from flask import Flask, jsonify, request
import pyttsx3
import threading

app = Flask(__name__)

# --- DATABASE ---
product_database = {
    "banana": 2.50,
    "apple": 1.50,
    "milk": 5.00,
    "bread": 3.20,
    "water": 1.00
}

# In-memory cart
shopping_cart = []

# --- AUDIO LOGIC ---
def speak_function(text):
    try:
        engine = pyttsx3.init()
        engine.setProperty('rate', 150)
        engine.say(text)
        engine.runAndWait()
    except Exception as e:
        print(f"Audio Error: {e}")

def trigger_voice(text):
    thread = threading.Thread(target=speak_function, args=(text,))
    thread.start()

# --- ROUTES ---

@app.route('/')
def home():
    return "Smart Shopping Backend with Quantity Support Ready."

# --- FLOW STEP 1: Detection (With Quantity) ---
# URL Example: /detect/banana/2
@app.route('/detect/<item_name>/<int:quantity>', methods=['GET'])
def detect_item(item_name, quantity):
    item_name = item_name.lower()
    
    if item_name in product_database:
        unit_price = product_database[item_name]
        
        # Audio: "2 banana detected, the price is 2.5 ringgit"
        message = f"{quantity} {item_name} detected. The price is {unit_price} ringgit."
        trigger_voice(message)
        
        return jsonify({
            "status": "found",
            "item": item_name,
            "quantity": quantity,
            "unit_price": unit_price,
            "message": message
        })
    else:
        trigger_voice(f"Sorry, I do not know {item_name}")
        return jsonify({"status": "error", "message": "Item not found"})

# --- FLOW STEP 2: Add to Cart (With Quantity) ---
# URL Example: /add/banana/2
@app.route('/add/<item_name>/<int:quantity>', methods=['GET'])
def add_to_cart(item_name, quantity):
    item_name = item_name.lower()
    
    if item_name in product_database:
        unit_price = product_database[item_name]
        
        # 1. Add the item multiple times based on quantity
        for _ in range(quantity):
            shopping_cart.append({'name': item_name, 'price': unit_price})
        
        # 2. Calculate new total
        total_price = sum(item['price'] for item in shopping_cart)
        
        # Audio: "2 banana added to cart, your total is 5 ringgit"
        message = f"{quantity} {item_name} added to cart. Your total is {total_price:.2f} ringgit."
        trigger_voice(message)
        
        return jsonify({
            "status": "added",
            "added_quantity": quantity,
            "cart_count": len(shopping_cart),
            "total_price": total_price,
            "message": message
        })
    else:
        return jsonify({"status": "error", "message": "Cannot add unknown item"})

# --- FLOW STEP 3: Checkout ---
@app.route('/checkout', methods=['GET'])
def checkout():
    total = sum(item['price'] for item in shopping_cart)
    count = len(shopping_cart)
    
    message = f"Checkout complete. You have {count} items. Your total is {total:.2f} ringgit. Thank you."
    trigger_voice(message)
    
    shopping_cart.clear()
    
    return jsonify({"status": "success", "message": message})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
from flask import Flask, jsonify, request
import pyttsx3
import threading

app = Flask(__name__)

# --- 1. MEMORY: The Database & Cart ---
# In a real app, this comes from a database. For now, we simulate it.
product_database = {
    "apple": 1.50,
    "banana": 0.80,
    "milk": 3.20,
    "bread": 2.50,
    "chips": 4.00,
    "water": 1.00
}

shopping_cart = []

# --- 2. AUDIO LOGIC: Text-to-Speech ---
def speak_function(text):
    """
    Function to make the computer speak.
    We run this in a separate thread so it doesn't block the server.
    """
    try:
        engine = pyttsx3.init()
        # You can adjust rate (speed) and volume here
        engine.setProperty('rate', 150) 
        engine.say(text)
        engine.runAndWait()
    except Exception as e:
        print(f"Audio Error: {e}")

def trigger_voice(text):
    # Running audio in a background thread ensures the app doesn't freeze while talking
    thread = threading.Thread(target=speak_function, args=(text,))
    thread.start()

# --- 3. ROUTES: The API Endpoints ---

@app.route('/')
def home():
    return "Blind Shopper Backend is Running! Go to /scan/apple to test."

@app.route('/scan/<item_name>', methods=['GET'])
def scan_item(item_name):
    """
    Simulates detecting an item.
    In the future, your camera will send the name here.
    For now, you type it in the browser.
    """
    item_name = item_name.lower()
    
    # Check if item exists in our database
    if item_name in product_database:
        price = product_database[item_name]
        
        # Add to cart logic
        shopping_cart.append({'name': item_name, 'price': price})
        
        # Calculate total logic
        total_price = sum(item['price'] for item in shopping_cart)
        
        # Prepare the response
        response_text = f"Added {item_name} to cart. Price is {price} ringgit. Total is now {total_price:.2f} ringgit."
        
        # Trigger Audio
        trigger_voice(response_text)
        
        return jsonify({
            "status": "success",
            "message": response_text,
            "cart": shopping_cart,
            "total": total_price
        })
    
    else:
        error_text = f"Sorry, I do not recognize {item_name}."
        trigger_voice(error_text)
        return jsonify({
            "status": "error",
            "message": error_text
        })

@app.route('/cart', methods=['GET'])
def view_cart():
    """See what is currently inside the cart"""
    total_price = sum(item['price'] for item in shopping_cart)
    return jsonify({
        "cart": shopping_cart,
        "total_items": len(shopping_cart),
        "total_price": total_price
    })

@app.route('/clear', methods=['GET'])
def clear_cart():
    """Empty the cart"""
    shopping_cart.clear()
    msg = "Cart cleared."
    trigger_voice(msg)
    return jsonify({"message": msg, "cart": []})

@app.route('/process_image', methods=['POST'])
def process_image():
    """
    This is where the Real Camera will send data later.
    For now, we simulate receiving a barcode or text from a "camera".
    """
    # 1. Receive data from the "Frontend" (Camera)
    data = request.json
    detected_item = data.get('item_name') # The camera will send {'item_name': 'apple'}

    if not detected_item:
        return jsonify({"status": "error", "message": "No item detected"})

    # 2. Re-use your existing logic
    # (We just call the same logic you already wrote!)
    return scan_item(detected_item)

@app.route('/checkout', methods=['GET'])
def checkout():
    total = sum(item['price'] for item in shopping_cart)
    count = len(shopping_cart)
    
    # Create the final summary message
    message = f"Checkout complete. You have {count} items. Your total is {total} ringgit. Thank you for shopping."
    
    # Speak it
    trigger_voice(message)
    
    # Clear the cart for the next customer
    shopping_cart.clear()
    
    return jsonify({"status": "success", "message": message})

if __name__ == '__main__':
    # debug=True allows the server to auto-reload when you save changes
    app.run(debug=True, port=5000)
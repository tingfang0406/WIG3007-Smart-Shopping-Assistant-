from flask import Flask, jsonify, request
import pyttsx3
import threading
import base64
import io

from PIL import Image
import numpy as np
from ultralytics import YOLO

app = Flask(__name__)

# --- DATABASE ---
# Map detected class names to prices (you can adjust these values)
product_database = {
    "Beans": 3.50,
    "Cake": 12.00,
    "Candy": 2.00,
    "Cereal": 8.50,
    "Chips": 4.00,
    "Chocolate": 5.00,
    "Coffee": 15.00,
    "Corn": 3.00,
    "Fish": 18.00,
    "Flour": 4.50,
    "Honey": 10.00,
    "Jam": 7.00,
    "Juice": 6.00,
    "Milk": 5.00,
    "Nuts": 9.00,
    "Oil": 12.00,
    "Pasta": 4.00,
    "Rice": 5.50,
    "Soda": 3.00,
    "Spices": 4.00,
    "Sugar": 3.50,
    "Tea": 6.00,
    "Tomato Sauce": 4.50,
    "Vinegar": 5.00,
    "Water": 1.50,
}

# In-memory cart
shopping_cart = []


# --- AUDIO LOGIC ---
def speak_function(text):
    try:
        engine = pyttsx3.init()
        engine.setProperty("rate", 150)
        engine.say(text)
        engine.runAndWait()
    except Exception as e:
        print(f"Audio Error: {e}")


# Voice disabled on backend - voice now plays on phone via React Native
def trigger_voice(text):
    # Voice is now handled on the phone, so we skip backend TTS
    # Uncomment the line below if you want backend voice for testing/debugging
    # thread = threading.Thread(target=speak_function, args=(text,))
    # thread.start()
    pass


# --- YOLOv8 PYTORCH MODEL ---
MODEL_PATH = "best.pt"

try:
    model = YOLO(MODEL_PATH)
    print("YOLOv8 PyTorch model loaded:", MODEL_PATH)
    print("Model classes:", model.names)
    
    # Auto-sync product_database with model classes (add missing ones with default price)
    model_class_names = list(model.names.values()) if hasattr(model, 'names') else []
    for class_name in model_class_names:
        if class_name not in product_database:
            product_database[class_name] = 5.00  # Default price
            print(f"Added missing class '{class_name}' to product_database with default price 5.00")
    
    print(f"Total classes in model: {len(model_class_names)}")
    print(f"Classes: {model_class_names}")
except Exception as e:
    model = None
    print("Failed to load YOLOv8 model:", e)

# YOLOv8 grocery classes – fallback if model.names not available
LABELS = [
    "Beans",
    "Cake",
    "Candy",
    "Cereal",
    "Chips",
    "Chocolate",
    "Coffee",
    "Corn",
    "Fish",
    "Flour",
    "Honey",
    "Jam",
    "Juice",
    "Milk",
    "Nuts",
    "Oil",
    "Pasta",
    "Rice",
    "Soda",
    "Spices",
    "Sugar",
    "Tea",
    "Tomato Sauce",
    "Vinegar",
    "Water",
]


def predict_item_from_image(image: Image.Image) -> str:
    """
    Run YOLOv8 PyTorch model and return the top detected class name.
    Uses Ultralytics YOLO which handles preprocessing automatically.
    """
    if model is None:
        raise RuntimeError("YOLOv8 model not initialized")

    # YOLO model expects confidence threshold (default 0.25)
    # conf=0.1 means we accept detections with confidence >= 0.1
    results = model(image, conf=0.1, verbose=False)

    if len(results) == 0 or len(results[0].boxes) == 0:
        print("No detections found")
        return "unknown"

    # Get the first (best) detection
    boxes = results[0].boxes
    best_box = boxes[0]  # Already sorted by confidence
    
    confidence = float(best_box.conf[0])
    class_id = int(best_box.cls[0])
    
    # Get class name from model's class names
    if hasattr(model, 'names') and class_id in model.names:
        class_name = model.names[class_id]
    elif 0 <= class_id < len(LABELS):
        class_name = LABELS[class_id]
    else:
        print(f"Class ID {class_id} out of range")
        return "unknown"

    print(f"Best detection -> class: {class_name}, confidence: {confidence:.3f}")
    
    return class_name


# --- ROUTES ---

@app.route("/")
def home():
    return "Smart Shopping Backend with YOLOv8 PyTorch model and Quantity Support Ready."


@app.route("/predict", methods=["POST"])
def predict():
    """
    Expects JSON: { "image": "<base64 string>" }
    Uses the YOLOv8 PyTorch model to predict the grocery item.
    """
    data = request.get_json(silent=True)
    if not data or "image" not in data:
        return jsonify({"status": "error", "message": "No image provided"}), 400

    if model is None:
        return jsonify({"status": "error", "message": "Model not loaded on server"}), 500

    try:
        image_b64 = data["image"]
        image_bytes = base64.b64decode(image_b64)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        item_name = predict_item_from_image(image)

        # Case-insensitive lookup in product_database
        item_name_lower = item_name.lower()
        matched_key = None
        for key in product_database.keys():
            if key.lower() == item_name_lower:
                matched_key = key
                break
        
        if matched_key:
            unit_price = product_database[matched_key]
            message = f"{matched_key} detected. The price is {unit_price} ringgit."
            trigger_voice(message)
            return jsonify(
                {
                    "status": "found",
                    "item": matched_key,
                    "unit_price": unit_price,
                    "message": message,
                }
            )
        else:
            print(f"Item '{item_name}' not found in product_database. Available keys: {list(product_database.keys())}")
            return jsonify({"status": "unknown", "item": item_name}), 200

    except Exception as e:
        print("Prediction error:", e)
        return jsonify({"status": "error", "message": "Prediction failed"}), 500


# --- FLOW STEP 1: Detection (With Quantity) ---
# URL Example: /detect/banana/2
@app.route('/detect/<item_name>/<int:quantity>', methods=['GET'])
def detect_item(item_name, quantity):
    item_name_lower = item_name.lower()
    
    # Case-insensitive lookup
    matched_key = None
    for key in product_database.keys():
        if key.lower() == item_name_lower:
            matched_key = key
            break
    
    if matched_key:
        unit_price = product_database[matched_key]
        
        # Audio: "2 banana detected, the price is 2.5 ringgit"
        message = f"{quantity} {matched_key} detected. The price is {unit_price} ringgit."
        trigger_voice(message)
        
        return jsonify({
            "status": "found",
            "item": matched_key,
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
    item_name_lower = item_name.lower()
    
    # Case-insensitive lookup
    matched_key = None
    for key in product_database.keys():
        if key.lower() == item_name_lower:
            matched_key = key
            break
    
    if matched_key:
        unit_price = product_database[matched_key]
        
        # 1. Add the item multiple times based on quantity
        for _ in range(quantity):
            shopping_cart.append({'name': matched_key, 'price': unit_price})
        
        # 2. Calculate new total
        total_price = sum(item['price'] for item in shopping_cart)
        
        # Audio: "2 banana added to cart, your total is 5 ringgit"
        message = f"{quantity} {matched_key} added to cart. Your total is {total_price:.2f} ringgit."
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
    # host='0.0.0.0' makes the server reachable from other devices on the network
    app.run(host='0.0.0.0', debug=True, port=5000)
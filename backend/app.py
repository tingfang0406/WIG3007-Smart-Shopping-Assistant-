from flask import Flask, jsonify, request
from flask_cors import CORS
import json
from audio_logic import generate_audio_message

app = Flask(__name__)
CORS(app)

# Load Database
with open('database.json', 'r') as f:
    products_db = json.load(f)

# Global Cart Total (Reset every time server restarts)
cart_total = 0.0

@app.route('/', methods=['GET'])
def home():
    return "Blind Shopper Backend is Running!"

@app.route('/scan/<item_id>', methods=['GET'])
def scan_item(item_id):
    global cart_total
    
    item_id = item_id.lower() # ensure 'Apple' matches 'apple'
    
    if item_id in products_db:
        item = products_db[item_id]
        price = item['price']
        name = item['name']
        
        # Update Total
        cart_total += price
        
        # Use your Audio Logic
        message_to_speak = generate_audio_message(name, price, cart_total)
        
        return jsonify({
            "status": "success",
            "name": name,
            "price": price,
            "total": cart_total,
            "audio_message": message_to_speak 
        })
    else:
        return jsonify({
            "status": "error",
            "message": "Item not found in database"
        }), 404

if __name__ == '__main__':
    # '0.0.0.0' allows the mobile phone to find this laptop
    app.run(host='0.0.0.0', port=5000, debug=True)
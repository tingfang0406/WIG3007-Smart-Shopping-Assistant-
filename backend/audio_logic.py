import math

def format_currency_audio(amount):
    """
    Converts 4.50 into "4 Ringgit and 50 Sen"
    """
    ringgit = int(amount)
    sen = int(round((amount - ringgit) * 100))
    
    text = f"{ringgit} Ringgit"
    if sen > 0:
        text += f" and {sen} Sen"
    return text

def generate_audio_message(item_name, price, total_cart_value):
    # 1. Format the prices to sound natural
    price_spoken = format_currency_audio(price)
    total_spoken = format_currency_audio(total_cart_value)
    
    # 2. Construct the sentence
    # "Added Coca Cola. Price is 2 Ringgit and 50 Sen. Total is now 10 Ringgit."
    message = f"Added {item_name}. Price is {price_spoken}. Total is now {total_spoken}."
    
    return message
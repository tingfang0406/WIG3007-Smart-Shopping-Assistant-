def generate_audio_message(item_name, price, total_cart_value):
    """
    Decides what the blind user should hear.
    """
    # Logic: If item is expensive, warn them? Or just standard info?
    
    clean_message = f"{item_name} added to cart. Price is {price} Ringgit."
    
    if total_cart_value > 50:
         clean_message += " Warning: You have exceeded 50 Ringgit."
         
    return clean_message
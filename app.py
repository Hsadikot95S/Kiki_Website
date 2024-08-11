from flask import Flask, request, jsonify, render_template, abort, send_from_directory
import stripe
import os
from datetime import datetime
import mysql.connector
from flask_cors import CORS

app = Flask(__name__)
CORS(app)



# Replace with your actual Stripe secret key
stripe.api_key = "sk_test_51PPwVlImrBfC2UDpbYrHTmkp78IowquSToV0gYm05PN0kyUUKK0sDrUu9xE9vEDOpJtlcO17wbOAmZdbBAXauOso00Jja5wR64"

# Connect to the MySQL database
db_config = {
    'user': 'root',
    'password': 'mid.ran-95',
    'host': 'localhost',
    'database': 'kiki_subscribers',
    'raise_on_warnings': True
}


# Route to serve files from the data folder
@app.route('/data/<filename>')
def download_data_file(filename):
    data_directory = os.path.join(app.root_path, 'data')
    try:
        return send_from_directory(data_directory, filename)
    except FileNotFoundError:
        abort(404)

# Route to serve images from the static/images folder
@app.route('/images/<filename>')
def serve_image(filename):
    images_directory = os.path.join(app.root_path, 'static', 'images')
    try:
        return send_from_directory(images_directory, filename)
    except FileNotFoundError:
        abort(404)


#  CREATE TABLE subscriber (
#     ->     discordId BIGINT(20), 
#     ->     discordUsername VARCHAR(255), 
#     ->     email VARCHAR(255), 
#     ->     joinDate VARCHAR(255), 
#     ->     autoRenewal VARCHAR(255)
#     -> );

@app.route('/store-subscriber', methods=['POST'])
def store_subscriber():
    data = request.get_json()
    
    discord_id = data.get('discordId')
    discord_username = data.get('discordUsername')
    email = data.get('email')
    join_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    auto_renewal = 'No'  # Default value

    connection = None
    try:
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor()

        # Check if the discordId already exists
        cursor.execute("SELECT * FROM subscriber WHERE discordId = %s", (discord_id,))
        existing_record = cursor.fetchone()

        if existing_record:
            return jsonify({'message': 'Subscriber already exists!'}), 409  # HTTP 409 Conflict

        # If not exists, insert the new subscriber
        insert_query = """
        INSERT INTO subscriber (discordId, discordUsername, email, joinDate, autoRenewal)
        VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(insert_query, (discord_id, discord_username, email, join_date, auto_renewal))
        connection.commit()

        return jsonify({'message': 'Subscriber added successfully!'}), 200

    except mysql.connector.Error as err:
        print(f"Error: {err}")
        return jsonify({'error': str(err)}), 500

    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()


@app.route('/create-checkout-session', methods=['POST'])
def create_checkout_session():
    data = request.get_json()

    try:
        # Create a new Stripe Checkout session
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[
                {
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': item['name'],
                        },
                        'unit_amount': int(item['cost'] * 100),  # Convert to cents
                    },
                    'quantity': item['quantity'],
                } for item in data['cartItems']
            ],
            mode='payment',
            success_url='http://127.0.0.1:4242/success',
            cancel_url='http://127.0.0.1:4242/cancel',
        )

        # Return the session ID to the frontend
        return jsonify({'id': session.id})

    except Exception as e:
        return jsonify(error=str(e)), 400


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/checkout')
def checkout():
    return render_template('checkout.html')

@app.route('/pricing')
def pricing():
    return render_template('pricing.html')

@app.route('/privacy')
def privacy():
    return render_template('privacy_policy.html')

@app.route('/terms')
def terms():
    return render_template('terms_of_service.html')

@app.route('/subscribe')
def subscribe():
    return render_template('subscription.html')

@app.route('/create-payment-intent', methods=['POST'])
def create_payment():
    try:
        data = request.get_json()
        subtotal = data['totalPrice']

        # Create a PaymentIntent with the subtotal amount
        intent = stripe.PaymentIntent.create(
            amount=int(subtotal * 100),  # Convert dollars to cents
            currency='usd',
            payment_method_types=['card']
        )

        return jsonify({
            'clientSecret': intent['client_secret']
        })
    except Exception as e:
        return jsonify(error=str(e)), 403
    


@app.route('/success')
def success():
    return "Payment succeeded!"

@app.route('/cancel')
def cancel():
    return "Payment cancelled."

if __name__ == '__main__':
    app.run(port=4242)
    app.run(debug=True)

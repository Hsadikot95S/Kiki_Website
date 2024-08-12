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
#     ->     discordId BIGINT(20),   -- Discord ID of the user
#     ->     discordUsername VARCHAR(255), -- Discord username of the user
#     ->     email VARCHAR(255),  -- Email address of the user
#     ->     joinDate VARCHAR(255), -- Date when the user joined
#     ->     autoRenewal VARCHAR(255)  -- Auto-renewal status
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


# Route to create a checkout session
@app.route('/create-checkout-session', methods=['POST'])
def create_checkout_session():
    data = request.get_json()

    # Create the Stripe Checkout session
    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[
            {
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': item['name'],
                    },
                    'unit_amount': int(item['cost'] * 100),
                },
                'quantity': item['quantity'],
            } for item in data['cartItems']
        ],
        mode='payment',
        success_url='http://127.0.0.1:4242/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url='http://127.0.0.1:4242/cancel',
        metadata={'discordId': data.get('discordId')}
    )

    return jsonify({'id': session.id})


# CREATE TABLE subscriptions (
#     uuid VARCHAR(36) NOT NULL PRIMARY KEY,  -- UUID to uniquely identify each subscription
#     discordId BIGINT(20) NOT NULL,          -- Discord ID of the user
#     tier VARCHAR(255) NOT NULL,             -- Subscription tier, comma-separated if multiple
#     serverId BIGINT(20),                    -- Server ID (can be NULL initially)
#     joinDate DATETIME NOT NULL,             -- Date when the subscription was activated
#     expiryDate DATETIME NOT NULL,           -- Date when the subscription expires
#     status TINYINT(1) NOT NULL DEFAULT 0,   -- Subscription status (0 for inactive, 1 for active)
#     retryCount INT DEFAULT 0,               -- Number of retry attempts if payment fails
#     UNIQUE KEY unique_subscription (discordId)  -- Ensures no duplicate subscriptions for the same user
# );

    
# Stripe webhook to handle events like successful payments
# Stripe webhook to handle events like successful payments
@app.route('/stripe-webhook', methods=['POST'])
def stripe_webhook():
    payload = request.get_data(as_text=True)
    sig_header = request.headers.get('Stripe-Signature')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError:
        return jsonify({'status': 'error', 'message': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError:
        return jsonify({'status': 'error', 'message': 'Invalid signature'}), 400

    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        discord_id = session['metadata']['discordId']
        cart_items = session['display_items']

        # Get the payment status
        payment_status = session['payment_status']
        join_date = datetime.now()
        expiry_date = join_date + timedelta(days=30)
        status = 1 if payment_status == 'paid' else 0
        retry_count = 0 if status == 1 else 1

        connection = None
        try:
            connection = mysql.connector.connect(**db_config)
            cursor = connection.cursor()

            # Check if user already has a subscription
            cursor.execute("SELECT * FROM subscriptions WHERE discordId = %s", (discord_id,))
            existing_record = cursor.fetchone()

            # Update or Insert into subscriptions table
            if existing_record:
                # Update existing record
                existing_tiers = existing_record[2]
                updated_tiers = existing_tiers + ',' + ','.join([item['name'] for item in cart_items])
                update_query = """
                UPDATE subscriptions
                SET tier = %s, serverId = NULL, joinDate = %s, expiryDate = %s, status = %s, retryCount = retryCount + %s
                WHERE discordId = %s
                """
                cursor.execute(update_query, (updated_tiers, join_date, expiry_date, status, retry_count, discord_id))
            else:
                # Insert new subscription record
                insert_query = """
                INSERT INTO subscriptions (uuid, discordId, tier, serverId, joinDate, expiryDate, status, retryCount)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """
                for item in cart_items:
                    cursor.execute(insert_query, (
                        str(uuid.uuid4()), discord_id, item['name'], None, join_date, expiry_date, status, retry_count
                    ))

            connection.commit()

        except mysql.connector.Error as err:
            print(f"Error: {err}")
            return jsonify({'error': str(err)}), 500

        finally:
            if connection and connection.is_connected():
                cursor.close()
                connection.close()

    return jsonify({'status': 'success'}), 200



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

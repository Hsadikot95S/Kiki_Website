from flask import Flask, request, jsonify, render_template, abort, send_from_directory
import stripe
import os
from datetime import datetime,timedelta
import uuid
import mysql.connector
from flask_cors import CORS

app = Flask(__name__)
CORS(app)



# Replace with your actual Stripe secret key
stripe.api_key = "sk_test_51PPwVlImrBfC2UDpbYrHTmkp78IowquSToV0gYm05PN0kyUUKK0sDrUu9xE9vEDOpJtlcO17wbOAmZdbBAXauOso00Jja5wR64"
webhook_secret = 'whsec_46104ba9458f37347d42e915d447ba2e3f0ddadd980dd91b98b78537801d10af'

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
    cart_items = data.get('cartItems', [])
    metadata = data.get('metadata', {})

    try:
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor()

        # Extract the tier names from metadata
        tiers = metadata.get('tier_names', '')

        # Assuming discord_id is already stored or retrieved separately
        cursor.execute("SELECT discordId FROM subscriber ORDER BY joinDate DESC LIMIT 1")
        discord_id_row = cursor.fetchone()
        if not discord_id_row:
            raise ValueError("No discordId found in the database.")
        discord_id = discord_id_row[0]

        print("Metadata stored in variable 'tiers':", tiers)

        # Generate the current timestamp for joinDate and calculate expiryDate
        join_date = datetime.now()
        expiry_date = join_date + timedelta(days=30)

        # Split tiers and insert each into a new row
        for item in cart_items:
            tier_name = item['name']
            quantity = item['quantity']

            # Check if there's already a subscription for this discordId and tier
            cursor.execute("SELECT * FROM subscriptions WHERE discordId = %s AND tiers = %s", (discord_id, tier_name))
            existing_record = cursor.fetchone()

            if existing_record:
                # If a subscription exists, update the quantity and dates
                update_query = """
                UPDATE subscriptions
                SET quantity = quantity + %s, joinDate = %s, expiryDate = %s
                WHERE discordId = %s AND tiers = %s
                """
                cursor.execute(update_query, (quantity, join_date, expiry_date, discord_id, tier_name))
            else:
                # Insert a new record if no subscription exists
                insert_query = """
                INSERT INTO subscriptions (uuid, discordId, tiers, quantity, joinDate, expiryDate)
                VALUES (%s, %s, %s, %s, %s, %s)
                """
                cursor.execute(insert_query, (str(uuid.uuid4()), discord_id, tier_name, quantity, join_date, expiry_date))
        
        connection.commit()
        print("Tiers and dates stored in DB for discordId:", discord_id)

    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return jsonify({'error': str(err)}), 500
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()

    try:
        # Create a Stripe Checkout session
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[
                {
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': item['name'],
                        },
                        'unit_amount': int(item['cost'] * 100),  # Stripe expects amounts in cents
                    },
                    'quantity': item['quantity'],
                }
                for item in cart_items
            ],
            mode='payment',
            success_url='http://127.0.0.1:4242/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url='http://127.0.0.1:4242/cancel',
        )

        print("Stripe session created with ID:", session.id)

        return jsonify({'id': session.id})
    except Exception as e:
        print(f"Error creating checkout session: {e}")
        return jsonify({'error': str(e)}), 500



# CREATE TABLE subscriptions (
#     uuid VARCHAR(36) NOT NULL PRIMARY KEY,  -- UUID to uniquely identify each subscription
#     discordId BIGINT(20) NOT NULL,          -- Discord ID of the user
#     tiers VARCHAR(255) NOT NULL,             -- Subscription tier, comma-separated if multiple
#     serverId BIGINT(20),                    -- Server ID (can be NULL initially)
#     joinDate DATETIME NOT NULL,             -- Date when the subscription was activated
#     expiryDate DATETIME NOT NULL,           -- Date when the subscription expires
#     status TINYINT(1) NOT NULL DEFAULT 0,   -- Subscription status (0 for inactive, 1 for active)
#     retryCount INT DEFAULT 0,               -- Number of retry attempts if payment fails
#     Quantity INT DEFAULT 0s,                 -- Quantity of the subscription
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

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        print("Session data:", session)

        try:
            connection = mysql.connector.connect(**db_config)
            cursor = connection.cursor()
            cursor.execute("SELECT discordId FROM subscriber ORDER BY joinDate DESC LIMIT 1")
            discord_id_row = cursor.fetchone()
            if not discord_id_row:
                raise ValueError("No discordId found in the database.")
            discord_id = discord_id_row[0]

            print("Discord ID:", discord_id)

            # Retrieve the stored tiers from the subscriptions table
            cursor.execute("SELECT tiers FROM subscriptions WHERE discordId = %s", (discord_id,))
            tiers_row = cursor.fetchone()
            if not tiers_row:
                raise ValueError("No tiers found in the database for this discordId.")
            tiers = tiers_row[0].split(',')

            payment_status = session['payment_status']
            join_date = datetime.now()
            expiry_date = join_date + timedelta(days=30)
            status = 1 if payment_status == 'paid' else 0
            retry_count = 0 if status == 1 else 1

            # Process each tier and update the subscription details in the database
            for tier in tiers:
                update_query = """
                UPDATE subscriptions
                SET joinDate = %s, expiryDate = %s, status = %s, retryCount = %s
                WHERE discordId = %s AND FIND_IN_SET(%s, tiers)
                """
                cursor.execute(update_query, (join_date, expiry_date, status, retry_count, discord_id, tier))

            connection.commit()

        except mysql.connector.Error as err:
            print(f"Database error: {err}")
            return jsonify({'error': str(err)}), 500
        except Exception as e:
            print(f"Error: {e}")
            return jsonify({'error': str(e)}), 500
        finally:
            if connection and connection.is_connected():
                cursor.close()
                connection.close()

    return jsonify({'status': 'success'}), 200

@app.route('/get-subscriptions', methods=['GET'])
def get_subscriptions():
    try:
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor(dictionary=True)

        query = """
            SELECT s.discordUsername, sub.tiers, sub.joinDate, sub.expiryDate
            FROM subscriber s
            JOIN subscriptions sub ON s.discordId = sub.discordId
        """
        cursor.execute(query)
        result = cursor.fetchall()

        return jsonify(result)

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        connection.close()

@app.route('/update-subscriptions', methods=['POST'])
def update_subscriptions():
    try:
        data = request.get_json()
        subscriptions = data.get('subscriptions', [])
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor()

        for subscription in subscriptions:
            discord_username = subscription.get('discordUsername')
            tier = subscription.get('tiers')
            quantity = subscription.get('quantity')

            if discord_username and tier and quantity is not None:
                print(f"Updating {tier} for {discord_username} to quantity {quantity}")

                # Update the quantity for the corresponding discordUsername and tier
                update_query = """
                    UPDATE subscriptions 
                    SET quantity = quantity + %s
                    WHERE discordId = (SELECT discordId FROM subscriber WHERE discordUsername = %s)
                    AND tiers = %s
                """
                cursor.execute(update_query, (quantity, discord_username, tier))

        connection.commit()
        return jsonify({'success': True}), 200

    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return jsonify({'error': str(err)}), 500

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()



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

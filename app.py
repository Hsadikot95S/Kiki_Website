from flask import Flask, request, jsonify, render_template, abort, send_from_directory,redirect,url_for,make_response
import stripe
import os
from datetime import datetime,timedelta
import uuid
import mysql.connector
from mysql.connector import Error

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




# Function to connect to the MySQL database
def get_db_connection():
    try:
        conn = mysql.connector.connect(**db_config)
        return conn
    except mysql.connector.Error as err:
        print(f"Database connection error: {err}")
        return None
# Function to initialize the database table

# Function to initialize the database and create necessary tables
def initialize_database():
    try:
        connection = mysql.connector.connect(**db_config)
        # Use dictionary=True to return rows as dictionaries
        cursor = connection.cursor(dictionary=True)

        # Create 'subscribers' table if it does not exist
        cursor.execute("SHOW TABLES LIKE 'subscribers'")
        result = cursor.fetchone()
        if not result:
            cursor.execute("""
                CREATE TABLE subscribers (
                    discordId VARCHAR(255) PRIMARY KEY,
                    discordUsername VARCHAR(255),
                    email VARCHAR(255),
                    joinDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                    autoRenewal VARCHAR(255) DEFAULT 'Yes'
                );
            """)

        # Create 'subscriptions' table if it does not exist
        cursor.execute("SHOW TABLES LIKE 'subscriptions'")
        result = cursor.fetchone()
        if not result:
            cursor.execute("""
                CREATE TABLE subscriptions (
                    uuid VARCHAR(36) NOT NULL PRIMARY KEY,
                    discordId BIGINT NOT NULL,
                    tiers VARCHAR(255) NOT NULL,
                    serverId BIGINT,
                    joinDate DATETIME NOT NULL,
                    expiryDate DATETIME NOT NULL,
                    status TINYINT NOT NULL DEFAULT 0,
                    retryCount INT DEFAULT 0,
                    quantity INT DEFAULT 0,
                    UNIQUE KEY unique_subscription (discordId, tiers)
                );
            """)

        # Check for missing columns and add them if necessary
        cursor.execute("DESCRIBE subscriptions")
        existing_columns = [column['Field'] for column in cursor.fetchall()]

        required_columns = {
            'uuid': "ALTER TABLE subscriptions ADD COLUMN uuid VARCHAR(36) NOT NULL PRIMARY KEY",
            'discordId': "ALTER TABLE subscriptions ADD COLUMN discordId BIGINT NOT NULL",
            'tiers': "ALTER TABLE subscriptions ADD COLUMN tiers VARCHAR(255) NOT NULL",
            'serverId': "ALTER TABLE subscriptions ADD COLUMN serverId BIGINT",
            'joinDate': "ALTER TABLE subscriptions ADD COLUMN joinDate DATETIME NOT NULL",
            'expiryDate': "ALTER TABLE subscriptions ADD COLUMN expiryDate DATETIME NOT NULL",
            'status': "ALTER TABLE subscriptions ADD COLUMN status TINYINT NOT NULL DEFAULT 0",
            'retryCount': "ALTER TABLE subscriptions ADD COLUMN retryCount INT DEFAULT 0",
            'quantity': "ALTER TABLE subscriptions ADD COLUMN quantity INT DEFAULT 0"
        }

        for column_name, alter_statement in required_columns.items():
            if column_name not in existing_columns:
                cursor.execute(alter_statement)
                print(f"Added missing column '{column_name}' to 'subscriptions' table.")

        connection.commit()
        print("Database initialized successfully.")

    except mysql.connector.Error as e:
        print(f"Error initializing database: {str(e)}")
    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()


@app.route('/store-subscriber', methods=['POST'])
def store_subscriber():
    data = request.json
    discord_id = data.get('discordId')
    discord_username = data.get('discordUsername')
    email = data.get('email')

    # Ensure all parameters are provided
    if not discord_id or not discord_username or not email:
        return jsonify({"error": "Missing parameters"}), 400

    try:
        # Establish database connection
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()

        # SQL query with alias to prevent deprecation warning
        query = """
            INSERT INTO subscribers (discordId, discordUsername, email, joinDate, autoRenewal)
            VALUES (%s, %s, %s, CURRENT_TIMESTAMP, 'Yes') AS new
            ON DUPLICATE KEY UPDATE discordUsername = new.discordUsername, email = new.email, joinDate = new.joinDate, autoRenewal = new.autoRenewal;
        """
        cursor.execute(query, (discord_id, discord_username, email))

        # Commit the transaction
        conn.commit()

        return jsonify({"success": "User data saved successfully"}), 200
    except mysql.connector.Error as err:
        print(f"Error: {err}")
        return jsonify({"error": str(err)}), 500
    finally:
        # Ensure that cursor and connection are closed if they were created
        try:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
        except NameError:
            print("Cursor or connection was not created due to earlier error.")


@app.route('/get-cart-items', methods=['GET'])
def get_cart_items():
    discord_id = request.cookies.get('discord_id')

    if not discord_id:
        return jsonify({'error': 'Missing discord ID in cookie'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Fetch all items in the cart for this user
        cursor.execute("SELECT item_name, cost_per_item, quantity, total_cost FROM cart WHERE discord_id = %s", (discord_id,))
        cart_items = cursor.fetchall()

        return jsonify(cart_items), 200

    except Error as e:
        print(f"Error fetching cart items: {str(e)}")
        return jsonify({'error': 'Failed to fetch cart items'}), 500

    finally:
        cursor.close()
        conn.close()

# @app.route('/remove-from-cart', methods=['POST'])
# def remove_from_cart():
#     discord_id = session.get('discord_id')
#     if not discord_id:
#         return jsonify({'error': 'User not logged in'}), 401

#     data = request.get_json()
#     item_id = data.get('itemId')

#     try:
#         conn = get_db_connection()
#         cursor = conn.cursor()

#         # Remove item from the cart
#         cursor.execute("DELETE FROM cart WHERE discord_id = %s AND id = %s", (discord_id, item_id))
#         conn.commit()

#         return jsonify({'message': 'Item removed from cart'}), 200

#     except Error as e:
#         print(f"Error removing item from cart: {str(e)}")  # Log the error
#         return jsonify({'error': 'Failed to remove item from cart'}), 500

#     finally:
#         cursor.close()
#         conn.close()

@app.route('/complete-purchase', methods=['POST'])
def complete_purchase():
    discord_id = session.get('discord_id')
    if not discord_id:
        return jsonify({'error': 'User not logged in'}), 401

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Clear the cart for the user
        cursor.execute("DELETE FROM cart WHERE discord_id = %s", (discord_id,))
        conn.commit()

        return jsonify({'message': 'Purchase completed successfully'}), 200

    except Error as e:
        print(f"Error completing purchase: {str(e)}")  # Log the error
        return jsonify({'error': 'Failed to complete purchase'}), 500

    finally:
        cursor.close()
        conn.close()


# Route to create a checkout session
@app.route('/create-checkout-session', methods=['POST'])
def create_checkout_session():
    data = request.json
    cart_items = data.get('cartItems', [])
    discord_username = data.get('discordUsername')  # Get the discordUsername from the request

    # Convert cart items to a string for metadata
    cart_items_str = ','.join([f"{item['name']}:{item['quantity']}:{item['cost']}" for item in cart_items])
    
    metadata = {
        'discordUsername': discord_username,  # Include discordUsername in the metadata
        'cartItems': cart_items_str  # Convert cartItems to a string
    }

    print("Received cart items:", cart_items)
    print("Formatted metadata:", metadata)

    # Initialize database to ensure tables are set up correctly
    initialize_database()

    try:
        # Create line items for Stripe Checkout
        line_items = [
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
        ]
        # Create a Stripe Checkout session
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=line_items,
            mode='payment',
            success_url='http://127.0.0.1:4242/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url='http://127.0.0.1:4242/cancel',
            metadata=metadata  # Pass the metadata including discordUsername
        )

        print("Stripe session created with ID:", session.id)

        return jsonify({'id': session.id})
    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return jsonify({'error': str(err)}), 500
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
        print("Received Stripe webhook for session completed:", session)

        # Initialize the database
        initialize_database()

        try:
            connection = mysql.connector.connect(**db_config)
            cursor = connection.cursor()

            # Extract relevant information from the session
            payment_status = session['payment_status']
            join_date = datetime.now()
            expiry_date = join_date + timedelta(days=30)
            status = 1 if payment_status == 'paid' else 0
            retry_count = 0 if status == 1 else 1

            # Retrieve discordUsername from metadata
            discord_username = session['metadata'].get('discordUsername')
            cart_items = session['metadata'].get('cartItems', [])

            print("Metadata retrieved from Stripe session:", discord_username, cart_items)

            if not discord_username:
                raise ValueError("Discord username not found in session metadata")

            # Ensure cart items exist and are valid
            if not cart_items:
                raise ValueError("Cart items not found in session metadata")

            # Fetch the discordId associated with the discordUsername
            cursor.execute("SELECT discordId FROM subscribers WHERE discordUsername = %s", (discord_username,))
            result = cursor.fetchone()

            if not result:
                raise ValueError("Discord ID not found for the given username")

            discord_id = result[0]
            print("Retrieved discord ID:", discord_id)

            # Insert or update the subscription details in the database
            for item in cart_items:
                print("Processing item:", item)
                insert_query = """
                INSERT INTO subscriptions (uuid, discordId, tiers, joinDate, expiryDate, status, retryCount, quantity)
                VALUES (UUID(), %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE joinDate=%s, expiryDate=%s, status=%s, retryCount=%s, quantity=%s
                """
                cursor.execute(insert_query, (discord_id, item['name'], join_date, expiry_date, status, retry_count, item['quantity'],
                                              join_date, expiry_date, status, retry_count, item['quantity']))

            connection.commit()
            print("Data successfully saved to the subscriptions table.")

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

        # Fetch the subscriptions data
        query = """
            SELECT s.discordUsername, sub.tiers, sub.joinDate, sub.expiryDate, sub.quantity
            FROM subscribers s
            JOIN subscriptions sub ON s.discordId = sub.discordId
        """
        cursor.execute(query)
        result = cursor.fetchall()

        return jsonify(result)

    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return jsonify({'error': str(err)}), 500
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/update-subscriptions', methods=['POST'])
def update_subscriptions():
    data = request.get_json()
    subscriptions = data['subscriptions']
    try:
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor()
        for subscription in subscriptions:
            discord_username = subscription['discordUsername']
            tier = subscription['tiers']
            quantity = subscription['quantity']
            query = "UPDATE subscriptions SET quantity = %s WHERE discordId = (SELECT discordId FROM subscribers WHERE discordUsername = %s) AND tiers = %s"
            cursor.execute(query, (quantity, discord_username, tier))
        connection.commit()
        return jsonify({'success': True, 'message': 'Subscriptions updated successfully'})
    except Exception as e:
        connection.rollback()
        return jsonify({'success': False, 'message': str(e)})
    finally:
        cursor.close()
        connection.close()


@app.route('/index')
def index():
    return render_template('index.html')


@app.route('/cart')
def cart():
    return render_template('checkout.html')

@app.route('/get_subscriptions', endpoint='manage_subscriptions')
def get_subscriptions():
    # Logic to handle subscription management
    return render_template('subscription.html')


@app.route('/logout')
def logout():
    # Logic to handle logout, e.g., clearing session or cookies
    return redirect(url_for('index'))
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
    return redirect(url_for('manage_subscriptions'))



@app.route('/cancel')
def cancel():
    return "Payment cancelled."

if __name__ == '__main__':
    app.run(port=4242)
    app.run(debug=True)

from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import os
import bcrypt  # Password hashing 

app = Flask(__name__)
CORS(app)

print("🚀 Starting Flask app...")  

# Database connection
def get_db_connection():
    try:
        conn = psycopg2.connect(
            host="localhost",
            database="agriculture_marketplace",
            user="postgres",
            password="SYSTEM"
        )
        print("DB connected successfully ✅ ")
        return conn
    except Exception as e:
        print(f"DB connection failed: {e}  ❌ ")
        raise

# Signup Route 
@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.json
        full_name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        user_type = data.get('userType')  # Frontend se 'userType' aa raha

        if not all([full_name, email, password, user_type]):
            return jsonify({"success": False, "error": "All fields are required!"})

        # Password hash 
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        # DB connection
        conn = get_db_connection()
        cur = conn.cursor()

        # Check duplicate email
        cur.execute("SELECT user_id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({"success": False, "error": "Email already registered!"})

        # Insert 
        cur.execute("""
            INSERT INTO users (full_name, email, password_hash, user_type)
            VALUES (%s, %s, %s, %s)
            RETURNING user_id
        """, (full_name, email, password_hash, user_type))

        user_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        print(f"New user signed up: {email} (ID: {user_id})")
        return jsonify({
            "success": True,
            "user_id": user_id,
            "message": "Account created successfully"
        })

    except psycopg2.IntegrityError as e:
        print(f"DB Integrity error: {e}")
        return jsonify({"success": False, "error": "Database error (e.g., invalid user type or duplicate)"})
    except Exception as e:
        print(f"Signup error: {e}")
        return jsonify({"success": False, "error": str(e)})

# Login Route 
@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({"success": False, "error": "Email and password required!"})

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT user_id, full_name, user_type, password_hash FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        cur.close()
        conn.close()

        if user and bcrypt.checkpw(password.encode('utf-8'), user[3].encode('utf-8')):
            print(f"User logged in: {email} (ID: {user[0]})successfully")
            return jsonify({
                "success": True,
                "user_id": user[0],
                "name": user[1],
                "role": user[2], 
                "message": "Login successful"
            })
        else:
            print(f"Invalid login for: {email}")
            return jsonify({"success": False, "error": "Invalid email or password!"})

    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({"success": False, "error": str(e)})

# Crop Submit 
@app.route('/api/batches', methods=['POST'])
def submit_crop_batch():
    try:
        data = request.json
        farmer_id = data['farmer_id']  
        crop_type = data['crop_type']
        quantity_kg = data['quantity_kg']
        desired_price_per_kg = data['desired_price_per_kg']

        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            INSERT INTO crop_batches 
            (farmer_id, crop_type, quantity_kg, desired_price_per_kg, current_status) 
            VALUES (%s, %s, %s, %s, 'submitted')
            RETURNING batch_id
        """, (farmer_id, crop_type, quantity_kg, desired_price_per_kg))
        
        batch_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        print(f"Batch submitted: ID {batch_id} by farmer {farmer_id}")
        return jsonify({
            "success": True,
            "batch_id": batch_id,
            "message": "Crop batch submitted successfully"
        })
    
    except Exception as e:
        print(f"Batch submit error: {e}")
        return jsonify({"success": False, "error": str(e)})

# All Batches 
@app.route('/api/batches', methods=['GET'])
def get_all_batches():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM crop_batches")
        batches = cur.fetchall()
        cur.close()
        conn.close()
        
        print("Fetched all batches")
        return jsonify({"batches": [dict(row) for row in batches]})  # List of dicts banao
    except Exception as e:
        print(f"Get batches error: {e}")
        return jsonify({"error": str(e)})

# Grade Batch 
@app.route('/api/batches/<int:batch_id>/grade', methods=['POST'])
def grade_batch(batch_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("SELECT grade_crop_batch(%s)", (batch_id,))
        grade = cur.fetchone()[0]
        
        conn.commit()
        cur.close()
        conn.close()
        
        print(f"Batch {batch_id} graded: {grade}")
        return jsonify({
            "success": True,
            "batch_id": batch_id,
            "grade": grade,
            "message": "Grading completed successfully"
        })
    
    except Exception as e:
        print(f"Grade batch error: {e}")
        return jsonify({"success": False, "error": str(e)})

# Create Market Listing 
@app.route('/api/listings', methods=['POST'])
def create_listing():
    try:
        data = request.json
        batch_id = data['batch_id']
        listing_price_per_kg = data['listing_price_per_kg']
        quantity_available_kg = data['quantity_available_kg']
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            INSERT INTO market_listings 
            (batch_id, listing_price_per_kg, quantity_available_kg) 
            VALUES (%s, %s, %s)
            RETURNING listing_id
        """, (batch_id, listing_price_per_kg, quantity_available_kg))
        
        listing_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        print(f"Listing created: ID {listing_id} for batch {batch_id}")
        return jsonify({"listing_id": listing_id, "message": "Listing created successfully"})
    
    except Exception as e:
        print(f"Create listing error: {e}")
        return jsonify({"error": str(e)})

if __name__ == '__main__':
    print("Flask server starting on http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
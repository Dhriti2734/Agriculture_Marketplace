# app.py
from flask import Flask, request, jsonify
import psycopg2
import os

app = Flask(__name__)

# Database connection
def get_db_connection():
    conn = psycopg2.connect(
        host="localhost",
        database="agriculture_marketplace",
        user="postgres",
        password="SYSTEM"
    )
    return conn

#  Crop Submit
@app.route('/api/batches', methods=['POST'])
def submit_crop_batch():
    try:
        data = request.json
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            INSERT INTO crop_batches 
            (farmer_id, crop_type, quantity_kg, desired_price_per_kg, current_status) 
            VALUES (%s, %s, %s, %s, 'submitted')
            RETURNING batch_id
        """, (data['farmer_id'], data['crop_type'], data['quantity_kg'], data['desired_price_per_kg']))
        
        batch_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            "success": True,
            "batch_id": batch_id,
            "message": "Crop batch submitted successfully"
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

#  All Batches
@app.route('/api/batches', methods=['GET'])
def get_all_batches():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM crop_batches")
    batches = cur.fetchall()
    cur.close()
    conn.close()
    
    return jsonify({"batches": batches})

#  Grade Batch 
@app.route('/api/batches/<int:batch_id>/grade', methods=['POST'])
def grade_batch(batch_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        #Stored Procedure
        cur.execute("SELECT grade_crop_batch(%s)", (batch_id,))
        grade = cur.fetchone()[0]
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            "success": True,
            "batch_id": batch_id,
            "grade": grade,
            "message": "Grading completed successfully"
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

# Create Market Listing
@app.route('/api/listings', methods=['POST'])
def create_listing():
    data = request.json
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        INSERT INTO market_listings 
        (batch_id, listing_price_per_kg, quantity_available_kg) 
        VALUES (%s, %s, %s)
        RETURNING listing_id
    """, (data['batch_id'], data['listing_price_per_kg'], data['quantity_available_kg']))
    
    listing_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({"listing_id": listing_id, "message": "Listing created successfully"})

if __name__ == '__main__':
    app.run(debug=True)
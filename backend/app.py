# app.py (FULL updated - strict AI check + hybrid DB merging)
import time
import os
import traceback
import numpy as np

from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2 import extras
import bcrypt
import importlib.util

app = Flask(__name__)
CORS(app)

print("🚀 Starting Flask Backend...")

# ---------------- DB CONNECTION ----------------
def get_db_connection():
    try:
        conn = psycopg2.connect(
            host="localhost",
            database="agriculture_marketplace",
            user="postgres",
            password="SYSTEM"
        )
        return conn
    except Exception as e:
        print("❌ Database connection error:", e)
        raise

# ---------------- LOAD AI MODULE ----------------
AI_MODULE_PATH = os.path.join(os.path.dirname(__file__), "..", "ai-module", "ai_module.py")
AI_MODULE_PATH = os.path.normpath(AI_MODULE_PATH)

def load_ai_module(path):
    try:
        spec = importlib.util.spec_from_file_location("ai_module_dynamic", path)
        ai_mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(ai_mod)
        print("🤖 AI Module Loaded Successfully!")
        return ai_mod
    except Exception as e:
        print("❌ Failed to load AI module:", e)
        traceback.print_exc()
        return None

ai_module = load_ai_module(AI_MODULE_PATH)

# ---------------- UPLOAD FOLDER ----------------
BASE_DIR = os.path.dirname(__file__)
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ---------------- HELPERS ----------------
def _to_py_scalar(x):
    # convert numpy types to Python native if needed
    if isinstance(x, (np.float32, np.float64)):
        return float(x)
    return x

# ---------------- SIGNUP ----------------
@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.json
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")
        user_type = data.get("userType")

        if not all([name, email, password, user_type]):
            return jsonify({"success": False, "error": "All fields required"})

        password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT user_id FROM users WHERE email=%s", (email,))
        if cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({"success": False, "error": "Email already registered"})

        cur.execute("""
            INSERT INTO users (full_name, email, password_hash, user_type)
            VALUES (%s, %s, %s, %s)
            RETURNING user_id
        """, (name, email, password_hash, user_type))

        user_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"success": True, "user_id": user_id})
    
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)})

# ---------------- LOGIN ----------------
@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get("email")
        password = data.get("password")

        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT user_id, full_name, user_type, password_hash 
            FROM users WHERE email=%s
        """, (email,))
        user = cur.fetchone()
        cur.close()
        conn.close()

        if not user:
            return jsonify({"success": False, "error": "Invalid email"})

        if bcrypt.checkpw(password.encode(), user[3].encode()):
            return jsonify({
                "success": True,
                "user_id": user[0],
                "name": user[1],
                "role": user[2]
            })
        else:
            return jsonify({"success": False, "error": "Wrong password"})

    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)})

# =================================================================
# 🔥 MAIN ENDPOINT: SUBMIT CROP + IMAGE + AI + GRADING (STRICT)
# =================================================================
@app.route('/api/submit-crop-with-image', methods=['POST'])
def submit_crop_with_image():
    try:
        if ai_module is None:
            return jsonify({"success": False, "error": "AI module not loaded"}), 500

        # form fields
        farmer_id = request.form.get('farmer_id')
        crop_type = request.form.get('crop_type')
        quantity_kg = request.form.get('quantity_kg')
        desired_price_per_kg = request.form.get('desired_price_per_kg')
        image = request.files.get('image')

        if not all([farmer_id, crop_type, quantity_kg, image]):
            return jsonify({"success": False, "error": "Missing fields"}), 400

        # Save image
        filename = f"batch_{int(time.time())}_{image.filename}"
        save_path = os.path.join(UPLOAD_FOLDER, filename)
        image.save(save_path)

        # ---- AI analysis: we PASS expected_crop so AI can validate ----
        ai_results = ai_module.analyze_crop_image(save_path, expected_crop=crop_type)

        # If AI indicates mismatch -> STRICT policy = reject and return model_check info
        if not ai_results.get("match", True):
            # delete saved file? (optional) keep for debug -> we keep
            return jsonify({
                "success": False,
                "error": ai_results.get("message", "Image crop type mismatch"),
                "model_check": ai_results.get("detected_crop")
            }), 400

        # Convert numpy types in ai_results
        for k, v in list(ai_results.items()):
            if isinstance(v, (np.float32, np.float64)):
                ai_results[k] = float(v)

        # ---- DB reference row (hybrid strategy) ----
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT moisture, test_weight, protein, defect_percentage,
                   broken_percentage, foreign_matter, density, color_uniformity, size_index
            FROM crop_quality_reference
            WHERE crop_type = %s
            ORDER BY random()
            LIMIT 1
        """, (crop_type,))
        ref = cur.fetchone()

        if ref:
            ref_row = {
                "moisture": ref[0],
                "test_weight": ref[1],
                "protein": ref[2],
                "ref_defect": ref[3],
                "broken_percentage": ref[4],
                "foreign_matter": ref[5],
                "density": ref[6],
                "color_uniformity_ref": ref[7],
                "size_index": ref[8]
            }
        else:
            # fallback defaults
            ref_row = {
                "moisture": 12.0,
                "test_weight": 75.0,
                "protein": 10.0,
                "ref_defect": 0.0,
                "broken_percentage": 0.0,
                "foreign_matter": 0.0,
                "density": 740.0,
                "color_uniformity_ref": 70.0,
                "size_index": 1.0
            }

        # ---- Insert into crop_batches ----
        cur.execute("""
            INSERT INTO crop_batches
            (farmer_id, crop_type, quantity_kg, desired_price_per_kg, current_status, created_at, updated_at)
            VALUES (%s,%s,%s,%s,'submitted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING batch_id
        """, (farmer_id, crop_type, float(quantity_kg),
              float(desired_price_per_kg) if desired_price_per_kg else None))
        batch_id = cur.fetchone()[0]
        conn.commit()

        # ---- Save image + AI data ----
        cur.execute("""
            INSERT INTO crop_images
            (batch_id, image_url, image_type, upload_order, is_verified, ai_analysis_data)
            VALUES (%s,%s,%s,%s,%s,%s)
            RETURNING image_id
        """, (batch_id, f"uploads/{filename}", "main", 1, False, extras.Json(ai_results)))
        image_id = cur.fetchone()[0]
        conn.commit()

        # ---- Insert quality_measurements (HYBRID):
        # Use AI defect/color; use DB moisture/test_weight (ref_row)
        cur.execute("""
            INSERT INTO quality_measurements
            (batch_id, defect_percentage, color_uniformity_score, size_variance,
             shape_consistency, moisture_content, test_weight, foreign_matter_percentage,
             broken_grain_percentage, measured_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,CURRENT_TIMESTAMP)
            RETURNING measurement_id
        """, (
            batch_id,
            ai_results.get("defect_percentage"),
            ai_results.get("color_uniformity_score"),
            None, None,
            ref_row["moisture"],
            ref_row["test_weight"],
            ref_row["foreign_matter"],
            ref_row["broken_percentage"]
        ))
        measurement_id = cur.fetchone()[0]
        conn.commit()

        # ---- Call DB grading function ----
        cur.execute("SELECT grade_crop_batch(%s)", (batch_id,))
        final_grade = cur.fetchone()[0]
        conn.commit()

        # update batch status
        cur.execute("UPDATE crop_batches SET current_status='graded', updated_at=CURRENT_TIMESTAMP WHERE batch_id=%s",
                    (batch_id,))
        conn.commit()

        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "batch_id": batch_id,
            "image_id": image_id,
            "measurement_id": measurement_id,
            "ai_results": ai_results,
            "reference": ref_row,
            "final_grade": final_grade
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


# ---------------- GET ALL BATCHES ----------------
@app.route('/api/batches', methods=['GET'])
def get_batches():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT batch_id, crop_type, quantity_kg, current_status
            FROM crop_batches
            ORDER BY batch_id DESC
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()

        batches = [
            {"batch_id": r[0], "crop_type": r[1], "quantity_kg": r[2], "current_status": r[3]}
            for r in rows
        ]

        return jsonify({"batches": batches})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)})


# ---------------- START SERVER ----------------
if __name__ == "__main__":
    print("Backend running at http://127.0.0.1:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)

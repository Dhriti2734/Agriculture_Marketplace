# ai_module.py  (HYBRID-ready, expects expected_crop kwarg)
import os
import cv2
import numpy as np
import random
import traceback

def detect_crop_type(image_path):
    """
    Improved heuristic detector: returns 'Wheat'|'Rice'|'Maize'|'Unknown'
    (You can later replace with real model)
    """
    try:
        img = cv2.imread(image_path)
        if img is None:
            return "Unknown", 0.0
        img = cv2.resize(img, (256, 256))
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        avg_h, avg_s, avg_v = hsv.mean(axis=(0,1))
        # edge density
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = edges.mean()

        # Wheat: golden, moderate brightness, lower edge density
        if 15 < avg_h < 40 and 80 < avg_v < 220 and edge_density < 40:
            return "Wheat", 0.85

        # Rice: bright, low saturation (pale)
        if avg_s < 60 and avg_v > 180:
            return "Rice", 0.85

        # Maize: yellow/orange + higher texture
        if 20 < avg_h < 50 and avg_s > 80 and avg_v > 140 and edge_density > 30:
            return "Maize", 0.8

        return "Unknown", 0.4
    except Exception as e:
        traceback.print_exc()
        return "Unknown", 0.0

def calculate_defect_percentage_from_gray(gray):
    _, thresh = cv2.threshold(gray, 100, 255, cv2.THRESH_BINARY_INV)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3,3))
    clean = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=1)
    defect_pixels = int((clean == 255).sum())
    total_pixels = clean.size
    return round((defect_pixels / float(total_pixels)) * 100.0, 2)

def calculate_color_uniformity_bgr(img):
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    L, A, B = cv2.split(lab)
    std_L = np.std(L)
    std_A = np.std(A)
    std_B = np.std(B)
    uniformity = 100.0 - (std_L + std_A + std_B) / 3.0
    uniformity = max(0.0, min(100.0, uniformity))
    return round(uniformity, 2)

def analyze_crop_image(image_path, expected_crop=None):
    """
    Returns:
      {
        detected_crop: str,
        confidence: float,
        match: bool,
        message: optional string (if mismatch),
        defect_percentage: float,
        color_uniformity_score: float,
        moisture_content: float,   # simulated fallback
        test_weight: float         # simulated fallback
      }
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    img = cv2.imread(image_path)
    if img is None:
        raise ValueError("Unable to read image")

    img = cv2.resize(img, (512, 512))
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # AI-driven visual metrics (defect + color)
    defect_pct = calculate_defect_percentage_from_gray(gray)
    color_unif = calculate_color_uniformity_bgr(img)

    # classification
    detected_crop, confidence = detect_crop_type(image_path)

    match = True
    message = None
    if expected_crop:
        # case-insensitive compare; require minimum confidence
        try:
            if detected_crop.lower() != expected_crop.lower() or confidence < 0.45:
                match = False
                message = f"Uploaded image looks like **{detected_crop}**, expected **{expected_crop}**."
        except Exception:
            match = False
            message = f"Uploaded image could not be reliably classified. Expected {expected_crop}."

    # Provide simulated sensor fields for backward compatibility.
    moisture_sim = round(random.uniform(10.0, 18.0), 2)
    test_weight_sim = round(random.uniform(70.0, 85.0), 2)

    return {
        "detected_crop": detected_crop,
        "confidence": float(confidence),
        "match": match,
        "message": message,
        "defect_percentage": float(defect_pct),
        "color_uniformity_score": float(color_unif),
        "moisture_content": moisture_sim,
        "test_weight": test_weight_sim
    }

# quick CLI test
if __name__ == "__main__":
    import argparse, json
    p = argparse.ArgumentParser()
    p.add_argument("image")
    p.add_argument("--expected", default=None)
    args = p.parse_args()
    r = analyze_crop_image(args.image, expected_crop=args.expected)
    print(json.dumps(r, indent=2))

# ai_module.py
import cv2
import numpy as np
import random
import os
import json

def analyze_crop_image(image_path):
    """Analyze a crop image and return metrics"""

    if not os.path.exists(image_path):
        raise FileNotFoundError(f"❌ Image not found: {image_path}")

    # Read image
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"⚠️ Unable to load image file: {image_path}")

    # Resize to standard
    image = cv2.resize(image, (256, 256))

    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Defect percentage (simple threshold)
    _, thresh = cv2.threshold(gray, 100, 255, cv2.THRESH_BINARY_INV)
    defect_pixels = np.sum(thresh == 255)
    total_pixels = thresh.size
    defect_percentage = round((defect_pixels / total_pixels) * 100, 2)

    # Color uniformity
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    hue_std = np.std(hsv[:, :, 0])
    color_uniformity_score = round(100 - min(hue_std, 100), 2)

    # Simulated non-visual parameters
    moisture_content = round(random.uniform(10, 18), 2)
    test_weight = round(random.uniform(70, 85), 2)

    # Package results
    result = {
        "defect_percentage": defect_percentage,
        "color_uniformity_score": color_uniformity_score,
        "moisture_content": moisture_content,
        "test_weight": test_weight
    }

    return result


if __name__ == "__main__":
    image_path = os.path.join(os.getcwd(), "sample_crop.jpg")
    print(f"🧠 Running AI analysis on: {image_path}")
    try:
        results = analyze_crop_image(image_path)
        print(json.dumps(results, indent=4))
    except Exception as e:
        print("❌ Error:", e)

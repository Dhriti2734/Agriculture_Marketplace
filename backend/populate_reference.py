# populate_reference.py
"""
Populate crop_quality_reference with realistic synthetic rows for many crops.
Run: venv\Scripts\activate
     python populate_reference.py
"""

import random
import psycopg2
import time
from math import isfinite

DB = {
    "host": "localhost",
    "database": "agriculture_marketplace",
    "user": "postgres",
    "password": "SYSTEM",
    "port": 5432
}

# Dictionary of crop -> list of parameter ranges (min, max) for key metrics.
# Ranges are realistic typical values — conservative, literature-based approximations.
CROP_RANGES = {
    # Cereals
    "Wheat": {
        "moisture": (9.0, 15.0),
        "test_weight": (70.0, 82.0),  # kg/hl or g (interpretation consistent)
        "protein": (8.0, 15.0),
        "defect_percentage": (0.0, 10.0),
        "broken_percentage": (0.0, 5.0),
        "foreign_matter": (0.0, 3.0),
        "density": (740.0, 820.0),
        "color_uniformity": (50.0, 95.0),
        "size_index": (0.8, 1.2)
    },
    "Rice": {
        "moisture": (11.0, 16.0),
        "test_weight": (60.0, 75.0),
        "protein": (6.0, 9.0),
        "defect_percentage": (0.0, 12.0),
        "broken_percentage": (0.0, 15.0),
        "foreign_matter": (0.0, 2.5),
        "density": (650.0, 740.0),
        "color_uniformity": (45.0, 92.0),
        "size_index": (0.6, 1.1)
    },
    "Maize": {
        "moisture": (12.0, 16.0),
        "test_weight": (70.0, 82.0),
        "protein": (7.0, 11.0),
        "defect_percentage": (0.0, 8.0),
        "broken_percentage": (0.0, 6.0),
        "foreign_matter": (0.0, 3.0),
        "density": (720.0, 820.0),
        "color_uniformity": (50.0, 95.0),
        "size_index": (0.75, 1.25)
    },
    # Pulses
    "Chickpea": {"moisture": (10.0,13.0), "test_weight": (70.0,80.0), "protein": (18.0,24.0),
                 "defect_percentage": (0.0,6.0), "broken_percentage": (0.0,6.0), "foreign_matter": (0.0,2.0),
                 "density": (680.0,760.0), "color_uniformity": (55.0,95.0), "size_index": (0.8,1.2)},
    "Lentil": {"moisture": (10.0,13.0), "test_weight": (60.0,72.0), "protein": (22.0,30.0),
               "defect_percentage": (0.0,8.0), "broken_percentage": (0.0,6.0), "foreign_matter": (0.0,2.0),
               "density": (620.0,700.0), "color_uniformity": (50.0,92.0), "size_index": (0.7,1.15)},
    # Oilseeds
    "Soybean": {"moisture": (9.0,12.0), "test_weight": (70.0,80.0), "protein": (32.0,45.0),
                "defect_percentage": (0.0,6.0), "broken_percentage": (0.0,3.0), "foreign_matter": (0.0,2.0),
                "density": (720.0,820.0), "color_uniformity": (60.0,95.0), "size_index": (0.8,1.2)},
    "Mustard": {"moisture": (8.0,11.0), "test_weight": (50.0,60.0), "protein": (20.0,30.0),
                "defect_percentage": (0.0,6.0), "broken_percentage": (0.0,3.0), "foreign_matter": (0.0,2.0),
                "density": (500.0,620.0), "color_uniformity": (55.0,90.0), "size_index": (0.7,1.1)},
    # Fruits & Vegetables — values are approximate (post-harvest quality metrics)
    "Apple": {"moisture": (80.0,88.0), "test_weight": (0.0,0.0), "protein": (0.2,0.6),
              "defect_percentage": (0.0,12.0), "broken_percentage": (0.0,5.0), "foreign_matter": (0.0,2.0),
              "density": (600.0,740.0), "color_uniformity": (40.0,98.0), "size_index": (0.5,1.3)},
    "Mango": {"moisture": (70.0,85.0), "test_weight": (0.0,0.0), "protein": (0.4,1.2),
              "defect_percentage": (0.0,15.0), "broken_percentage": (0.0,8.0), "foreign_matter": (0.0,3.0),
              "density": (520.0,760.0), "color_uniformity": (40.0,95.0), "size_index": (0.6,1.3)},
    # Vegetables
    "Potato": {"moisture": (75.0,85.0), "test_weight": (0.0,0.0), "protein": (1.5,3.0),
               "defect_percentage": (0.0,10.0), "broken_percentage": (0.0,4.0), "foreign_matter": (0.0,2.0),
               "density": (600.0,820.0), "color_uniformity": (50.0,95.0), "size_index": (0.6,1.4)},
    # Others
    "Coffee": {"moisture": (10.0,12.0), "test_weight": (60.0,72.0), "protein": (10.0,14.0),
               "defect_percentage": (0.0,8.0), "broken_percentage": (0.0,6.0), "foreign_matter": (0.0,5.0),
               "density": (550.0,720.0), "color_uniformity": (40.0,95.0), "size_index": (0.6,1.2)},
    "Tea": {"moisture": (4.0,8.0), "test_weight": (0.0,0.0), "protein": (10.0,18.0),
            "defect_percentage": (0.0,12.0), "broken_percentage": (0.0,10.0), "foreign_matter": (0.0,6.0),
            "density": (200.0,420.0), "color_uniformity": (30.0,90.0), "size_index": (0.4,1.0)}
}

# If you want more crops add them to this dict above.
# We'll generate N rows per crop by sampling uniform within ranges plus a little noise
ROWS_PER_CROP = 300  # produce 300 rows per crop -> large reference table

def sample_value(r):
    if r[0] == r[1]:
        return round(r[0], 2)
    return round(random.uniform(r[0], r[1]), 2)

def build_rows():
    rows = []
    for crop, metrics in CROP_RANGES.items():
        for _ in range(ROWS_PER_CROP):
            row = {
                "crop_type": crop,
                "moisture": sample_value(metrics["moisture"]),
                "test_weight": sample_value(metrics["test_weight"]) if metrics["test_weight"] != (0.0,0.0) else None,
                "protein": sample_value(metrics["protein"]) if metrics.get("protein") else None,
                "defect_percentage": sample_value(metrics["defect_percentage"]),
                "broken_percentage": sample_value(metrics["broken_percentage"]),
                "foreign_matter": sample_value(metrics["foreign_matter"]),
                "density": sample_value(metrics["density"]),
                "color_uniformity": sample_value(metrics["color_uniformity"]),
                "size_index": sample_value(metrics["size_index"]),
                "source": "synthetic_ranges_v1"
            }
            rows.append(row)
    return rows

def insert_rows(rows):
    conn = psycopg2.connect(**DB)
    cur = conn.cursor()
    insert_sql = """
        INSERT INTO crop_quality_reference
        (crop_type, moisture, test_weight, protein, defect_percentage,
         broken_percentage, foreign_matter, density, color_uniformity, size_index, source)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """
    batch = []
    for i, r in enumerate(rows, 1):
        batch.append((
            r["crop_type"], r["moisture"], r["test_weight"], r["protein"],
            r["defect_percentage"], r["broken_percentage"], r["foreign_matter"],
            r["density"], r["color_uniformity"], r["size_index"], r["source"]
        ))
        # Insert in batches to avoid huge single insert
        if i % 500 == 0:
            cur.executemany(insert_sql, batch)
            conn.commit()
            batch = []
            print(f"Inserted {i} rows so far...")
    if batch:
        cur.executemany(insert_sql, batch)
        conn.commit()
        print(f"Inserted total {len(rows)} rows.")
    cur.close()
    conn.close()

if __name__ == "__main__":
    print("Building rows...")
    rows = build_rows()
    print("Connecting and inserting rows into DB...")
    insert_rows(rows)
    print("Done.")

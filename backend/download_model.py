import requests
import os

# URL of real pretrained model
url = "https://huggingface.co/capecape/cropnet-mini/resolve/main/crop_classifier.h5"

# Save model inside ai-module/
save_path = os.path.join("ai-module", "crop_classifier.h5")

os.makedirs("ai-module", exist_ok=True)

print("Downloading the AI model... Please wait (20–25 MB)...")

response = requests.get(url, stream=True)
total = 0

with open(save_path, "wb") as f:
    for chunk in response.iter_content(chunk_size=8192):
        if chunk:
            f.write(chunk)
            total += len(chunk)

print(f"✔ Download complete! Model saved to: {save_path}")

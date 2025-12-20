import requests

url = "http://localhost:8000/analyze"
file_path = "c:/Users/ankit/.gemini/antigravity/brain/fd684f2f-0c91-4a08-bdd4-ee68ad915459/uploaded_image_1766205808673.png"

with open(file_path, "rb") as f:
    files = {"file": f}
    data = {
        "item_id": "test_verification",
        "description": "test vector generation",
        "is_lost": "true"
    }
    response = requests.post(url, files=files, data=data)
    
    if response.status_code == 200:
        json_resp = response.json()
        if "vector" in json_resp and len(json_resp["vector"]) > 10:
             print("Success: Vector found in response! Length:", len(json_resp["vector"]))
        else:
             print("Failed: Vector missing or empty.", json_resp.keys())
    else:
        print(f"Error: {response.status_code}", response.text)

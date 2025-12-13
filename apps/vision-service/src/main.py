from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from transformers import CLIPProcessor, CLIPModel
from ultralytics import YOLO
from PIL import Image
import io
import torch
from pymilvus import connections, Collection, FieldSchema, CollectionSchema, DataType, utility
import uvicorn

app = FastAPI(title="Vision Service")

# --- 1. Load AI Models ---
print("⏳ Loading CLIP Model...")
# Using CPU for compatibility; change to "cuda" if you have a GPU
device = "cuda" if torch.cuda.is_available() else "cpu"

clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(device)
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
print("✅ CLIP Model Loaded!")

print("⏳ Loading YOLO Model...")
yolo_model = YOLO("yolov8n.pt")  # Pre-trained YOLO model
print("✅ YOLO Model Loaded!")

# --- 2. Setup Milvus Connection & Schema ---
COLLECTION_NAME = "lost_items"
DIMENSION = 512

def init_milvus():
    print("⏳ Connecting to Milvus...")
    try:
        connections.connect("default", host="localhost", port="19530")
        
        if not utility.has_collection(COLLECTION_NAME):
            print(f"⚠️ Collection '{COLLECTION_NAME}' missing. Creating...")
            
            # Schema Definition
            fields = [
                # Internal Milvus ID (Primary Key)
                FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
                # External ID (The ID from your MongoDB/Postgres)
                FieldSchema(name="external_id", dtype=DataType.VARCHAR, max_length=100), 
                # The Image Vector
                FieldSchema(name="vector", dtype=DataType.FLOAT_VECTOR, dim=DIMENSION),
                # A readable description/tags
                FieldSchema(name="description", dtype=DataType.VARCHAR, max_length=500),
            ]
            
            schema = CollectionSchema(fields, description="Lost items vectors")
            collection = Collection(name=COLLECTION_NAME, schema=schema)
            
            # Indexing for fast search
            index_params = {
                "metric_type": "L2", 
                "index_type": "IVF_FLAT", 
                "params": {"nlist": 128}
            }
            collection.create_index(field_name="vector", index_params=index_params)
            print(f"✅ Collection created!")
        else:
            print(f"✅ Collection '{COLLECTION_NAME}' found.")
            
        # Load collection into memory for searching
        Collection(COLLECTION_NAME).load()
        
    except Exception as e:
        print(f"❌ Milvus Init Failed: {e}")

# Initialize Milvus on startup
init_milvus()

@app.post("/analyze")
async def analyze_image(
    file: UploadFile = File(...), 
    item_id: str = Form(...),    # The ID from your Main DB (e.g., MongoDB/Postgres ID)
    description: str = Form(...) # User provided description
):
    try:
        # A. Read Image
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data)).convert("RGB")

        # B. YOLO Object Detection (Optional: used for validation or auto-tagging)
        # We run this to detect what object is in the image
        yolo_results = yolo_model(image)
        detected_objects = []
        for result in yolo_results:
            for box in result.boxes:
                class_id = int(box.cls[0])
                label = yolo_model.names[class_id]
                detected_objects.append(label)
        
        # You might want to append detected objects to the description for better context
        full_description = f"{description} | Detected: {', '.join(set(detected_objects))}"

        # C. Generate Vector (CLIP)
        inputs = clip_processor(images=image, return_tensors="pt").to(device)
        with torch.no_grad():
            outputs = clip_model.get_image_features(**inputs)
        
        # Flatten vector to list
        embedding = outputs.squeeze().tolist()

        # D. Save to Milvus
        collection = Collection(COLLECTION_NAME)
        # Data format must match schema order: [[external_id], [vector], [description]]
        collection.insert([
            [item_id],          # external_id
            [embedding],        # vector
            [full_description]  # description
        ])
        collection.flush() # Ensure it is searchable immediately

        return {
            "status": "stored", 
            "external_id": item_id,
            "detected_objects": list(set(detected_objects)),
            "vector_preview": embedding[:5] 
        }

    except Exception as e:
        print(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search")
async def search(
    text: str = Form(None),       # Option 1: Search by Text
    file: UploadFile = File(None) # Option 2: Search by Image
):
    query_vector = []

    # 1. Generate Query Vector
    if file:
        # Image Search Logic
        print("🔍 Searching by Image...")
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        inputs = clip_processor(images=image, return_tensors="pt").to(device)
        with torch.no_grad():
            outputs = clip_model.get_image_features(**inputs)
        query_vector = outputs.squeeze().tolist()
        
    elif text:
        # Text Search Logic
        print(f"🔍 Searching by Text: '{text}'")
        inputs = clip_processor(text=[text], return_tensors="pt", padding=True).to(device)
        with torch.no_grad():
            outputs = clip_model.get_text_features(**inputs)
        query_vector = outputs.squeeze().tolist()
        
    else:
        raise HTTPException(400, "Provide text or upload an image to search.")

    # 2. Perform Search in Milvus
    collection = Collection(COLLECTION_NAME)
    if collection.num_entities == 0:
         return {"results": [], "message": "Collection is empty."}

    results = collection.search(
        data=[query_vector], 
        anns_field="vector", 
        param={"metric_type": "L2", "params": {"nprobe": 10}}, 
        limit=5, 
        output_fields=["external_id", "description"] # Return the ID so you can look it up in your DB
    )

    # 3. Format Results
    matches = []
    for hits in results:
        for hit in hits:
            matches.append({
                "milvus_id": hit.id,                # Internal ID
                "external_id": hit.entity.get("external_id"), # YOUR DB ID
                "description": hit.entity.get("description"),
                "score": hit.distance               # Distance (Lower is better for L2)
            })
            
    return matches

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
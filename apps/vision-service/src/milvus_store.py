from pymilvus import connections, Collection, FieldSchema, CollectionSchema, DataType, utility

COLLECTION_NAME = "lost_found_items"
DIMENSION = 512 # CLIP-ViT-Base-Patch32 uses 512 dimensions

def connect_milvus():
    print("⏳ Connecting to Milvus...")
    connections.connect("default", host="localhost", port="19530")
    print("✅ Connected to Milvus!")
    setup_collection()

def setup_collection():
    # 1. Check if collection exists
    if utility.has_collection(COLLECTION_NAME):
        return

    # 2. Define Schema
    print("🛠️ Creating Milvus Collection...")
    fields = [
        FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
        FieldSchema(name="external_id", dtype=DataType.VARCHAR, max_length=100), # Link to Postgres UUID
        FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=DIMENSION),
        FieldSchema(name="is_lost", dtype=DataType.BOOL) # True=Lost, False=Found
    ]
    schema = CollectionSchema(fields, "Lost and Found Items Vectors")
    
    # 3. Create Collection
    collection = Collection(COLLECTION_NAME, schema)
    
    # 4. Create Index (Crucial for speed)
    index_params = {
        "metric_type": "L2", # Euclidean Distance
        "index_type": "IVF_FLAT",
        "params": {"nlist": 1024}
    }
    collection.create_index(field_name="embedding", index_params=index_params)
    collection.load() # Must load into RAM to search
    print("✅ Collection Ready & Loaded!")

def insert_vector(external_id: str, vector: list, is_lost: bool):
    collection = Collection(COLLECTION_NAME)
    # Milvus expects columns of data
    data = [
        [external_id], # external_id
        [vector],      # embedding
        [is_lost]      # is_lost
    ]
    collection.insert(data)
    collection.flush() # Ensure data is written
    print(f"💾 Vector saved for {external_id}")

def search_vectors(query_vector: list, limit: int = 5):
    collection = Collection(COLLECTION_NAME)
    search_params = {"metric_type": "L2", "params": {"nprobe": 10}}
    
    results = collection.search(
        data=[query_vector],
        anns_field="embedding",
        param=search_params,
        limit=limit,
        output_fields=["external_id", "is_lost"]
    )
    
    matches = []
    for hits in results:
        for hit in hits:
            matches.append({
                "score": hit.distance, # Lower is better for L2 distance
                "external_id": hit.entity.get("external_id"),
                "is_lost": hit.entity.get("is_lost")
            })
    return matches
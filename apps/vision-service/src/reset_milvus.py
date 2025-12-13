from pymilvus import connections, utility

def reset_db():
    print("⏳ Connecting to Milvus...")
    try:
        connections.connect("default", host="localhost", port="19530")
        
        collection_name = "lost_items"
        
        if utility.has_collection(collection_name):
            print(f"🗑️ Found old collection '{collection_name}'. Dropping it...")
            utility.drop_collection(collection_name)
            print("✅ Old collection deleted! Restart your main server now.")
        else:
            print(f"🤷 Collection '{collection_name}' not found. Nothing to delete.")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    reset_db()
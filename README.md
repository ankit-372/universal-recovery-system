# 🔍 Universal Recovery System

A highly scalable, AI-powered "Lost & Found" platform leveraging generative vector embeddings and real-time object detection to automatically identify and recover lost items.

By combining traditional relational databases with specialized Serverless Vector search capabilities and neural networks, this architecture moves beyond simple keyword matching, allowing users to find objects based purely on visual semantics.

---

## ✨ Key Features
- **AI-Powered Vector Search:** Uses OpenAI's **CLIP** model to map images and text descriptions into mathematical vectors, allowing users to search for "a black backpack" and instantly match with an uploaded photo of a black backpack.
- **Serverless Analytics Cloud:** Migrated from local Milvus to **Zilliz Cloud** for totally managed, persistent vector similarity search.
- **Globally Distributed Architecture:** 
  - The React frontend and NestJS Core Backend are hosted on **Render**.
  - The heavy AI inferencing service is hosted natively on **Hugging Face Spaces**.
  - Media payloads are cleanly managed by **Cloudinary**.
- **Anti-Tracking/ISP Proxy Bypass:** NestJS actively masks Cloudinary image requests through an internal proxy router (`/items/image/proxy`) to completely bypass aggressive ISP firewalls and strict browser trackers (e.g. Brave Shields).

---

## 🏗️ System Architecture

The system operates on an isolated microservices blueprint. It purposely untangles slow machine learning operations from the central API gateway and distributes them across cloud providers.

```mermaid
graph TD
    User((User/Browser Front-End)) -->|HTTP / WebSockets| Gateway[NestJS Core Backend]
    
    subgraph "Render Cloud (Node.js)"
        Gateway -->|Relational Data| PG[(Render PostgreSQL)]
        Gateway -->|Proxy Image Fetch| Cloudinary[(Cloudinary Storage)]
    end
    
    subgraph "Hugging Face Space (Python/PyTorch)"
        Gateway -->|Rest API request| Vision[FastAPI Vision Service]
        Vision -->|Generate Array| CLIP[OpenAI CLIP Model]
        Vision -->|Store/Match Vector| Zilliz[(Zilliz Vector DB)]
    end
```

### 1. The Presentation Layer (`web-client`)
*   **Deployment:** Render Cloud (Static Site)
*   **Tech Stack:** React 19, TypeScript, Vite, TailwindCSS v4.
*   **Role:** Provides the user interface. It communicates securely with the Core Backend using HTTPOnly JWT cookies via standard REST APIs (Axios). 

### 2. The API Gateway & Business Engine (`core-backend`)
*   **Deployment:** Render Cloud (Web Service)
*   **Tech Stack:** NestJS, Prisma/TypeORM, PostgreSQL.
*   **Role:** This is the orchestrator. Everything flows through NestJS first.
    1.  **Authentication:** Validates secure cookies, protects routes, and manages users.
    2.  **Relational State:** Manages the canonical truth of the system (Users, Items, Timestamps, Locations) in **PostgreSQL**.
    3.  **Blob Storage:** Directly uploads incoming raw media files to **Cloudinary** using secure URL streams.
    4.  **AI Proxying:** NestJS forwards image parameters to the Hugging Face `vision-service` over synchronous HTTP.
    5.  **Bypass Router:** Acts as an image proxy host to circumvent external 3rd-party tracking blockers by serving Cloudinary blobs directly from its safe first-party domain.

### 3. The Artificial Intelligence Engine (`vision-service`)
*   **Deployment:** Hugging Face Spaces (Docker + Compute)
*   **Tech Stack:** FastAPI, PyTorch, Transformers.
*   **Role:** An isolated, heavy computational service that manages AI models.
    1.  **CLIP Inference:** Passes the query through OpenAI's `clip-vit-base-patch32` model. This is strictly normalized to output flat 512-dimensional arrays.
    2.  **Vector Persistence:** Opens a remote connection to **Zilliz Cloud** using secure tokens to insert, schema-validate, or calculate Cosine Similarity between matching vectors.

### 4. Application Storage Layer
*   **Render Postgres:** Handles exact relational mappings (e.g., *Is User 123 the owner of Item 456?*).
*   **Cloudinary:** Retains the heavy unstructured media files.
*   **Zilliz Cloud (Milvus):** An advanced serverless vector database. Takes vector arrays and computes **Inner Product (IP)** calculations across filtered metadata boolean flags (like `is_lost = true`).

---

## 🔀 Internal Request Flow (Search Sequence)

When a user tries to search for an item, this is the exact flow data takes across the internet:

```mermaid
sequenceDiagram
    participant Client as React Client (Browser)
    participant Nest as Render Backend (Node)
    participant Cloud as Cloudinary
    participant Fast as Hugging Face Space (Python)
    participant Zil as Zilliz DB
    participant PG as Render Postgres

    Client->>Nest: 1. Upload Query Image File to Match
    Nest->>Fast: 2. POST /search (image file stream)
    
    rect rgb(200, 220, 240)
        Note right of Fast: AI Inference Phase
        Fast->>Fast: 3. CLIP calculates 512D Tensor -> Flattens
    end

    Fast->>Zil: 4. Cosine Math on Vectors matching is_lost boolean
    Zil-->>Fast: 5. Return top 5 matches (IDs + Score)
    Fast-->>Nest: 6. Returns ID & Score JSON
    
    rect rgb(200, 240, 200)
        Note left of PG: Relational Reconstruction
        Nest->>PG: 7. SELECT * FROM Items WHERE id IN (...)
        PG-->>Nest: 8. Rows containing associated Cloudinary URLs
    end
    
    Nest-->>Client: 9. Returns Match Object array to Frontend User
    Client->>Nest: 10. (Image Bypass): GET /items/image/proxy?url=XYZ
    Nest->>Cloud: 11. Fetch raw CDN Blob securely
    Cloud-->>Client: 12. Piped Image Stream successfully renders in UI
```

---

## 🚀 Environment Setup & Deployment

Because this architecture relies on robust cloud integrations, you must ensure the following environment keys are generated and securely attached to your respective platforms.

### 1. Render API Gateway Environment Variables (`core-backend`)
*   `DATABASE_URL` (Supplied natively by Render PostgreSQL addon)
*   `VISION_SERVICE_URL` (e.g. `https://your-huggingface-space.hf.space`)
*   `CLOUDINARY_URL` (Standard `cloudinary://Key:Secret@Cloud` schema)
*   `JWT_SECRET` (Secure random string)

### 2. Hugging Face Space Environment Variables (`vision-service`)
*   `MILVUS_URI` (Your Zilliz Cloud highly-available cluster URL)
*   `MILVUS_TOKEN` (Zilliz API Token)

### 3. Vercel / Render Frontend Client Variable (`web-client`)
*   `VITE_API_URL` (Your Render NestJS URL - e.g. `https://core-backend-xxxx.onrender.com`)

Once variables are correctly injected, standard commits pushed to `main` will securely trigger isolated pipeline rebuilds on Render and Hugging Face.

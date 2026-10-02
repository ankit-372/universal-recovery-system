# 🔍 Universal Recovery System

> **One-liner:** A full-stack, AI-powered Lost & Found platform that uses computer vision and vector similarity search to automatically identify and recover lost items through visual semantics — not keywords.

---

## 📌 Project Overview

Universal Recovery System replaces traditional text-based lost-and-found workflows with an intelligent, image-driven matching engine. Users can report lost or found items by uploading photos. The system uses OpenAI's CLIP neural network to convert those images into mathematical vectors (embeddings), stores them in a specialized vector database, and then allows anyone to search by uploading a photo or typing a natural-language description (e.g., *"a black backpack"*). The system performs **cosine similarity** matching across all stored vectors and returns the most visually similar items — even if no textual metadata matches. Users who find a match can then communicate in real-time via a built-in WebSocket-powered chat system.

---

## 🏗️ System Architecture

The project follows an **isolated microservices architecture** distributed across cloud providers. Heavy AI inference is deliberately decoupled from the core API gateway to prevent thread-blocking and allow independent horizontal scaling.

```mermaid
graph TD
    User((User / Browser)) -->|HTTP / WebSockets| Gateway[NestJS Core Backend]
    
    subgraph "Render Cloud · Node.js"
        Gateway -->|Relational Data| PG[(PostgreSQL)]
        Gateway -->|Proxy Image Fetch| Cloudinary[(Cloudinary CDN)]
        Gateway -->|Sessions & Rate Limiting| Redis[(Redis)]
    end
    
    subgraph "Hugging Face Space · Python / PyTorch"
        Gateway -->|REST API with Auth| Vision[FastAPI Vision Service]
        Vision -->|Generate Embedding| CLIP[OpenAI CLIP Model]
        Vision -->|Object Detection| YOLO[YOLOv8 Model]
        Vision -->|Store / Search Vector| Zilliz[(Zilliz Cloud Vector DB)]
    end
```

### Three-Service Breakdown

| Service | Language | Framework | Deployed On |
|---|---|---|---|
| **Web Client** (Presentation Layer) | TypeScript | React 19 + Vite | Render (Static Site) |
| **Core Backend** (API Gateway & Orchestrator) | TypeScript | NestJS 11 | Render (Web Service) |
| **Vision Service** (AI/ML Engine) | Python | FastAPI + PyTorch | Hugging Face Spaces (Docker) |

### Four-Database Strategy

| Database | Type | Purpose |
|---|---|---|
| **PostgreSQL** (Render) | Relational (SQL) | Users, Items, Conversations, Messages — canonical truth |
| **Zilliz Cloud** (Milvus-compatible) | Serverless Vector DB | 512-dimensional CLIP embeddings for similarity search |
| **Cloudinary** | Cloud CDN / Object Storage | Raw image and media file storage |
| **Redis** | In-memory Key-Value | Single-device sessions, JWT revocation, distributed rate limiting |

---

## 🛠️ Complete Tech Stack

### Frontend
- **React 19** — Latest React with concurrent features
- **TypeScript** — Full static type safety
- **Vite 7** — Next-generation build tool with instant HMR
- **TailwindCSS v4** — Utility-first CSS framework (via `@tailwindcss/vite` plugin)
- **React Router v7** — Client-side routing with 10+ routes
- **Axios** — HTTP client with interceptors and credential forwarding
- **Socket.IO Client** — Real-time WebSocket communication
- **Lucide React** — Icon library
- **clsx + tailwind-merge** — Dynamic className composition utilities

### Backend (API Gateway)
- **NestJS 11** — Enterprise-grade Node.js framework with modular architecture
- **TypeORM** — Object-Relational Mapper with entity decorators and migrations
- **PostgreSQL 15** (via `pg` driver) — Primary relational database
- **Passport.js** — Authentication middleware (JWT strategy)
- **@nestjs/jwt** — JSON Web Token signing and verification
- **@nestjs/throttler** — Global and route-specific rate limiting
- **ioredis** — Redis client for session lifecycle management
- **helmet** — Security HTTP header hardening
- **bcrypt** — Password hashing with salted rounds
- **Multer** — Multipart file upload handling with magic-byte validation
- **Cloudinary SDK** — Direct image upload via stream piping
- **Streamifier** — Buffer-to-stream conversion for Cloudinary uploads
- **Nodemailer** — Transactional email (password reset via Gmail SMTP)
- **Socket.IO** — WebSocket server with handshake JWT authentication
- **cookie-parser** — Secure HTTPOnly cookie parsing
- **class-validator + class-transformer** — DTO validation with decorators
- **Axios** — Internal HTTP calls to the Vision Service
- **form-data** — Multipart form construction for inter-service communication

### AI / Vision Service
- **FastAPI** — High-performance async Python web framework
- **PyTorch** — Deep learning tensor computation framework
- **Hugging Face Transformers** — Model loading and inference pipeline
- **OpenAI CLIP** (`clip-vit-base-patch32`) — Vision-Language model for generating 512D embeddings
- **YOLOv8 Nano** (Ultralytics) — Real-time object detection neural network
- **Pillow (PIL)** — Image preprocessing and format conversion
- **NumPy** — Numerical array operations
- **PyMilvus** — Python SDK for Milvus/Zilliz vector database
- **Uvicorn** — ASGI server for production deployment

### DevOps & Infrastructure
- **Docker** — Containerized Vision Service with multi-stage Dockerfile
- **Docker Compose** — Local development orchestration (PostgreSQL, Redis, MinIO, Milvus)
- **Render** — Cloud hosting for backend + frontend + PostgreSQL
- **Hugging Face Spaces** — GPU-enabled hosting for AI inference service
- **render.yaml** — Infrastructure-as-Code deployment blueprint
- **Artillery** — Load testing framework (YAML-based test scenarios)
- **ESLint + Prettier** — Code quality and formatting
- **Jest + Supertest** — Unit and E2E testing framework

---

## 🧠 AI / Machine Learning Concepts

### 1. CLIP (Contrastive Language-Image Pretraining)
- Developed by **OpenAI**, CLIP is a neural network trained on 400 million image-text pairs from the internet
- It learns a **shared embedding space** where images and text can be directly compared
- The model used is `clip-vit-base-patch32` which uses a **Vision Transformer (ViT)** as the image encoder
- Outputs a **512-dimensional float vector** for any input (image or text)
- This enables **cross-modal search**: searching images with text queries and vice versa

### 2. Vector Embeddings & Similarity Search
- Every uploaded image is converted into a **512-dimensional floating-point array** (vector embedding)
- These vectors capture the **semantic meaning** of the image — not pixels, but concepts
- Search is performed using **Inner Product (IP) similarity** on L2-normalized vectors, which is mathematically equivalent to **Cosine Similarity**
- Cosine similarity measures the angle between two vectors in high-dimensional space — smaller angle = more similar
- The formula: `similarity = (A · B) / (||A|| × ||B||)`, range: [-1, 1]

### 3. Vector Normalization
- All CLIP outputs are **L2-normalized** before storage: `vector / ||vector||₂`
- This ensures all vectors lie on a unit hypersphere, making Inner Product equivalent to Cosine Similarity
- Normalization prevents magnitude bias — only direction (semantic meaning) matters

### 4. YOLOv8 Object Detection
- **You Only Look Once (YOLO)** v8 Nano model performs real-time object detection on uploaded images
- Runs at a confidence threshold of 0.25 to maximize detection coverage
- Detected object labels (e.g., "backpack", "phone", "bottle") are appended to the item description
- This enriches the metadata stored alongside each vector for better context

### 5. IVF_FLAT Indexing
- The vector database uses **Inverted File Index with Flat quantization** (IVF_FLAT)
- Vectors are partitioned into 128 clusters (nlist=128) using k-means
- At search time, only the nearest 10 clusters are scanned (nprobe=10), dramatically reducing search time
- This is an **Approximate Nearest Neighbor (ANN)** algorithm — trades minor accuracy for massive speed gains

### 6. Cross-Modal Search
- Because CLIP maps both images and text into the **same 512D vector space**, users can:
  - Upload a **photo** → system generates image embedding → searches against stored image embeddings
  - Type a **text description** → system generates text embedding → searches against stored image embeddings
- This is the key innovation: a text query like *"red umbrella"* will match a photo of a red umbrella even if no text metadata exists

### 7. Filtered Vector Search
- Search queries support boolean metadata filtering (e.g., `is_lost == true`)
- Milvus applies the scalar filter **before** the ANN search, narrowing the candidate set
- This allows users to search specifically for lost items or found items

---

## 🔐 Security & Hardening Architecture

### 1. Cookie-Based JWT & Redis Session Management
- **HttpOnly Secure Cookies:** JWT tokens are stored in `HttpOnly`, `secure: true`, `sameSite: 'none'` cookies, preventing XSS-based credential theft.
- **Fail-Closed Secrets:** Bootstrapping fails immediately if `JWT_SECRET` is unset, preventing predictable signature vulnerabilities.
- **Redis Session Revocation:** Each login assigns a unique `sid` (session ID) stored in Redis. Logout or password reset immediately invalidates the active session across all devices.

### 2. WebSocket Handshake Authentication
- Real-time Socket.IO connections run custom JWT authentication middleware during connection handshake.
- Unauthenticated or forged connection requests are dropped before entering rooms.
- **Server-Derived Identity:** In chat events, `senderId` is resolved exclusively from the verified socket identity rather than client-supplied payloads, preventing impersonation.

### 3. IDOR / BOLA Prevention
- Chat room joining and message history endpoints enforce strict participant membership checks against PostgreSQL records.
- Non-participant attempts to query or post to conversations result in immediate `403 Forbidden` responses.

### 4. File Upload & Magic-Byte Verification
- File uploads are validated through MIME-type checks, a 5MB size limit, and header signature (magic byte) inspection (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF...WEBP`, GIF `GIF87a`/`GIF89a`).
- File extension spoofing is detected and blocked before reaching disk or cloud pipelines.

### 5. SSRF-Hardened Image Proxy
- Cloudinary images are proxied through `/items/image/proxy` to circumvent ISP/tracker blocks.
- URLs are strictly parsed using standard URL parsers, strictly restricting destinations to `https://res.cloudinary.com` and rejecting embedded user credentials.

### 6. CSRF & Network Protection
- CSRF middleware validates custom request headers (`X-Requested-With: XMLHttpRequest`) and whitelisted origins for all mutating HTTP methods (POST, PUT, DELETE, PATCH).
- Global and route-level rate limiting via `ThrottlerModule` mitigates credential stuffing, search saturation, and brute-force token attempts.
- HTTP security headers are enforced via `helmet`. Request body payloads are capped at 1MB to prevent memory exhaustion.
- Internal service-to-service endpoints (`/reset`) require shared secret authentication via `X-Internal-Key`.

---

## 📦 Backend Module Architecture (NestJS)

The backend follows NestJS's **modular architecture pattern** with dependency injection:

### 1. Auth Module
- **Controller:** `/auth/signup`, `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/forgot-password`, `/auth/reset-password`
- **Service:** Handles registration (with duplicate email detection), login (credential verification), JWT signing, session generation, and password reset logic
- **JWT Strategy:** Custom Passport strategy extracting JWTs from cookies with Redis session lookup
- **Email Service:** Nodemailer-based transactional email for password reset links

### 2. Users Module
- **Controller:** `/users/profile` (GET & PUT)
- **Service:** CRUD operations for user entities, profile retrieval, and password updates
- **Entity:** `User` — id, name, email (unique), password (hashed), createdAt

### 3. Items Module
- **Controller:** `/items` (GET all user items), `/items` (POST create), `/items/search` (POST), `/items/image/proxy` (GET), `/items/nuke` (DELETE, admin only)
- **Service:**
  - **Create flow:** Upload image to Cloudinary → Save item to PostgreSQL → Forward image to Vision Service for CLIP embedding + YOLO detection → Store vector in Zilliz
  - **Search flow:** Forward query (image/text) to Vision Service → Receive top-5 vector matches with external IDs → Hydrate results from PostgreSQL using `IN` clause → Return combined results
  - **Proxy flow:** Receives Cloudinary URL, verifies origin, and pipes raw image blob to the client
- **Entity:** `Item` — id, name, description, location, isLost (boolean), imageUrl, userId, detectedObjects (string array), createdAt

### 4. Chat Module
- **Controller:** REST endpoints for creating/retrieving conversations and messages with membership validation
- **Service:**
  - Conversation deduplication using normalized user ID pairs: `[min(a,b), max(a,b)]`
  - Last message preview for inbox display
  - Chronological message retrieval
  - IDOR-safe membership verification
- **WebSocket Gateway:**
  - Room-based architecture: each conversation has a dedicated room (`conversation_{id}`)
  - Handshake JWT middleware validation
  - Server-side verified `senderId` emission
- **Entities:**
  - `Conversation` — id, user1Id, user2Id, createdAt, updatedAt
  - `Message` — id, conversationId, senderId, content (text), createdAt

---

## 🖥️ Frontend Architecture (React)

### Routing (11 Routes)
| Route | Page | Auth Required |
|---|---|---|
| `/` | Home (landing page) | No |
| `/login` | Login form | No |
| `/signup` | Registration form | No |
| `/search` | AI-powered search (text/image) | No |
| `/report-lost` | Report a lost item with image upload | Yes |
| `/report-found` | Report a found item | Yes |
| `/inbox` | Real-time chat inbox | Yes |
| `/profile` | User profile + reported items | Yes |
| `/forgot-password` | Password reset request | No |
| `/reset-password` | Password reset form (token-based) | No |

### State Management
- **AuthContext:** Global authentication state using React Context API. On mount, calls `/auth/me` to check for existing session cookie. Provides `user`, `setUser`, and `loading` to the entire app tree.
- **SocketContext:** Manages Socket.IO lifecycle tied to authentication state. Connects when user is present, disconnects on logout. Provides the socket instance to chat components.

---

## 🔀 Core Data Flow: End-to-End Search Sequence

```mermaid
sequenceDiagram
    participant Client as React Browser
    participant Nest as NestJS Backend
    participant Cloud as Cloudinary
    participant Fast as FastAPI (HF Space)
    participant Zil as Zilliz Vector DB
    participant PG as PostgreSQL

    Client->>Nest: 1. Upload query image or text
    Nest->>Fast: 2. POST /search (multipart form with timeout)
    
    rect rgb(40, 40, 120)
        Note right of Fast: AI Inference Phase
        Fast->>Fast: 3. CLIP generates 512D vector
        Fast->>Fast: 4. L2 normalize the vector
    end

    Fast->>Zil: 5. ANN search with IP metric + is_lost filter
    Zil-->>Fast: 6. Return top 5 matches (IDs + scores)
    Fast-->>Nest: 7. JSON array of {external_id, score}
    
    rect rgb(40, 80, 40)
        Note left of PG: Relational Hydration
        Nest->>PG: 8. SELECT * FROM items WHERE id IN (...)
        PG-->>Nest: 9. Full item records with Cloudinary URLs
    end

    Nest-->>Client: 10. Enriched match results
    Client->>Nest: 11. GET /items/image/proxy?url=cloudinary_url
    Nest->>Cloud: 12. Fetch raw CDN blob (validated domain)
    Cloud-->>Client: 13. Piped image stream renders in UI
```

---

## 🔀 Core Data Flow: Item Registration Sequence

1. **User uploads** an image + metadata (name, description, location, isLost) via the React form
2. **NestJS receives** the multipart request and validates file size, MIME-type, and magic bytes
3. **Cloudinary upload:** Raw image buffer is streamed to Cloudinary's secure upload API, returning a CDN URL
4. **PostgreSQL insert:** A new `Item` record is created with metadata and the Cloudinary URL
5. **Vision Service call:** NestJS posts the file buffer, item ID, description, and `is_lost` flag to FastAPI `/analyze` with a 30-second timeout
6. **YOLO detection:** Vision Service runs YOLOv8 Nano on the image, detecting object classes (>25% confidence)
7. **CLIP embedding:** The image passes through CLIP ViT, producing a 512D tensor which is L2-normalized
8. **Vector storage:** The normalized embedding, PostgreSQL item ID, enriched description, and `is_lost` boolean are inserted into Zilliz Cloud
9. **Metadata update:** Detected labels are saved to `detectedObjects` in PostgreSQL

---

## 🚀 Environment Setup & Deployment

### 1. Local Development with Docker Compose

Four local services can be spun up simultaneously:
```bash
docker-compose up -d
```
- **PostgreSQL 15** — Relational database (`localhost:5432`)
- **Redis 7** — Session storage & rate limit cache (`localhost:6379`)
- **MinIO** — S3-compatible local object store (`localhost:9000` / dashboard `localhost:9001`)
- **Milvus Standalone** — Local vector database (`localhost:19530`)

### 2. Running Services Locally

```bash
# Core Backend
cd apps/core-backend
npm install
npm run build
npm run start:dev

# Vision Service
cd apps/vision-service
pip install -r requirements.txt
python src/main.py

# Web Client
cd apps/web-client
npm install
npm run dev
```

---

## 🧪 Testing & Quality

- **Security Test Suite:** `npm test` runs automated tests for magic-byte file validation, token hashing, and CSRF protection.
- **Backend Unit & E2E Testing:** Jest + Supertest test suites covering controllers and services.
- **Load Testing:** Artillery load scenarios simulating warm-up (2 RPS), sustained traffic (5 RPS), and high-load thresholds.
- **Linting & Code Quality:** ESLint, Prettier, and TypeScript strict compiler checks.

---

## 📈 Hyper-Scale Architecture Blueprint (100K RPS)

The repository includes architectural scaling blueprints for transitioning from prototype to 100,000 requests per second:

1. **Edge Caching (Cloudflare / CloudFront):** Static assets and cached top-K vector search results absorb ~40% of traffic at the CDN layer.
2. **Horizontal API Gateway Scaling:** 50–100 NestJS pods behind Kubernetes Horizontal Pod Autoscaler (HPA) with L7 load balancing.
3. **Asynchronous Event-Driven Pipeline:** Replace synchronous AI calls with **Apache Kafka** message queues — API gateway queues image references and responds with `202 Accepted` immediately.
4. **GPU Worker Fleet:** Auto-scaled FastAPI workers on NVIDIA GPU instances consuming batches from Kafka topics.
5. **Dynamic Inference Batching:** Workers batch up to 64 images simultaneously through the CLIP Vision Transformer, achieving 1000%+ throughput gains.
6. **Database Connection Pooling:** PgBouncer deployed in front of Amazon Aurora PostgreSQL with read replicas.
7. **Distributed Vector Cluster:** Distributed Milvus deployment separating Data Nodes, Index Nodes, and Query Nodes.
8. **WebSocket Scaling:** Redis Pub/Sub adapter to broadcast Socket.IO events across all distributed backend nodes.

---

## 📝 Key Engineering Concepts Used

| Concept | Where Applied |
|---|---|
| **Microservices Architecture** | Three independent services communicating over authenticated HTTP/REST |
| **Vector Embeddings** | CLIP model converts images/text into 512D mathematical representations |
| **Approximate Nearest Neighbor (ANN)** | IVF_FLAT index for sub-millisecond similarity search |
| **Cross-Modal Search** | Text queries match against image embeddings in shared vector space |
| **Cosine Similarity** | Semantic matching via Inner Product on L2-normalized vectors |
| **Object Detection** | YOLOv8 identifies objects in uploaded images for metadata enrichment |
| **JWT & Session Revocation** | Stateless tokens with Redis single-device session tracking |
| **WebSocket (Socket.IO)** | Bidirectional real-time chat with room-based broadcasting and JWT auth |
| **Image Proxy / ISP Bypass** | Backend proxies CDN images to circumvent tracker blocking |
| **Stream Processing** | Buffer-to-stream piping for Cloudinary uploads and image proxying |
| **ORM (TypeORM)** | Declarative entity mapping with automated migrations |
| **DTO Validation** | class-validator decorators for type-safe input validation |
| **Dependency Injection** | NestJS IoC container for modular, testable architecture |
| **Infrastructure as Code** | render.yaml and docker-compose.yml define entire deployment |
| **Multi-Cloud Distribution** | Services span Render, Hugging Face, Zilliz, and Cloudinary |

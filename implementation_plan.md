# System Load Testing & Benchmarking Plan

To find out how many users the system can handle during "rush hour" (peak load), we need to run stress tests against your services. 

However, before we begin testing, I have identified a **critical architectural bottleneck** in your code that will cause the Vision Service to crash or timeout at extremely low traffic (likely < 1 user per second).

## 🚨 Critical Finding: The AI Bottleneck
In `apps/vision-service/src/main.py`, you are defining your routes as `async def` but executing heavy, blocking PyTorch models (`yolo_model`, `clip_processor`) directly inside them. 
Because FastAPI runs on an asynchronous event loop, running a heavy synchronous CPU/GPU task inside an `async def` **blocks the entire server**. If one user uploads an image, the server is completely paralyzed and cannot accept any other users or requests until that image is finished processing. 

**Max capacity prediction:** 1 concurrent user (approx. 0.5 - 1.0 requests per second total).

## Proposed Changes

To accurately test and fix "rush hour" performance, we will proceed in two phases:

### Phase 1: Code Optimization
#### [MODIFY] vision-service/src/main.py
- Refactor the `/analyze` and `/search` endpoints to either be standard synchronous `def` (which allows FastAPI to spawn threadpools automatically) or manually offload the torch inferences to `fastapi.concurrency.run_in_threadpool`. This separates background processing from the API server, immediately multiplying how many users you can handle.

### Phase 2: Load Testing Strategy
#### [NEW] infra/load_test.js (or .py)
We will write a synthetic load testing script using `Locust` (Python) or `Artillery` (Node.js). It will:
1. Send rapid requests to the NestJS Gateway (Authentication & Database lookups) to verify it can handle **1,000+ Requests / Sec**.
2. Bombard the Vision Service `/analyze` endpoint with concurrent multipart file uploads to see exactly when the memory or CPU maxes out.

## User Action Required

> [!CAUTION]
> Your Docker Engine is currently turned off or stopped. I cannot boot PostgreSQL, Redis, MinIO, or Milvus to start the tests.

1. **Please turn on Docker Desktop / start your Docker daemon.**
2. Do you want me to apply the Event Loop Fix to the Vision Service first so that it actually survives the load test?
3. Which tool would you prefer to use for load testing? (I recommend `npx artillery` since it's easy to configure without installing desktop tools).

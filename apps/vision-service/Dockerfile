FROM python:3.10-slim

WORKDIR /app

# Install system dependencies (required for OpenCV in YOLO)
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir pymilvus ultralytics

# HuggingFace expects the app to run as an unprivileged user (UID: 1000)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Copy application files
COPY --chown=user src/ src/
COPY --chown=user yolov8n.pt yolov8n.pt

# Pre-download OpenAI CLIP model to speed up boot times on HF Spaces
RUN python -c "from transformers import CLIPModel, CLIPProcessor; CLIPModel.from_pretrained('openai/clip-vit-base-patch32'); CLIPProcessor.from_pretrained('openai/clip-vit-base-patch32')"

# Expose port required by HuggingFace Spaces
EXPOSE 7860

# Run the API
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "7860"]

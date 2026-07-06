FROM python:3.10-slim AS backend-runner
WORKDIR /app

# Install system utilities needed for package builds
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend codebase
COPY backend/ ./backend/

# Copy pre-compiled frontend assets directly from host
COPY dist/ ./dist/

# Set production env parameters
ENV PORT=8080
ENV USE_PYTHON_BACKEND=true
ENV PYTHONUNBUFFERED=1

EXPOSE 8080

CMD uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT}

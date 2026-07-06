#!/bin/bash

# ==============================================================================
# CommunityOS - Single-Terminal Unified Runner (Linux/macOS)
# ==============================================================================

# Colors for elegant CLI output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Trap interrupt (Ctrl+C) and terminate both services cleanly
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down CommunityOS services...${NC}"
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
    echo -e "${GREEN}All services successfully stopped.${NC}"
    exit 0
}

trap cleanup INT TERM

echo -e "${BLUE}========================================================================${NC}"
echo -e "${GREEN}                     Starting CommunityOS Platform!${NC}"
echo -e "${BLUE}========================================================================${NC}"

# Check for .env file
if [ ! -f .env ]; then
    echo "Warning: .env file not found. Copying defaults from .env.example..."
    cp .env.example .env
fi

# Activate virtual environment if it exists
if [ -d .venv ]; then
    source .venv/bin/activate
else
    echo -e "${YELLOW}Warning: .venv directory not found. Please run './setup.sh' first.${NC}"
    echo "Attempting to run using system python packages..."
fi

# 1. Start Python FastAPI Backend on port 8000
echo -e "${BLUE}[1/2] Starting FastAPI Backend (http://localhost:8000)...${NC}"
export USE_PYTHON_BACKEND=true
uvicorn main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

# Give backend a moment to start
sleep 2

# 2. Start React/Vite Frontend
echo -e "${BLUE}[2/2] Starting Vite Frontend (http://localhost:3000)...${NC}"
npm run dev &
FRONTEND_PID=$!

echo -e "${GREEN}========================================================================${NC}"
echo -e "CommunityOS is fully operational!"
echo -e "  - Frontend: ${GREEN}http://localhost:3000${NC}"
echo -e "  - Backend:  ${GREEN}http://localhost:8000${NC}"
echo -e "Press ${YELLOW}Ctrl+C${NC} in this window to stop both services cleanly."
echo -e "${BLUE}========================================================================${NC}"

# Wait on background processes to allow Ctrl+C trap to catch
wait

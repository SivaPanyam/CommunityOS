#!/bin/bash

# ==============================================================================
# CommunityOS - Local Environment Setup Script (Linux/macOS)
# ==============================================================================

# Colors for elegant CLI output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================================================${NC}"
echo -e "${GREEN}                  Welcome to CommunityOS Local Setup!${NC}"
echo -e "${BLUE}========================================================================${NC}"
echo "This script will configure your local environment and install all dependencies."
echo ""

# Helper to check commands
check_command() {
    command -v "$1" >/dev/null 2>&1
}

# 1. System Requirements Verification
echo -e "${BLUE}[1/5] Checking system prerequisites...${NC}"

if check_command node; then
    NODE_VER=$(node -v)
    echo -e "  - Node.js: ${GREEN}Installed (${NODE_VER})${NC}"
else
    echo -e "  - ${RED}Error: Node.js is not installed. Please install Node.js (v18+).${NC}"
    exit 1
fi

if check_command npm; then
    NPM_VER=$(npm -v)
    echo -e "  - NPM:     ${GREEN}Installed (${NPM_VER})${NC}"
else
    echo -e "  - ${RED}Error: NPM is not installed. Please install NPM.${NC}"
    exit 1
fi

if check_command python3; then
    PYTHON_VER=$(python3 --version)
    echo -e "  - Python3: ${GREEN}Installed (${PYTHON_VER})${NC}"
elif check_command python; then
    PYTHON_VER=$(python --version)
    echo -e "  - Python:  ${GREEN}Installed (${PYTHON_VER})${NC}"
else
    echo -e "  - ${RED}Error: Python 3 is not installed. Please install Python (3.9+).${NC}"
    exit 1
fi

# Determine appropriate python executable name
PYTHON_CMD="python3"
if ! check_command python3 && check_command python; then
    PYTHON_CMD="python"
fi

echo ""

# 2. Environment Variables Configuration
echo -e "${BLUE}[2/5] Configuring environment variables...${NC}"
if [ ! -f .env ]; then
    echo "Creating local .env file from .env.example..."
    cp .env.example .env
    echo -e "  - .env file: ${GREEN}Created!${NC}"
    echo "Tip: You can edit '.env' directly to configure your GEMINI_API_KEY."
else
    echo -e "  - .env file: ${YELLOW}Already exists. Skipping creation.${NC}"
fi
echo ""

# 3. Backend Dependency Setup (Virtual Environment)
echo -e "${BLUE}[3/5] Setting up Python virtual environment & backend dependencies...${NC}"
if [ ! -d .venv ]; then
    echo "Creating Python virtual environment (.venv)..."
    $PYTHON_CMD -m venv .venv
    echo -e "  - Virtual Environment: ${GREEN}Created (.venv)${NC}"
else
    echo -e "  - Virtual Environment: ${YELLOW}Already exists (.venv)${NC}"
fi

# Activate venv and install requirements
echo "Installing Python packages from requirements.txt..."
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo -e "  - Python dependencies: ${GREEN}Successfully installed!${NC}"
else
    echo -e "  - ${RED}Error installing Python packages. Please check logs and retry.${NC}"
    exit 1
fi
deactivate
echo ""

# 4. Frontend Dependency Setup
echo -e "${BLUE}[4/5] Installing React frontend dependencies...${NC}"
echo "Running 'npm install' in project root..."
npm install

if [ $? -eq 0 ]; then
    echo -e "  - Node dependencies: ${GREEN}Successfully installed!${NC}"
else
    echo -e "  - ${RED}Error running 'npm install'. Please check logs and retry.${NC}"
    exit 1
fi
echo ""

# 5. Success Summary & Run Instructions
echo -e "${BLUE}[5/5] Setup complete!${NC}"
echo -e "${GREEN}========================================================================${NC}"
echo -e "         ${GREEN}CommunityOS is ready for local launch!${NC}"
echo -e "${GREEN}========================================================================${NC}"
echo ""
echo "You have two ways to run the application:"
echo ""
echo -e "Option A: RUNNING MANUALLY (Native Dual-Process)"
echo "--------------------------------------------------------"
echo "  1. Start the Python Backend:"
echo -e "     ${BLUE}source .venv/bin/activate${NC}"
echo -e "     ${BLUE}uvicorn main:app --reload${NC}"
echo ""
echo "  2. Start the Frontend (In a separate terminal):"
echo -e "     ${BLUE}npm run dev${NC}"
echo ""
echo -e "Option B: DOCKER COMPOSE (Single Command)"
echo "--------------------------------------------------------"
echo -e "  Run the entire stack in isolated containers:"
echo -e "     ${BLUE}docker-compose up --build${NC}"
echo ""
echo "You can also use the startup script: './start.sh'"
echo -e "${BLUE}========================================================================${NC}"

# ==============================================================================
# CommunityOS - Local Environment Setup Script (Windows PowerShell)
# ==============================================================================

Write-Host "========================================================================" -ForegroundColor Blue
Write-Host "                  Welcome to CommunityOS Local Setup!" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Blue
Write-Host "This script will configure your local environment and install all dependencies."
Write-Host ""

# 1. System Requirements Verification
Write-Host "[1/5] Checking system prerequisites..." -ForegroundColor Blue

# Check Node.js
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCheck) {
    $nodeVer = & node -v
    Write-Host "  - Node.js: Installed ($nodeVer)" -ForegroundColor Green
} else {
    Write-Host "  - Error: Node.js is not installed. Please install Node.js (v18+)." -ForegroundColor Red
    Exit
}

# Check NPM
$npmCheck = Get-Command npm -ErrorAction SilentlyContinue
if ($npmCheck) {
    $npmVer = & npm -v
    Write-Host "  - NPM:     Installed ($npmVer)" -ForegroundColor Green
} else {
    Write-Host "  - Error: NPM is not installed. Please install NPM." -ForegroundColor Red
    Exit
}

# Check Python 3
$pythonCheck = Get-Command python -ErrorAction SilentlyContinue
if ($pythonCheck) {
    $pythonVer = & python --version
    Write-Host "  - Python:  Installed ($pythonVer)" -ForegroundColor Green
} else {
    Write-Host "  - Error: Python is not installed. Please install Python (3.9+)." -ForegroundColor Red
    Exit
}

Write-Host ""

# 2. Environment Variables Configuration
Write-Host "[2/5] Configuring environment variables..." -ForegroundColor Blue
if (-not (Test-Path .env)) {
    Write-Host "Creating local .env file from .env.example..."
    Copy-Item .env.example .env
    Write-Host "  - .env file: Created!" -ForegroundColor Green
    Write-Host "Tip: You can edit '.env' directly to configure your GEMINI_API_KEY."
} else {
    Write-Host "  - .env file: Already exists. Skipping creation." -ForegroundColor Yellow
}
Write-Host ""

# 3. Backend Dependency Setup (Virtual Environment)
Write-Host "[3/5] Setting up Python virtual environment & backend dependencies..." -ForegroundColor Blue
if (-not (Test-Path .venv)) {
    Write-Host "Creating Python virtual environment (.venv)..."
    & python -m venv .venv
    Write-Host "  - Virtual Environment: Created (.venv)" -ForegroundColor Green
} else {
    Write-Host "  - Virtual Environment: Already exists (.venv)" -ForegroundColor Yellow
}

# Activate and install dependencies
Write-Host "Installing Python packages from requirements.txt..."
& .venv\Scripts\pip.exe install --upgrade pip
& .venv\Scripts\pip.exe install -r requirements.txt

if ($LASTEXITCODE -eq 0) {
    Write-Host "  - Python dependencies: Successfully installed!" -ForegroundColor Green
} else {
    Write-Host "  - Error installing Python packages. Please check logs and retry." -ForegroundColor Red
    Exit
}
Write-Host ""

# 4. Frontend Dependency Setup
Write-Host "[4/5] Installing React frontend dependencies..." -ForegroundColor Blue
Write-Host "Running 'npm install' in project root..."
& npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "  - Node dependencies: Successfully installed!" -ForegroundColor Green
} else {
    Write-Host "  - Error running 'npm install'. Please check logs and retry." -ForegroundColor Red
    Exit
}
Write-Host ""

# 5. Success Summary & Run Instructions
Write-Host "[5/5] Setup complete!" -ForegroundColor Blue
Write-Host "========================================================================" -ForegroundColor Green
Write-Host "         CommunityOS is ready for local launch!" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "You have two ways to run the application:"
Write-Host ""
Write-Host "Option A: RUNNING MANUALLY (Native Dual-Process)"
Write-Host "--------------------------------------------------------"
Write-Host "  1. Start the Python Backend:"
Write-Host "     Active virtual environment and run uvicorn:" -ForegroundColor Gray
Write-Host "     .venv\Scripts\activate.ps1" -ForegroundColor Cyan
Write-Host "     uvicorn main:app --reload" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. Start the Frontend (In a separate terminal):"
Write-Host "     npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option B: DOCKER COMPOSE (Single Command)"
Write-Host "--------------------------------------------------------"
Write-Host "  Run the entire stack in isolated containers:"
Write-Host "     docker-compose up --build" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can also use the startup script: '.\start.ps1'" -ForegroundColor Yellow
Write-Host "========================================================================" -ForegroundColor Blue

# ==============================================================================
# CommunityOS - Single-Terminal Unified Runner (Windows PowerShell)
# ==============================================================================

# Setup termination cleanup
$processes = @()

function Cleanup {
    Write-Host ""
    Write-Host "Shutting down CommunityOS services..." -ForegroundColor Yellow
    foreach ($p in $processes) {
        if ($p -and -not $p.HasExited) {
            Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
        }
    }
    Write-Host "All services successfully stopped." -ForegroundColor Green
}

# Trap Ctrl+C cleanly
$originalDTE = [console]::TreatControlCAsInput
[console]::TreatControlCAsInput = $true

Write-Host "========================================================================" -ForegroundColor Blue
Write-Host "                     Starting CommunityOS Platform!" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Blue

# Verify .env
if (-not (Test-Path .env)) {
    Write-Host "Warning: .env file not found. Copying defaults from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
}

# Set env flag so dev server knows we want local standalone Vite + Proxy
$env:USE_PYTHON_BACKEND = "true"

# Determine python/pip commands
$pipPath = ".venv\Scripts\pip.exe"
$uvicornCmd = "uvicorn"
if (Test-Path ".venv\Scripts\uvicorn.exe") {
    $uvicornCmd = ".venv\Scripts\uvicorn.exe"
}

# 1. Start Python FastAPI Backend on port 8000
Write-Host "[1/2] Starting FastAPI Backend (http://localhost:8000)..." -ForegroundColor Blue
$backendProcess = Start-Process -FilePath $uvicornCmd -ArgumentList "main:app --host 127.0.0.1 --port 8000 --reload" -PassThru -NoNewWindow
$processes += $backendProcess

Start-Sleep -Seconds 2

# 2. Start React/Vite Frontend
Write-Host "[2/2] Starting Vite Frontend (http://localhost:3000)..." -ForegroundColor Blue
$frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run dev" -PassThru -NoNewWindow
$processes += $frontendProcess

Write-Host "========================================================================" -ForegroundColor Green
Write-Host "CommunityOS is fully operational!"
Write-Host "  - Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "  - Backend:  http://localhost:8000" -ForegroundColor Green
Write-Host "Press Ctrl+C in this console window to stop all services cleanly."
Write-Host "========================================================================" -ForegroundColor Blue

# Simple pooling loop checking for key interrupt
try {
    while ($true) {
        if ([console]::KeyAvailable) {
            $key = [console]::ReadKey($true)
            if ($key.Modifiers -eq "Control" -and $key.Key -eq "C") {
                break
            }
        }
        # Check if subprocesses exited early
        if ($backendProcess.HasExited -or $frontendProcess.HasExited) {
            Write-Host "Warning: One of the processes terminated unexpectedly." -ForegroundColor Red
            break
        }
        Start-Sleep -Milliseconds 250
    }
} finally {
    Cleanup
    [console]::TreatControlCAsInput = $originalDTE
}

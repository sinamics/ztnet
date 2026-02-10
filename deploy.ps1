# ZTNET Docker Deployment Script for Windows PowerShell
# Run this script: .\deploy.ps1

param(
    [Parameter()]
    [ValidateSet("prebuilt", "custom", "stop", "logs", "status")]
    [string]$Action
)

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green" 
    Yellow = "Yellow"
    Blue = "Cyan"
}

function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Colors.Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Colors.Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Colors.Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Colors.Red
}

function Test-Dependencies {
    Write-Status "Checking dependencies..."
    
    # Check Docker
    try {
        docker --version | Out-Null
    }
    catch {
        Write-Error "Docker is not installed. Please install Docker Desktop first."
        exit 1
    }
    
    # Check Docker Compose
    try {
        docker-compose --version | Out-Null
    }
    catch {
        try {
            docker compose version | Out-Null
        }
        catch {
            Write-Error "Docker Compose is not available. Please install Docker Compose."
            exit 1
        }
    }
    
    Write-Success "Dependencies check passed!"
}

function Deploy-Prebuilt {
    Write-Status "Deploying ZTNET with pre-built image..."
    
    # Check .env.production
    if (-not (Test-Path ".env.production")) {
        Write-Warning ".env.production not found. Please create it first!"
        Write-Status "You can copy from .env.production template and modify the values."
        return
    }
    
    # Deploy
    Write-Status "Starting services..."
    docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
    
    Write-Success "ZTNET deployed successfully!"
    Write-Status "Access your ZTNET at: http://localhost:3000"
}

function Deploy-Custom {
    Write-Status "Building and deploying ZTNET from source..."
    
    # Check .env.production  
    if (-not (Test-Path ".env.production")) {
        Write-Warning ".env.production not found. Please create it first!"
        return
    }
    
    # Build and deploy
    Write-Status "Building custom image (this may take a few minutes)..."
    docker-compose -f docker-compose.custom.yml --env-file .env.production build
    
    Write-Status "Starting services..."
    docker-compose -f docker-compose.custom.yml --env-file .env.production up -d
    
    Write-Success "Custom ZTNET deployed successfully!"
    Write-Status "Access your ZTNET at: http://localhost:3000"
}

function Stop-Services {
    Write-Status "Stopping ZTNET services..."
    
    try { docker-compose -f docker-compose.prod.yml down 2>$null } catch { }
    try { docker-compose -f docker-compose.custom.yml down 2>$null } catch { }
    
    Write-Success "Services stopped!"
}

function Show-Logs {
    Write-Status "Showing ZTNET logs..."
    Write-Status "Press Ctrl+C to exit logs"
    Start-Sleep 2
    
    $containers = docker ps --format "{{.Names}}" | Where-Object { $_ -match "ztnet-app" }
    
    if ($containers) {
        $container = $containers[0]
        docker logs -f $container
    }
    else {
        Write-Error "No ZTNET container found running!"
    }
}

function Show-Status {
    Write-Status "ZTNET Services Status:"
    Write-Host ""
    
    $containers = docker ps --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}" | Where-Object { $_ -match "(ztnet|postgres|zerotier)" }
    
    if ($containers) {
        $containers | ForEach-Object { Write-Host $_ }
    }
    else {
        Write-Warning "No ZTNET containers found!"
    }
}

function Show-Menu {
    Write-Host ""
    Write-Host "🐳 ZTNET Docker Deployment" -ForegroundColor Cyan
    Write-Host "==========================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Available commands:"
    Write-Host "  .\deploy.ps1 prebuilt  - Deploy with pre-built image (recommended)"
    Write-Host "  .\deploy.ps1 custom    - Build and deploy from source"  
    Write-Host "  .\deploy.ps1 stop      - Stop all services"
    Write-Host "  .\deploy.ps1 logs      - Show logs"
    Write-Host "  .\deploy.ps1 status    - Show container status"
    Write-Host ""
}

# Main execution
Test-Dependencies

if (-not $Action) {
    Show-Menu
    
    while ($true) {
        $choice = Read-Host "Enter action (prebuilt/custom/stop/logs/status/exit)"
        
        switch ($choice.ToLower()) {
            "prebuilt" { Deploy-Prebuilt; break }
            "custom" { Deploy-Custom; break }
            "stop" { Stop-Services; break }
            "logs" { Show-Logs; break }
            "status" { Show-Status; break }
            "exit" { Write-Status "Goodbye!"; exit 0 }
            default { Write-Error "Invalid choice. Please try again." }
        }
        
        Write-Host ""
        Read-Host "Press Enter to continue"
        Show-Menu
    }
}
else {
    switch ($Action.ToLower()) {
        "prebuilt" { Deploy-Prebuilt }
        "custom" { Deploy-Custom }
        "stop" { Stop-Services }
        "logs" { Show-Logs }
        "status" { Show-Status }
        default { Write-Error "Invalid action: $Action" }
    }
}
# ZTNET VPS Management Script
# Usage: .\manage-vps.ps1 -VpsHost "192.168.1.100" -VpsUser "root" -Action "status"

param(
    [Parameter(Mandatory=$true)]
    [string]$VpsHost,
    
    [Parameter(Mandatory=$true)]
    [string]$VpsUser,
    
    [Parameter(Mandatory=$true)]
    [ValidateSet("status", "logs", "restart", "stop", "update", "backup", "shell")]
    [string]$Action,
    
    [Parameter()]
    [string]$VpsPort = "22",
    
    [Parameter()]
    [string]$DeployPath = "/home/$VpsUser/ztnet"
)

# Colors
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Cyan"
}

function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor $Colors.Blue }
function Write-Success { param($msg) Write-Host "[SUCCESS] $msg" -ForegroundColor $Colors.Green }
function Write-Warning { param($msg) Write-Host "[WARNING] $msg" -ForegroundColor $Colors.Yellow }
function Write-Error { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor $Colors.Red }

function Execute-SSH {
    param([string]$Command)
    
    $sshCmd = "ssh -p $VpsPort $VpsUser@$VpsHost '$Command'"
    try {
        Invoke-Expression $sshCmd
    }
    catch {
        Write-Error "SSH command failed: $_"
        exit 1
    }
}

function Show-Status {
    Write-Info "📊 ZTNET Status on VPS"
    Write-Info "======================="
    
    $statusCmd = @"
cd $DeployPath && \\
echo '🐳 Docker containers:' && \\
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' && \\
echo '' && \\
echo '💾 Disk usage:' && \\
df -h $DeployPath && \\
echo '' && \\
echo '🧠 Memory usage:' && \\
free -h && \\
echo '' && \\
echo '🔗 Application URL: http://\$(curl -s ifconfig.me):3000'
"@

    Execute-SSH -Command $statusCmd
}

function Show-Logs {
    Write-Info "📝 ZTNET Application Logs"
    Write-Info "=========================="
    
    $logsCmd = "cd $DeployPath && docker logs ztnet-app-custom --tail 50 -f"
    
    Write-Info "Showing last 50 lines (Press Ctrl+C to exit)..."
    Execute-SSH -Command $logsCmd
}

function Restart-Services {
    Write-Info "🔄 Restarting ZTNET services..."
    
    $restartCmd = @"
cd $DeployPath && \\
echo '⏹ Stopping services...' && \\
docker-compose -f docker-compose.custom.yml down && \\
echo '▶ Starting services...' && \\
docker-compose -f docker-compose.custom.yml --env-file .env.production up -d && \\
echo '⏳ Waiting for startup...' && \\
sleep 20 && \\
docker ps && \\
echo '✅ Restart completed!'
"@

    Execute-SSH -Command $restartCmd
}

function Stop-Services {
    Write-Info "⏹ Stopping ZTNET services..."
    
    $stopCmd = @"
cd $DeployPath && \\
docker-compose -f docker-compose.custom.yml down && \\
echo '✅ Services stopped!'
"@

    Execute-SSH -Command $stopCmd
}

function Update-Application {
    Write-Info "🔄 Updating ZTNET application..."
    
    # First, prepare files locally
    Write-Info "Preparing update files..."
    $tempDir = ".\update-temp"
    if (Test-Path $tempDir) {
        Remove-Item -Recurse -Force $tempDir
    }
    New-Item -ItemType Directory -Path $tempDir | Out-Null
    
    # Copy source files
    $updateFiles = @("src", "public", "prisma", "package.json", "Dockerfile")
    foreach ($item in $updateFiles) {
        if (Test-Path $item) {
            Copy-Item -Recurse $item $tempDir -Force
            Write-Info "✓ Prepared $item"
        }
    }
    
    # Upload to VPS
    Write-Info "Uploading updated files..."
    $uploadCmd = "scp -r -P $VpsPort $tempDir/* $VpsUser@$VpsHost:$DeployPath/"
    Invoke-Expression $uploadCmd
    
    # Rebuild and restart on VPS
    $updateCmd = @"
cd $DeployPath && \\
echo '🏗 Rebuilding application...' && \\
docker-compose -f docker-compose.custom.yml down && \\
docker-compose -f docker-compose.custom.yml --env-file .env.production build --no-cache && \\
echo '🚀 Starting updated services...' && \\
docker-compose -f docker-compose.custom.yml --env-file .env.production up -d && \\
echo '⏳ Waiting for startup...' && \\
sleep 30 && \\
docker ps && \\
echo '✅ Update completed!'
"@

    Execute-SSH -Command $updateCmd
    
    # Cleanup
    Remove-Item -Recurse -Force $tempDir
    Write-Success "Update completed!"
}

function Backup-Data {
    Write-Info "💾 Creating ZTNET backup..."
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupCmd = @"
cd $DeployPath && \\
echo '📦 Creating backup...' && \\
mkdir -p backups && \\
docker exec ztnet-postgres-custom pg_dump -U postgres ztnet > backups/db-backup-$timestamp.sql && \\
tar -czf backups/code-backup-$timestamp.tar.gz src public prisma docker-compose.custom.yml .env.production && \\
echo '✅ Backup created:' && \\
ls -la backups/
"@

    Execute-SSH -Command $backupCmd
    
    Write-Success "Backup completed! Files saved in $DeployPath/backups/"
}

function Open-Shell {
    Write-Info "🐚 Opening SSH shell to VPS..."
    Write-Info "Type 'exit' to return to Windows"
    Write-Info "Current directory: $DeployPath"
    
    $shellCmd = "ssh -t -p $VpsPort $VpsUser@$VpsHost 'cd $DeployPath && exec bash'"
    Invoke-Expression $shellCmd
}

# Main execution
Write-Info "🛠 ZTNET VPS Management"
Write-Info "Target: $VpsUser@$VpsHost:$VpsPort"
Write-Info "Path: $DeployPath"
Write-Info ""

switch ($Action) {
    "status" { Show-Status }
    "logs" { Show-Logs }
    "restart" { Restart-Services }
    "stop" { Stop-Services }
    "update" { Update-Application }
    "backup" { Backup-Data }
    "shell" { Open-Shell }
}

Write-Info ""
Write-Info "Management completed!"
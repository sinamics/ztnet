# ZTNET VPS Manager - PowerShell Script
# Usage: .\ztnet-manager.ps1 -Action <action> -VpsHost <ip> -VpsUser <user>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("deploy", "redeploy", "status", "logs", "restart", "stop", "start", "update-env", "update-code", "backup", "shell", "health")]
    [string]$Action,
    
    [Parameter(Mandatory=$true)]
    [string]$VpsHost,
    
    [Parameter(Mandatory=$true)]
    [string]$VpsUser,
    
    [Parameter()]
    [string]$VpsPort = "22",
    
    [Parameter()]
    [string]$DeployPath = "/opt/ztnet"
)

# Colors
function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "[SUCCESS] $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "[WARNING] $msg" -ForegroundColor Yellow }
function Write-ErrorMsg { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }

function Execute-SSH {
    param([string]$Command)
    $sshCmd = "ssh -p $VpsPort $VpsUser@$VpsHost '$Command'"
    try {
        Invoke-Expression $sshCmd
    }
    catch {
        Write-ErrorMsg "SSH command failed: $_"
        exit 1
    }
}

function Deploy-Application {
    Write-Info "🚀 Starting full deployment..."
    .\deploy-remote.ps1 -VpsHost $VpsHost -VpsUser $VpsUser -VpsPort $VpsPort
}

function Redeploy-Application {
    Write-Info "🔄 Redeploying application..."
    
    # Upload source code
    Write-Info "Uploading updated source code..."
    $uploadCmd = "scp -r -P $VpsPort src public prisma package.json $VpsUser@$VpsHost`:$DeployPath/"
    Invoke-Expression $uploadCmd
    
    # Rebuild and restart
    $redeployCmd = "cd $DeployPath && docker-compose -f docker-compose.simple.yml up -d --build"
    Execute-SSH -Command $redeployCmd
    
    Write-Success "✅ Redeploy completed!"
}

function Show-Status {
    Write-Info "📊 ZTNET Application Status"
    Write-Info "==========================="
    
    $statusCmd = @"
echo '🐳 Docker containers:' && \
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'NAMES|ztnet' && \
echo '' && \
echo '💾 Disk usage:' && \
df -h $DeployPath && \
echo '' && \
echo '🧠 Memory usage:' && \
free -h && \
echo '' && \
echo '🌐 Application health:' && \
curl -s -o /dev/null -w 'HTTP Status: %{http_code}\n' http://localhost:3000 2>/dev/null || echo 'Service not responding'
"@

    Execute-SSH -Command $statusCmd
}

function Show-Logs {
    Write-Info "📝 ZTNET Application Logs"
    Write-Info "=========================="
    Write-Info "Showing last 50 lines (Press Ctrl+C to exit)..."
    
    $logsCmd = "docker logs ztnet-app-simple --tail 50 -f"
    Execute-SSH -Command $logsCmd
}

function Restart-Services {
    Write-Info "🔄 Restarting ZTNET services..."
    
    $restartCmd = @"
cd $DeployPath && \
echo '⏹ Stopping services...' && \
docker-compose -f docker-compose.simple.yml down && \
echo '▶ Starting services...' && \
docker-compose -f docker-compose.simple.yml up -d && \
echo '⏳ Waiting for startup...' && \
sleep 15 && \
docker ps | grep ztnet && \
echo '✅ Restart completed!'
"@

    Execute-SSH -Command $restartCmd
}

function Stop-Services {
    Write-Info "⏹ Stopping ZTNET services..."
    
    $stopCmd = "cd $DeployPath && docker-compose -f docker-compose.simple.yml down"
    Execute-SSH -Command $stopCmd
    
    Write-Success "✅ Services stopped!"
}

function Start-Services {
    Write-Info "▶ Starting ZTNET services..."
    
    $startCmd = "cd $DeployPath && docker-compose -f docker-compose.simple.yml up -d"
    Execute-SSH -Command $startCmd
    
    Write-Success "✅ Services started!"
}

function Update-Environment {
    Write-Info "⚙️ Updating environment variables..."
    
    if (Test-Path ".env.production") {
        $uploadCmd = "scp -P $VpsPort .env.production $VpsUser@$VpsHost`:$DeployPath/"
        Invoke-Expression $uploadCmd
        
        $restartCmd = "cd $DeployPath && docker-compose -f docker-compose.simple.yml restart"
        Execute-SSH -Command $restartCmd
        
        Write-Success "✅ Environment updated and services restarted!"
    } else {
        Write-ErrorMsg "❌ .env.production file not found!"
    }
}

function Update-Code {
    Write-Info "📦 Updating source code only..."
    
    # Upload source directories
    $uploadCmd = "scp -r -P $VpsPort src public $VpsUser@$VpsHost`:$DeployPath/"
    Invoke-Expression $uploadCmd
    
    # Rebuild container
    $rebuildCmd = @"
cd $DeployPath && \
echo '🔨 Rebuilding application...' && \
docker-compose -f docker-compose.simple.yml build ztnet-app && \
echo '🚀 Restarting with new code...' && \
docker-compose -f docker-compose.simple.yml up -d
"@

    Execute-SSH -Command $rebuildCmd
    
    Write-Success "✅ Code updated and deployed!"
}

function Backup-Data {
    Write-Info "💾 Creating application backup..."
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupCmd = @"
cd $DeployPath && \
echo '📦 Creating backup archive...' && \
mkdir -p backups && \
tar -czf backups/ztnet-backup-$timestamp.tar.gz \
  docker-compose.simple.yml \
  Dockerfile.simple \
  .env.production \
  src public prisma && \
echo '✅ Backup created: backups/ztnet-backup-$timestamp.tar.gz' && \
ls -la backups/
"@

    Execute-SSH -Command $backupCmd
    
    Write-Success "💾 Backup completed!"
}

function Open-Shell {
    Write-Info "🐚 Opening SSH shell to VPS..."
    Write-Info "You will be connected to: $VpsUser@$VpsHost"
    Write-Info "Working directory: $DeployPath"
    Write-Info "Type 'exit' to return to Windows PowerShell"
    Write-Info ""
    
    $shellCmd = "ssh -t -p $VpsPort $VpsUser@$VpsHost 'cd $DeployPath && exec bash'"
    Invoke-Expression $shellCmd
}

function Health-Check {
    Write-Info "🏥 Performing health check..."
    
    $healthCmd = @"
echo '🔍 Service status:' && \
docker ps | grep ztnet-app-simple && \
echo '' && \
echo '🌐 HTTP health check:' && \
curl -s -o /dev/null -w 'Response time: %{time_total}s\nHTTP Status: %{http_code}\n' http://localhost:3000 && \
echo '' && \
echo '💾 Container stats:' && \
docker stats ztnet-app-simple --no-stream --format 'CPU: {{.CPUPerc}}\tMemory: {{.MemUsage}}'
"@

    Execute-SSH -Command $healthCmd
}

# Main execution
Write-Info "🛠 ZTNET VPS Manager"
Write-Info "Target: $VpsUser@$VpsHost`:$VpsPort"
Write-Info "Action: $Action"
Write-Info ""

switch ($Action) {
    "deploy" { Deploy-Application }
    "redeploy" { Redeploy-Application }
    "status" { Show-Status }
    "logs" { Show-Logs }
    "restart" { Restart-Services }
    "stop" { Stop-Services }
    "start" { Start-Services }
    "update-env" { Update-Environment }
    "update-code" { Update-Code }
    "backup" { Backup-Data }
    "shell" { Open-Shell }
    "health" { Health-Check }
}

Write-Info ""
Write-Success "🎉 Operation completed!"
Write-Info "Access your ZTNET at: http://$VpsHost`:3000"
param(
    [Parameter(Mandatory=$true)]
    [string]$VpsHost,
    
    [Parameter(Mandatory=$true)] 
    [string]$VpsUser,
    
    [Parameter()]
    [string]$VpsPort = "22",
    
    [Parameter()]
    [string]$DeployPath = "/home/$VpsUser/ztnet"
)

function Write-Info { 
    param($msg) 
    Write-Host "[INFO] $msg" -ForegroundColor Cyan
}

function Write-Success { 
    param($msg) 
    Write-Host "[SUCCESS] $msg" -ForegroundColor Green
}

function Write-Warning { 
    param($msg) 
    Write-Host "[WARNING] $msg" -ForegroundColor Yellow
}

function Write-ErrorMsg { 
    param($msg) 
    Write-Host "[ERROR] $msg" -ForegroundColor Red
}

Write-Info "ZTNET Remote Deployment to VPS"
Write-Info "Target: $VpsUser@$VpsHost"
Write-Info "Deploy Path: $DeployPath"

# Test SSH connection
Write-Info "Testing SSH connection..."
try {
    $testResult = ssh -o ConnectTimeout=10 -p $VpsPort $VpsUser@$VpsHost "echo 'Connection OK'"
    if ($testResult -match "Connection OK") {
        Write-Success "SSH connection successful!"
    } else {
        Write-ErrorMsg "SSH connection failed!"
        Write-Info "Please check: VPS accessible, SSH key configured, port $VpsPort open"
        exit 1
    }
} catch {
    Write-ErrorMsg "Cannot connect to VPS!"
    exit 1
}

# Create deployment directory
Write-Info "Preparing files..."
$tempDir = ".\deploy-temp"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy files
$files = @("docker-compose.simple.yml", "Dockerfile.simple", ".env.production", "package.json", "package-lock.json", "next.config.mjs", "tailwind.config.cjs", "tsconfig.json")
foreach ($file in $files) {
    if (Test-Path $file) {
        Copy-Item $file $tempDir -Force
        Write-Info "Copied $file"
    }
}

# Copy directories  
$dirs = @("src", "public", "prisma")
foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        Copy-Item -Recurse $dir $tempDir -Force
        Write-Info "Copied $dir"
    }
}

# Create deployment directory on VPS
Write-Info "Creating deployment directory on VPS..."
ssh -p $VpsPort $VpsUser@$VpsHost "mkdir -p $DeployPath"

# Upload files
Write-Info "Uploading files to VPS..."
scp -r -P $VpsPort "$tempDir/*" "$VpsUser@$VpsHost`:$DeployPath/"

# Install Docker if needed
Write-Info "Checking Docker installation..."
$dockerCheck = ssh -p $VpsPort $VpsUser@$VpsHost "docker --version 2>/dev/null || echo 'NOT_FOUND'"
if ($dockerCheck -match "NOT_FOUND") {
    Write-Info "Installing Docker..."
    ssh -p $VpsPort $VpsUser@$VpsHost "curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh"
    ssh -p $VpsPort $VpsUser@$VpsHost "sudo usermod -aG docker $VpsUser"
    ssh -p $VpsPort $VpsUser@$VpsHost "sudo curl -L 'https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-Linux-x86_64' -o /usr/local/bin/docker-compose"
    ssh -p $VpsPort $VpsUser@$VpsHost "sudo chmod +x /usr/local/bin/docker-compose"
    Write-Success "Docker installed!"
} else {
    Write-Success "Docker already installed"
}

# Deploy application
Write-Info "Deploying ZTNET app only..."
ssh -p $VpsPort $VpsUser@$VpsHost "cd $DeployPath && docker-compose -f docker-compose.simple.yml down 2>/dev/null || true"
ssh -p $VpsPort $VpsUser@$VpsHost "cd $DeployPath && docker-compose -f docker-compose.simple.yml --env-file .env.production build"
ssh -p $VpsPort $VpsUser@$VpsHost "cd $DeployPath && docker-compose -f docker-compose.simple.yml --env-file .env.production up -d"

# Wait and check status
Write-Info "Waiting for services to start..." 
Start-Sleep 30
ssh -p $VpsPort $VpsUser@$VpsHost "cd $DeployPath && docker ps"

# Cleanup
Remove-Item -Recurse -Force $tempDir

Write-Success "Deployment completed!"
Write-Info "Access ZTNET at: http://$VpsHost`:3000"
Write-Info "Check status: ssh -p $VpsPort $VpsUser@$VpsHost 'docker ps'"
# Build and Push ZTNET Docker Image Script

# Colors for PowerShell output
$Colors = @{
    Green = "Green"
    Yellow = "Yellow" 
    Red = "Red"
    Cyan = "Cyan"
}

function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor $Colors.Cyan }
function Write-Success { param($msg) Write-Host "[SUCCESS] $msg" -ForegroundColor $Colors.Green }
function Write-Warning { param($msg) Write-Host "[WARNING] $msg" -ForegroundColor $Colors.Yellow }
function Write-Error { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor $Colors.Red }

# Configuration
$IMAGE_NAME = "your-dockerhub-username/ztnet"
$TAG = "v1.0.1"
$FULL_IMAGE = "${IMAGE_NAME}:${TAG}"

Write-Info "🐳 ZTNET Docker Build & Push Script"
Write-Info "=================================="

# Step 1: Build Docker image
Write-Info "Building Docker image: $FULL_IMAGE"
Write-Info "This may take 10-15 minutes..."

try {
    docker build -t $FULL_IMAGE `
        --build-arg NEXT_PUBLIC_APP_VERSION=$TAG `
        --build-arg NEXTAUTH_SECRET="build-time-secret" `
        --build-arg NEXTAUTH_URL="http://localhost:3000" `
        .
    
    Write-Success "✅ Docker image built successfully!"
}
catch {
    Write-Error "❌ Docker build failed: $_"
    exit 1
}

# Step 2: Test image locally (optional)
Write-Info "🧪 Testing image locally..."
Write-Info "You can test with: docker run -p 3000:3000 $FULL_IMAGE"

# Step 3: Login to Docker Hub
Write-Info "🔐 Logging into Docker Hub..."
Write-Warning "Please enter your Docker Hub credentials:"

try {
    docker login
    Write-Success "✅ Logged in successfully!"
}
catch {
    Write-Error "❌ Docker login failed"
    exit 1
}

# Step 4: Push to Docker Hub
Write-Info "📤 Pushing image to Docker Hub..."

try {
    docker push $FULL_IMAGE
    Write-Success "✅ Image pushed successfully!"
}
catch {
    Write-Error "❌ Docker push failed: $_"
    exit 1
}

# Step 5: Also tag as latest
Write-Info "🏷️ Tagging as latest..."
docker tag $FULL_IMAGE "${IMAGE_NAME}:latest"
docker push "${IMAGE_NAME}:latest"

Write-Success "🎉 Build and push completed!"
Write-Info "Your image is now available at: $FULL_IMAGE"
Write-Info ""
Write-Info "📋 Next steps for VPS deployment:"
Write-Info "1. SSH to your VPS"
Write-Info "2. Pull image: docker pull $FULL_IMAGE"
Write-Info "3. Run with docker-compose (modify image name)"
Write-Info ""
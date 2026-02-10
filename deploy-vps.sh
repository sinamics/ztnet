#!/bin/bash
# ZTNET VPS Deployment Script via Git

set -e

echo "🚀 ZTNET VPS Deployment via Git"
echo "==============================="

# Configuration
REPO_URL="https://github.com/yourusername/ztnet.git"  # Change this
BRANCH="main"
APP_DIR="/home/$(whoami)/ztnet"
COMPOSE_FILE="docker-compose.custom.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if Docker is installed
check_docker() {
    print_status "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed!"
        print_status "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        print_warning "Please logout and login again for Docker permissions!"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_status "Installing Docker Compose..."
        sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    fi
    
    print_success "Docker is ready!"
}

# Clone or update repository
setup_repo() {
    print_status "Setting up repository..."
    
    if [ -d "$APP_DIR" ]; then
        print_status "Updating existing repository..."
        cd "$APP_DIR"
        git fetch origin
        git reset --hard origin/$BRANCH
        git clean -fd
    else
        print_status "Cloning repository..."
        git clone -b $BRANCH $REPO_URL $APP_DIR
        cd "$APP_DIR"
    fi
    
    print_success "Repository ready!"
}

# Setup environment file
setup_env() {
    print_status "Setting up environment file..."
    
    if [ ! -f ".env.production" ]; then
        cat > .env.production << EOF
# ===========================================
# ZTNET VPS PRODUCTION CONFIGURATION
# ===========================================

# Database Configuration
POSTGRES_PASSWORD=secure_postgres_password_$(date +%s)

# NextAuth Configuration (REQUIRED)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=http://$(curl -s ifconfig.me):3000
# For domain: NEXTAUTH_URL=https://yourdomain.com

# ZeroTier Configuration
# Get API token from: https://my.zerotier.com/account
# ZTCENTRAL_API_TOKEN=your_api_token_here

# Email Configuration (Optional)
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_EMAIL=
# SMTP_PASSWORD=
# SMTP_USERNAME=
# SMTP_FROM_NAME=ZTNET

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_VERSION=v1.0.1
EOF
        print_success "Environment file created!"
        print_warning "Please edit .env.production with your actual values!"
        
        # Show external IP
        EXTERNAL_IP=$(curl -s ifconfig.me)
        print_status "Your VPS external IP: $EXTERNAL_IP"
        print_status "NEXTAUTH_URL has been set to: http://$EXTERNAL_IP:3000"
        
    else
        print_status "Environment file already exists."
    fi
}

# Deploy the application
deploy_app() {
    print_status "Deploying ZTNET..."
    
    # Stop existing services
    docker-compose -f $COMPOSE_FILE down 2>/dev/null || true
    
    # Build and start services
    print_status "Building and starting services..."
    docker-compose -f $COMPOSE_FILE --env-file .env.production up -d --build
    
    # Wait for services to be ready
    print_status "Waiting for services to start..."
    sleep 30
    
    # Check if containers are running
    if docker ps | grep -q "ztnet-app"; then
        print_success "✅ ZTNET deployed successfully!"
        
        EXTERNAL_IP=$(curl -s ifconfig.me)
        print_success "🌐 Access your ZTNET at: http://$EXTERNAL_IP:3000"
        print_status "📊 Check logs: docker logs ztnet-app-custom -f"
        print_status "📈 Check status: docker ps"
        
    else
        print_error "❌ Deployment failed!"
        print_status "Check logs: docker-compose logs"
        exit 1
    fi
}

# Setup firewall (optional)
setup_firewall() {
    print_status "Setting up firewall..."
    
    if command -v ufw &> /dev/null; then
        sudo ufw allow 3000/tcp
        sudo ufw allow 9993/udp
        sudo ufw --force enable
        print_success "Firewall configured!"
    else
        print_warning "UFW not found. Please manually open ports 3000 and 9993."
    fi
}

# Show status
show_status() {
    print_status "Current deployment status:"
    echo ""
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    print_status "Logs (Ctrl+C to exit):"
    docker logs ztnet-app-custom --tail 50 -f
}

# Main execution
main() {
    print_status "Starting VPS deployment process..."
    
    check_docker
    setup_repo
    setup_env
    
    echo ""
    print_warning "Before continuing, please review .env.production file:"
    print_status "nano .env.production"
    echo ""
    read -p "Press Enter when ready to deploy..."
    
    deploy_app
    setup_firewall
    
    echo ""
    print_success "🎉 Deployment completed!"
    echo ""
    read -p "Show live status? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        show_status
    fi
}

# Run main function
main "$@"
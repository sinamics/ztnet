#!/bin/bash
# ZTNET Docker Deployment Script

set -e

echo "🐳 ZTNET Docker Deployment Script"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if docker and docker-compose are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Dependencies check passed!"
}

# Function to deploy with pre-built image
deploy_prebuilt() {
    print_status "Deploying ZTNET with pre-built image..."
    
    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        print_warning ".env.production not found. Creating from template..."
        cp .env.production.example .env.production 2>/dev/null || {
            print_error "Please create .env.production file first!"
            exit 1
        }
    fi
    
    # Deploy with docker-compose
    print_status "Starting services..."
    docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
    
    print_success "ZTNET deployed successfully!"
    print_status "Access your ZTNET at: http://localhost:3000"
}

# Function to build and deploy custom image
deploy_custom() {
    print_status "Building and deploying ZTNET from source..."
    
    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        print_warning ".env.production not found. Creating from template..."
        cp .env.production.example .env.production 2>/dev/null || {
            print_error "Please create .env.production file first!"
            exit 1
        }
    fi
    
    # Build and deploy
    print_status "Building custom image..."
    docker-compose -f docker-compose.custom.yml --env-file .env.production build
    
    print_status "Starting services..."
    docker-compose -f docker-compose.custom.yml --env-file .env.production up -d
    
    print_success "Custom ZTNET deployed successfully!"
    print_status "Access your ZTNET at: http://localhost:3000"
}

# Function to stop services
stop_services() {
    print_status "Stopping ZTNET services..."
    
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    docker-compose -f docker-compose.custom.yml down 2>/dev/null || true
    
    print_success "Services stopped!"
}

# Function to show logs
show_logs() {
    print_status "Showing ZTNET logs..."
    echo "Press Ctrl+C to exit logs"
    sleep 2
    
    if docker ps --format "table {{.Names}}" | grep -q "ztnet-app"; then
        docker logs -f ztnet-app
    elif docker ps --format "table {{.Names}}" | grep -q "ztnet-app-custom"; then
        docker logs -f ztnet-app-custom
    else
        print_error "No ZTNET container found running!"
    fi
}

# Function to show status
show_status() {
    print_status "ZTNET Services Status:"
    echo ""
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(ztnet|postgres|zerotier)" || print_warning "No ZTNET containers found!"
}

# Main menu
show_menu() {
    echo ""
    echo "Choose deployment option:"
    echo "1) Deploy with pre-built image (recommended)"
    echo "2) Build and deploy from source"
    echo "3) Stop services"
    echo "4) Show logs"
    echo "5) Show status"
    echo "6) Exit"
    echo ""
}

# Main script
main() {
    check_dependencies
    
    while true; do
        show_menu
        read -p "Enter your choice (1-6): " choice
        
        case $choice in
            1)
                deploy_prebuilt
                ;;
            2)
                deploy_custom
                ;;
            3)
                stop_services
                ;;
            4)
                show_logs
                ;;
            5)
                show_status
                ;;
            6)
                print_status "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please choose 1-6."
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

# Run main function
main "$@"
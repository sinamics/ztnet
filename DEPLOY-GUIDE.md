# 🚀 Hướng dẫn Deploy ZTNET lên VPS

## 📋 Yêu cầu hệ thống

### Windows (Development Environment)
- Node.js 18+ 
- PowerShell 5.1+
- SSH Client (OpenSSH hoặc Git Bash)
- SCP (để upload files)

### VPS (Production Environment)
- Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- RAM: 2GB+ (khuyến nghị 4GB)
- Docker và Docker Compose
- PostgreSQL server (có thể ở máy khác)
- Port 22 (SSH), 3000 (ZTNET) mở

## 🔧 Chuẩn bị Deploy

### 1. Cấu hình Environment Variables

Chỉnh sửa file `.env.production`:

```env
# Database Configuration - Remote PostgreSQL
DATABASE_URL="postgresql://username:password@192.168.1.42:5438/ztnet"

# NextAuth Configuration (REQUIRED)
NEXTAUTH_SECRET=your-super-long-secret-key-at-least-32-characters-long
NEXTAUTH_URL=http://VPS_IP:3000

# ZeroTier Configuration - Central API
ZTCENTRAL_API_TOKEN=your_zerotier_central_api_token_here
ZTCENTRAL_API_URL=https://api.zerotier.com/api/v1

# Production Environment
NODE_ENV=production
```

### 2. Kiểm tra SSH Connection

```powershell
# Test SSH connection
ssh -p 22 root@VPS_IP

# Test với timeout
ssh -o ConnectTimeout=10 root@VPS_IP "echo 'Connection OK'"
```

## 🚀 Deploy ZTNET

### Phương pháp 1: Auto Deploy Script (Khuyến nghị)

```powershell
# Deploy một lệnh duy nhất
.\deploy-remote.ps1 -VpsHost "VPS_IP" -VpsUser "root"
```

Script sẽ tự động:
- ✅ Kiểm tra SSH connection
- ✅ Upload source code và configs  
- ✅ Cài đặt Docker (nếu chưa có)
- ✅ Build và start container
- ✅ Hiển thị URL truy cập

### Phương pháp 2: Manual Deploy

```powershell
# 1. Upload files lên VPS
scp -r src public prisma package*.json *.yml *.simple .env.production root@VPS_IP:/opt/ztnet/

# 2. SSH vào VPS và deploy
ssh root@VPS_IP
cd /opt/ztnet

# 3. Build và start
docker-compose -f docker-compose.simple.yml --env-file .env.production up -d --build
```

## 🔄 Redeploy Application

### Quick Redeploy (Code changes only)

```powershell
# 1. Upload code mới
scp -r src root@VPS_IP:/opt/ztnet/

# 2. Rebuild container
ssh root@VPS_IP "cd /opt/ztnet && docker-compose -f docker-compose.simple.yml up -d --build"
```

### Full Redeploy (All changes)

```powershell
# Sử dụng deploy script
.\deploy-remote.ps1 -VpsHost "VPS_IP" -VpsUser "root"

# Hoặc manual
scp -r * root@VPS_IP:/opt/ztnet/
ssh root@VPS_IP "cd /opt/ztnet && docker-compose -f docker-compose.simple.yml down && docker-compose -f docker-compose.simple.yml up -d --build"
```

### Selective Redeploy (Specific files)

```powershell
# Chỉ update environment variables
scp .env.production root@VPS_IP:/opt/ztnet/
ssh root@VPS_IP "cd /opt/ztnet && docker-compose -f docker-compose.simple.yml restart"

# Chỉ update Docker config
scp docker-compose.simple.yml Dockerfile.simple root@VPS_IP:/opt/ztnet/
ssh root@VPS_IP "cd /opt/ztnet && docker-compose -f docker-compose.simple.yml up -d --build"
```

## 📊 Management Commands

### Kiểm tra Status

```powershell
# Kiểm tra containers
ssh root@VPS_IP "docker ps"

# Kiểm tra ZTNET app
ssh root@VPS_IP "docker ps | grep ztnet-app-simple"

# Health check
ssh root@VPS_IP "curl -I http://localhost:3000"
```

### Xem Logs

```powershell
# Logs realtime
ssh root@VPS_IP "docker logs ztnet-app-simple -f"

# Logs 50 dòng cuối
ssh root@VPS_IP "docker logs ztnet-app-simple --tail 50"

# Logs có timestamp
ssh root@VPS_IP "docker logs ztnet-app-simple -t"
```

### Restart Services

```powershell
# Restart ZTNET app
ssh root@VPS_IP "cd /opt/ztnet && docker-compose -f docker-compose.simple.yml restart"

# Stop services
ssh root@VPS_IP "cd /opt/ztnet && docker-compose -f docker-compose.simple.yml down"

# Start services
ssh root@VPS_IP "cd /opt/ztnet && docker-compose -f docker-compose.simple.yml up -d"
```

### Database Operations

```powershell
# Chạy Prisma migrations
ssh root@VPS_IP "cd /opt/ztnet && docker exec ztnet-app-simple npx prisma migrate deploy"

# Generate Prisma client
ssh root@VPS_IP "cd /opt/ztnet && docker exec ztnet-app-simple npx prisma generate"

# Reset database (CAREFUL!)
ssh root@VPS_IP "cd /opt/ztnet && docker exec ztnet-app-simple npx prisma migrate reset --force"
```

## 🛠 Troubleshooting Guide

### 1. SSH Connection Failed

```powershell
# Kiểm tra VPS accessible
ping VPS_IP

# Kiểm tra SSH service
ssh -v root@VPS_IP

# Kiểm tra port
nmap -p 22 VPS_IP
```

**Solutions:**
- Đảm bảo VPS đang chạy
- Kiểm tra firewall rules
- Cấu hình SSH key authentication
- Kiểm tra SSH service status: `systemctl status ssh`

### 2. Docker Build Failed

```powershell
# Xem build logs chi tiết
ssh root@VPS_IP "cd /opt/ztnet && docker-compose -f docker-compose.simple.yml build --no-cache --progress=plain"

# Clear Docker cache
ssh root@VPS_IP "docker system prune -f"
```

**Common Issues:**
- Missing files (package-lock.json, .env.production)
- Environment variables không đúng
- Node.js version compatibility
- Network timeout trong build

### 3. Application Not Starting

```powershell
# Kiểm tra logs lỗi
ssh root@VPS_IP "docker logs ztnet-app-simple"

# Kiểm tra environment variables
ssh root@VPS_IP "cd /opt/ztnet && docker exec ztnet-app-simple env | grep DATABASE_URL"

# Test database connection
ssh root@VPS_IP "cd /opt/ztnet && docker exec ztnet-app-simple npx prisma db pull"
```

### 4. Port Already In Use

```powershell
# Kiểm tra process sử dụng port 3000
ssh root@VPS_IP "lsof -i :3000"

# Kill process
ssh root@VPS_IP "sudo fuser -k 3000/tcp"
```

### 5. Database Connection Issues

```powershell
# Test database từ VPS
ssh root@VPS_IP "pg_isready -h DB_HOST -p DB_PORT -U DB_USER"

# Test connection string
ssh root@VPS_IP "psql 'postgresql://username:password@host:port/database' -c 'SELECT version();'"
```

## 🔐 Security Best Practices

### 1. SSH Key Authentication

```powershell
# Tạo SSH key pair
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# Copy public key lên VPS
type $env:USERPROFILE\.ssh\id_rsa.pub | ssh root@VPS_IP "cat >> ~/.ssh/authorized_keys"

# Disable password authentication sau khi setup key
```

### 2. Firewall Configuration

```bash
# Trên VPS
ufw allow 22     # SSH
ufw allow 3000   # ZTNET 
ufw enable
```

### 3. Environment Security

```env
# Sử dụng strong secrets
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Database với strong password
DATABASE_URL="postgresql://ztnet:$(openssl rand -base64 16)@host:port/ztnet"
```

## 📈 Monitoring & Maintenance

### Health Check Script

```bash
#!/bin/bash
# health-check.sh
curl -f http://localhost:3000/api/health || exit 1
```

### Backup Script

```bash
#!/bin/bash
# backup.sh
timestamp=$(date +%Y%m%d_%H%M%S)
docker exec postgres pg_dump -U ztnet ztnet > backup_$timestamp.sql
```

### Update Script

```powershell
# update.ps1
git pull origin main
.\deploy-remote.ps1 -VpsHost "VPS_IP" -VpsUser "root"
```

## 🌐 Access URLs

Sau khi deploy thành công:

- **ZTNET Web Interface**: `http://VPS_IP:3000`
- **Login Page**: `http://VPS_IP:3000/auth/login`
- **Admin Panel**: `http://VPS_IP:3000/admin` (sau khi login)
- **API Endpoint**: `http://VPS_IP:3000/api/v1/`

## 📞 Support & Resources

- **Documentation**: https://ztnet.network
- **GitHub Issues**: https://github.com/sinamics/ztnet/issues
- **Discord**: https://discord.gg/VafvyXvY58
- **ZeroTier Central**: https://my.zerotier.com

---

## 📋 Quick Reference Commands

```powershell
# Deploy
.\deploy-remote.ps1 -VpsHost "IP" -VpsUser "root"

# Status
ssh root@VPS_IP "docker ps"

# Logs  
ssh root@VPS_IP "docker logs ztnet-app-simple -f"

# Restart
ssh root@VPS_IP "cd /opt/ztnet && docker-compose -f docker-compose.simple.yml restart"

# Redeploy
scp -r src root@VPS_IP:/opt/ztnet/ && ssh root@VPS_IP "cd /opt/ztnet && docker-compose -f docker-compose.simple.yml up -d --build"
```

**🎊 Happy Deploying!**
# 🚀 ZTNET Windows to VPS Deployment Guide

Hướng dẫn chi tiết các cách deploy ZTNET từ Windows sang VPS Linux.

## 📋 Yêu cầu hệ thống

### Windows (Development)
- Node.js 18+
- Docker Desktop (chỉ cho cách 1 và 2)
- Git
- PowerShell 5.1+
- OpenSSH (Windows 10+) hoặc Git Bash

### VPS (Production)
- Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- RAM: 2GB+ (khuyến nghị 4GB)
- Disk: 10GB+ trống
- Port 22 (SSH), 3000 (ZTNET), 5432 (PostgreSQL) mở

## 🎯 3 Cách Deploy

### **Cách 1: Docker Registry (Khuyến nghị cho Production)**

**Ưu điểm:**
- Build một lần, deploy nhiều lần
- Nhanh nhất cho production
- Dễ rollback và scale
- Image được optimize

**Quy trình:**
```powershell
# 1. Build và push image lên Docker Hub
.\build-and-push.ps1 -ImageName "username/ztnet" -Tag "v1.0"

# 2. Upload config lên VPS
scp docker-compose.vps.yml .env.production root@your-vps:/opt/ztnet/

# 3. Deploy trên VPS
ssh root@your-vps "cd /opt/ztnet && docker-compose -f docker-compose.vps.yml up -d"
```

**Phù hợp:** Production, CI/CD, nhiều server

---

### **Cách 2: Git Repository**

**Ưu điểm:**
- Code luôn sync với git
- Tự động install Docker
- Dễ track changes
- Backup code tự nhiên

**Quy trình:**
```bash
# 1. Push code lên Git (GitHub/GitLab)
git push origin main

# 2. Upload script deploy lên VPS
scp deploy-vps.sh root@your-vps:/tmp/

# 3. Chạy deploy trên VPS
ssh root@your-vps "chmod +x /tmp/deploy-vps.sh && /tmp/deploy-vps.sh"
```

**Phù hợp:** Development, team nhỏ, frequent updates

---

### **Cách 3: Trực tiếp SSH (Đơn giản nhất)**

**Ưu điểm:**
- Một lệnh duy nhất
- Tự động upload files
- Tự động cài Docker
- Quản lý từ xa hoàn toàn

**Quy trình:**
```powershell
# Deploy một lệnh
.\deploy-remote.ps1 -VpsHost "192.168.1.100" -VpsUser "root"

# Quản lý sau deploy
.\manage-vps.ps1 -VpsHost "192.168.1.100" -VpsUser "root" -Action "status"
```

**Phù hợp:** Prototype, demo, setup nhanh

## 📝 Setup chi tiết

### 1️⃣ Cách 1: Docker Registry

#### Bước 1: Tạo Docker Hub account
1. Đăng ký tại https://hub.docker.com
2. Tạo repository: `username/ztnet`
3. Login Docker:
```powershell
docker login
```

#### Bước 2: Build và push
```powershell
# Chỉnh sửa thông tin trong script
code build-and-push.ps1

# Build và push
.\build-and-push.ps1 -ImageName "yourusername/ztnet" -Tag "v1.0"
```

#### Bước 3: Setup VPS
```powershell
# Upload config files
scp docker-compose.vps.yml .env.production root@your-vps:/opt/ztnet/

# Deploy
ssh root@your-vps
cd /opt/ztnet
docker-compose -f docker-compose.vps.yml up -d
```

### 2️⃣ Cách 2: Git Repository

#### Bước 1: Push code lên Git
```powershell
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### Bước 2: Deploy từ Git
```powershell
# Upload script
scp deploy-vps.sh root@your-vps:/tmp/

# Execute deployment
ssh root@your-vps "chmod +x /tmp/deploy-vps.sh && /tmp/deploy-vps.sh"
```

### 3️⃣ Cách 3: Deploy trực tiếp

#### Bước 1: Setup SSH key (khuyến nghị)
```powershell
# Tạo SSH key nếu chưa có
ssh-keygen -t rsa -b 4096 -C "your-email@gmail.com"

# Copy public key lên VPS
type $env:USERPROFILE\.ssh\id_rsa.pub | ssh root@your-vps "cat >> ~/.ssh/authorized_keys"
```

#### Bước 2: Deploy
```powershell
.\deploy-remote.ps1 -VpsHost "your-vps-ip" -VpsUser "root"
```

#### Bước 3: Quản lý
```powershell
# Xem trạng thái
.\manage-vps.ps1 -VpsHost "your-vps-ip" -VpsUser "root" -Action "status"

# Xem logs
.\manage-vps.ps1 -VpsHost "your-vps-ip" -VpsUser "root" -Action "logs"

# Restart services
.\manage-vps.ps1 -VpsHost "your-vps-ip" -VpsUser "root" -Action "restart"

# Update code
.\manage-vps.ps1 -VpsHost "your-vps-ip" -VpsUser "root" -Action "update"

# Backup
.\manage-vps.ps1 -VpsHost "your-vps-ip" -VpsUser "root" -Action "backup"

# SSH shell
.\manage-vps.ps1 -VpsHost "your-vps-ip" -VpsUser "root" -Action "shell"
```

## ⚙️ Configuration Files

### Environment Variables (.env.production)
```bash
# Database
DATABASE_URL="postgresql://ztnet:strongpassword@localhost:5432/ztnet"
NEXTAUTH_SECRET="your-super-secret-key-here"

# ZeroTier
ZTCENTRAL_API_TOKEN="your-zerotier-api-token"
ZTCENTRAL_API_URL="https://api.zerotier.com/api/v1"

# Mail (optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# App
NEXTAUTH_URL="http://your-vps-ip:3000"
NODE_ENV="production"
```

### Docker Compose Files
- `docker-compose.prod.yml`: Pre-built image từ Docker Hub
- `docker-compose.custom.yml`: Build từ source code
- `docker-compose.vps.yml`: Registry image cho VPS

## 🔧 Troubleshooting

### Lỗi thường gặp

#### SSH Connection Failed
```powershell
# Test connection
ssh -v root@your-vps

# Fix: Check firewall, SSH service, key permissions
```

#### Docker Build Failed
```powershell
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

#### Database Connection Error
```bash
# Check PostgreSQL
docker logs ztnet-postgres-custom

# Reset database
docker-compose down -v
docker-compose up -d postgres
```

#### Port Already in Use
```bash
# Kill process using port 3000
sudo fuser -k 3000/tcp

# Or change port in docker-compose.yml
```

### Performance Tips

#### Tăng tốc build
```dockerfile
# Thêm vào Dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts
```

#### Optimize memory
```yaml
# Trong docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

## 🚀 Quick Start Examples

### Deploy Production nhanh nhất:
```powershell
# Cách 1: Registry (Production)
.\build-and-push.ps1 -ImageName "mycompany/ztnet" -Tag "prod"

# Cách 2: Git (Development)
git push && scp deploy-vps.sh root@vps:/tmp/ && ssh root@vps "/tmp/deploy-vps.sh"

# Cách 3: Direct (Prototype)
.\deploy-remote.ps1 -VpsHost "192.168.1.100" -VpsUser "ubuntu"
```

### Setup Development Environment:
```powershell
# Local development
npm install
npm run dev

# Test Docker build
docker-compose -f docker-compose.custom.yml up --build
```

### Monitor Production:
```powershell
# Health check
.\manage-vps.ps1 -VpsHost "prod-server" -VpsUser "ubuntu" -Action "status"

# Continuous monitoring
while ($true) { 
    .\manage-vps.ps1 -VpsHost "prod-server" -VpsUser "ubuntu" -Action "status"
    Start-Sleep 30 
}
```

## 📚 Additional Resources

- [ZTNET Documentation](https://docs.ztnet.network/)
- [ZeroTier API](https://docs.zerotier.com/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [PostgreSQL Tuning](https://pgtune.leopard.in.ua/)

## 🔒 Security Checklist

- ✅ SSH key authentication (không dùng password)
- ✅ Firewall rules (ufw hoặc iptables)
- ✅ Strong passwords cho database
- ✅ HTTPS với SSL certificate
- ✅ Regular backups
- ✅ Update security patches

---
**Happy Deploying! 🎉**
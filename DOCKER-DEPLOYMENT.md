# 🐳 ZTNET Docker Deployment Guide

## 📋 Prerequisites

- Docker & Docker Compose installed
- 2GB+ RAM available
- Ports 3000, 9993 available

## 🚀 Quick Start

### Method 1: Pre-built Image (Recommended)

```bash
# 1. Copy environment template
cp .env.production .env.production.local

# 2. Edit .env.production.local with your values
nano .env.production.local

# 3. Deploy
docker-compose -f docker-compose.prod.yml --env-file .env.production.local up -d
```

### Method 2: Build from Source

```bash
# 1. Setup environment
cp .env.production .env.production.local

# 2. Build and deploy
docker-compose -f docker-compose.custom.yml --env-file .env.production.local up -d
```

## 🎯 Using Deployment Scripts

### Windows PowerShell
```powershell
# Interactive menu
.\deploy.ps1

# Direct commands
.\deploy.ps1 prebuilt    # Deploy with pre-built image
.\deploy.ps1 custom      # Build and deploy from source
.\deploy.ps1 stop        # Stop services
.\deploy.ps1 logs        # View logs
.\deploy.ps1 status      # Check status
```

### Linux/macOS
```bash
# Interactive menu
chmod +x deploy.sh
./deploy.sh

# For direct deployment
./deploy.sh prebuilt
```

## ⚙️ Configuration

### Required Environment Variables

```env
# Database
POSTGRES_PASSWORD=your_secure_password

# NextAuth (CRITICAL for security)
NEXTAUTH_SECRET=your-32-character-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# For production domain:
# NEXTAUTH_URL=https://yourdomain.com
```

### ZeroTier Configuration (Choose one)

**Option A: ZeroTier Central (Recommended)**
```env
ZTCENTRAL_API_TOKEN=your_api_token_from_my.zerotier.com
```

**Option B: Local Controller (Included)**
```env
# No additional config needed
# Uses the zerotier container automatically
```

## 🌍 Production Deployment

### 1. Domain Setup
```env
NEXTAUTH_URL=https://yourdomain.com
```

### 2. HTTPS with Caddy (Optional)
Uncomment the caddy section in docker-compose.prod.yml:
```yaml
https-proxy:
  image: caddy:latest
  command: caddy reverse-proxy --from yourdomain.com --to ztnet:3000
  ports:
    - "80:80"
    - "443:443"
```

### 3. Database Backup
```bash
# Backup
docker exec ztnet-postgres pg_dump -U postgres ztnet > backup.sql

# Restore
docker exec -i ztnet-postgres psql -U postgres ztnet < backup.sql
```

## 📊 Monitoring

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker logs -f ztnet-app
```

### Check Status
```bash
docker ps
docker-compose ps
```

### Resource Usage
```bash
docker stats
```

## 🛠️ Troubleshooting

### Common Issues

**1. Port already in use**
```bash
# Check what's using port 3000
netstat -tulpn | grep :3000
# Or change port in docker-compose
ports:
  - "3001:3000"  # Use port 3001 instead
```

**2. Database connection failed**
```bash
# Check database logs
docker logs ztnet-postgres

# Reset database
docker-compose down -v
docker-compose up -d
```

**3. ZeroTier not working**
```bash
# Check ZeroTier logs
docker logs ztnet-zerotier

# Restart ZeroTier only
docker restart ztnet-zerotier
```

### Complete Reset
```bash
# Stop and remove everything (includes data!)
docker-compose down -v
docker system prune -f

# Redeploy
docker-compose up -d
```

## 🔧 Advanced Configuration

### Custom Network Subnet
```yaml
networks:
  app-network:
    ipam:
      config:
        - subnet: 192.168.100.0/24
```

### Resource Limits
```yaml
services:
  ztnet:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
```

### External Database
```yaml
# Remove postgres service and update:
environment:
  POSTGRES_HOST: external-db-host
  POSTGRES_PORT: 5432
```

## 📚 Next Steps

1. **First Login**: http://localhost:3000
2. **Create Admin Account**: First user becomes admin
3. **Configure ZeroTier**: Add networks and manage members
4. **Setup Email** (optional): Configure SMTP settings
5. **Backup Strategy**: Regular database backups

## 🆘 Support

- **Documentation**: https://ztnet.network
- **Issues**: GitHub Issues
- **Community**: Discord Server

---

**🎉 Your ZTNET is ready! Access it at http://localhost:3000**
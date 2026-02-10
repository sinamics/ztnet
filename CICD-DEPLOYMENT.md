# CI/CD Deployment Guide
# Deploy ZTNet từ Dev PC → GitHub → Docker Registry → VPS

Hướng dẫn này giúp bạn setup quy trình CI/CD tự động, trong đó VPS chỉ cần pull Docker image đã build sẵn từ registry, không cần source code.

## 📋 Mô hình CI/CD

```
Dev PC
  ↓ git push
GitHub Repository
  ↓ GitHub Actions (tự động build)
Docker Hub / GHCR
  ↓ docker pull
VPS (chỉ cần Docker)
```

## 🎯 Ưu điểm

✅ **VPS nhẹ hơn**: Không cần Node.js, build tools, hay source code  
✅ **Build nhanh**: CI/CD server build nhanh và ổn định hơn  
✅ **Bảo mật**: Source code không bị expose trên VPS  
✅ **Dễ rollback**: Chỉ cần pull image version cũ  
✅ **Multi-platform**: Tự động build cho AMD64 và ARM64  

---

## 🚀 BƯỚC 1: Setup Docker Registry

### Option A: Docker Hub (Khuyến nghị cho public projects)

1. **Tạo tài khoản tại**: https://hub.docker.com
2. **Tạo repository**: 
   - Repository name: `ztnet` (hoặc tên khác)
   - Visibility: Public hoặc Private
3. **Tạo Access Token**:
   - Settings → Security → New Access Token
   - Permissions: Read, Write, Delete
   - **Lưu token này lại** (chỉ hiện 1 lần)

### Option B: GitHub Container Registry (GHCR)

- **Miễn phí** và tự động có sẵn với GitHub
- Image: `ghcr.io/<username>/<repo>:tag`
- Không cần setup thêm (dùng GITHUB_TOKEN)

---

## 🔧 BƯỚC 2: Cấu hình GitHub Secrets

Vào repository GitHub của bạn:

**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Thêm các secrets sau:

### Nếu dùng Docker Hub:
```
DOCKER_USERNAME = your-dockerhub-username
DOCKER_PASSWORD = your-dockerhub-access-token
DOCKER_REPOSITORY = ztnet
```

### Nếu dùng GHCR:
- Không cần thêm secret (dùng `GITHUB_TOKEN` tự động)
- Nhớ enable write permission cho GITHUB_TOKEN:
  - Settings → Actions → General → Workflow permissions
  - Chọn "Read and write permissions"

---

## 📝 BƯỚC 3: Kích hoạt GitHub Actions

File workflow đã được tạo tại: `.github/workflows/docker-cicd.yml`

### Workflow sẽ tự động chạy khi:

1. **Push lên branch `main` hoặc `develop`**
   ```bash
   git push origin main
   ```

2. **Tạo tag version**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. **Manual trigger** (từ GitHub Actions tab)

### Theo dõi build process:

1. Vào GitHub repository
2. Click tab **Actions**
3. Xem workflow "Docker CI/CD - Build and Push" đang chạy
4. Sau 10-15 phút, image sẽ được push lên registry

### Docker image tags được tạo:

| Trigger | Tags tạo ra |
|---------|-------------|
| Push to main | `latest`, `main`, `main-abc1234` |
| Push to develop | `develop`, `develop-abc1234` |
| Tag v1.0.0 | `v1.0.0`, `1.0`, `1`, `latest` |

---

## 🖥️ BƯỚC 4: Deploy lên VPS

### 4.1. Chuẩn bị VPS

VPS chỉ cần:
- **Docker** và **Docker Compose**
- **Không cần** Node.js, Git, hay build tools

#### Cài đặt Docker (nếu chưa có):

**Ubuntu/Debian:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Cài docker compose
sudo apt update
sudo apt install docker-compose-plugin -y
```

**Kiểm tra:**
```bash
docker --version
docker compose version
```

### 4.2. Tạo thư mục và file cấu hình

```bash
# Tạo thư mục cho ứng dụng
mkdir -p ~/ztnet
cd ~/ztnet

# Download file docker-compose từ GitHub (hoặc copy thủ công)
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/ztnet/main/docker-compose.registry.yml
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/ztnet/main/.env.vps.example

# Đổi tên file
mv docker-compose.registry.yml docker-compose.yml
mv .env.vps.example .env
```

### 4.3. Cấu hình file .env

```bash
nano .env
```

**Chỉnh sửa các giá trị sau:**

```bash
# Database password (tạo mật khẩu mạnh)
POSTGRES_PASSWORD=your_secure_postgres_password_here

# Domain hoặc IP của VPS
NEXTAUTH_URL=http://your-vps-ip:3000

# Generate secret: openssl rand -base64 32
NEXTAUTH_SECRET=your_nextauth_secret_here

# Docker image (chọn version cần deploy)
DOCKER_IMAGE=sinamics/ztnet:latest

# Port (mặc định 3000)
APP_PORT=3000
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 4.4. Deploy ứng dụng

```bash
# Pull image mới nhất từ registry
docker compose pull

# Start services
docker compose up -d

# Xem logs
docker compose logs -f ztnet
```

### 4.5. Kiểm tra deployment

```bash
# Kiểm tra container đang chạy
docker compose ps

# Kiểm tra logs
docker compose logs ztnet

# Kiểm tra health
curl http://localhost:3000/api/health
```

Truy cập ứng dụng: `http://your-vps-ip:3000`

---

## 🔄 BƯỚC 5: Update ứng dụng

### Cập nhật lên version mới:

```bash
cd ~/ztnet

# Pull image mới nhất
docker compose pull

# Restart với image mới (zero downtime)
docker compose up -d

# Xem logs để đảm bảo mọi thứ OK
docker compose logs -f ztnet
```

### Rollback về version cũ:

```bash
# Sửa .env, đổi DOCKER_IMAGE về version cũ
nano .env
# DOCKER_IMAGE=sinamics/ztnet:v1.0.0

# Pull và restart
docker compose pull
docker compose up -d
```

### Deploy version cụ thể:

```bash
# Option 1: Sửa .env
nano .env
# DOCKER_IMAGE=sinamics/ztnet:v1.0.0

# Option 2: Override trực tiếp
DOCKER_IMAGE=sinamics/ztnet:v1.0.0 docker compose up -d
```

---

## 🔧 BƯỚC 6: Setup Nginx Reverse Proxy (Khuyến nghị)

### Cài đặt Nginx:

```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx -y
```

### Tạo Nginx config:

```bash
sudo nano /etc/nginx/sites-available/ztnet
```

**Nội dung:**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Enable site:**

```bash
sudo ln -s /etc/nginx/sites-available/ztnet /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Setup SSL với Let's Encrypt:

```bash
sudo certbot --nginx -d your-domain.com
```

**Update NEXTAUTH_URL trong .env:**

```bash
nano ~/ztnet/.env
# NEXTAUTH_URL=https://your-domain.com

# Restart
cd ~/ztnet
docker compose restart ztnet
```

---

## 📊 Quản lý và Monitoring

### Xem logs:

```bash
# Logs của tất cả services
docker compose logs -f

# Chỉ logs của ztnet
docker compose logs -f ztnet

# 100 dòng cuối
docker compose logs --tail=100 ztnet
```

### Kiểm tra resource usage:

```bash
docker stats
```

### Backup database:

```bash
# Backup
docker compose exec postgres pg_dump -U postgres ztnet > backup_$(date +%Y%m%d).sql

# Restore
docker compose exec -T postgres psql -U postgres ztnet < backup_20240210.sql
```

### Dọn dẹp:

```bash
# Xóa images cũ không dùng
docker image prune -a

# Xóa containers, networks, volumes không dùng
docker system prune -a --volumes
```

---

## 🐛 Troubleshooting

### Container không start:

```bash
# Xem logs chi tiết
docker compose logs ztnet

# Kiểm tra .env có đúng không
cat .env

# Restart lại
docker compose restart
```

### Database connection error:

```bash
# Kiểm tra postgres đang chạy
docker compose ps postgres

# Xem logs postgres
docker compose logs postgres

# Kiểm tra password trong .env
```

### Image pull failed:

```bash
# Kiểm tra network
ping hub.docker.com

# Pull thủ công
docker pull sinamics/ztnet:latest

# Nếu private registry, login trước
docker login
```

### Port đã được sử dụng:

```bash
# Kiểm tra port 3000
sudo lsof -i :3000

# Hoặc đổi port trong .env
# APP_PORT=3001
```

---

## 🎯 Best Practices

### 1. Versioning Strategy:

```bash
# Development
DOCKER_IMAGE=sinamics/ztnet:develop

# Staging
DOCKER_IMAGE=sinamics/ztnet:main

# Production
DOCKER_IMAGE=sinamics/ztnet:v1.0.0
```

### 2. Automated Updates:

Tạo script update tự động:

```bash
nano ~/ztnet/update.sh
```

```bash
#!/bin/bash
cd ~/ztnet
echo "Pulling latest image..."
docker compose pull
echo "Restarting services..."
docker compose up -d
echo "Showing logs..."
docker compose logs --tail=50 ztnet
```

```bash
chmod +x ~/ztnet/update.sh
```

### 3. Health Checks:

Setup cron job để kiểm tra health:

```bash
crontab -e
```

```bash
# Kiểm tra mỗi 5 phút
*/5 * * * * curl -f http://localhost:3000/api/health || docker compose -f ~/ztnet/docker-compose.yml restart ztnet
```

### 4. Backup Strategy:

```bash
nano ~/backup-ztnet.sh
```

```bash
#!/bin/bash
BACKUP_DIR=~/ztnet-backups
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
docker compose -f ~/ztnet/docker-compose.yml exec -T postgres \
  pg_dump -U postgres ztnet > $BACKUP_DIR/db_$DATE.sql

# Backup ZeroTier data
docker run --rm -v ztnet-zerotier-data:/data -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/zerotier_$DATE.tar.gz -C /data .

# Xóa backup cũ hơn 7 ngày
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
chmod +x ~/backup-ztnet.sh

# Setup daily backup
crontab -e
# 0 2 * * * ~/backup-ztnet.sh
```

---

## 📚 Tham khảo thêm

### Workflow files:
- [.github/workflows/docker-cicd.yml](.github/workflows/docker-cicd.yml) - GitHub Actions workflow

### Docker Compose:
- [docker-compose.registry.yml](docker-compose.registry.yml) - VPS deployment config
- [.env.vps.example](.env.vps.example) - Environment variables template

### So sánh với phương pháp khác:
- [DOCKER-DEPLOYMENT.md](DOCKER-DEPLOYMENT.md) - Build trực tiếp từ source
- [QUICK-START.md](QUICK-START.md) - Development setup
- [DEPLOY-GUIDE.md](DEPLOY-GUIDE.md) - General deployment guide

---

## 💡 Câu hỏi thường gặp

**Q: Registry nào tốt hơn, Docker Hub hay GHCR?**  
A: GHCR tốt cho private repos, Docker Hub tốt cho public và có CDN tốt hơn.

**Q: Có cần mở port 9993 không?**  
A: Có, nếu muốn ZeroTier controller hoạt động từ bên ngoài.

**Q: Làm sao để deploy nhiều VPS cùng lúc?**  
A: Sử dụng tools như Ansible, hoặc script SSH loop đơn giản.

**Q: Image size bao nhiêu?**  
A: Khoảng 500-700MB (đã optimize với multi-stage build).

**Q: Có hỗ trợ auto-update không?**  
A: Có thể dùng Watchtower hoặc custom script với cron job.

---

## 🤝 Hỗ trợ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra [Troubleshooting](#-troubleshooting) section
2. Xem GitHub Issues
3. Tham gia Discord community

**Happy Deploying! 🚀**

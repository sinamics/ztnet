# 🎯 Quick Start - ZTNET Deployment

## 🚀 Cách nhanh nhất để deploy

### 1. Deploy lần đầu
```powershell
# Đảm bảo đã cấu hình .env.production
.\deploy-remote.ps1 -VpsHost "157.245.152.131" -VpsUser "root"
```

### 2. Quản lý sau deploy
```powershell
# Kiểm tra trạng thái
.\ztnet-manager.ps1 -Action status -VpsHost "157.245.152.131" -VpsUser "root"

# Xem logs
.\ztnet-manager.ps1 -Action logs -VpsHost "157.245.152.131" -VpsUser "root"

# Restart services
.\ztnet-manager.ps1 -Action restart -VpsHost "157.245.152.131" -VpsUser "root"
```

### 3. Update code mới  
```powershell
# Chỉ update source code
.\ztnet-manager.ps1 -Action update-code -VpsHost "157.245.152.131" -VpsUser "root"

# Hoặc redeploy hoàn toàn
.\ztnet-manager.ps1 -Action redeploy -VpsHost "157.245.152.131" -VpsUser "root"
```

## 📁 Files quan trọng

| File | Mục đích |
|------|----------|
| `deploy-remote.ps1` | Script deploy tự động |
| `ztnet-manager.ps1` | Script quản lý VPS |
| `docker-compose.simple.yml` | Docker config cho ZTNET app only |
| `Dockerfile.simple` | Dockerfile tối giản |
| `.env.production` | Environment variables production |
| `DEPLOY-GUIDE.md` | Hướng dẫn chi tiết |

## 🌐 URLs sau khi deploy

- **ZTNET Web**: `http://157.245.152.131:3000`
- **Login**: `http://157.245.152.131:3000/auth/login`
- **Admin**: `http://157.245.152.131:3000/admin`

## 🆘 Lệnh cứu cấp

```powershell
# Kiểm tra VPS còn sống không
ping 157.245.152.131

# SSH vào VPS
ssh root@157.245.152.131

# Xem containers đang chạy
docker ps

# Restart ZTNET container
docker restart ztnet-app-simple

# Xem logs lỗi
docker logs ztnet-app-simple --tail 50
```

## 📖 Đọc thêm

- **[DEPLOY-GUIDE.md](DEPLOY-GUIDE.md)** - Hướng dẫn chi tiết đầy đủ
- **[README.md](README.md)** - Documentation chính thức ZTNET
# KDx Portal - Quick Start Deployment

Fast-track deployment guide for experienced DevOps engineers.

---

## Prerequisites

- DigitalOcean account
- Domain: `worldpathregulatory.world`
- Git repository with code
- SSH access configured

---

## Infrastructure Setup (15 minutes)

### 1. Create Resources

**Droplet:**
```
Image: Ubuntu 22.04 LTS
Size: 4GB RAM / 2 vCPUs / 80GB SSD ($24/mo)
Datacenter: NYC3
Backups: Enabled
```

**Managed MySQL:**
```
Engine: MySQL 8
Size: 1GB RAM / 1 vCPU / 10GB ($15/mo)
Datacenter: NYC3 (same as droplet)
```

**Spaces:**
```
Name: kdx-portal-files
Name: kdx-portal-backups
Datacenter: NYC3
CDN: Enabled
```

### 2. Configure DNS

```
A Record: @ → DROPLET_IP
A Record: www → DROPLET_IP
```

---

## Deployment (20 minutes)

### 1. Initial Setup

```bash
ssh root@DROPLET_IP

# Clone repository
git clone YOUR_REPO_URL /var/www/kdx-portal
cd /var/www/kdx-portal

# Run setup
chmod +x deployment/scripts/*.sh
./deployment/scripts/01-initial-setup.sh
```

### 2. Configure Environment

```bash
cp deployment/config/.env.production.template .env
nano .env
```

Fill in:
- `DATABASE_URL` (from DigitalOcean Databases)
- `JWT_SECRET` (generate: `openssl rand -base64 32`)
- `S3_*` variables (from Spaces)

### 3. Deploy Application

```bash
# Update repo URL in script
nano deployment/scripts/02-deploy-application.sh

# Deploy
./deployment/scripts/02-deploy-application.sh

# Run migrations
pnpm db:push
```

### 4. Setup SSL

```bash
./deployment/scripts/03-setup-ssl.sh
```

### 5. Configure Monitoring & Backups

```bash
./deployment/scripts/04-setup-monitoring.sh
./deployment/scripts/05-setup-backups.sh
```

---

## Verification

```bash
# Check status
pm2 status
sudo systemctl status nginx

# Test endpoints
curl https://worldpathregulatory.world/health
curl https://worldpathregulatory.world/api/health

# View logs
pm2 logs kdx-portal --lines 50
```

---

## Post-Deployment

1. **Setup UptimeRobot:** https://uptimerobot.com
   - Monitor: `https://worldpathregulatory.world/health`
   - Alert: `bryanra@worldpathregulatory.com`

2. **Enable DO Monitoring:**
   - Droplet → Monitoring → Enable alerts

3. **Create first admin user:**
   - Visit: `https://worldpathregulatory.world`
   - Register with: `bryanra@worldpathregulatory.com`

---

## Maintenance Commands

```bash
# Update application
cd /var/www/kdx-portal && git pull && pnpm install && cd client && pnpm build && cd .. && pm2 restart kdx-portal

# Manual backup
/var/www/kdx-portal/deployment/scripts/backup-database.sh

# View logs
pm2 logs kdx-portal
tail -f /var/log/kdx-portal/access.log
tail -f /var/log/kdx-portal/error.log

# Restart services
pm2 restart kdx-portal
sudo systemctl restart nginx
```

---

## Troubleshooting

**502 Bad Gateway:**
```bash
pm2 restart kdx-portal
sudo systemctl restart nginx
```

**Database Connection:**
```bash
mysql -h DB_HOST -P 25060 -u USER -p
# Check trusted sources in DO dashboard
```

**SSL Issues:**
```bash
sudo certbot renew
sudo systemctl restart nginx
```

---

## Cost Summary

| Service | Monthly Cost |
|---------|--------------|
| Droplet (4GB) | $24.00 |
| MySQL DB (1GB) | $15.00 |
| Spaces (250GB) | $5.00 |
| Backups | $4.80 |
| **Total** | **$48.80** |

---

For detailed documentation, see: `deployment/docs/DEPLOYMENT_GUIDE.md`

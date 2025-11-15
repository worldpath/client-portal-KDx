# KDx Portal - DigitalOcean Deployment Package

Enterprise-grade deployment package for hosting WorldPath Regulatory Solutions portal on DigitalOcean.

---

## 📦 Package Contents

```
deployment/
├── README.md                          # This file
├── scripts/                           # Automated deployment scripts
│   ├── 01-initial-setup.sh           # Server initialization
│   ├── 02-deploy-application.sh      # Application deployment
│   ├── 03-setup-ssl.sh               # SSL certificate setup
│   ├── 04-setup-monitoring.sh        # Monitoring configuration
│   ├── 05-setup-backups.sh           # Backup automation
│   └── backup-database.sh            # Database backup script
├── config/                            # Configuration files
│   ├── nginx.conf                    # Nginx reverse proxy config
│   ├── ecosystem.config.js           # PM2 process manager config
│   └── .env.production.template      # Environment variables template
└── docs/                              # Documentation
    ├── DEPLOYMENT_GUIDE.md           # Complete deployment guide
    └── QUICK_START.md                # Fast-track deployment
```

---

## 🚀 Quick Start

### For First-Time Deployment

1. **Read the documentation:**
   - Detailed guide: [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md)
   - Quick start: [`docs/QUICK_START.md`](docs/QUICK_START.md)

2. **Prepare infrastructure:**
   - Create DigitalOcean Droplet (4GB RAM, $24/mo)
   - Create Managed MySQL Database (1GB RAM, $15/mo)
   - Create DigitalOcean Spaces for file storage ($5/mo)
   - Configure DNS for `worldpathregulatory.world`

3. **Run deployment scripts in order:**
   ```bash
   ./scripts/01-initial-setup.sh
   ./scripts/02-deploy-application.sh
   ./scripts/03-setup-ssl.sh
   ./scripts/04-setup-monitoring.sh
   ./scripts/05-setup-backups.sh
   ```

4. **Configure environment:**
   - Copy `config/.env.production.template` to `/var/www/kdx-portal/.env`
   - Fill in database credentials, Spaces keys, and secrets

5. **Verify deployment:**
   - Visit `https://worldpathregulatory.world`
   - Check health endpoint: `https://worldpathregulatory.world/health`

---

## 💰 Cost Breakdown

| Service | Specification | Monthly Cost |
|---------|--------------|--------------|
| Droplet | 4GB RAM, 2 vCPUs, 80GB SSD | $24.00 |
| MySQL Database | 1GB RAM, 1 vCPU, 10GB storage | $15.00 |
| Spaces (S3) | 250GB storage + 1TB transfer | $5.00 |
| Automated Backups | 20% of droplet cost | $4.80 |
| **Total** | | **$48.80/month** |

---

## 📋 Deployment Checklist

- [ ] DigitalOcean account created and billing configured
- [ ] Domain `worldpathregulatory.world` DNS configured
- [ ] Droplet created (Ubuntu 22.04, 4GB RAM)
- [ ] Managed MySQL database created
- [ ] DigitalOcean Spaces created (files + backups)
- [ ] Spaces API keys generated
- [ ] SSH access to droplet configured
- [ ] Git repository accessible
- [ ] All deployment scripts executed successfully
- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] SSL certificates installed and verified
- [ ] Application accessible via HTTPS
- [ ] UptimeRobot monitoring configured
- [ ] Automated backups tested
- [ ] First admin user created
- [ ] Team notified of deployment

---

## 🔧 Script Descriptions

### 01-initial-setup.sh
Prepares the server environment:
- Updates system packages
- Installs Node.js 22.x, pnpm, PM2
- Installs nginx and certbot for SSL
- Configures UFW firewall
- Installs GraphicsMagick for PDF thumbnails
- Creates application directories

**Duration:** ~10-15 minutes

### 02-deploy-application.sh
Deploys the application:
- Clones Git repository
- Installs dependencies
- Builds client application
- Configures nginx reverse proxy
- Starts application with PM2

**Duration:** ~5-10 minutes

**Note:** Update `REPO_URL` variable before running!

### 03-setup-ssl.sh
Configures SSL certificates:
- Obtains Let's Encrypt certificates
- Configures nginx for HTTPS
- Sets up automatic certificate renewal

**Duration:** ~2-3 minutes

### 04-setup-monitoring.sh
Sets up monitoring and logging:
- Configures PM2 log rotation
- Sets up automated health checks (every 5 minutes)
- Configures application log rotation (14 days)
- Provides instructions for UptimeRobot setup

**Duration:** ~2-3 minutes

### 05-setup-backups.sh
Configures automated backups:
- Daily database backups at 2:00 AM
- 30-day retention period
- Upload to DigitalOcean Spaces
- Weekly droplet snapshot reminders

**Duration:** ~2-3 minutes

### backup-database.sh
Manual database backup script:
- Creates compressed MySQL dump
- Uploads to DigitalOcean Spaces
- Cleans up old backups
- Sends notification email

**Run manually:** `/var/www/kdx-portal/deployment/scripts/backup-database.sh`

---

## 🔐 Security Features

- **SSL/TLS encryption** via Let's Encrypt
- **Firewall (UFW)** configured with minimal open ports
- **Database SSL** connections required
- **Private file storage** with signed URLs
- **Rate limiting** on API endpoints
- **Security headers** configured in nginx
- **Automated security updates** via unattended-upgrades

---

## 📊 Monitoring & Alerts

### Included Monitoring

- **PM2 process monitoring** - Auto-restart on crashes
- **Automated health checks** - Every 5 minutes
- **Log rotation** - Prevents disk space issues
- **DigitalOcean metrics** - CPU, memory, disk, network

### Recommended External Monitoring

- **UptimeRobot** (free tier):
  - Monitor: `https://worldpathregulatory.world/health`
  - Interval: 5 minutes
  - Alert email: `bryanra@worldpathregulatory.com`

### Alert Thresholds

- CPU usage > 80%
- Memory usage > 85%
- Disk usage > 85%
- Application downtime > 2 minutes

---

## 🔄 Backup Strategy

### Automated Backups

- **Database:** Daily at 2:00 AM, 30-day retention
- **Droplet:** Weekly snapshots (manual via reminder)
- **Files:** Stored in DigitalOcean Spaces (redundant)

### Recovery Time Objectives

- **Database restore:** ~10 minutes
- **Full system restore:** ~30 minutes
- **Data loss window:** 24 hours (daily backups)

---

## 🛠 Maintenance

### Daily
```bash
pm2 status                    # Check application status
pm2 logs kdx-portal --lines 50  # Review logs
```

### Weekly
- Review UptimeRobot reports
- Check backup logs
- Create droplet snapshot

### Monthly
- Review DigitalOcean billing
- Update system packages
- Review and optimize database
- Clean old Spaces files

### Application Updates
```bash
cd /var/www/kdx-portal
git pull origin main
pnpm install
cd client && pnpm build && cd ..
pm2 restart kdx-portal
```

---

## 🆘 Troubleshooting

### Common Issues

**502 Bad Gateway:**
```bash
pm2 restart kdx-portal
sudo systemctl restart nginx
```

**Database Connection Failed:**
```bash
# Check database credentials in .env
grep DATABASE_URL /var/www/kdx-portal/.env

# Test connection
mysql -h DB_HOST -P 25060 -u USER -p

# Verify droplet IP in database trusted sources
```

**File Upload Failures:**
```bash
# Check Spaces credentials
grep S3_ /var/www/kdx-portal/.env

# Verify nginx upload limit
grep client_max_body_size /etc/nginx/sites-enabled/kdx-portal
```

**SSL Certificate Issues:**
```bash
sudo certbot renew
sudo systemctl restart nginx
```

### View Logs

```bash
# Application logs
pm2 logs kdx-portal

# Nginx access logs
tail -f /var/log/kdx-portal/access.log

# Nginx error logs
tail -f /var/log/kdx-portal/error.log

# Backup logs
tail -f /var/log/kdx-portal/backup.log

# Health check logs
tail -f /var/log/kdx-portal/health-check.log
```

---

## 📞 Support

For deployment issues or questions:
- **Email:** bryanra@worldpathregulatory.com
- **Documentation:** See `docs/DEPLOYMENT_GUIDE.md`
- **DigitalOcean Support:** https://www.digitalocean.com/support

---

## 📝 License

Proprietary - WorldPath Regulatory Solutions

---

**Last Updated:** November 2025  
**Package Version:** 1.0.0  
**Tested On:** Ubuntu 22.04 LTS, Node.js 22.x

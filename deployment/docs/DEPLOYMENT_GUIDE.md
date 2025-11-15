# KDx Portal - DigitalOcean Deployment Guide

Complete guide for deploying WorldPath Regulatory Solutions portal to DigitalOcean for enterprise production use.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Cost Breakdown](#cost-breakdown)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Application Deployment](#application-deployment)
5. [Post-Deployment Configuration](#post-deployment-configuration)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)
8. [Backup & Recovery](#backup--recovery)

---

## Prerequisites

Before starting deployment, ensure you have:

- DigitalOcean account with billing configured
- Domain name `worldpathregulatory.world` with DNS access
- Git repository with your application code
- SSH key pair for secure server access
- Email account `bryanra@worldpathregulatory.com` for alerts

---

## Cost Breakdown

### Monthly Recurring Costs

| Service | Specification | Monthly Cost |
|---------|--------------|--------------|
| **Droplet** | 4GB RAM, 2 vCPUs, 80GB SSD | $24.00 |
| **Managed MySQL** | 1GB RAM, 1 vCPU, 10GB storage | $15.00 |
| **Spaces (S3)** | 250GB storage + 1TB transfer | $5.00 |
| **Automated Backups** | Droplet backups (20% of droplet) | $4.80 |
| **Domain (if purchased)** | .world TLD | ~$30/year |
| **Total** | | **~$49/month** |

### One-Time Costs

- Domain registration (if not owned): ~$30/year
- Initial setup time: ~2-3 hours

### Cost Optimization Tips

1. **Use Reserved Instances**: Save 10-15% with 1-year commitment
2. **Enable CDN**: Reduce Spaces bandwidth costs
3. **Optimize Images**: Reduce storage and transfer costs
4. **Monitor Usage**: Set billing alerts at $40, $50, $60

---

## Infrastructure Setup

### Step 1: Create DigitalOcean Droplet

1. **Log in to DigitalOcean** → Click "Create" → "Droplets"

2. **Choose Configuration:**
   - **Image**: Ubuntu 22.04 LTS x64
   - **Plan**: Basic
   - **CPU Options**: Premium Intel
   - **Size**: 4GB RAM / 2 vCPUs / 80GB SSD ($24/month)
   - **Datacenter**: New York 3 (or closest to your users)
   - **VPC Network**: Default
   - **Authentication**: SSH keys (recommended) or Password
   - **Hostname**: `kdx-portal-prod`
   - **Enable Backups**: ✓ Yes (adds $4.80/month)
   - **Monitoring**: ✓ Yes (free)

3. **Click "Create Droplet"** and wait ~60 seconds

4. **Note your Droplet IP address** (e.g., `159.65.123.45`)

### Step 2: Configure DNS

1. **Go to your domain registrar** (where you bought worldpathregulatory.world)

2. **Add DNS A Records:**
   ```
   Type: A
   Name: @
   Value: YOUR_DROPLET_IP
   TTL: 3600

   Type: A
   Name: www
   Value: YOUR_DROPLET_IP
   TTL: 3600
   ```

3. **Wait for DNS propagation** (5-30 minutes)
   - Test with: `dig worldpathregulatory.world`

### Step 3: Create Managed MySQL Database

1. **DigitalOcean Dashboard** → "Databases" → "Create Database Cluster"

2. **Configuration:**
   - **Database Engine**: MySQL 8
   - **Plan**: Basic
   - **Size**: 1GB RAM / 1 vCPU / 10GB storage ($15/month)
   - **Datacenter**: Same as droplet (New York 3)
   - **Database Name**: `kdx_portal`
   - **Trusted Sources**: Add your droplet's IP

3. **Click "Create Database Cluster"** and wait ~5 minutes

4. **Save Connection Details:**
   - Go to "Connection Details"
   - Copy the connection string (starts with `mysql://`)
   - You'll need this for environment variables

### Step 4: Create DigitalOcean Spaces (S3 Storage)

1. **DigitalOcean Dashboard** → "Spaces" → "Create Space"

2. **Configuration:**
   - **Datacenter**: Same as droplet (NYC3)
   - **Enable CDN**: ✓ Yes (recommended)
   - **Space Name**: `kdx-portal-files`
   - **File Listing**: Private (recommended)

3. **Create Spaces Access Keys:**
   - Go to "API" → "Spaces Keys" → "Generate New Key"
   - Name: `kdx-portal-production`
   - **Save Access Key ID and Secret Key** (shown only once!)

4. **Note your Spaces endpoint:**
   - Without CDN: `https://kdx-portal-files.nyc3.digitaloceanspaces.com`
   - With CDN: `https://kdx-portal-files.nyc3.cdn.digitaloceanspaces.com`

### Step 5: Create Backup Space (Optional but Recommended)

1. **Create another Space** for database backups:
   - Name: `kdx-portal-backups`
   - Same datacenter
   - Private access

---

## Application Deployment

### Step 1: Connect to Your Droplet

```bash
ssh root@YOUR_DROPLET_IP
```

### Step 2: Run Initial Setup Script

```bash
# Download deployment scripts (or clone your repository)
cd /tmp
git clone YOUR_REPOSITORY_URL kdx-portal-deploy
cd kdx-portal-deploy/deployment/scripts

# Make scripts executable
chmod +x *.sh

# Run initial setup
./01-initial-setup.sh
```

This script will:
- Update system packages
- Install Node.js 22.x, pnpm, PM2
- Install nginx and certbot
- Configure firewall (UFW)
- Install GraphicsMagick for PDF thumbnails
- Create application directories

**Duration:** ~10-15 minutes

### Step 3: Configure Git Repository

Before deploying, update the repository URL in the deployment script:

```bash
nano /var/www/kdx-portal/deployment/scripts/02-deploy-application.sh
```

Change this line:
```bash
REPO_URL="YOUR_GIT_REPOSITORY_URL"
```

To your actual repository:
```bash
REPO_URL="https://github.com/yourusername/kdx-portal.git"
```

### Step 4: Deploy Application

```bash
cd /var/www/kdx-portal/deployment/scripts
./02-deploy-application.sh
```

This script will:
- Clone your repository
- Install dependencies
- Build client application
- Configure nginx
- Start application with PM2

**Duration:** ~5-10 minutes

### Step 5: Configure Environment Variables

```bash
cd /var/www/kdx-portal
cp deployment/config/.env.production.template .env
nano .env
```

**Fill in these critical values:**

```bash
# Database (from Step 3)
DATABASE_URL=mysql://doadmin:PASSWORD@HOST:25060/kdx_portal?ssl-mode=REQUIRED

# Security (generate with: openssl rand -base64 32)
JWT_SECRET=YOUR_GENERATED_SECRET_HERE

# Spaces Storage (from Step 4)
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_REGION=nyc3
S3_BUCKET=kdx-portal-files
S3_ACCESS_KEY_ID=YOUR_SPACES_KEY
S3_SECRET_ACCESS_KEY=YOUR_SPACES_SECRET
S3_PUBLIC_URL=https://kdx-portal-files.nyc3.cdn.digitaloceanspaces.com

# Backup Space
BACKUP_S3_BUCKET=kdx-portal-backups
```

Save and exit (Ctrl+X, Y, Enter)

### Step 6: Run Database Migrations

```bash
cd /var/www/kdx-portal
pnpm db:push
```

This creates all database tables and schema.

### Step 7: Setup SSL Certificates

```bash
cd /var/www/kdx-portal/deployment/scripts
./03-setup-ssl.sh
```

This script will:
- Obtain Let's Encrypt SSL certificates
- Configure nginx for HTTPS
- Setup automatic certificate renewal

**Duration:** ~2-3 minutes

### Step 8: Restart Application

```bash
pm2 restart kdx-portal
pm2 save
```

### Step 9: Verify Deployment

1. **Check application status:**
   ```bash
   pm2 status
   pm2 logs kdx-portal --lines 50
   ```

2. **Check nginx status:**
   ```bash
   sudo systemctl status nginx
   sudo nginx -t
   ```

3. **Test HTTPS access:**
   ```bash
   curl https://worldpathregulatory.world/health
   ```
   Should return: `healthy`

4. **Open in browser:**
   - Visit: `https://worldpathregulatory.world`
   - Should see login page

---

## Post-Deployment Configuration

### Setup Monitoring

```bash
cd /var/www/kdx-portal/deployment/scripts
./04-setup-monitoring.sh
```

This configures:
- PM2 log rotation
- Automated health checks (every 5 minutes)
- Application log rotation (14 days)

**Then setup external monitoring:**

1. **UptimeRobot (Free):**
   - Visit: https://uptimerobot.com
   - Create account
   - Add monitor:
     * Type: HTTP(s)
     * URL: `https://worldpathregulatory.world/health`
     * Interval: 5 minutes
     * Alert email: `bryanra@worldpathregulatory.com`

2. **DigitalOcean Monitoring:**
   - Droplet → Monitoring tab
   - Enable email alerts for:
     * CPU > 80%
     * Memory > 85%
     * Disk > 85%

### Setup Automated Backups

```bash
cd /var/www/kdx-portal/deployment/scripts
./05-setup-backups.sh
```

This configures:
- Daily database backups at 2:00 AM
- 30-day retention period
- Upload to DigitalOcean Spaces
- Weekly droplet snapshot reminders

**Verify backup is working:**
```bash
tail -f /var/log/kdx-portal/backup.log
```

### Create First Admin User

1. **Access your application:** `https://worldpathregulatory.world`
2. **Register first user** (will be automatically set as admin)
3. **Or manually promote user to admin:**
   ```bash
   mysql -h DATABASE_HOST -u USER -p
   USE kdx_portal;
   UPDATE users SET role='admin' WHERE email='bryanra@worldpathregulatory.com';
   ```

---

## Monitoring & Maintenance

### Daily Checks

```bash
# Check application status
pm2 status

# View recent logs
pm2 logs kdx-portal --lines 100

# Check disk space
df -h

# Check memory usage
free -h
```

### Weekly Tasks

- Review UptimeRobot reports
- Check backup logs: `tail -100 /var/log/kdx-portal/backup.log`
- Review error logs: `tail -100 /var/log/kdx-portal/error.log`
- Create droplet snapshot (via email reminder)

### Monthly Tasks

- Review DigitalOcean billing
- Check database size and optimize if needed
- Review and clean old Spaces files
- Update system packages: `sudo apt-get update && sudo apt-get upgrade`

### Updating Application

```bash
cd /var/www/kdx-portal
git pull origin main
pnpm install
cd client && pnpm build && cd ..
pm2 restart kdx-portal
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs kdx-portal --lines 200

# Check environment variables
cat /var/www/kdx-portal/.env

# Restart application
pm2 restart kdx-portal

# If still failing, check database connection
mysql -h HOST -u USER -p
```

### 502 Bad Gateway Error

```bash
# Check if application is running
pm2 status

# Check nginx error logs
sudo tail -100 /var/log/nginx/error.log

# Restart nginx
sudo systemctl restart nginx

# Restart application
pm2 restart kdx-portal
```

### Database Connection Issues

```bash
# Test database connectivity
mysql -h DATABASE_HOST -P 25060 -u USER -p

# Check if droplet IP is in database trusted sources
# DigitalOcean → Databases → Your DB → Settings → Trusted Sources

# Verify DATABASE_URL in .env is correct
grep DATABASE_URL /var/www/kdx-portal/.env
```

### File Upload Failures

```bash
# Check Spaces credentials
grep S3_ /var/www/kdx-portal/.env

# Test Spaces access
s3cmd ls s3://kdx-portal-files/

# Check nginx upload size limit
grep client_max_body_size /etc/nginx/sites-enabled/kdx-portal
```

### High Memory Usage

```bash
# Check memory usage
free -h
htop

# Restart application to free memory
pm2 restart kdx-portal

# Consider upgrading droplet if consistently high
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificates manually
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

---

## Backup & Recovery

### Manual Database Backup

```bash
/var/www/kdx-portal/deployment/scripts/backup-database.sh
```

Backup location: `/var/backups/kdx-portal/database/`

### Restore from Database Backup

```bash
# List available backups
ls -lh /var/backups/kdx-portal/database/

# Restore specific backup
gunzip < /var/backups/kdx-portal/database/kdx-portal-db-TIMESTAMP.sql.gz | \
mysql -h DATABASE_HOST -P 25060 -u USER -p kdx_portal
```

### Create Droplet Snapshot

**Via DigitalOcean Dashboard:**
1. Droplets → Your Droplet → Snapshots
2. Click "Take Snapshot"
3. Name: `kdx-portal-YYYYMMDD`

**Via CLI (if doctl installed):**
```bash
doctl compute droplet-action snapshot DROPLET_ID --snapshot-name kdx-portal-$(date +%Y%m%d)
```

### Restore from Droplet Snapshot

1. DigitalOcean → Droplets → Create
2. Choose "Snapshots" tab
3. Select your snapshot
4. Create new droplet
5. Update DNS to point to new droplet IP

### Disaster Recovery Plan

**If droplet becomes unresponsive:**

1. **Create new droplet from latest snapshot**
2. **Update DNS A records** to new droplet IP
3. **Restore latest database backup** if needed
4. **Verify application functionality**
5. **Update monitoring** to use new IP

**Recovery Time Objective (RTO):** ~30 minutes  
**Recovery Point Objective (RPO):** 24 hours (daily backups)

---

## Security Best Practices

1. **Keep system updated:**
   ```bash
   sudo apt-get update && sudo apt-get upgrade
   ```

2. **Use strong passwords** for database and admin accounts

3. **Enable 2FA** on DigitalOcean account

4. **Regularly review access logs:**
   ```bash
   tail -100 /var/log/kdx-portal/access.log
   ```

5. **Monitor for suspicious activity** via UptimeRobot and logs

6. **Keep SSL certificates current** (auto-renewed by certbot)

7. **Restrict database access** to droplet IP only

8. **Use private Spaces** for sensitive files

---

## Support & Resources

- **DigitalOcean Documentation:** https://docs.digitalocean.com
- **DigitalOcean Community:** https://www.digitalocean.com/community
- **PM2 Documentation:** https://pm2.keymetrics.io/docs
- **Nginx Documentation:** https://nginx.org/en/docs
- **Let's Encrypt:** https://letsencrypt.org/docs

---

## Deployment Checklist

- [ ] Droplet created and accessible via SSH
- [ ] DNS configured and propagated
- [ ] Managed MySQL database created
- [ ] DigitalOcean Spaces created (files + backups)
- [ ] Initial setup script completed
- [ ] Application deployed
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] Application accessible via HTTPS
- [ ] Monitoring configured (UptimeRobot + DO)
- [ ] Automated backups configured
- [ ] First admin user created
- [ ] Weekly snapshot schedule confirmed
- [ ] Team members notified of new URL

---

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Droplet IP:** _______________  
**Database Host:** _______________  

---

*For questions or issues, contact: bryanra@worldpathregulatory.com*

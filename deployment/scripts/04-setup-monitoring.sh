#!/bin/bash
set -e

echo "========================================="
echo "KDx Portal - Monitoring Setup"
echo "========================================="
echo ""

# Configuration
DOMAIN="worldpathregulatory.world"
ALERT_EMAIL="bryanra@worldpathregulatory.com"

echo "This script will help you set up monitoring for your KDx Portal."
echo ""
echo "We recommend using UptimeRobot (free tier) for uptime monitoring:"
echo "  1. Visit https://uptimerobot.com and create a free account"
echo "  2. Add a new monitor with these settings:"
echo "     - Monitor Type: HTTP(s)"
echo "     - URL: https://$DOMAIN/health"
echo "     - Monitoring Interval: 5 minutes"
echo "     - Alert Contacts: $ALERT_EMAIL"
echo ""

# Install monitoring tools
echo "→ Installing monitoring tools..."
sudo apt-get install -y htop iotop nethogs

# Setup PM2 monitoring
echo "→ Configuring PM2 monitoring..."
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

# Create monitoring script
cat > /usr/local/bin/kdx-health-check.sh << 'EOF'
#!/bin/bash
# KDx Portal Health Check Script

# Check if application is running
if ! pm2 list | grep -q "kdx-portal.*online"; then
    echo "ERROR: Application is not running!"
    pm2 restart kdx-portal
    echo "Application restarted at $(date)" >> /var/log/kdx-portal/auto-restart.log
fi

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 85 ]; then
    echo "WARNING: Disk usage is at ${DISK_USAGE}%"
fi

# Check memory usage
MEM_USAGE=$(free | grep Mem | awk '{print ($3/$2) * 100.0}' | cut -d'.' -f1)
if [ $MEM_USAGE -gt 85 ]; then
    echo "WARNING: Memory usage is at ${MEM_USAGE}%"
fi

# Check database connectivity
if ! timeout 5 mysql -h$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p') -P$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p') -u$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p') -p$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p') -e "SELECT 1" &>/dev/null; then
    echo "ERROR: Database connection failed!"
fi
EOF

chmod +x /usr/local/bin/kdx-health-check.sh

# Setup cron job for health checks
echo "→ Setting up automated health checks..."
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/kdx-health-check.sh >> /var/log/kdx-portal/health-check.log 2>&1") | crontab -

# Setup log rotation for application logs
echo "→ Configuring log rotation..."
sudo tee /etc/logrotate.d/kdx-portal > /dev/null << 'EOF'
/var/log/kdx-portal/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 $USER $USER
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

echo ""
echo "✓ Monitoring setup complete!"
echo ""
echo "Configured monitoring:"
echo "  • PM2 log rotation (7 days, 10MB max)"
echo "  • Automated health checks (every 5 minutes)"
echo "  • Application log rotation (14 days)"
echo ""
echo "Next steps:"
echo "  1. Setup UptimeRobot monitoring at https://uptimerobot.com"
echo "  2. Configure DigitalOcean Monitoring (Droplet > Monitoring tab)"
echo "  3. Enable email alerts for droplet metrics"
echo ""
echo "View monitoring logs:"
echo "  • Health checks: tail -f /var/log/kdx-portal/health-check.log"
echo "  • Application: pm2 logs kdx-portal"
echo "  • Nginx access: tail -f /var/log/kdx-portal/access.log"
echo "  • Nginx errors: tail -f /var/log/kdx-portal/error.log"
echo ""

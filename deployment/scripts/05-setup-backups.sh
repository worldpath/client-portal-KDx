#!/bin/bash
set -e

echo "========================================="
echo "KDx Portal - Backup Automation Setup"
echo "========================================="
echo ""

# Make backup script executable
chmod +x /var/www/kdx-portal/deployment/scripts/backup-database.sh

# Setup daily database backups at 2 AM
echo "→ Configuring daily database backups (2:00 AM)..."
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/kdx-portal/deployment/scripts/backup-database.sh >> /var/log/kdx-portal/backup.log 2>&1") | crontab -

# Create backup directories
echo "→ Creating backup directories..."
sudo mkdir -p /var/backups/kdx-portal/database
sudo mkdir -p /var/backups/kdx-portal/droplet
sudo chown -R $USER:$USER /var/backups/kdx-portal

# Setup weekly droplet snapshots reminder
echo "→ Setting up weekly snapshot reminder..."
cat > /usr/local/bin/kdx-snapshot-reminder.sh << 'EOF'
#!/bin/bash
echo "========================================="
echo "Weekly Droplet Snapshot Reminder"
echo "========================================="
echo ""
echo "It's time to create a weekly droplet snapshot!"
echo ""
echo "Steps:"
echo "  1. Log in to DigitalOcean Control Panel"
echo "  2. Go to Droplets > Your Droplet > Snapshots"
echo "  3. Click 'Take Snapshot'"
echo "  4. Name it: kdx-portal-$(date +%Y%m%d)"
echo ""
echo "Or use DigitalOcean CLI:"
echo "  doctl compute droplet-action snapshot YOUR_DROPLET_ID --snapshot-name kdx-portal-$(date +%Y%m%d)"
echo ""
EOF

chmod +x /usr/local/bin/kdx-snapshot-reminder.sh

# Schedule weekly snapshot reminder (Sundays at 1 AM)
(crontab -l 2>/dev/null; echo "0 1 * * 0 /usr/local/bin/kdx-snapshot-reminder.sh | mail -s 'KDx Portal - Weekly Snapshot Reminder' bryanra@worldpathregulatory.com") | crontab -

# Test database backup
echo "→ Running test database backup..."
/var/www/kdx-portal/deployment/scripts/backup-database.sh

echo ""
echo "✓ Backup automation configured successfully!"
echo ""
echo "Backup schedule:"
echo "  • Database backups: Daily at 2:00 AM"
echo "  • Retention period: 30 days"
echo "  • Droplet snapshots: Weekly (manual via reminder email)"
echo ""
echo "Backup locations:"
echo "  • Local: /var/backups/kdx-portal/database/"
echo "  • Remote: DigitalOcean Spaces (if configured)"
echo ""
echo "To manually trigger a backup:"
echo "  /var/www/kdx-portal/deployment/scripts/backup-database.sh"
echo ""
echo "To restore from backup:"
echo "  gunzip < /var/backups/kdx-portal/database/BACKUP_FILE.sql.gz | mysql -h HOST -u USER -p DATABASE"
echo ""

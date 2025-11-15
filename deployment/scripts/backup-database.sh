#!/bin/bash
set -e

# KDx Portal - Database Backup Script
# This script creates automated backups of the MySQL database
# and uploads them to DigitalOcean Spaces for redundancy

# Configuration
BACKUP_DIR="/var/backups/kdx-portal/database"
RETENTION_DAYS=30
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="kdx-portal-db-${TIMESTAMP}.sql.gz"

# Load database credentials from environment
source /var/www/kdx-portal/.env

# Extract database connection details from DATABASE_URL
# Format: mysql://username:password@host:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

echo "========================================="
echo "KDx Portal - Database Backup"
echo "========================================="
echo "Timestamp: $(date)"
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"
echo ""

# Create database dump
echo "→ Creating database backup..."
mysqldump \
  --host=$DB_HOST \
  --port=$DB_PORT \
  --user=$DB_USER \
  --password=$DB_PASS \
  --single-transaction \
  --routines \
  --triggers \
  --ssl-mode=REQUIRED \
  $DB_NAME | gzip > "$BACKUP_DIR/$BACKUP_FILE"

# Check if backup was successful
if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    echo "✓ Backup created successfully: $BACKUP_SIZE"
else
    echo "✗ Backup failed!"
    exit 1
fi

# Upload to DigitalOcean Spaces (if configured)
if [ ! -z "$S3_ACCESS_KEY_ID" ] && [ ! -z "$BACKUP_S3_BUCKET" ]; then
    echo "→ Uploading backup to DigitalOcean Spaces..."
    
    # Install s3cmd if not present
    if ! command -v s3cmd &> /dev/null; then
        echo "Installing s3cmd..."
        sudo apt-get install -y s3cmd
    fi
    
    # Configure s3cmd
    cat > /tmp/s3cfg << EOF
[default]
access_key = $S3_ACCESS_KEY_ID
secret_key = $S3_SECRET_ACCESS_KEY
host_base = ${S3_ENDPOINT#https://}
host_bucket = %(bucket)s.${S3_ENDPOINT#https://}
use_https = True
EOF
    
    # Upload to Spaces
    s3cmd -c /tmp/s3cfg put "$BACKUP_DIR/$BACKUP_FILE" "s3://$BACKUP_S3_BUCKET/database/$BACKUP_FILE"
    rm /tmp/s3cfg
    
    echo "✓ Backup uploaded to Spaces"
fi

# Clean up old backups (keep last RETENTION_DAYS days)
echo "→ Cleaning up old backups (keeping last $RETENTION_DAYS days)..."
find $BACKUP_DIR -name "kdx-portal-db-*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

# Count remaining backups
BACKUP_COUNT=$(find $BACKUP_DIR -name "kdx-portal-db-*.sql.gz" -type f | wc -l)
echo "✓ Local backups retained: $BACKUP_COUNT"

# Send notification email (if configured)
if [ ! -z "$BACKUP_NOTIFICATION_EMAIL" ]; then
    echo "Database backup completed successfully at $(date)" | \
    mail -s "KDx Portal - Database Backup Success" $BACKUP_NOTIFICATION_EMAIL
fi

echo ""
echo "✓ Backup completed successfully!"
echo "Location: $BACKUP_DIR/$BACKUP_FILE"
echo ""

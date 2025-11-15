#!/bin/bash
set -e

# KDx Portal - Production Deployment Script
# This script is called by GitHub Actions CD workflow
# Can also be run manually for emergency deployments

echo "========================================="
echo "KDx Portal - Production Deployment"
echo "========================================="
echo "Started at: $(date)"
echo ""

# Configuration
APP_DIR="/var/www/kdx-portal"
BACKUP_DIR="/var/backups/kdx-portal/deployments"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Navigate to application directory
cd $APP_DIR

# Backup current state before deployment
echo "→ Creating pre-deployment backup..."
CURRENT_COMMIT=$(git rev-parse HEAD)
echo $CURRENT_COMMIT > $BACKUP_DIR/last-deployment-$TIMESTAMP.txt
git diff HEAD > $BACKUP_DIR/uncommitted-changes-$TIMESTAMP.diff || true

# Pull latest changes
echo "→ Pulling latest changes from repository..."
git fetch origin
BEFORE_COMMIT=$(git rev-parse HEAD)
git pull origin main
AFTER_COMMIT=$(git rev-parse HEAD)

if [ "$BEFORE_COMMIT" = "$AFTER_COMMIT" ]; then
    echo "✓ Already up to date (no new commits)"
else
    echo "✓ Updated from $BEFORE_COMMIT to $AFTER_COMMIT"
    git log --oneline $BEFORE_COMMIT..$AFTER_COMMIT
fi

# Install dependencies
echo "→ Installing dependencies..."
pnpm install --frozen-lockfile

# Build client application
echo "→ Building client application..."
cd client
pnpm build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "✗ Build failed: dist directory not found"
    exit 1
fi

BUILD_SIZE=$(du -sh dist | cut -f1)
echo "✓ Build successful: $BUILD_SIZE"
cd ..

# Run database migrations (if needed)
echo "→ Running database migrations..."
pnpm db:push 2>&1 | tee /tmp/migration-output.log || {
    echo "⚠ Migration warning (may be normal if no changes)"
}

# Restart application with PM2
echo "→ Restarting application with PM2..."
pm2 restart kdx-portal --update-env

# Wait for application to start
echo "→ Waiting for application to start..."
sleep 5

# Check PM2 status
echo "→ Checking PM2 status..."
pm2 list

# Test health endpoint
echo "→ Testing health endpoint..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)

if [ "$HEALTH_CHECK" = "200" ]; then
    echo "✓ Health check passed (HTTP $HEALTH_CHECK)"
else
    echo "✗ Health check failed (HTTP $HEALTH_CHECK)"
    echo "Rolling back to previous commit..."
    git reset --hard $BEFORE_COMMIT
    pm2 restart kdx-portal
    exit 1
fi

# Save PM2 process list
pm2 save

# Clean up old deployment backups (keep last 10)
echo "→ Cleaning up old deployment backups..."
cd $BACKUP_DIR
ls -t last-deployment-*.txt | tail -n +11 | xargs -r rm
ls -t uncommitted-changes-*.diff | tail -n +11 | xargs -r rm

echo ""
echo "========================================="
echo "✓ Deployment completed successfully!"
echo "========================================="
echo "Deployed commit: $AFTER_COMMIT"
echo "Build size: $BUILD_SIZE"
echo "Completed at: $(date)"
echo ""

# Log deployment to file
echo "$(date '+%Y-%m-%d %H:%M:%S') - Deployed $AFTER_COMMIT by ${USER:-automated}" >> /var/log/kdx-portal/deployments.log

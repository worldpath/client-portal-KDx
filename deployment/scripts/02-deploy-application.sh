#!/bin/bash
set -e

echo "========================================="
echo "KDx Portal - Application Deployment"
echo "========================================="
echo ""

# Configuration
APP_DIR="/var/www/kdx-portal"
REPO_URL="YOUR_GIT_REPOSITORY_URL"  # Replace with your actual repository URL
BRANCH="main"

# Check if repository URL is configured
if [ "$REPO_URL" = "YOUR_GIT_REPOSITORY_URL" ]; then
    echo "ERROR: Please configure REPO_URL in this script first!"
    echo "Edit deployment/scripts/02-deploy-application.sh and set your Git repository URL"
    exit 1
fi

# Navigate to application directory
cd $APP_DIR

# Clone or pull repository
if [ -d ".git" ]; then
    echo "→ Pulling latest changes from repository..."
    git pull origin $BRANCH
else
    echo "→ Cloning repository..."
    git clone -b $BRANCH $REPO_URL .
fi

# Install dependencies
echo "→ Installing dependencies..."
pnpm install --frozen-lockfile

# Build client application
echo "→ Building client application..."
cd client
pnpm build
cd ..

# Copy nginx configuration
echo "→ Installing nginx configuration..."
sudo cp deployment/config/nginx.conf /etc/nginx/sites-available/kdx-portal
sudo ln -sf /etc/nginx/sites-available/kdx-portal /etc/nginx/sites-enabled/kdx-portal
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
echo "→ Testing nginx configuration..."
sudo nginx -t

# Reload nginx
echo "→ Reloading nginx..."
sudo systemctl reload nginx

# Setup PM2 ecosystem
echo "→ Configuring PM2..."
pm2 delete kdx-portal 2>/dev/null || true
pm2 start deployment/config/ecosystem.config.js
pm2 save

echo ""
echo "✓ Application deployed successfully!"
echo ""
echo "Next steps:"
echo "1. Configure environment variables: nano /var/www/kdx-portal/.env"
echo "2. Run database migrations: cd /var/www/kdx-portal && pnpm db:push"
echo "3. Setup SSL: ./deployment/scripts/03-setup-ssl.sh"
echo "4. Check application status: pm2 status"
echo "5. View logs: pm2 logs kdx-portal"
echo ""

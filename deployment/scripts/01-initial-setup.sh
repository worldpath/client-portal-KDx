#!/bin/bash
set -e

echo "========================================="
echo "KDx Portal - Initial Server Setup"
echo "========================================="
echo ""

# Update system packages
echo "→ Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install essential tools
echo "→ Installing essential tools..."
sudo apt-get install -y curl wget git build-essential nginx certbot python3-certbot-nginx ufw

# Install Node.js 22.x (LTS)
echo "→ Installing Node.js 22.x..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
echo "→ Installing pnpm..."
sudo npm install -g pnpm

# Install PM2 for process management
echo "→ Installing PM2..."
sudo npm install -g pm2

# Setup PM2 to start on boot
echo "→ Configuring PM2 startup..."
sudo pm2 startup systemd -u $USER --hp /home/$USER
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER

# Configure firewall
echo "→ Configuring UFW firewall..."
sudo ufw --force enable
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw status

# Install GraphicsMagick for PDF thumbnails
echo "→ Installing GraphicsMagick..."
sudo apt-get install -y graphicsmagick

# Create application directory
echo "→ Creating application directory..."
sudo mkdir -p /var/www/kdx-portal
sudo chown -R $USER:$USER /var/www/kdx-portal

# Create logs directory
echo "→ Creating logs directory..."
sudo mkdir -p /var/log/kdx-portal
sudo chown -R $USER:$USER /var/log/kdx-portal

echo ""
echo "✓ Initial server setup complete!"
echo ""
echo "Next steps:"
echo "1. Run 02-deploy-application.sh to deploy the application"
echo "2. Configure your environment variables in /var/www/kdx-portal/.env"
echo "3. Run 03-setup-ssl.sh to configure SSL certificates"
echo ""

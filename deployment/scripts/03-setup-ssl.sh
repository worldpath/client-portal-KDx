#!/bin/bash
set -e

echo "========================================="
echo "KDx Portal - SSL Certificate Setup"
echo "========================================="
echo ""

# Configuration
DOMAIN="worldpathregulatory.world"
EMAIL="bryanra@worldpathregulatory.com"

echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo ""

# Obtain SSL certificate
echo "→ Obtaining SSL certificate from Let's Encrypt..."
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

# Setup auto-renewal
echo "→ Setting up automatic certificate renewal..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal process
echo "→ Testing certificate renewal..."
sudo certbot renew --dry-run

echo ""
echo "✓ SSL certificate installed successfully!"
echo ""
echo "Your site is now accessible at:"
echo "  https://$DOMAIN"
echo "  https://www.$DOMAIN"
echo ""
echo "Certificate auto-renewal is configured and will run automatically."
echo ""

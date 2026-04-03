#!/bin/bash
set -e

echo "============================================"
echo "  TCN Coffee Management - VPS Setup Script"
echo "  Domain: lvtcenter.it.com"
echo "  Server: Ubuntu VPS"
echo "============================================"
echo ""

# =============================================
# 1. Update system & install dependencies
# =============================================
echo "[1/7] Updating system packages..."
apt update && apt upgrade -y
apt install -y nginx certbot python3-certbot-nginx unzip wget curl

# =============================================
# 2. Install PocketBase
# =============================================
echo "[2/7] Installing PocketBase..."
mkdir -p /opt/pocketbase
cd /opt/pocketbase

# Download PocketBase for Linux AMD64 (latest stable)
PB_VERSION="0.25.9"
wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" -O pocketbase.zip
unzip -o pocketbase.zip
rm pocketbase.zip
chmod +x pocketbase

echo "PocketBase ${PB_VERSION} installed at /opt/pocketbase/"

# =============================================
# 3. Setup PocketBase systemd service
# =============================================
echo "[3/7] Setting up PocketBase systemd service..."
cp /tmp/deploy/pocketbase.service /etc/systemd/system/pocketbase.service
systemctl daemon-reload
systemctl enable pocketbase
systemctl start pocketbase

echo "PocketBase service started on 127.0.0.1:8090"

# Wait for PocketBase to start
sleep 3

# =============================================
# 4. Deploy React frontend
# =============================================
echo "[4/7] Deploying React frontend..."
mkdir -p /var/www/tancaonguyen
cp -r /tmp/deploy/dist/* /var/www/tancaonguyen/
chown -R www-data:www-data /var/www/tancaonguyen

echo "Frontend deployed to /var/www/tancaonguyen/"

# =============================================
# 5. Configure Nginx (HTTP first for certbot)
# =============================================
echo "[5/7] Configuring Nginx (HTTP only first)..."

# Create a temporary HTTP-only config for certbot validation
cat > /etc/nginx/sites-available/tancaonguyen << 'NGINX_TEMP'
server {
    listen 80;
    server_name lvtcenter.it.com;

    root /var/www/tancaonguyen;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8090/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }

    location /_/ {
        proxy_pass http://127.0.0.1:8090/_/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 256;
}
NGINX_TEMP

# Enable site, disable default
ln -sf /etc/nginx/sites-available/tancaonguyen /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo "Nginx configured and running"

# =============================================
# 6. Setup SSL with Let's Encrypt
# =============================================
echo "[6/7] Setting up SSL certificate..."
echo ""
echo "IMPORTANT: Make sure DNS for lvtcenter.it.com points to this server's IP (36.50.26.99)"
echo "before running certbot."
echo ""

# Try to get SSL certificate
certbot --nginx -d lvtcenter.it.com --non-interactive --agree-tos --email admin@lvtcenter.it.com || {
    echo ""
    echo "WARNING: SSL setup failed. This is normal if DNS is not yet configured."
    echo "After pointing DNS to 36.50.26.99, run:"
    echo "  certbot --nginx -d lvtcenter.it.com"
    echo ""
    echo "The app will work on HTTP (port 80) in the meantime."
}

# =============================================
# 7. Import PocketBase schema
# =============================================
echo "[7/7] PocketBase schema..."
echo ""
echo "============================================"
echo "  SETUP COMPLETE!"
echo "============================================"
echo ""
echo "Next steps:"
echo ""
echo "1. CONFIGURE DNS: Point lvtcenter.it.com -> 36.50.26.99"
echo "   (A record in your domain DNS settings)"
echo ""
echo "2. CREATE POCKETBASE ADMIN:"
echo "   Open http://36.50.26.99/_/ in your browser"
echo "   Create your admin account (first time only)"
echo ""
echo "3. IMPORT COLLECTIONS:"
echo "   In PocketBase Admin -> Settings -> Import collections"
echo "   Upload the pb_schema.json file"
echo ""
echo "4. If SSL failed, run after DNS is set:"
echo "   certbot --nginx -d lvtcenter.it.com"
echo ""
echo "5. Your app will be available at:"
echo "   http://lvtcenter.it.com (or https:// after SSL)"
echo ""
echo "Useful commands:"
echo "  systemctl status pocketbase    # Check PocketBase status"
echo "  systemctl restart pocketbase   # Restart PocketBase"
echo "  systemctl status nginx         # Check Nginx status"
echo "  journalctl -u pocketbase -f    # View PocketBase logs"
echo "  cat /var/log/pocketbase.log    # View PocketBase log file"
echo ""

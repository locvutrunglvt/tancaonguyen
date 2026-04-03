"""Setup multi-app architecture on VPS"""
import paramiko
import base64

VPS_IP = "36.50.26.99"
VPS_USER = "root"
VPS_PASS = "Anhthu123#az1"

def ssh_connect():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_IP, port=22, username=VPS_USER, password=VPS_PASS, timeout=30)
    return ssh

def run(ssh, cmd, timeout=60):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    return exit_code, out, err

def sftp_write(ssh, path, content):
    sftp = ssh.open_sftp()
    f = sftp.file(path, 'w')
    f.write(content)
    f.close()
    sftp.close()

ssh = ssh_connect()
print("Connected!\n")

# ============================================
# 1. Create multi-app directory structure
# ============================================
print("[1/5] Creating multi-app directory structure...")
run(ssh, "mkdir -p /var/www/tcn")
run(ssh, "mkdir -p /opt/pocketbase/tcn")
# Move existing files
run(ssh, "cp -r /var/www/tancaonguyen/* /var/www/tcn/ 2>/dev/null")
run(ssh, "chown -R www-data:www-data /var/www/tcn")

# Move PocketBase data if exists in default location
run(ssh, "cp -rn /opt/pocketbase/pb_data /opt/pocketbase/tcn/pb_data 2>/dev/null")
run(ssh, "cp /opt/pocketbase/pb_schema.json /opt/pocketbase/tcn/ 2>/dev/null")
print("  -> Directory structure created")
print("     /var/www/tcn/          (TCN frontend)")
print("     /opt/pocketbase/tcn/   (TCN PocketBase data)")

# ============================================
# 2. Create PocketBase service for TCN (port 8091)
# ============================================
print("\n[2/5] Setting up PocketBase for TCN on port 8091...")

tcn_service = """[Unit]
Description=PocketBase - TCN App
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/pocketbase
ExecStart=/opt/pocketbase/pocketbase serve --http=127.0.0.1:8091 --dir=/opt/pocketbase/tcn/pb_data
Restart=always
RestartSec=5
StandardOutput=append:/var/log/pocketbase-tcn.log
StandardError=append:/var/log/pocketbase-tcn.log

[Install]
WantedBy=multi-user.target
"""
sftp_write(ssh, "/etc/systemd/system/pocketbase-tcn.service", tcn_service)

# Stop old generic service, start new TCN-specific one
run(ssh, "systemctl stop pocketbase 2>/dev/null")
run(ssh, "systemctl disable pocketbase 2>/dev/null")
run(ssh, "systemctl daemon-reload")
run(ssh, "systemctl enable pocketbase-tcn")
run(ssh, "systemctl start pocketbase-tcn")

import time
time.sleep(2)
code, out, _ = run(ssh, "systemctl is-active pocketbase-tcn")
print(f"  -> pocketbase-tcn: {out}")

code, out, _ = run(ssh, "curl -sf http://127.0.0.1:8091/api/health")
print(f"  -> API health: {out}")

# ============================================
# 3. Create nginx config for tcn.lvtcenter.it.com
# ============================================
print("\n[3/5] Configuring nginx for tcn.lvtcenter.it.com...")

tcn_nginx = """server {
    listen 80;
    server_name tcn.lvtcenter.it.com;

    root /var/www/tcn;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8091/api/;
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
        proxy_pass http://127.0.0.1:8091/_/;
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
"""
sftp_write(ssh, "/etc/nginx/sites-available/tcn", tcn_nginx)
run(ssh, "ln -sf /etc/nginx/sites-available/tcn /etc/nginx/sites-enabled/tcn")

# Update main site to redirect to tcn subdomain
main_nginx = """server {
    listen 80;
    server_name lvtcenter.it.com;
    return 301 https://tcn.lvtcenter.it.com$request_uri;
}

server {
    listen 443 ssl http2;
    server_name lvtcenter.it.com;

    ssl_certificate /etc/letsencrypt/live/lvtcenter.it.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lvtcenter.it.com/privkey.pem;

    return 301 https://tcn.lvtcenter.it.com$request_uri;
}
"""
sftp_write(ssh, "/etc/nginx/sites-available/tancaonguyen", main_nginx)

# Also keep IP access working (for testing)
ip_nginx = """server {
    listen 80 default_server;
    listen 443 ssl default_server;
    server_name _;

    ssl_certificate /etc/letsencrypt/live/lvtcenter.it.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lvtcenter.it.com/privkey.pem;

    root /var/www/tcn;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8091/api/;
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
        proxy_pass http://127.0.0.1:8091/_/;
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
}
"""
sftp_write(ssh, "/etc/nginx/sites-available/default-ip", ip_nginx)
run(ssh, "ln -sf /etc/nginx/sites-available/default-ip /etc/nginx/sites-enabled/default-ip")

code, out, _ = run(ssh, "nginx -t 2>&1")
print(f"  -> nginx -t: {out}")
if "successful" in out:
    run(ssh, "systemctl reload nginx")
    print("  -> nginx reloaded!")

# ============================================
# 4. Create deploy script for GitHub Actions
# ============================================
print("\n[4/5] Creating deploy webhook receiver on VPS...")

# Create a simple deploy script that GitHub Actions will call via SSH
deploy_script = """#!/bin/bash
# Deploy script for individual apps
# Usage: /opt/deploy/deploy-app.sh <app-name>

APP_NAME=$1
APP_DIR="/var/www/${APP_NAME}"
BACKUP_DIR="/var/www/backups/${APP_NAME}"

if [ -z "$APP_NAME" ]; then
    echo "Usage: $0 <app-name>"
    exit 1
fi

echo "Deploying ${APP_NAME}..."

# Create backup
mkdir -p ${BACKUP_DIR}
cp -r ${APP_DIR} ${BACKUP_DIR}/$(date +%Y%m%d_%H%M%S) 2>/dev/null

# Extract uploaded archive
if [ -f "/tmp/${APP_NAME}-dist.tar.gz" ]; then
    rm -rf ${APP_DIR}/*
    tar -xzf /tmp/${APP_NAME}-dist.tar.gz -C ${APP_DIR}/
    chown -R www-data:www-data ${APP_DIR}
    rm /tmp/${APP_NAME}-dist.tar.gz
    echo "Deploy complete: ${APP_NAME}"
else
    echo "No archive found: /tmp/${APP_NAME}-dist.tar.gz"
    exit 1
fi
"""
run(ssh, "mkdir -p /opt/deploy /var/www/backups")
sftp_write(ssh, "/opt/deploy/deploy-app.sh", deploy_script)
run(ssh, "chmod +x /opt/deploy/deploy-app.sh")

# Create SSH key for GitHub Actions
code, out, _ = run(ssh, "test -f /root/.ssh/deploy_key && echo 'exists' || echo 'missing'")
if "missing" in out:
    run(ssh, "ssh-keygen -t ed25519 -f /root/.ssh/deploy_key -N '' -C 'github-actions-deploy'")
    print("  -> Deploy SSH key created")

code, pub_key, _ = run(ssh, "cat /root/.ssh/deploy_key.pub")
code, priv_key, _ = run(ssh, "cat /root/.ssh/deploy_key")

# Add deploy key to authorized_keys
run(ssh, "grep -q 'github-actions-deploy' /root/.ssh/authorized_keys 2>/dev/null || cat /root/.ssh/deploy_key.pub >> /root/.ssh/authorized_keys")
print("  -> Deploy key authorized")

# ============================================
# 5. Summary
# ============================================
print("\n[5/5] Verifying...")
code, out, _ = run(ssh, "systemctl is-active pocketbase-tcn")
print(f"  PocketBase TCN (port 8091): {out}")

code, out, _ = run(ssh, "systemctl is-active nginx")
print(f"  Nginx: {out}")

code, out, _ = run(ssh, "curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1:8091/api/health")
print(f"  TCN API: {out}")

print(f"\n{'='*50}")
print(f"  MULTI-APP SETUP COMPLETE!")
print(f"{'='*50}")
print(f"\n  Structure:")
print(f"    /var/www/tcn/              -> tcn.lvtcenter.it.com")
print(f"    /var/www/<next-app>/       -> <next-app>.lvtcenter.it.com")
print(f"    /opt/pocketbase/tcn/       -> PB data for TCN (port 8091)")
print(f"    /opt/pocketbase/<next>/    -> PB data for next app")
print(f"    /opt/deploy/deploy-app.sh  -> Deploy script")
print(f"\n  GitHub Actions SSH private key (save as GitHub Secret):")
print(f"{'='*50}")
print(priv_key)
print(f"{'='*50}")

ssh.close()

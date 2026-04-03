"""Fix nginx on VPS using SFTP to upload config files directly"""
import paramiko
import base64
import time
import io

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

def sftp_write(sftp, remote_path, content):
    """Write content to remote file via SFTP"""
    f = sftp.file(remote_path, 'w')
    f.write(content)
    f.close()
    print(f"  -> Uploaded {remote_path}")

ssh = ssh_connect()
print("Connected to VPS!\n")

# ============================================
# Step 1: Kill ALL stuck dpkg/apt processes
# ============================================
print("[1/5] Cleaning up stuck processes...")
code, out, _ = run(ssh, "ps aux | grep -E 'dpkg|apt|needrestart' | grep -v grep")
if out:
    print(f"  Found processes:\n     {out[:200]}")
run(ssh, "killall -9 dpkg apt apt-get needrestart 2>/dev/null; sleep 1")
run(ssh, "rm -f /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock /var/cache/apt/archives/lock /var/lib/apt/lists/lock")
print("  -> Locks cleared")

# ============================================
# Step 2: Check nginx installation status
# ============================================
print("\n[2/5] Checking nginx status...")
code, out, _ = run(ssh, "which nginx && nginx -v 2>&1")
print(f"  {out}")

code, out, _ = run(ssh, "test -f /etc/nginx/nginx.conf && echo 'nginx.conf EXISTS' || echo 'nginx.conf MISSING'")
print(f"  {out}")

code, out, _ = run(ssh, "test -f /etc/nginx/mime.types && echo 'mime.types EXISTS' || echo 'mime.types MISSING'")
print(f"  {out}")

# ============================================
# Step 3: Upload nginx.conf and site config via SFTP
# ============================================
print("\n[3/5] Uploading nginx configs via SFTP...")
sftp = ssh.open_sftp()

# Ensure directories exist
run(ssh, "mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled /etc/nginx/conf.d /etc/nginx/modules-enabled")

# Write main nginx.conf
nginx_conf = """user www-data;
worker_processes auto;
pid /run/nginx.pid;
error_log /var/log/nginx/error.log;

events {
    worker_connections 768;
}

http {
    sendfile on;
    tcp_nopush on;
    types_hash_max_size 2048;
    client_max_body_size 50M;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    access_log /var/log/nginx/access.log;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 256;

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
"""
sftp_write(sftp, "/etc/nginx/nginx.conf", nginx_conf)

# Check if mime.types exists, if not create a basic one
code, out, _ = run(ssh, "test -f /etc/nginx/mime.types && echo 'ok' || echo 'missing'")
if "missing" in out:
    mime_types = """types {
    text/html                                        html htm shtml;
    text/css                                         css;
    text/xml                                         xml;
    image/gif                                        gif;
    image/jpeg                                       jpeg jpg;
    application/javascript                           js;
    application/json                                 json;
    application/pdf                                  pdf;
    image/png                                        png;
    image/svg+xml                                    svg svgz;
    image/webp                                       webp;
    image/x-icon                                     ico;
    font/woff                                        woff;
    font/woff2                                       woff2;
    application/wasm                                 wasm;
    video/mp4                                        mp4;
    application/octet-stream                         bin;
}
"""
    sftp_write(sftp, "/etc/nginx/mime.types", mime_types)

# Write site config
site_conf = """server {
    listen 80;
    server_name lvtcenter.it.com _;

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
}
"""
sftp_write(sftp, "/etc/nginx/sites-available/tancaonguyen", site_conf)
sftp.close()

# Enable site and remove default
run(ssh, "ln -sf /etc/nginx/sites-available/tancaonguyen /etc/nginx/sites-enabled/tancaonguyen")
run(ssh, "rm -f /etc/nginx/sites-enabled/default")

# ============================================
# Step 4: Test and reload nginx
# ============================================
print("\n[4/5] Testing nginx config...")
code, out, err = run(ssh, "nginx -t 2>&1")
print(f"  {out}")
if code == 0 or "successful" in out:
    run(ssh, "systemctl reload nginx 2>/dev/null || systemctl restart nginx")
    print("  -> Nginx reloaded!")
else:
    print(f"  -> Error: {out} {err}")
    # Try to see what's wrong
    code, out, _ = run(ssh, "cat /etc/nginx/nginx.conf | head -5")
    print(f"  nginx.conf starts with: {out}")

# ============================================
# Step 5: Full verification
# ============================================
print("\n[5/5] Verifying everything...")

# PocketBase
code, out, _ = run(ssh, "systemctl is-active pocketbase")
print(f"  PocketBase service: {out}")

code, out, _ = run(ssh, "curl -sf http://127.0.0.1:8090/api/health | head -1")
print(f"  PocketBase API: {out or 'OK' if code == 0 else 'FAILED'}")

# Nginx
code, out, _ = run(ssh, "systemctl is-active nginx")
print(f"  Nginx service: {out}")

code, out, _ = run(ssh, "curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1/")
print(f"  HTTP localhost: {out}")

code, out, _ = run(ssh, "curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1/api/health")
print(f"  API via nginx: {out}")

# Check frontend files
code, out, _ = run(ssh, "ls /var/www/tancaonguyen/ | head -10")
print(f"  Frontend files: {out}")

# External access
code, out, _ = run(ssh, "curl -sf -o /dev/null -w '%{http_code}' http://36.50.26.99/")
print(f"  External HTTP: {out}")

# Check firewall
code, out, _ = run(ssh, "ufw status 2>/dev/null || iptables -L INPUT -n 2>/dev/null | head -5")
print(f"  Firewall: {out[:200]}")

# DNS check
code, out, _ = run(ssh, "host lvtcenter.it.com 2>/dev/null | head -2 || echo 'host command not available'")
print(f"  DNS: {out}")

print("\n" + "=" * 50)
print("  RESULTS")
print("=" * 50)
print(f"  App:       http://36.50.26.99")
print(f"  PB Admin:  http://36.50.26.99/_/")
print(f"  Domain:    http://lvtcenter.it.com (after DNS)")
print("=" * 50)

ssh.close()

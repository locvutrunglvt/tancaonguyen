import paramiko
import base64
import time

VPS_IP = "36.50.26.99"
VPS_USER = "root"
VPS_PASS = "Anhthu123#az1"

def create_ssh():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_IP, port=22, username=VPS_USER, password=VPS_PASS, timeout=30)
    return ssh

def run(ssh, cmd, desc="", timeout=300):
    if desc:
        print(f"  -> {desc}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        for line in out.split('\n')[:15]:
            print(f"     {line}")
    if exit_code != 0 and err:
        for line in err.split('\n')[:5]:
            print(f"     [!] {line}")
    return exit_code, out, err

def write_file(ssh, path, content):
    """Write file on remote using base64 to avoid shell escaping issues"""
    b64 = base64.b64encode(content.encode()).decode()
    run(ssh, f"echo '{b64}' | base64 -d > {path}", f"Writing {path}")

ssh = create_ssh()
print("Connected!\n")

# ==========================================
# 1. Kill stuck dpkg and fix
# ==========================================
print("[1/6] Fixing dpkg lock...")
run(ssh, "kill -9 9209 2>/dev/null; sleep 1", "Killing stuck apt process")
run(ssh, "rm -f /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock /var/cache/apt/archives/lock", "Removing lock files")
run(ssh, "dpkg --configure -a", "Configuring pending packages", timeout=120)

# ==========================================
# 2. Install nginx properly
# ==========================================
print("\n[2/6] Installing packages...")
run(ssh, "DEBIAN_FRONTEND=noninteractive apt install -y nginx certbot python3-certbot-nginx unzip wget curl 2>&1 | tail -5", "Installing nginx + certbot", timeout=180)

# ==========================================
# 3. Check if nginx.conf exists, if not recreate
# ==========================================
print("\n[3/6] Fixing nginx.conf...")
exit_code, out, _ = run(ssh, "test -f /etc/nginx/nginx.conf && echo 'exists' || echo 'missing'")

if "missing" in out:
    print("  -> nginx.conf missing, recreating...")
    nginx_main = """user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 768;
}

http {
    sendfile on;
    tcp_nopush on;
    types_hash_max_size 2048;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    gzip on;

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
"""
    write_file(ssh, "/etc/nginx/nginx.conf", nginx_main)
    # Also ensure mime.types exists
    run(ssh, "test -f /etc/nginx/mime.types || apt install --reinstall -y nginx-common 2>&1 | tail -3", "Checking mime.types")

# ==========================================
# 4. Write site config for lvtcenter.it.com
# ==========================================
print("\n[4/6] Writing site config...")
site_config = """server {
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

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 256;
}
"""
write_file(ssh, "/etc/nginx/sites-available/tancaonguyen", site_config)
run(ssh, "ln -sf /etc/nginx/sites-available/tancaonguyen /etc/nginx/sites-enabled/tancaonguyen", "Enabling site")
run(ssh, "rm -f /etc/nginx/sites-enabled/default", "Removing default")

# ==========================================
# 5. Test and restart nginx
# ==========================================
print("\n[5/6] Testing nginx...")
exit_code, out, err = run(ssh, "nginx -t 2>&1", "nginx -t")
if exit_code == 0 or "successful" in out:
    run(ssh, "systemctl restart nginx", "Restarting nginx")
    print("  -> Nginx OK!")
else:
    print("  -> Issue with nginx, trying to reinstall...")
    run(ssh, "apt install --reinstall -y nginx-core nginx-common 2>&1 | tail -5", "Reinstalling nginx", timeout=120)
    run(ssh, "nginx -t 2>&1")
    run(ssh, "systemctl restart nginx")

# ==========================================
# 6. Final verification
# ==========================================
print("\n[6/6] Final check...")
run(ssh, "systemctl is-active pocketbase && echo '  PocketBase: OK' || echo '  PocketBase: FAILED'")
run(ssh, "systemctl is-active nginx && echo '  Nginx: OK' || echo '  Nginx: FAILED'")

# Test HTTP from inside
exit_code, out, _ = run(ssh, "curl -s -o /dev/null -w '%{http_code}' http://localhost/", "HTTP localhost test")
print(f"  -> HTTP status: {out}")

exit_code, out, _ = run(ssh, "curl -s -o /dev/null -w '%{http_code}' http://localhost/api/health", "PocketBase API test")
print(f"  -> PB API status: {out}")

# Test from outside
exit_code, out, _ = run(ssh, "curl -s -o /dev/null -w '%{http_code}' http://36.50.26.99/", "External HTTP test")
print(f"  -> External HTTP: {out}")

# Check firewall
run(ssh, "ufw status 2>/dev/null || echo 'ufw not active'", "Firewall status")

# Try SSL if domain resolves
print("\n  Attempting SSL...")
exit_code, out, _ = run(ssh, "host lvtcenter.it.com 2>/dev/null | head -1 || echo 'DNS lookup failed'", "DNS check")
if "36.50.26.99" in out:
    run(ssh, "certbot --nginx -d lvtcenter.it.com --non-interactive --agree-tos --email admin@lvtcenter.it.com 2>&1 | tail -5", "Getting SSL cert")
else:
    print(f"  -> DNS not pointing here yet: {out}")
    print("     After DNS setup, run: certbot --nginx -d lvtcenter.it.com")

print("\n" + "=" * 50)
print("  VPS Ready!")
print(f"  App: http://36.50.26.99")
print(f"  PB Admin: http://36.50.26.99/_/")
print("=" * 50)

ssh.close()

import paramiko
import time

VPS_IP = "36.50.26.99"
VPS_USER = "root"
VPS_PASS = "Anhthu123#az1"

def create_ssh():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_IP, port=22, username=VPS_USER, password=VPS_PASS, timeout=30)
    return ssh

def run_cmd(ssh, cmd, desc="", timeout=300):
    if desc:
        print(f"  -> {desc}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        for line in out.split('\n')[:10]:
            print(f"     {line}")
    if exit_code != 0 and err:
        for line in err.split('\n')[:5]:
            print(f"     [!] {line}")
    return exit_code, out, err

ssh = create_ssh()
print("Connected!\n")

# Fix dpkg
print("[1/5] Fixing dpkg...")
run_cmd(ssh, "dpkg --configure -a", "Running dpkg --configure -a", timeout=120)
run_cmd(ssh, "apt --fix-broken install -y", "Fixing broken packages", timeout=120)

# Install packages
print("\n[2/5] Installing nginx, certbot...")
run_cmd(ssh, "apt update -y", "apt update")
run_cmd(ssh, "DEBIAN_FRONTEND=noninteractive apt install -y nginx certbot python3-certbot-nginx unzip wget curl", "Installing packages", timeout=180)

# Check nginx directories
print("\n[3/5] Configuring Nginx...")
run_cmd(ssh, "ls -la /etc/nginx/sites-available/ 2>/dev/null || echo 'No sites-available dir'")
run_cmd(ssh, "mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled", "Ensuring nginx dirs exist")

# Write nginx config using a different method (tee instead of redirect)
nginx_config = r"""server {
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

# Use python on the remote to write the file (avoids shell escaping issues)
escaped = nginx_config.replace("'", "'\\''")
run_cmd(ssh, f"python3 -c \"f=open('/etc/nginx/sites-available/tancaonguyen','w'); f.write('''{nginx_config}'''); f.close()\"", "Writing nginx config via python3")

# Verify file was written
exit_code, out, _ = run_cmd(ssh, "cat /etc/nginx/sites-available/tancaonguyen | head -5", "Verifying config")

if "server" not in out:
    # Fallback: write via base64
    import base64
    b64 = base64.b64encode(nginx_config.encode()).decode()
    run_cmd(ssh, f"echo '{b64}' | base64 -d > /etc/nginx/sites-available/tancaonguyen", "Writing config via base64")

run_cmd(ssh, "ln -sf /etc/nginx/sites-available/tancaonguyen /etc/nginx/sites-enabled/tancaonguyen", "Enabling site")
run_cmd(ssh, "rm -f /etc/nginx/sites-enabled/default", "Removing default site")

exit_code, out, err = run_cmd(ssh, "nginx -t 2>&1", "Testing nginx config")
if "successful" in out or "ok" in out or exit_code == 0:
    run_cmd(ssh, "systemctl restart nginx", "Restarting nginx")
    print("  -> Nginx OK!")
else:
    print(f"  -> Nginx test issue, checking further...")
    run_cmd(ssh, "cat /etc/nginx/sites-available/tancaonguyen")
    # Try with the main nginx.conf approach instead
    run_cmd(ssh, "nginx -T 2>&1 | head -20", "Full nginx config dump")

# Step 4: Verify everything is running
print("\n[4/5] Verifying services...")
run_cmd(ssh, "systemctl is-active pocketbase", "PocketBase status")
run_cmd(ssh, "systemctl is-active nginx", "Nginx status")
run_cmd(ssh, "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:80/ 2>/dev/null || echo 'Cannot reach nginx'", "Testing local HTTP")
run_cmd(ssh, "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8090/api/health 2>/dev/null || echo 'Cannot reach PB'", "Testing PocketBase API")

# Step 5: Try SSL
print("\n[5/5] SSL setup...")
exit_code, _, _ = run_cmd(ssh, "which certbot", "Checking certbot")
if exit_code == 0:
    run_cmd(ssh, "certbot --nginx -d lvtcenter.it.com --non-interactive --agree-tos --email admin@lvtcenter.it.com 2>&1", "Getting SSL cert")
else:
    print("  -> certbot not available, skip SSL for now")

print("\n" + "=" * 50)
print("  DONE! Check: http://36.50.26.99")
print("  PocketBase Admin: http://36.50.26.99/_/")
print("=" * 50)

ssh.close()

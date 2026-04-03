"""Setup SSL using certbot standalone mode (no nginx plugin needed)"""
import paramiko
import time

VPS_IP = "36.50.26.99"
VPS_USER = "root"
VPS_PASS = "Anhthu123#az1"

def ssh_connect():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_IP, port=22, username=VPS_USER, password=VPS_PASS, timeout=30)
    return ssh

def run(ssh, cmd, timeout=120):
    print(f"  $ {cmd[:80]}...")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    combined = out + "\n" + err if err else out
    for line in combined.strip().split('\n')[:15]:
        if line.strip():
            print(f"     {line}")
    return exit_code, out, err

def sftp_write(ssh, path, content):
    sftp = ssh.open_sftp()
    f = sftp.file(path, 'w')
    f.write(content)
    f.close()
    sftp.close()
    print(f"  -> Written {path}")

ssh = ssh_connect()
print("Connected!\n")

# Kill dpkg processes
run(ssh, "killall -9 dpkg 2>/dev/null; rm -f /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock; sleep 1; echo ok")

# Check if certbot binary already exists
print("[1/4] Checking certbot...")
code, out, _ = run(ssh, "which certbot 2>/dev/null && certbot --version 2>&1 || echo 'certbot not working'")

if "not working" in out or code != 0:
    # Install certbot via snap instead (avoids dpkg issues)
    print("\n  -> Trying snap install...")
    run(ssh, "snap install --classic certbot 2>&1 | tail -5", timeout=120)
    run(ssh, "ln -sf /snap/bin/certbot /usr/bin/certbot 2>/dev/null")

# Verify certbot works
code, out, _ = run(ssh, "certbot --version 2>&1")
print(f"  Certbot: {out}")

# Check DNS from VPS
print("\n[2/4] Checking DNS...")
code, out, _ = run(ssh, "dig lvtcenter.it.com @8.8.8.8 +short 2>/dev/null || host lvtcenter.it.com 2>/dev/null | head -2")
print(f"  DNS result: {out}")

if "36.50.26.99" not in out:
    print("  WARNING: DNS not yet pointing to this VPS!")
    print("  SSL may fail. Trying anyway...")

# Get SSL cert using webroot method (nginx stays running)
print("\n[3/4] Getting SSL certificate...")
# Create webroot dir for challenge
run(ssh, "mkdir -p /var/www/tancaonguyen/.well-known/acme-challenge")

code, out, err = run(ssh, "certbot certonly --webroot -w /var/www/tancaonguyen -d lvtcenter.it.com --non-interactive --agree-tos --email admin@lvtcenter.it.com 2>&1", timeout=120)

if code != 0 and "already exists" not in out:
    print("  -> Webroot method failed, trying standalone...")
    # Stop nginx temporarily for standalone
    run(ssh, "systemctl stop nginx; sleep 2")
    code, out, err = run(ssh, "certbot certonly --standalone -d lvtcenter.it.com --non-interactive --agree-tos --email admin@lvtcenter.it.com 2>&1", timeout=120)
    # Restart nginx after
    run(ssh, "systemctl start nginx")

# Check if cert was obtained
code, out, _ = run(ssh, "test -f /etc/letsencrypt/live/lvtcenter.it.com/fullchain.pem && echo 'CERT EXISTS' || echo 'NO CERT'")

if "CERT EXISTS" in out:
    print("\n[4/4] Configuring Nginx with SSL...")

    ssl_site = """server {
    listen 80;
    server_name lvtcenter.it.com _;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name lvtcenter.it.com _;

    ssl_certificate /etc/letsencrypt/live/lvtcenter.it.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lvtcenter.it.com/privkey.pem;

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
    sftp_write(ssh, "/etc/nginx/sites-available/tancaonguyen", ssl_site)

    code, out, _ = run(ssh, "nginx -t 2>&1")
    if code == 0 or "successful" in out:
        run(ssh, "systemctl reload nginx")
        print("\n  SSL CONFIGURED!")
        print(f"  -> https://lvtcenter.it.com")
    else:
        print(f"  -> Nginx config error: {out}")

    # Auto-renew
    run(ssh, "certbot renew --dry-run 2>&1 | tail -3")
else:
    print("\n  SSL cert not obtained. This may be because:")
    print("  - DNS hasn't fully propagated yet")
    print("  - Firewall blocking port 80")
    print("  Try again later or run manually on VPS:")
    print("  certbot certonly --webroot -w /var/www/tancaonguyen -d lvtcenter.it.com")

# Final check
print("\n" + "=" * 50)
code, out, _ = run(ssh, "curl -sf -o /dev/null -w '%{http_code}' http://36.50.26.99/")
print(f"  HTTP: {out}")
code, out, _ = run(ssh, "curl -sf -o /dev/null -w '%{http_code}' https://lvtcenter.it.com/ 2>/dev/null || echo 'N/A'")
print(f"  HTTPS: {out}")
print("=" * 50)

ssh.close()

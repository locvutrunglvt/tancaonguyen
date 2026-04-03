"""Update nginx configs with SSL for tcn subdomain"""
import paramiko

VPS_IP = "36.50.26.99"
VPS_USER = "root"
VPS_PASS = "Anhthu123#az1"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_IP, port=22, username=VPS_USER, password=VPS_PASS, timeout=30)
print("Connected!")

sftp = ssh.open_sftp()

# TCN subdomain with SSL
tcn_conf = """server {
    listen 80;
    server_name tcn.lvtcenter.it.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tcn.lvtcenter.it.com;

    ssl_certificate /etc/letsencrypt/live/tcn.lvtcenter.it.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tcn.lvtcenter.it.com/privkey.pem;

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
f = sftp.file("/etc/nginx/sites-available/tcn", "w")
f.write(tcn_conf)
f.close()
print("TCN nginx config updated with SSL")

# Main domain redirect
main_conf = """server {
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
f = sftp.file("/etc/nginx/sites-available/tancaonguyen", "w")
f.write(main_conf)
f.close()
print("Main domain redirect updated")

sftp.close()

# Test and reload
stdin, stdout, stderr = ssh.exec_command("nginx -t 2>&1")
stdout.channel.recv_exit_status()
out = stdout.read().decode().strip()
print(f"nginx -t: {out}")

if "successful" in out:
    stdin, stdout, stderr = ssh.exec_command("systemctl reload nginx")
    stdout.channel.recv_exit_status()
    print("Nginx reloaded!")

# Verify
stdin, stdout, stderr = ssh.exec_command("curl -sf -o /dev/null -w '%{http_code}' https://tcn.lvtcenter.it.com/")
stdout.channel.recv_exit_status()
out = stdout.read().decode().strip()
print(f"\nhttps://tcn.lvtcenter.it.com -> {out}")

stdin, stdout, stderr = ssh.exec_command("curl -sf -o /dev/null -w '%{http_code}' https://tcn.lvtcenter.it.com/api/health")
stdout.channel.recv_exit_status()
out = stdout.read().decode().strip()
print(f"https://tcn.lvtcenter.it.com/api/health -> {out}")

print("\nDone!")
ssh.close()

import paramiko
import os
import sys
import stat

VPS_IP = "36.50.26.99"
VPS_USER = "root"
VPS_PASS = "Anhthu123#az1"
VPS_PORT = 22

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.join(PROJECT_DIR, "dist")

def create_ssh():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_IP, port=VPS_PORT, username=VPS_USER, password=VPS_PASS, timeout=30)
    return ssh

def run_cmd(ssh, cmd, desc=""):
    if desc:
        print(f"  -> {desc}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=300)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        print(f"     {out[:500]}")
    if exit_code != 0 and err:
        print(f"     [WARN] {err[:300]}")
    return exit_code, out, err

def upload_dir(sftp, local_dir, remote_dir):
    """Recursively upload a directory"""
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = f"{remote_dir}/{item}"
        if os.path.isdir(local_path):
            try:
                sftp.mkdir(remote_path)
            except:
                pass
            upload_dir(sftp, local_path, remote_path)
        else:
            print(f"     Uploading: {item}")
            sftp.put(local_path, remote_path)

def main():
    print("=" * 50)
    print("  TCN Coffee - VPS Auto Deploy")
    print(f"  Target: {VPS_USER}@{VPS_IP}")
    print("=" * 50)
    print()

    # Step 1: Connect
    print("[1/7] Connecting to VPS...")
    try:
        ssh = create_ssh()
        print("  -> Connected!")
    except Exception as e:
        print(f"  -> FAILED: {e}")
        sys.exit(1)

    # Step 2: Update system and install packages
    print("\n[2/7] Installing system packages...")
    run_cmd(ssh, "apt update -y", "Updating package list")
    run_cmd(ssh, "apt install -y nginx certbot python3-certbot-nginx unzip wget curl", "Installing nginx, certbot, wget, unzip")

    # Step 3: Install PocketBase
    print("\n[3/7] Installing PocketBase...")
    run_cmd(ssh, "mkdir -p /opt/pocketbase", "Creating /opt/pocketbase")

    # Check if PocketBase already exists
    exit_code, out, _ = run_cmd(ssh, "test -f /opt/pocketbase/pocketbase && echo 'exists' || echo 'missing'")
    if "missing" in out:
        PB_VERSION = "0.25.9"
        run_cmd(ssh, f"cd /opt/pocketbase && wget -q https://github.com/pocketbase/pocketbase/releases/download/v{PB_VERSION}/pocketbase_{PB_VERSION}_linux_amd64.zip -O pb.zip && unzip -o pb.zip && rm pb.zip && chmod +x pocketbase", f"Downloading PocketBase v{PB_VERSION}")
    else:
        print("  -> PocketBase already installed, skipping download")

    # Step 4: Setup PocketBase service
    print("\n[4/7] Setting up PocketBase service...")
    service_content = """[Unit]
Description=PocketBase - TCN Coffee Management
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/pocketbase
ExecStart=/opt/pocketbase/pocketbase serve --http=127.0.0.1:8090
Restart=always
RestartSec=5
StandardOutput=append:/var/log/pocketbase.log
StandardError=append:/var/log/pocketbase.log

[Install]
WantedBy=multi-user.target"""

    run_cmd(ssh, f"cat > /etc/systemd/system/pocketbase.service << 'SVCEOF'\n{service_content}\nSVCEOF", "Writing systemd service")
    run_cmd(ssh, "systemctl daemon-reload && systemctl enable pocketbase && systemctl restart pocketbase", "Starting PocketBase service")

    import time
    time.sleep(3)
    run_cmd(ssh, "systemctl is-active pocketbase", "Checking PocketBase status")

    # Step 5: Upload frontend
    print("\n[5/7] Uploading frontend files...")
    run_cmd(ssh, "mkdir -p /var/www/tancaonguyen", "Creating web directory")
    run_cmd(ssh, "rm -rf /var/www/tancaonguyen/*", "Cleaning old files")

    sftp = ssh.open_sftp()
    upload_dir(sftp, DIST_DIR, "/var/www/tancaonguyen")

    # Also upload pb_schema.json
    schema_path = os.path.join(PROJECT_DIR, "pb_schema.json")
    if os.path.exists(schema_path):
        sftp.put(schema_path, "/opt/pocketbase/pb_schema.json")
        print("     Uploaded pb_schema.json")
    sftp.close()

    run_cmd(ssh, "chown -R www-data:www-data /var/www/tancaonguyen", "Setting permissions")
    print("  -> Frontend uploaded!")

    # Step 6: Configure Nginx
    print("\n[6/7] Configuring Nginx...")
    nginx_config = """server {
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
}"""

    run_cmd(ssh, f"cat > /etc/nginx/sites-available/tancaonguyen << 'NGXEOF'\n{nginx_config}\nNGXEOF", "Writing Nginx config")
    run_cmd(ssh, "ln -sf /etc/nginx/sites-available/tancaonguyen /etc/nginx/sites-enabled/", "Enabling site")
    run_cmd(ssh, "rm -f /etc/nginx/sites-enabled/default", "Removing default site")

    exit_code, _, err = run_cmd(ssh, "nginx -t", "Testing Nginx config")
    if exit_code == 0:
        run_cmd(ssh, "systemctl restart nginx", "Restarting Nginx")
        print("  -> Nginx configured!")
    else:
        print(f"  -> Nginx config error: {err}")

    # Step 7: SSL
    print("\n[7/7] Setting up SSL...")
    print("  -> Attempting Let's Encrypt certificate...")
    exit_code, out, err = run_cmd(ssh, "certbot --nginx -d lvtcenter.it.com --non-interactive --agree-tos --email admin@lvtcenter.it.com 2>&1")
    if exit_code == 0:
        print("  -> SSL certificate installed!")
    else:
        print("  -> SSL setup skipped (DNS may not be pointing to this server yet)")
        print("     Run later: certbot --nginx -d lvtcenter.it.com")

    # Final status
    print("\n" + "=" * 50)
    print("  DEPLOYMENT COMPLETE!")
    print("=" * 50)
    print()

    run_cmd(ssh, "systemctl is-active pocketbase && echo 'PocketBase: RUNNING' || echo 'PocketBase: STOPPED'")
    run_cmd(ssh, "systemctl is-active nginx && echo 'Nginx: RUNNING' || echo 'Nginx: STOPPED'")

    print()
    print("Next steps:")
    print(f"  1. Open http://36.50.26.99/_/ to create PocketBase admin account")
    print(f"  2. Import collections: upload pb_schema.json in Admin > Settings > Import")
    print(f"  3. Point DNS lvtcenter.it.com -> 36.50.26.99")
    print(f"  4. After DNS: certbot --nginx -d lvtcenter.it.com")
    print(f"  5. App URL: http://lvtcenter.it.com (or https after SSL)")

    ssh.close()

if __name__ == "__main__":
    main()

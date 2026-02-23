# Deploy TCN Coffee Management to VPS

## VPS Info
- **IP**: 36.50.26.99
- **Domain**: lvtcenter.it.com
- **OS**: Ubuntu
- **SSH**: root@36.50.26.99 port 22

---

## Buoc 1: Cau hinh DNS

Vao trang quan ly domain `lvtcenter.it.com`, tao ban ghi:
- **Type**: A
- **Host**: @ (hoac de trong)
- **Value**: 36.50.26.99
- **TTL**: 300

---

## Buoc 2: Upload files len VPS

Mo PowerShell/Terminal, chay tung lenh:

```bash
# Upload dist (frontend)
scp -r dist/* root@36.50.26.99:/tmp/

# Upload deploy configs
scp deploy/pocketbase.service root@36.50.26.99:/tmp/
scp deploy/setup-vps.sh root@36.50.26.99:/tmp/
scp pb_schema.json root@36.50.26.99:/tmp/
```

---

## Buoc 3: SSH vao VPS va chay setup

```bash
ssh root@36.50.26.99
```

Nhap password, sau do chay cac lenh sau:

### 3.1 - Cap nhat he thong
```bash
apt update && apt upgrade -y
apt install -y nginx certbot python3-certbot-nginx unzip wget curl
```

### 3.2 - Cai dat PocketBase
```bash
mkdir -p /opt/pocketbase
cd /opt/pocketbase
wget https://github.com/pocketbase/pocketbase/releases/download/v0.25.9/pocketbase_0.25.9_linux_amd64.zip
unzip pocketbase_0.25.9_linux_amd64.zip
rm pocketbase_0.25.9_linux_amd64.zip
chmod +x pocketbase
```

### 3.3 - Tao PocketBase service
```bash
cat > /etc/systemd/system/pocketbase.service << 'EOF'
[Unit]
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
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable pocketbase
systemctl start pocketbase
systemctl status pocketbase
```

### 3.4 - Deploy frontend
```bash
mkdir -p /var/www/tancaonguyen
cp -r /tmp/dist/* /var/www/tancaonguyen/ 2>/dev/null || true
# Neu ban upload tung file, copy chung vao /var/www/tancaonguyen/
chown -R www-data:www-data /var/www/tancaonguyen
```

### 3.5 - Cau hinh Nginx
```bash
cat > /etc/nginx/sites-available/tancaonguyen << 'EOF'
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
EOF

ln -sf /etc/nginx/sites-available/tancaonguyen /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
```

### 3.6 - Cai SSL (sau khi DNS da tro ve IP)
```bash
certbot --nginx -d lvtcenter.it.com --agree-tos --email admin@lvtcenter.it.com
```

---

## Buoc 4: Thiet lap PocketBase

1. Mo trinh duyet: `http://lvtcenter.it.com/_/` (hoac `http://36.50.26.99/_/`)
2. Tao tai khoan admin (lan dau tien)
3. Vao **Settings > Import collections**
4. Upload file `pb_schema.json` de tao cac bang du lieu
5. Tao user dau tien trong collection `users`

---

## Cac lenh huu ich

```bash
# Kiem tra trang thai
systemctl status pocketbase
systemctl status nginx

# Khoi dong lai
systemctl restart pocketbase
systemctl restart nginx

# Xem log
journalctl -u pocketbase -f
cat /var/log/pocketbase.log
tail -f /var/log/nginx/error.log

# Cap nhat frontend (sau khi build lai)
scp -r dist/* root@36.50.26.99:/var/www/tancaonguyen/
```

---

## Cap nhat app sau nay

Tren may local:
```bash
npm run build
scp -r dist/* root@36.50.26.99:/var/www/tancaonguyen/
```

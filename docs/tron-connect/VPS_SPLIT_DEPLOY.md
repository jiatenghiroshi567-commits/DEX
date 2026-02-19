# VPS Split Deploy (Static Front + Static Admin)

Goal:
- Same VPS
- `app.yourdomain.com` for frontend
- `admin.yourdomain.com` for admin UI
- Optional `api.yourdomain.com` for admin-bridge API

## 1. Build two static outputs

```bash
cd /var/www/perpx-local-integration
git pull
npm install
npm run build:split
```

or one-shot:

```bash
bash scripts/deploy-static-split.sh
```

Generated:
- `dist-front/` (frontend)
- `dist-admin/` (admin)

## 2. Place static files

```bash
sudo mkdir -p /var/www/perpx-front /var/www/perpx-admin
sudo rsync -a --delete dist-front/ /var/www/perpx-front/
sudo rsync -a --delete dist-admin/ /var/www/perpx-admin/
```

## 3. Nginx config

```nginx
server {
  listen 80;
  server_name app.yourdomain.com;

  root /var/www/perpx-front;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}

server {
  listen 80;
  server_name admin.yourdomain.com;

  root /var/www/perpx-admin;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}

# optional: admin-bridge API (mock or real backend)
server {
  listen 80;
  server_name api.yourdomain.com;

  location / {
    proxy_pass http://127.0.0.1:3010;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

Apply:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Template files:
- `deploy/nginx/perpx-app.conf`
- `deploy/nginx/perpx-admin.conf`
- `deploy/nginx/perpx-api.conf`

## 4. Env split

Frontend build:

```bash
VITE_APP_MODE=front
VITE_ADMIN_BRIDGE_ENABLED=1
VITE_ADMIN_BRIDGE_API_BASE_URL=https://api.yourdomain.com
```

Admin build:

```bash
VITE_APP_MODE=admin
VITE_ADMIN_BRIDGE_ENABLED=0
VITE_ADMIN_BRIDGE_API_BASE_URL=https://api.yourdomain.com
```

## 5. Local check before VPS

```bash
npm run mock:admin-bridge
npm run dev:front   # http://localhost:3000
npm run dev:admin   # http://localhost:3002
```

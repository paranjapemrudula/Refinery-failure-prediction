# Azure VM Production Deployment

This guide assumes:

- Ubuntu 22.04 or 24.04 on Azure
- a public IP or DNS name for the VM
- PostgreSQL is reachable from the VM
- the repository is cloned to `/var/www/refinery-monitor`

## 1. Open VM ports in Azure

In the Azure Network Security Group attached to the VM, allow:

- `22` for SSH
- `80` for HTTP
- `443` for HTTPS

Do not expose Django or Gunicorn directly on `8000`.

## 2. Install system packages

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nginx git build-essential pkg-config libpq-dev nodejs npm certbot python3-certbot-nginx
```

## 3. Clone the app and set ownership

```bash
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/paranjapemrudula/Refinery-failure-prediction.git refinery-monitor
sudo chown -R $USER:$USER /var/www/refinery-monitor
```

## 4. Create backend environment file

Create `/etc/refinery-monitor/backend.env`:

```bash
sudo mkdir -p /etc/refinery-monitor
sudo nano /etc/refinery-monitor/backend.env
```

Example:

```env
DJANGO_SECRET_KEY=replace-with-a-strong-secret-key
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=your-domain.com,your-vm-public-ip
DJANGO_CORS_ALLOWED_ORIGINS=https://your-domain.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://your-domain.com
DJANGO_SESSION_COOKIE_SECURE=True
DJANGO_CSRF_COOKIE_SECURE=True
DJANGO_SECURE_SSL_REDIRECT=False
DJANGO_SECURE_HSTS_SECONDS=31536000
DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=True
DJANGO_SECURE_HSTS_PRELOAD=False

DB_ENGINE=django.db.backends.postgresql
DB_NAME=refinery_monitor_db
DB_USER=postgres
DB_PASSWORD=replace-with-your-db-password
DB_HOST=your-postgres-host
DB_PORT=5432

GEMINI_API_KEY=your-google-ai-studio-key
GEMINI_REPORT_MODEL=gemini-2.5-flash
OPENAI_API_KEY=
OPENAI_REPORT_MODEL=gpt-4.1-mini
```

For the first HTTP-only setup, keep `DJANGO_SECURE_SSL_REDIRECT=False`. After TLS is enabled, switch it to `True` and restart the app.

## 5. Build the Python environment and frontend

```bash
cd /var/www/refinery-monitor
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r backend/requirements.txt

cd backend
../.venv/bin/python manage.py migrate
../.venv/bin/python manage.py collectstatic --noinput

cd ../frontend
npm ci
npm run build
```

## 6. Install the systemd service

```bash
sudo cp /var/www/refinery-monitor/deploy/azure-vm/systemd/refinery-monitor.service /etc/systemd/system/refinery-monitor.service
sudo systemctl daemon-reload
sudo systemctl enable refinery-monitor
sudo systemctl start refinery-monitor
sudo systemctl status refinery-monitor
```

## 7. Install the nginx site

```bash
sudo cp /var/www/refinery-monitor/deploy/azure-vm/nginx/refinery-monitor.conf /etc/nginx/sites-available/refinery-monitor
sudo ln -sf /etc/nginx/sites-available/refinery-monitor /etc/nginx/sites-enabled/refinery-monitor
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

At this stage:

- frontend is served by nginx
- `/api/` and `/admin/` are proxied to Gunicorn on `127.0.0.1:8000`
- static files are served by nginx from `backend/staticfiles`

## 8. Enable HTTPS

If your domain points to the VM:

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Then update `/etc/refinery-monitor/backend.env`:

```env
DJANGO_SECURE_SSL_REDIRECT=True
```

And restart the app:

```bash
sudo systemctl restart refinery-monitor
```

## 9. Deploy updates later

```bash
cd /var/www/refinery-monitor
bash deploy/azure-vm/scripts/release.sh
```

## 10. GitHub Actions deployment

This repository includes:

- `.github/workflows/ci.yml` for backend/frontend validation
- `.github/workflows/deploy-azure-vm.yml` for VM deployment over SSH

Add these GitHub repository secrets before enabling automatic deploys:

- `AZURE_VM_HOST`: your VM public IP or DNS name
- `AZURE_VM_USER`: your SSH username, for example `azureuser`
- `AZURE_VM_SSH_PRIVATE_KEY`: the full private key contents used to connect to the VM

The deploy workflow runs the existing VM release script:

```bash
cd /var/www/refinery-monitor
bash deploy/azure-vm/scripts/release.sh
```

## 11. Useful checks

```bash
sudo journalctl -u refinery-monitor -n 100 --no-pager
sudo systemctl status refinery-monitor
sudo systemctl status nginx
curl -I http://127.0.0.1:8000/api/dashboard/
```

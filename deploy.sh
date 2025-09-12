#!/bin/bash
# Deployment script for member-voting app on Ubuntu
set -e

# Variables
APP_DIR="/opt/member-voting"
REPO_URL="https://github.com/jeremiah-shaff/member-voting.git"
NODE_VERSION="24"
POSTGRES_DB="member_voting"
POSTGRES_USER="member_voting_user"
POSTGRES_PASSWORD="securepassword"
FQDN="your.domain.com"
ACME_EMAIL="admin@your.domain.com"

# Update and install dependencies
sudo apt update
sudo apt install -y git curl build-essential nginx postgresql postgresql-contrib python3-certbot-nginx

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
sudo apt install -y nodejs

# Clone repo
sudo git clone "$REPO_URL" "$APP_DIR"
cd "$APP_DIR"

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
npm run build


# Create .env for frontend if needed
cat <<ENV | sudo tee "$APP_DIR/frontend/.env"
VITE_API_URL=/api
ENV

# Setup PostgreSQL
sudo -u postgres psql <<EOF
CREATE DATABASE $POSTGRES_DB;
CREATE USER $POSTGRES_USER WITH ENCRYPTED PASSWORD '$POSTGRES_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO $POSTGRES_USER;
EOF

# Apply schema
sudo -u postgres psql -d $POSTGRES_DB -f "$APP_DIR/backend/schema.sql"

sudo -u postgres psql -d $POSTGRES_DB <<EOF
GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO $POSTGRES_USER;
GRANT ALL ON SCHEMA public TO $POSTGRES_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $POSTGRES_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $POSTGRES_USER;
EOF

# Configure environment
cat <<ENV | sudo tee "$APP_DIR/backend/.env"
DATABASE_URL=postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:5432/$POSTGRES_DB
PORT=4000
FQDN=$FQDN
ACME_EMAIL=$ACME_EMAIL
ENV

# Setup systemd service for backend
sudo tee /etc/systemd/system/member-voting-backend.service > /dev/null <<SERVICE
[Unit]
Description=Member Voting Backend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR/backend
ExecStart=/usr/bin/node $APP_DIR/backend/index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable member-voting-backend
sudo systemctl start member-voting-backend

# Configure Nginx
sudo tee /etc/nginx/sites-available/member-voting > /dev/null <<NGINX
server {
    listen 80;
    server_name $FQDN;

    # Serve static frontend build
    location / {
        root $APP_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy ACME challenge
    location /.well-known/acme-challenge/ {
        proxy_pass http://localhost:4000/api/.well-known/acme-challenge/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Proxy API
    location /api/ {
        proxy_pass http://localhost:4000/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Proxy uploads
    location /uploads/ {
        proxy_pass http://localhost:4000/uploads/;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/member-voting /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo mkdir /opt/member-voting/backend/certs
sudo chown -R $USER:$USER /opt/member-voting/backend/certs

# Optional: Setup HTTPS with Certbot
# sudo certbot --nginx -d your.domain.com --non-interactive --agree-tos -m admin@your.domain.com

# Done

echo "Deployment complete! Visit http://$FQDN to access the app."

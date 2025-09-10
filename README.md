# Member Voting Web Application

## Overview

Member Voting is a secure, customizable web application for managing ballots, anonymous voting, and member administration. Designed for organizations such as churches, clubs, or boards, it provides:

- **Anonymous voting** for members on scheduled ballots
- **Admin dashboard** for ballot creation, editing, reporting, and member management
- **Customizable branding** (colors, logo, icon, FQDN)
- **Quorum and acceptance thresholds** for ballot measures
- **Dynamic UI theming** and responsive design
- **ACME certificate management** for HTTPS (Let's Encrypt)
- **Automatic certificate renewal**

## Features

- **Ballot Management:**
  - Create, edit, schedule ballots with multiple measures
  - Set quorum and acceptance thresholds
  - View detailed ballot reports
  - Delete ballots (with cascading deletion of measures and votes)

- **Voting:**
  - Members vote anonymously on open ballots
  - Prevents duplicate voting
  - Ballot results and acceptance status are shown after voting

- **Member Management:**
  - Add, edit, delete members
  - Grant/revoke admin privileges

- **Branding & UI:**
  - Set background, navigation, text, and button colors
  - Upload logo and site icon
  - Set site FQDN (domain)
  - All UI elements dynamically themed

- **Security:**
  - JWT-based authentication
  - HTTPS enabled via ACME/Let's Encrypt
  - Automatic certificate renewal

## Deployment

### Prerequisites
- Ubuntu server (root access)
- Public domain (FQDN) pointing to your server

### Steps
1. **Clone the repository:**
   ```bash
   git clone https://github.com/jeremiah-shaff/member-voting.git
   cd member-voting
   ```
2. **Run the deployment script:**
   ```bash
   sudo bash deploy.sh
   ```
   - Installs Node.js, PostgreSQL, Nginx, Certbot
   - Sets up database and schema
   - Installs dependencies and builds frontend
   - Configures environment and systemd service
   - Sets up Nginx reverse proxy
   - (Optional) Enables HTTPS with Certbot

3. **Access the app:**
   - Visit `http://your.domain.com` in your browser
   - Login as admin and configure branding, FQDN, and certificates

### Manual HTTPS Setup (if needed)
- Run Certbot for your domain:
  ```bash
  sudo certbot --nginx -d your.domain.com --non-interactive --agree-tos -m admin@your.domain.com
  ```
- The backend also supports ACME auto-renewal and certificate requests from the Branding page.

## Project Structure
- `backend/` — Node.js/Express API, ACME integration, PostgreSQL
- `frontend/` — React UI (Vite), dynamic branding
- `deploy.sh` — Automated deployment script
- `schema.sql` — Database schema

## Customization
- Update colors, logo, icon, and FQDN from the Branding page
- Request/renew HTTPS certificates from the Branding page
- All settings are stored in the database and applied dynamically

## Support
For issues or feature requests, open an issue on GitHub or contact the maintainer.

# Member Voting Web Application

## Overview

Member Voting is a secure, customizable web application for managing ballots, anonymous voting, committee/member administration, and reporting. Designed for organizations such as churches, clubs, or boards, it provides:

- **Anonymous voting** for members on scheduled ballots
- **Committee management** for restricting ballots to specific member groups
- **Admin dashboard** for ballot creation, editing, reporting, and member management
- **Customizable branding** (colors, logo, icon, FQDN)
- **Quorum and acceptance thresholds** for ballot measures
- **Dynamic UI theming** and responsive design
- **ACME certificate management** for HTTPS (Let's Encrypt)
- **Automatic certificate renewal**
- **Nginx config automation** for HTTPS setup

## Features

- **Ballot Management:**
  - Create, edit, schedule ballots with multiple measures
  - Assign ballots to committees or open to all members
  - Set quorum and acceptance thresholds
  - View detailed ballot reports
  - Delete ballots (with cascading deletion of measures and votes)
  - Ballot visibility and expiration logic
  - Indicate in UI whether a member has voted and if a ballot is expired

- **Voting:**
  - Members vote anonymously on open ballots
  - Prevents duplicate voting
  - Ballot results and acceptance status are shown after voting
  - Ballot access restricted by committee assignment

- **Committee Management:**
  - Create, rename, delete committees
  - Assign/remove members and ballots to/from committees
  - UI shows assigned members/ballots and available options
  - Null handling for committee assignments

- **Member Management:**
  - Add, edit, delete members
  - Grant/revoke admin privileges
  - Case-insensitive usernames

- **Branding & UI:**
  - Set background, navigation, text, and button colors
  - Upload logo and site icon
  - Set site FQDN (domain)
  - All UI elements dynamically themed
  - Request certificate and rebuild Nginx config for HTTPS from Branding page
  - Navigation bar with reporting and branding options

- **Security:**
  - JWT-based authentication
  - HTTPS enabled via ACME/Let's Encrypt
  - Automatic certificate renewal
  - Nginx config rebuilt automatically after certificate request or via Branding page

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
   - **Modify the parameters at the beginning of the script to match your desired outcome**

   ```bash
   sudo bash deploy.sh
   ```
   - Installs Node.js, PostgreSQL, Nginx
   - Sets up database and schema
   - Installs dependencies and builds frontend
   - Configures environment and systemd service
   - Sets up Nginx reverse proxy and HTTPS automation

3. **Access the app:**
   - Visit `http://your.domain.com` in your browser
   - Login as admin and configure branding, FQDN, and certificates
   - Use the Branding page to request certificates and rebuild Nginx config for HTTPS

### Manual HTTPS Setup (if needed)
- Run Certbot for your domain:
  ```bash
  sudo certbot --nginx -d your.domain.com --non-interactive --agree-tos -m admin@your.domain.com
  ```
- The backend also supports ACME auto-renewal and certificate requests from the Branding page.

## Project Structure
- `backend/` — Node.js/Express API, ACME integration, PostgreSQL, Nginx config automation
- `frontend/` — React UI (Vite), dynamic branding, committee/ballot/member management
- `deploy.sh` — Automated deployment script
- `schema.sql` — Database schema

## Customization
- Update colors, logo, icon, and FQDN from the Branding page
- Request/renew HTTPS certificates and rebuild Nginx config from the Branding page
- All settings are stored in the database and applied dynamically

## Support
For issues or feature requests, open an issue on GitHub or contact the maintainer.

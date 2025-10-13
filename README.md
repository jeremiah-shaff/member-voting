# Member Voting Web Application
<img width="755" height="658" alt="image" src="https://github.com/user-attachments/assets/9f25ee4e-672a-4f26-b14b-6f6978f6c3c1" />

## Overview

Member Voting is a secure, timezone-aware web application for managing ballots, anonymous voting, committee/member administration, and reporting. Designed for organizations such as churches, clubs, or boards, it provides:

- **Anonymous voting** for members on scheduled ballots
- **Committee management** for restricting ballots to specific member groups
- **Admin dashboard** for ballot creation, editing, reporting, and member management
- **Customizable branding** (colors, logo, icon, FQDN, timezone)
- **Quorum and acceptance thresholds** for ballot measures
- **Dynamic UI theming** and responsive design
- **ACME certificate management** for HTTPS (Let's Encrypt)
- **Automatic certificate renewal**
- **Nginx config automation** for HTTPS setup
- **Timezone support** for all ballot scheduling, voting, and reporting

## Features

- **Ballot Management:**
  - Create, edit, schedule ballots with multiple measures
  - Assign ballots to committees or open to all members
  - Set quorum and acceptance thresholds
  - View detailed ballot reports and audit logs
  - Delete ballots (with cascading deletion of measures and votes)
  - Ballot visibility and expiration logic
  - Indicate in UI whether a member has voted and if a ballot is expired
  - All ballot times are stored and displayed in the branding timezone

- **Voting:**
  - Members vote anonymously on open ballots
  - Prevents duplicate voting
  - Ballot results and acceptance status are shown after voting
  - Ballot access restricted by committee assignment
  - Voting only allowed between ballot start and end times (branding timezone)

- **Committee Management:**
  - Create, rename, delete committees
  - Assign/remove members and ballots to/from committees
  - UI shows assigned members/ballots and available options
  - Null handling for committee assignments

- **Member Management:**
  - Add, edit, delete members
  - Grant/revoke admin privileges
  - Case-insensitive usernames
  - Invite-only registration with expiring links (works even when registration is disabled)

- **Branding & UI:**
  - Set background, navigation, text, and button colors
  - Upload logo and site icon
  - Set site FQDN (domain) and timezone
  - All UI elements dynamically themed
  - Request certificate and rebuild Nginx config for HTTPS from Branding page
  - Navigation bar with reporting and branding options

- **Security:**
  - JWT-based authentication
  - HTTPS enabled via ACME/Let's Encrypt
  - Automatic certificate renewal
  - Nginx config rebuilt automatically after certificate request or via Branding page

- **Reporting & Audit:**
  - Ballot audit page shows which members voted (no vote values exposed)
  - Paper ballot summary included in audit and report pages
  - Ballot details and measures shown on audit page

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
   - Login as admin (default pw: admin) and configure branding, FQDN, timezone, and certificates
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
- Update colors, logo, icon, FQDN, and timezone from the Branding page
- Request/renew HTTPS certificates and rebuild Nginx config from the Branding page
- All settings are stored in the database and applied dynamically

## Email invites and delivery options

The app can send unique, expiring registration links (even when global registration is disabled). You can choose between three delivery methods in the Admin UI.

1) Microsoft Graph (app-only, recommended for service accounts)
- Admin UI → Branding → Email Settings → enable "Use Microsoft Graph"
- Fill these fields and Save:
  - Tenant ID, Client ID, Client Secret (masked when saved)
  - Send As (user email), Authority (default OK)
- Click "Verify OAuth Token" to validate Graph credentials
- Use "Send Test Email" to confirm delivery

Azure requirements:
- Azure AD App Registration with Application permission Mail.Send (admin consent)
- After consent, the app can send mail using the selected "Send As" user

2) SMTP with delegated OAuth (Exchange Online)
- Admin UI → Branding → Email Settings → enable "Use OAuth (Exchange Online)"
- Set Mode = Delegated (device code)
- Fill and Save:
  - Tenant ID, Client ID, OAuth User (mailbox email)
  - Scopes (default includes `https://outlook.office365.com/SMTP.Send offline_access openid profile email`)
  - Authority (default OK)
- Click "Start Device Code Sign-in" and follow the on-screen instructions to authenticate the mailbox user
- Click "Verify OAuth Token" to confirm delegated token availability
- Use "Send Test Email"

Notes:
- SMTP with app-only OAuth is not supported by Exchange Online; use delegated mode or Microsoft Graph
- MSAL token cache is persisted in the `settings` table and refreshed automatically

3) SMTP with basic auth
- Admin UI → Branding → Email Settings (leave OAuth and Graph disabled)
- Provide SMTP URL, or Host/Port/Secure/Username/Password
- Save and send a test email
- Tenant/mailbox must have SMTP AUTH enabled for this to work

Server env fallback (if DB settings are not set):
- `SMTP_URL` OR individual settings: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` (true/false), `SMTP_USER`, `SMTP_PASS`
- Optional: `FROM_EMAIL` (default `no-reply@member-voting`)

### Sending invites
- In the Admin UI (Members/Invites), create invite(s) with optional email and expiration
- Copy the link or click "Send Email" to email it directly

### Registration behavior
- Visiting `/register?invite=TOKEN` validates the token and permits sign-up even if global registration is disabled
- If the invite includes an email, the username is pre-filled and locked

### Troubleshooting
- Use "Verify OAuth Token" for immediate feedback:
  - Reports if delegated OAuth (SMTP) or Graph (app-only) is configured correctly
  - Surfaces MSAL error details to help diagnose setup issues

## Support
For issues or feature requests, open an issue on GitHub or contact the maintainer.

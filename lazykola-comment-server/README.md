# lazykola Serverless Comment System (`lazykola-comment-server`)

A lightweight, zero-maintenance comment backend designed for the `lazykola-a11y` Nikola theme. It runs entirely on Cloudflare Workers and Cloudflare D1 (SQLite database), meaning **no server hosting fees and no database maintenance**.

## Features
- **Serverless & 100% Free:** Runs on Cloudflare's edge network within their generous free tier.
- **Threaded/Nested Comments:** Supports hierarchical replies (up to 3 levels deep).
- **Privacy-First (GDPR ready):** Commenter emails are hashed via SHA-256 for Gravatar and never exposed to the public frontend.
- **Password-Protected Admin Panel:** A clean, built-in dashboard to view, approve, mark spam, or delete comments at `/admin`.
- **Spam Mitigation:** Inbuilt CSS-hidden honeypots, optional Cloudflare Turnstile CAPTCHA validation, and server-side rate limits.
- **Discord Notifications:** Receive real-time Discord embed alerts whenever a comment is awaiting moderation.

---

## Quick Setup Guide (3 Minutes)

### 1. Prerequisites
Make sure you have:
- A free [Cloudflare Account](https://dash.cloudflare.com/sign-up).
- [Node.js](https://nodejs.org/) (which includes `npm`/`npx`) installed on your computer.

### 2. Install Dependencies
Open a terminal in this directory (`lazykola-comment-server`) and run:
```bash
npm install
```

### 3. Create the D1 Database
Create the database on your Cloudflare account by running:
```bash
npx wrangler d1 create lazykola-db
```
Copy the database binding info printed in the terminal (specifically the `database_id`) and paste it into your `wrangler.toml` file, replacing `PLACEHOLDER_D1_DATABASE_ID`:
```toml
database_id = "your-copied-database-id-here"
```

### 4. Initialize Database Schema
Deploy the comments table schema to your database:
```bash
# Push schema to live production database
npx wrangler d1 execute lazykola-db --file=schema.sql

# Push schema to local testing database (for local dev)
npx wrangler d1 execute lazykola-db --file=schema.sql --local
```

### 5. Set Admin Password
Set your admin dashboard login password securely:
```bash
npx wrangler secret put ADMIN_PASSWORD
```
*(Enter a strong password when prompted. The username to log in will be `admin`)*.

### 6. Deploy to Cloudflare
Deploy your Worker to the live edge network:
```bash
npx wrangler deploy
```
Once completed, note down your Worker's URL (e.g., `https://lazykola-comments.your-subdomain.workers.dev`).

---

## Integration with Nikola Theme

In your Nikola site root, open `conf.py` and configure the following:

```python
# 1. Enable the lazykola comment system
COMMENT_SYSTEM = "lazykola"

# 2. Paste your deployed Cloudflare Worker URL (omit trailing slash)
COMMENT_SYSTEM_ID = "https://lazykola-comments.your-subdomain.workers.dev"
```

### Optional: Cloudflare Turnstile (Spam Prevention)
If you want invisible CAPTCHA checks to block spam bots:
1. Register a free site on [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile).
2. Set your **Secret Key** in the Worker:
   ```bash
   npx wrangler secret put TURNSTILE_SECRET_KEY
   ```
3. Add your **Site Key** to the `THEME_CONFIG` in your Nikola `conf.py`:
   ```python
   THEME_CONFIG = {
       # ... other configs ...
       "comment_turnstile_site_key": "your-turnstile-site-key-here",
   }
   ```

### Optional: Discord Alerts
To receive a Discord notification when a new comment is posted and waiting for moderation:
1. Create a Discord Webhook in your server channel settings.
2. Set the Webhook URL in the Worker:
   ```bash
   npx wrangler secret put DISCORD_WEBHOOK_URL
   ```

### Optional: Auto-Approve Comments
By default, comments go to `pending` until approved in the dashboard. If you want to auto-publish comments:
1. Open `wrangler.toml`.
2. Under `[vars]`, uncomment/add:
   ```toml
   AUTO_APPROVE = "true"
   ```
3. Redeploy using `npx wrangler deploy`.

---

## Local Development & Testing

To test the system locally before publishing:
1. Run `npm run dev` (starts worker locally at `http://localhost:8787`).
2. Set your Nikola `COMMENT_SYSTEM_ID` to `http://localhost:8787`.
3. Rebuild your site (`nikola build`) and open the local preview. You can submit comments and moderate them by visiting `http://localhost:8787/admin` (default password is `admin` in local mode).

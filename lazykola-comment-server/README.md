# lazykola Serverless Comment System (`lazykola-comment-server`)

A lightweight, zero-maintenance comment backend designed for the `lazykola-a11y` Nikola theme. It runs entirely on Cloudflare Workers and Cloudflare D1 (SQLite database), meaning **no server hosting fees and no database maintenance**.

## Features
- **Serverless & 100% Free:** Runs on Cloudflare's edge network within their generous free tier.
- **Threaded/Nested Comments:** Supports hierarchical replies of any depth; the theme visually collapses threads past 3 levels behind a "Show more replies" toggle so long conversations stay readable instead of cluttering the page.
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

### 2. Run the setup script

Open a terminal in this directory (`lazykola-comment-server`) and run:
```bash
node setup.js
```

It installs dependencies, creates the D1 database, writes its id into `wrangler.toml`, pushes the schema, asks you (directly, via Wrangler's own prompt, this script never sees or stores it) for an admin dashboard password, deploys the Worker, and prints the exact `conf.py` snippet to paste in with your real deployed URL already filled in. If anything fails partway through, it stops and tells you what to fix; it's safe to just re-run afterward, it detects the database already exists and skips straight past creating it.

Not ready to go live yet? Run it with `--skip-deploy` instead:
```bash
node setup.js --skip-deploy
```
That sets up the database and admin password but skips the public deploy, so you can test locally first with `npm run dev` (serves at `http://localhost:8787`). When you're ready, run `npm run deploy` and copy the URL it prints into `conf.py`.

<details>
<summary>Step by step, if you'd rather run it manually or understand each part</summary>

#### Install Dependencies
```bash
npm install
```

#### Create the D1 Database
Create the database on your Cloudflare account by running:
```bash
npx wrangler d1 create lazykola-db
```
Copy the database binding info printed in the terminal (specifically the `database_id`) and paste it into your `wrangler.toml` file, replacing `PLACEHOLDER_D1_DATABASE_ID`:
```toml
database_id = "your-copied-database-id-here"
```

#### Initialize Database Schema
Deploy the comments table schema to your database:
```bash
# Push schema to live production database
npx wrangler d1 execute lazykola-db --file=schema.sql

# Push schema to local testing database (for local dev)
npx wrangler d1 execute lazykola-db --file=schema.sql --local
```

#### Set Admin Password
Set your admin dashboard login password securely:
```bash
npx wrangler secret put ADMIN_PASSWORD
```
*(Enter a strong password when prompted. The username to log in will be `admin`)*.

#### Deploy to Cloudflare
Deploy your Worker to the live edge network:
```bash
npx wrangler deploy
```
Once completed, note down your Worker's URL (e.g., `https://lazykola-comments.your-subdomain.workers.dev`).

</details>

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

### Optional: Hard-Delete Instead of Preserving Replies
By default, deleting a comment from the admin dashboard **preserves its replies** — the comment itself is replaced with a "[comment removed]" placeholder, but any genuine replies underneath it stay visible and readable. A separate "Deleted" tab in the dashboard lets you restore it or permanently purge it (and, on purge, its replies) later.

If you'd rather deleting a comment always take its entire reply thread down with it immediately (no soft-delete step):
1. Open `wrangler.toml`.
2. Under `[vars]`, uncomment/add:
   ```toml
   PRESERVE_REPLIES_ON_DELETE = "false"
   ```
3. Redeploy using `npx wrangler deploy`.

---

## Local Development & Testing

To test the system locally before publishing:
1. Run `npm run dev` (starts worker locally at `http://localhost:8787`).
2. Set your Nikola `COMMENT_SYSTEM_ID` to `http://localhost:8787`.
3. Rebuild your site (`nikola build`) and open the local preview. You can submit comments and moderate them by visiting `http://localhost:8787/admin` (default password is `admin` in local mode).

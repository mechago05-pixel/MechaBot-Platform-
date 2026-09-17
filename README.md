# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Deploy the frontend to Vercel

This repository contains a Vite React frontend and a separate PHP/MySQL API. Vercel can host the frontend, but the PHP API must run on a PHP-capable host with a reachable MySQL database.

1. Import the repository into Vercel. The included `vercel.json` configures the Vite build and client-side routing.
2. Set the Vercel environment variable `VITE_API_BASE_URL` to the public URL of the deployed API, for example `https://api.example.com/api`.
3. Deploy the API separately and configure its database environment variables (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`) plus `CORS_ORIGINS=https://your-app.vercel.app`.
4. Run the SQL in `mysql/schema.sql` on the production MySQL database before using the app.

For a custom frontend domain, set `CORS_ORIGINS` to that origin instead. Multiple origins can be supplied as a comma-separated list.

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

### Render (recommended for a live site)

This repo includes a production `Dockerfile` (React frontend + PHP API + built-in SQLite database) and `render.yaml`. Everything runs in **one free web service** — no separate MySQL service and no paid plan needed.

1. Push these files to GitHub (`https://github.com/mechago05-pixel/MechaBot-Platform-`).
2. Open [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
3. Connect the GitHub repo and apply `render.yaml` (set `DB_DRIVER=sqlite`).
4. When Render asks for values, paste:
   - `ADMIN_EMAIL` — your email; the first account registered with it becomes admin
   - Optional SMTP fields (`MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`)
5. Wait until **mechabot** is Live. The public URL is `https://mechabot.onrender.com` (or the URL Render shows).
6. Email verification is off by default (`VERIFY_EMAIL_ENABLED=false`) so you can register and sign in immediately.
7. To get an admin account: set `ADMIN_EMAIL` to your email **before** registering, register with that email, then manually restart the service once (Render Dashboard → Manual Deploy → Restart) to promote it. The SQLite data file lives at `api/data/mechabot.sqlite` inside the service; note that free instances lose local files on redeploy, so re-register if the database is reset.

The database schema is created automatically on first start (`api/migrate.php` handles both SQLite and MySQL). If you later upgrade to a paid plan, uncomment the `mechabot-mysql` block in `render.yaml` and set `DB_DRIVER=mysql` to switch back to MySQL.

### Go-live checklist (after the first deploy)

1. **Live URL** — `https://mechabot.onrender.com` serves the app, and `https://mechabot.onrender.com/api/health` should return `{"data":{"ok":true,"db":true}}`.
2. **Free tier cold start** — the service sleeps after 15 minutes idle; the first request can take 30–60 seconds while it wakes up. This is normal, not downtime.
3. **Create the admin account** — register with the exact `ADMIN_EMAIL`, then Render Dashboard → Manual Deploy → Restart so `api/migrate.php` promotes it on boot.
4. **Email verification** — stays off until SMTP env vars are filled; add `MAIL_USERNAME` + `MAIL_PASSWORD` (Gmail app password) and restart to turn it on.
5. **Data resets on redeploy** — SQLite lives inside the container on the free plan, so users/uploads are wiped on every deploy. Upgrade to a paid plan with a disk (or MySQL) for persistent data.

### Deploy the frontend to Vercel

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

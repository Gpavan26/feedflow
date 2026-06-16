# FeedFlow Automation Worker

Playwright-based worker that logs into a test Instagram account and performs
preference-based actions (search hashtags, view posts, like posts) for each
user with automation active.

## Local Setup

```bash
cd automation-worker
npm install
cp .env.example .env
# fill in .env with your Supabase service role key + test IG credentials
npm start
```

This runs ONE cycle and exits. To loop continuously, set `LOOP=true` in `.env`.

## Deploy to Render.com (free tier)

1. Push this `automation-worker` folder to a GitHub repo (can be a subfolder
   of your main repo — set Render's "Root Directory" accordingly)
2. On Render.com: **New +** → **Background Worker**
3. Connect your repo
4. Build Command: `npm install`
   (the `postinstall` script already runs `playwright install --with-deps chromium`)
5. Start Command: `npm start`
6. Add environment variables from `.env.example` (use your real values)
7. Set `LOOP=true` so it runs continuously with the interval defined by
   `RUN_INTERVAL_MINUTES`

### Alternative: Render Cron Job
If you prefer a true cron schedule instead of a long-running loop:
1. **New +** → **Cron Job**
2. Same build/start commands, set `LOOP=false` (default)
3. Set schedule e.g. `*/30 * * * *` (every 30 minutes)

## Where to get SUPABASE_SERVICE_ROLE_KEY

Supabase Dashboard → Project Settings → API → `service_role` key (under
"Project API keys"). This key bypasses Row Level Security — keep it secret,
never put it in the mobile app, only in this backend worker's environment.

## Safety Notes

- Always use a dedicated TEST Instagram account.
- Keep `MAX_ACTIONS_PER_RUN` low (3-5) and `RUN_INTERVAL_MINUTES` reasonable
  (20-30+) to avoid Instagram rate-limiting or temporary action blocks.
- Instagram's DOM/selectors change often. If `worker.js` selectors stop
  working, inspect the live page (`headless: false` locally) and update the
  selectors for login fields, like button, etc.
- If Instagram challenges the login (2FA / suspicious activity check), you'll
  need to complete that manually once via a non-headless run before the
  worker can log in automatically going forward (session cookies could be
  persisted as a future improvement).

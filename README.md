# FeedFlow — Hackathon Submission

A mobile app that lets users personalize their Instagram feed by selecting
interests, connecting their account, and running an automated background
worker that reinforces those preferences over time.

## Project Structure

```
feedflow/
├── mobile/              # React Native + Expo app
├── supabase/            # Database schema (SQL)
└── automation-worker/   # Node.js + Playwright automation service
```

---

## SETUP — Follow these steps in order

### 1. Create Supabase Project (~5 min)

1. Go to https://supabase.com and sign up / log in
2. Click "New Project" — name it `feedflow`, choose a region, set a DB password (save it)
3. Wait ~2 min for provisioning
4. Go to **SQL Editor** → New Query → paste the entire contents of `supabase/schema.sql` → Run
5. Go to **Project Settings → API** → copy:
   - `Project URL`
   - `anon public key`
6. Go to **Authentication → Providers** → ensure "Email" is enabled (default)
   - Optional: under Authentication → Settings, disable "Confirm email" for faster testing

### 2. Configure the Mobile App (~5 min)

1. `cd feedflow/mobile`
2. Copy `.env.example` to `.env` and fill in your Supabase URL + anon key
3. `npm install`
4. Test locally: `npx expo start` (scan QR with Expo Go app)

### 3. Build the APK with EAS (~20-30 min)

1. Install EAS CLI: `npm install -g eas-cli`
2. Login: `eas login` (create a free Expo account if needed at expo.dev)
3. From `feedflow/mobile`: `eas build:configure`
4. Build: `eas build -p android --profile preview`
5. Once done, EAS gives you a download link for the `.apk` — this is your submission link

### 4. Deploy the Automation Worker (~10 min)

1. `cd feedflow/automation-worker`
2. Copy `.env.example` to `.env`, fill in:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (from Project Settings → API → service_role — keep secret)
   - `IG_USERNAME`, `IG_PASSWORD` (a TEST Instagram account, not your personal one)
3. Test locally: `npm install` then `npm start`
4. Deploy to Render.com (free tier):
   - Push this folder to a GitHub repo
   - On Render: New → Background Worker (or Cron Job) → connect repo
   - Set build command: `npm install && npx playwright install --with-deps chromium`
   - Set start command: `npm start`
   - Add the same env vars in Render's dashboard
   - For scheduling, use Render Cron Jobs (run every 30 min) or keep as a long-running worker with an internal setInterval

### 5. Record Demo Video (3-5 min)

Suggested flow:
1. Open app → onboarding screens
2. Select "more of" (e.g. Technology, AI) and "less of" categories → save
3. Connect Instagram screen → show status changing Disconnected → Connecting → Connected, with Last Sync timestamp
4. Switch to dashboard → toggle Automation Active
5. Show backend/Supabase table `automation_logs` populating with real entries (cut to Supabase dashboard or have it visible in-app)
6. Show analytics: Actions Completed counter increasing, Last Activity time, progress bar
7. Settings screen quick walkthrough

### 6. Submit

Post in the Telegram group:
- EAS APK download link
- Demo video (Loom/YouTube unlisted)
- (Optional) Supabase project link if they want to inspect data

---

## Important Notes on Instagram Automation

- **Use a dedicated test Instagram account** — never your personal one. Automated
  login/actions can trigger Instagram's bot detection and result in temporary
  or permanent restrictions.
- The Playwright worker logs into Instagram, navigates to the Explore page or
  searches hashtags matching the user's "more of" categories, and performs
  lightweight engagement actions (viewing posts, liking occasionally,
  following relevant accounts) — all logged to `automation_logs`.
- Keep action frequency LOW (a few actions per run, runs every 20-30 min) to
  avoid rate limiting / account flags during your demo.
- Instagram's UI changes frequently — if selectors break, you may need to
  adjust them (see comments in `automation-worker/worker.js`).

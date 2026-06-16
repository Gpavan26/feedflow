/**
 * FeedFlow Automation Worker
 *
 * For each user with automation active and Instagram connected, this worker:
 *  1. Logs into Instagram using a dedicated test account (Playwright)
 *  2. Searches hashtags/explore content matching the user's "more of" categories
 *  3. Performs lightweight engagement actions (view, like, follow) on relevant posts
 *  4. Logs each action to the `automation_logs` table for the dashboard
 *
 * IMPORTANT: Use a dedicated TEST Instagram account, not a personal one.
 * Instagram actively detects automation; keep MAX_ACTIONS_PER_RUN low and
 * RUN_INTERVAL_MINUTES reasonable (20-30+) to reduce risk of restrictions.
 *
 * Run modes:
 *  - `npm start` runs one cycle then exits (good for cron-based deployment)
 *  - Set LOOP=true in env to run continuously with setInterval
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  IG_USERNAME,
  IG_PASSWORD,
  RUN_INTERVAL_MINUTES = "30",
  MAX_ACTIONS_PER_RUN = "5",
  LOOP = "false",
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Map FeedFlow categories -> Instagram hashtags to search
const CATEGORY_HASHTAGS = {
  Technology: ["tech", "technology", "innovation"],
  "Artificial Intelligence": ["artificialintelligence", "machinelearning", "ai"],
  Startups: ["startup", "entrepreneur", "startuplife"],
  Business: ["business", "businessgrowth", "marketing"],
  Finance: ["finance", "investing", "personalfinance"],
  Fitness: ["fitness", "workout", "gym"],
  Health: ["health", "wellness", "healthylifestyle"],
  Education: ["education", "learning", "study"],
  Travel: ["travel", "wanderlust", "travelphotography"],
  Gaming: ["gaming", "gamer", "videogames"],
  Fashion: ["fashion", "style", "ootd"],
  Food: ["food", "foodie", "recipe"],
  Music: ["music", "musician", "newmusic"],
  Sports: ["sports", "athlete", "training"],
  "Art & Design": ["art", "design", "illustration"],
};

async function getActiveUsers() {
  // Users who have automation active AND instagram connected
  const { data: settings, error: settingsError } = await supabase
    .from("automation_settings")
    .select("user_id, is_active")
    .eq("is_active", true);

  if (settingsError) throw settingsError;
  if (!settings.length) return [];

  const userIds = settings.map((s) => s.user_id);

  const { data: connections, error: connError } = await supabase
    .from("instagram_connections")
    .select("user_id, status, ig_username")
    .in("user_id", userIds)
    .eq("status", "connected");

  if (connError) throw connError;

  return connections;
}

async function getUserPreferences(userId) {
  const { data, error } = await supabase
    .from("preferences")
    .select("category, preference_type")
    .eq("user_id", userId)
    .eq("preference_type", "more");

  if (error) throw error;
  return data.map((p) => p.category);
}

async function logAction(userId, actionType, category, target, status = "success") {
  await supabase.from("automation_logs").insert({
    user_id: userId,
    action_type: actionType,
    category,
    target,
    status,
  });
}

async function updateLastSync(userId) {
  await supabase
    .from("instagram_connections")
    .update({ last_sync: new Date().toISOString() })
    .eq("user_id", userId);
}

async function runCycleForUser(browser, userId, igUsername) {
  console.log(`\n--- Running cycle for user ${userId} (@${igUsername}) ---`);

  const categories = await getUserPreferences(userId);
  if (!categories.length) {
    console.log("No 'more' preferences set, skipping.");
    return;
  }

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
  });
  const page = await context.newPage();

  try {
    // Login
    await page.goto("https://www.instagram.com/accounts/login/", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2000);

    // Accept cookies if prompted
    const acceptBtn = page.getByRole("button", { name: /accept/i });
    if (await acceptBtn.isVisible().catch(() => false)) {
      await acceptBtn.click().catch(() => {});
    }

    await page.fill('input[name="username"]', IG_USERNAME);
    await page.fill('input[name="password"]', IG_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    // Dismiss "Save login info" / notification dialogs if present
    const notNowBtn = page.getByRole("button", { name: /not now/i });
    if (await notNowBtn.isVisible().catch(() => false)) {
      await notNowBtn.click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    let actionsThisRun = 0;
    const maxActions = parseInt(MAX_ACTIONS_PER_RUN, 10);

    for (const category of categories) {
      if (actionsThisRun >= maxActions) break;

      const hashtags = CATEGORY_HASHTAGS[category] || [category.toLowerCase()];
      const hashtag = hashtags[Math.floor(Math.random() * hashtags.length)];

      console.log(`Searching #${hashtag} for category "${category}"`);

      await page.goto(`https://www.instagram.com/explore/tags/${hashtag}/`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForTimeout(3000);

      await logAction(userId, "search", category, `#${hashtag}`);
      actionsThisRun++;

      // Click into the first post and "view" it
      const firstPost = page.locator("article a").first();
      if (await firstPost.isVisible().catch(() => false)) {
        await firstPost.click().catch(() => {});
        await page.waitForTimeout(2000);

        await logAction(userId, "view", category, `Post under #${hashtag}`);
        actionsThisRun++;

        // Like the post (best-effort — selector may need updates if IG changes UI)
        if (actionsThisRun < maxActions) {
          const likeBtn = page.locator('svg[aria-label="Like"]').first();
          if (await likeBtn.isVisible().catch(() => false)) {
            await likeBtn.click().catch(() => {});
            await logAction(userId, "like", category, `Post under #${hashtag}`);
            actionsThisRun++;
          }
        }

        // Go back to feed/explore
        await page.goBack().catch(() => {});
        await page.waitForTimeout(1500);
      }
    }

    await updateLastSync(userId);
    console.log(`Cycle complete: ${actionsThisRun} actions logged.`);
  } catch (err) {
    console.error(`Error during cycle for user ${userId}:`, err.message);
    await logAction(userId, "search", null, "Cycle error", "failed");
  } finally {
    await context.close();
  }
}

async function runCycle() {
  console.log(`\n=== FeedFlow automation cycle started: ${new Date().toISOString()} ===`);

  if (!IG_USERNAME || !IG_PASSWORD) {
    console.error("Missing IG_USERNAME or IG_PASSWORD — cannot run automation.");
    return;
  }

  const activeUsers = await getActiveUsers();
  console.log(`Found ${activeUsers.length} active user(s) with Instagram connected.`);

  if (!activeUsers.length) return;

  const browser = await chromium.launch({ headless: true });

  for (const user of activeUsers) {
    await runCycleForUser(browser, user.user_id, user.ig_username);
  }

  await browser.close();
  console.log(`=== Cycle finished: ${new Date().toISOString()} ===`);
}

// Entry point
(async () => {
  await runCycle();

  if (LOOP === "true") {
    const intervalMs = parseInt(RUN_INTERVAL_MINUTES, 10) * 60 * 1000;
    console.log(`Looping every ${RUN_INTERVAL_MINUTES} minutes...`);
    setInterval(runCycle, intervalMs);
  } else {
    process.exit(0);
  }
})();

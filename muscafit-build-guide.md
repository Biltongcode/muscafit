# Muscafit — Full Build Guide

---

## MASTER PROMPT — Give This to Claude Code First

Copy everything below the line into Claude Code as your opening message. Then give it this file as context.

---

```
I'm building Muscafit, a strength training accountability tracker web app. I have a full spec document — please read it completely before writing any code.

KEY INSTRUCTIONS:
1. Read the ENTIRE spec first to understand the full architecture, schema, and all 7 phases.
2. Build it PHASE BY PHASE. Start with Phase 1 only.
3. After completing each phase, STOP and tell me what you built and how to test it. Wait for me to confirm it works before starting the next phase.
4. Use the exact database schema from the spec — don't simplify or modify it.
5. Use the exact tech stack specified: Next.js 14 (App Router), TypeScript, Tailwind CSS, better-sqlite3, NextAuth.js credentials provider.
6. Port 3010 — my existing app uses 3000-3003.
7. Project directory: ~/muscafit
8. Database file: ~/muscafit/data/tracker.db

The app is for 2 users initially (may grow to 4-5 later). It's a private app deployed on my VPS at train.biltongcodes.com. Both users need individual logins. The daily view shows both users' exercises side by side for accountability.

Default exercises for the first user (Duncan):
- 125 press ups in 5 sets of 25 (reps_sets)
- 50 row/crunches (reps)
- 80 knee to elbow crunches (reps)
- 80 scissor leg raises (reps)
- 80 ankle taps (reps)
- 3 × 30 sec side planks each side (timed_sets, note: "each side")

Leave the second user's exercises empty — they'll configure their own.

Please start by reading the full spec, then begin Phase 1: Project Scaffold + Auth.
```

---

## What We're Building

A private web app at **train.biltongcodes.com** where you and your friend (and potentially more friends later) log daily strength training, tick off exercises, leave comments, and track activity sessions (squash, run, walk, gym, cycle). Email notifications nudge you if you haven't logged by a set time.

---

## Your Existing Setup (Quick Reference)

| Detail | Value |
|--------|-------|
| VPS | DigitalOcean, Ubuntu 24.04 LTS, London |
| IP | 138.68.177.215 |
| Domain | biltongcodes.com |
| DNS | Cloudflare (DNS only / grey cloud) |
| SSH | `ssh duncan@biltongcodes.com` |
| User | duncan (sudo) |
| Existing apps | daily-brief on PM2 (ports 3000-3003), nginx, certbot |
| Firewall | UFW — ports 22, 80, 443 open |
| Node | v22 |
| Process manager | PM2 |

---

## Architecture

```
Browser (you + friend)
    │
    ▼
Nginx (train.biltongcodes.com, HTTPS, reverse proxy)
    │
    ▼
Next.js app (port 3010) — API routes + React frontend
    │
    ▼
SQLite database (~/muscafit/data/tracker.db)
    │
    ▼
node-cron → Resend email notifications
```

Single codebase. No separate backend/frontend repos. No Lovable needed.

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js 14** (App Router) | API routes + frontend in one project, React, great DX |
| Database | **SQLite** via better-sqlite3 | Perfect for small user counts, no Postgres overhead, single file backup |
| Auth | **NextAuth.js** (credentials provider) | Individual logins per user, JWT sessions in HTTP-only cookies |
| Styling | **Tailwind CSS** | Fast, utility-first, easy to iterate |
| Email | **Resend** (resend.com) | 3,000 free emails/month, dead simple API, 5-min setup |
| Scheduler | **node-cron** | In-process cron for notification timing |
| Deployment | **PM2** + **nginx** | Consistent with your existing daily-brief setup |

---

## Database Schema

```sql
-- Users
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Exercise templates (each user has their own library)
CREATE TABLE exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,              -- e.g. "Press ups"
  target_type TEXT NOT NULL,       -- 'reps', 'reps_sets', 'timed', 'timed_sets'
  target_value INTEGER,            -- e.g. 125 (total reps), or 30 (seconds)
  target_sets INTEGER,             -- e.g. 5 (sets of 25), or 3 (for side planks)
  target_per_set INTEGER,          -- e.g. 25 (reps per set), or 30 (sec per set)
  notes TEXT,                      -- e.g. "each side" for side planks
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily exercise log entries
CREATE TABLE exercise_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  log_date DATE NOT NULL,
  completed BOOLEAN DEFAULT 0,
  actual_value INTEGER,            -- what they actually did
  actual_sets INTEGER,
  notes TEXT,                      -- per-exercise notes for the day
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, exercise_id, log_date)
);

-- Activity sessions (squash, run, walk, gym, cycle)
CREATE TABLE activity_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  session_date DATE NOT NULL,
  activity_type TEXT NOT NULL,     -- 'squash', 'run', 'walk', 'gym', 'cycle'
  duration_minutes INTEGER,
  distance_km REAL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Comments (per day, between users)
CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id INTEGER NOT NULL REFERENCES users(id),
  target_user_id INTEGER NOT NULL REFERENCES users(id),
  comment_date DATE NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### How Your Exercises Map to This Schema

| Your Exercise | target_type | target_value | target_sets | target_per_set | notes |
|--------------|-------------|-------------|-------------|----------------|-------|
| 125 press ups in 25 splits | reps_sets | 125 | 5 | 25 | |
| 50 row/crunches | reps | 50 | | | |
| 80 knee to elbow crunches | reps | 80 | | | |
| 80 scissor leg raise things | reps | 80 | | | |
| 80 ankle taps | reps | 80 | | | |
| 3 × side planks 30 sec each side | timed_sets | 30 | 3 | 30 | each side |

---

## UI Design

### Daily View (Main Screen)

The main screen shows **today's date** at the top with left/right arrows to navigate days. Below that, side-by-side columns (or stacked on mobile) — one per user.

Each user's column shows:

**Exercise Checklist**
- Each exercise as a row with the exercise name, target (e.g. "125 in 5×25"), and a checkbox
- Tapping the checkbox marks it complete and timestamps it
- A small edit icon lets you adjust the actual value if you did more/less
- Completed items get a subtle green highlight or strikethrough

**Activity Badges**
- A row of icon buttons: 🏸 squash, 🏃 run, 🚶 walk, 💪 gym, 🚴 cycle
- Tapped = logged (turns highlighted). Tap again to add duration/notes
- Shows as small coloured badges when logged

**Comment Section**
- Below each column, a small text input to leave a comment on that person's day
- Shows existing comments with author and timestamp

### Weekly View

A grid: days across the top (Mon–Sun), users as sections. Each cell shows completion percentage (e.g. "4/6") with colour coding: green (all done), amber (partial), empty (nothing logged). Activity icons shown as small dots below the number.

### Settings / Exercises Page

Each user can manage their own exercise list: add, edit, reorder, deactivate. Changes only affect future days (historical logs stay intact).

---

## Build Phases (Claude Code Prompts)

### Phase 1 — Project Scaffold + Auth

**Claude Code prompt:**

```
Create a Next.js 14 app (App Router) in ~/muscafit with:
- TypeScript
- Tailwind CSS
- better-sqlite3 for database
- NextAuth.js with credentials provider
- A SQLite database at ~/muscafit/data/tracker.db
- The database schema from the spec (users, exercises, exercise_logs, activity_sessions, comments tables)
- A seed script that creates two users: "Duncan" and "[friend's name]" with bcrypt-hashed passwords
- A login page at /login
- Middleware that redirects unauthenticated users to /login
- A basic home page at / that shows "Welcome, [name]" after login
- Use port 3010 for the dev server

Database should auto-create tables on first run if they don't exist.
The seed script should be at scripts/seed.ts and runnable with npx tsx scripts/seed.ts.
```

### Phase 2 — Daily Logging Core

**Claude Code prompt:**

```
In the muscafit Next.js app, build the daily exercise logging:

API routes:
- GET /api/exercises — list active exercises for current user
- POST /api/exercises — create a new exercise
- PUT /api/exercises/[id] — update exercise
- GET /api/logs?date=YYYY-MM-DD — get all exercise logs for a date (both users)
- POST /api/logs — create or update an exercise log entry (upsert on user_id + exercise_id + log_date)
- PUT /api/logs/[id] — update a log entry (completed, actual_value, notes)

The main page (/) should show:
- Today's date with prev/next day navigation arrows
- Two columns (side by side on desktop, stacked on mobile), one per user
- Each column lists that user's active exercises with:
  - Exercise name and target description (e.g. "Press ups — 125 in 5×25")
  - A checkbox to mark complete
  - When checked, it saves immediately via API and shows a subtle completion animation
  - An expand/edit button to enter actual_value and notes
- A completion summary at the top of each column (e.g. "4/6 complete")
- Colour-code: green background on completed rows

Auto-generate today's log entries if they don't exist when the page loads.
Use optimistic UI updates — check the box immediately, sync in background.
```

### Phase 3 — Activity Sessions

**Claude Code prompt:**

```
Add activity session logging to the muscafit app:

API routes:
- GET /api/activities?date=YYYY-MM-DD — get all activity sessions for a date (both users)
- POST /api/activities — create an activity session
- PUT /api/activities/[id] — update
- DELETE /api/activities/[id] — delete

On the main daily page, below each user's exercise list, add an activity bar:
- Five icon buttons in a row: squash (racquet), run (runner), walk (footprints), gym (dumbbell), cycle (bike)
- Use Lucide icons or simple SVG icons
- Tapping an icon opens a small popover/modal to enter duration (minutes) and optional notes, then saves
- Logged activities show as highlighted/filled icons with duration shown below
- Tapping an already-logged activity lets you edit or remove it

Keep it compact — this should be a single row of icons, not a big form.
```

### Phase 4 — Comments

**Claude Code prompt:**

```
Add a comment system to the muscafit app:

API routes:
- GET /api/comments?date=YYYY-MM-DD&target_user_id=X — get comments for a user on a date
- POST /api/comments — create a comment

On the daily page, below each user's column (after exercises and activities), add:
- A list of existing comments for that user on that day, showing author name, time, and text
- A text input with a send button for the OTHER user to leave a comment
- Comments should appear immediately after posting (optimistic update)
- Keep the design lightweight — small text, minimal chrome

Users can comment on the other person's day but also on their own (for personal notes).
```

### Phase 5 — Weekly Overview

**Claude Code prompt:**

```
Add a weekly view to the muscafit app at /weekly:

- Show the current week (Mon-Sun) with navigation arrows for prev/next week
- For each user, show a row with:
  - 7 cells (one per day)
  - Each cell shows: completion fraction (e.g. "4/6"), colour-coded green/amber/grey
  - Small activity icons below the number for any activities logged that day
  - Clicking a cell navigates to that day's daily view
- Add a nav bar or tabs to switch between Daily and Weekly views
- On mobile, make the grid scrollable horizontally if needed

This view is the accountability overview — you should be able to glance at it and see who's been consistent.
```

### Phase 6 — Exercise Management

**Claude Code prompt:**

```
Add an exercise management page at /settings/exercises:

- List the current user's exercises in their sort order
- Each exercise shows: name, target description, active/inactive toggle
- Drag to reorder (or up/down buttons as simpler alternative)
- Click to edit: name, target_type (dropdown: reps, reps_sets, timed, timed_sets), target_value, target_sets, target_per_set, notes
- Add new exercise button at the bottom
- Deactivating an exercise hides it from future daily views but keeps historical logs
- Add a link to this page from the main nav

Also add a profile section at /settings/profile where users can update their display name and email.
```

### Phase 7 — Email Notifications

**Claude Code prompt:**

```
Add email notifications to the muscafit app using Resend (resend.com):

Install the resend npm package.

Create a file lib/notifications.ts that:
- Uses node-cron to schedule a job at 8pm every day
- Checks each user: if they have 0 completed exercises for today, send a reminder email
- The email subject: "💪 Don't forget to log your training today"
- The email body: a simple HTML email showing how many exercises are waiting, and a link to train.biltongcodes.com
- Also send a morning summary at 7am: what the OTHER user did yesterday (exercises completed, activities, any comments)
- Use RESEND_API_KEY from environment variables
- Use a from address like "Muscafit <notifications@biltongcodes.com>" (or your Resend verified domain)

Create API route POST /api/settings/notifications for users to set their preferences:
- Notifications on/off
- Evening reminder time
- Morning summary on/off

Store preferences in a new user_settings table.

Import and start the cron jobs in the Next.js instrumentation file (instrumentation.ts) so they run when the server starts.
```

---

## Deployment on Your VPS

### Step 1 — Create DNS Record

Log into Cloudflare → biltongcodes.com → DNS:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | train | 138.68.177.215 | DNS only (grey cloud) |

This gives you **train.biltongcodes.com**.

### Step 2 — SSH In and Set Up the Project

```bash
ssh duncan@biltongcodes.com

# Create project directory
mkdir -p ~/muscafit/data

# Clone your repo (after you push it to GitHub)
cd ~
git clone https://github.com/YOUR_USERNAME/muscafit.git
# OR if building directly on server with Claude Code, the files will already be there

cd ~/muscafit
npm install
```

### Step 3 — Create Environment File

```bash
nano ~/muscafit/.env
```

Add:

```env
# Auth
NEXTAUTH_SECRET=generate-a-random-string-here-use-openssl-rand-base64-32
NEXTAUTH_URL=https://train.biltongcodes.com

# Database
DATABASE_PATH=./data/tracker.db

# Email notifications (sign up at resend.com)
RESEND_API_KEY=re_xxxxxxxxxxxx
NOTIFICATION_FROM=Muscafit <notifications@biltongcodes.com>
```

Generate the secret:
```bash
openssl rand -base64 32
```

### Step 4 — Build and Seed

```bash
cd ~/muscafit
npm run build
npx tsx scripts/seed.ts
```

### Step 5 — Set Up PM2

```bash
# Start the app
pm2 start npm --name muscafit -- start -- -p 3010
pm2 save

# Verify it's running
pm2 status
curl http://localhost:3010  # should return HTML
```

### Step 6 — Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/muscafit
```

Paste this config:

```nginx
server {
    listen 80;
    server_name train.biltongcodes.com;

    # Redirect HTTP to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name train.biltongcodes.com;

    # SSL certs (Certbot will fill these in, but we set them up)
    ssl_certificate /etc/letsencrypt/live/train.biltongcodes.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/train.biltongcodes.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and test:

```bash
sudo ln -s /etc/nginx/sites-available/muscafit /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 7 — Get SSL Certificate

```bash
# Temporarily comment out the ssl_certificate lines in the nginx config
# and the entire :443 server block, then reload nginx, then:
sudo certbot --nginx -d train.biltongcodes.com

# Certbot will modify your nginx config to add the certificate paths
# and handle the redirect automatically
sudo systemctl reload nginx
```

### Step 8 — Set Up Resend for Email

1. Go to resend.com and create a free account
2. Add your domain (biltongcodes.com) — Resend will give you DNS records to add in Cloudflare
3. Typically 3 records: a TXT record, a CNAME for DKIM, and a CNAME for return path
4. Add those records in Cloudflare DNS
5. Verify the domain in Resend
6. Copy your API key into the .env file
7. Restart: `pm2 restart muscafit`

### Step 9 — Update Script

Create a quick deploy script:

```bash
nano ~/muscafit/deploy.sh
```

```bash
#!/bin/bash
cd ~/muscafit
git pull
npm install
npm run build
pm2 restart muscafit
echo "✅ Deployed!"
```

```bash
chmod +x ~/muscafit/deploy.sh
```

Now after pushing code changes: `ssh duncan@biltongcodes.com "~/muscafit/deploy.sh"`

---

## Adding More Friends Later

The app is designed to scale to more users easily:

1. Create their account: add them to the seed script or build a simple admin page
2. The daily view already queries all users — it'll just add another column
3. On mobile, additional users stack vertically
4. Each user manages their own exercise list independently
5. Comments work between any users

For 4+ users, you might want to add a compact card layout instead of full columns, but that's a simple UI tweak when the time comes.

---

## Backup Strategy

Your SQLite database is a single file. Set up a simple daily backup:

```bash
# Add to crontab: crontab -e
0 3 * * * cp ~/muscafit/data/tracker.db ~/muscafit/data/backups/tracker-$(date +\%Y\%m\%d).db

# Create backup directory
mkdir -p ~/muscafit/data/backups
```

For off-server backup, you could also add a line to copy to DigitalOcean Spaces or just download periodically.

---

## Quick Reference — After Deployment

| Task | Command |
|------|---------|
| Check status | `pm2 status` |
| View logs | `pm2 logs muscafit --lines 50 --nostream` |
| Restart app | `pm2 restart muscafit` |
| Deploy update | `~/muscafit/deploy.sh` |
| Change user password | Run a script or build admin UI |
| Backup database | `cp ~/muscafit/data/tracker.db ~/muscafit/data/backups/tracker-$(date +%Y%m%d).db` |
| Check SSL | `sudo certbot certificates` |
| Nginx logs | `sudo tail -f /var/log/nginx/access.log` |

---

## Workflow Summary

1. **Open Claude Code** on your PC
2. **Paste the Master Prompt** from the top of this document
3. **Attach this full spec file** so Claude Code can read it
4. **Let it build Phase 1**, test it locally, confirm it works
5. **Say "Phase 2 please"** — repeat for each phase
6. **Push to GitHub** when you're happy with it locally
7. **Deploy to VPS** following the deployment steps above
8. **Share the login** with your friend

Each phase is designed to be a standalone, testable unit. You'll have a working app after Phase 2 — everything after that is polish and features.

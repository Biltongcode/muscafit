import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || './data/tracker.db';

// Ensure the data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_value INTEGER,
    target_sets INTEGER,
    target_per_set INTEGER,
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS exercise_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    exercise_id INTEGER NOT NULL REFERENCES exercises(id),
    log_date DATE NOT NULL,
    completed BOOLEAN DEFAULT 0,
    actual_value INTEGER,
    actual_sets INTEGER,
    notes TEXT,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, exercise_id, log_date)
  );

  CREATE TABLE IF NOT EXISTS activity_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    session_date DATE NOT NULL,
    activity_type TEXT NOT NULL,
    duration_minutes INTEGER,
    distance_km REAL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id INTEGER NOT NULL REFERENCES users(id),
    target_user_id INTEGER NOT NULL REFERENCES users(id),
    comment_date DATE NOT NULL,
    body TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    notifications_enabled BOOLEAN DEFAULT 1,
    evening_reminder_enabled BOOLEAN DEFAULT 1,
    evening_reminder_hour INTEGER DEFAULT 20,
    morning_summary_enabled BOOLEAN DEFAULT 1,
    morning_summary_hour INTEGER DEFAULT 7,
    notification_email TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Safe migration: add avatar_url column to users if missing
try {
  db.exec(`ALTER TABLE users ADD COLUMN avatar_url TEXT`);
} catch {
  // Column already exists — ignore
}

// Safe migration: add schedule_days column to exercises if missing
try {
  db.exec(`ALTER TABLE exercises ADD COLUMN schedule_days TEXT`);
} catch {
  // Column already exists — ignore
}

// Goals table
db.exec(`
  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_name TEXT NOT NULL,
    goal_type TEXT NOT NULL,
    scope TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id),
    target_value INTEGER NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Connections tables
db.exec(`
  CREATE TABLE IF NOT EXISTS user_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    connected_user_id INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, connected_user_id)
  );

  CREATE TABLE IF NOT EXISTS connection_invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inviter_id INTEGER NOT NULL REFERENCES users(id),
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed existing Duncan<->Fred connection (safe - UNIQUE constraint will prevent duplicates)
try { db.exec("INSERT INTO user_connections (user_id, connected_user_id) VALUES (1, 2)"); } catch {}
try { db.exec("INSERT INTO user_connections (user_id, connected_user_id) VALUES (2, 1)"); } catch {}

// Safe migration: add created_by_id to goals
try { db.exec('ALTER TABLE goals ADD COLUMN created_by_id INTEGER REFERENCES users(id)'); } catch {}
try { db.exec("UPDATE goals SET created_by_id = 1 WHERE scope = 'group' AND created_by_id IS NULL"); } catch {}

// Safe migration: add weekly summary columns to user_settings if missing
try {
  db.exec(`ALTER TABLE user_settings ADD COLUMN weekly_summary_enabled BOOLEAN DEFAULT 1`);
} catch {
  // Column already exists
}
try {
  db.exec(`ALTER TABLE user_settings ADD COLUMN weekly_summary_hour INTEGER DEFAULT 18`);
} catch {
  // Column already exists
}

// Safe migration: add weight columns for weighted exercises
try { db.exec(`ALTER TABLE exercises ADD COLUMN target_weight REAL`); } catch {}
try { db.exec(`ALTER TABLE exercises ADD COLUMN weight_unit TEXT DEFAULT 'kg'`); } catch {}
try { db.exec(`ALTER TABLE exercise_logs ADD COLUMN actual_weight REAL`); } catch {}

// Safe migration: add role column to users
try { db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`); } catch {}
// Auto-promote user id 1 to admin
try { db.exec(`UPDATE users SET role = 'admin' WHERE id = 1 AND role = 'user'`); } catch {}

// Safe migration: add canonical_name for shared exercise catalogue
try { db.exec(`ALTER TABLE exercises ADD COLUMN canonical_name TEXT`); } catch {}

// Safe migration: add status column for planned activities
try { db.exec(`ALTER TABLE activity_sessions ADD COLUMN status TEXT DEFAULT 'completed'`); } catch {}

// AI insights cache
db.exec(`
  CREATE TABLE IF NOT EXISTS weekly_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    week_start TEXT NOT NULL,
    insight TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, week_start)
  );
`);

export default db;

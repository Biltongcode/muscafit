import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || './data/tracker.db';

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
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
`);

// Seed users
const password1 = bcrypt.hashSync('duncan123', 10);
const password2 = bcrypt.hashSync('fred123', 10);

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (name, email, password_hash) VALUES (?, ?, ?)
`);

insertUser.run('Duncan', 'duncan@muscafit.local', password1);
insertUser.run('Fred', 'fred@muscafit.local', password2);

// Get Duncan's user ID
const duncan = db.prepare('SELECT id FROM users WHERE email = ?').get('duncan@muscafit.local') as { id: number };

// Seed Duncan's exercises
const insertExercise = db.prepare(`
  INSERT OR IGNORE INTO exercises (user_id, name, target_type, target_value, target_sets, target_per_set, notes, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

// Check if exercises already exist for Duncan
const existingCount = db.prepare('SELECT COUNT(*) as count FROM exercises WHERE user_id = ?').get(duncan.id) as { count: number };

if (existingCount.count === 0) {
  insertExercise.run(duncan.id, 'Press ups', 'reps_sets', 125, 5, 25, null, 1);
  insertExercise.run(duncan.id, 'Row/crunches', 'reps', 50, null, null, null, 2);
  insertExercise.run(duncan.id, 'Knee to elbow crunches', 'reps', 80, null, null, null, 3);
  insertExercise.run(duncan.id, 'Scissor leg raises', 'reps', 80, null, null, null, 4);
  insertExercise.run(duncan.id, 'Ankle taps', 'reps', 80, null, null, null, 5);
  insertExercise.run(duncan.id, 'Side planks', 'timed_sets', 30, 3, 30, 'each side', 6);
  console.log('Seeded 6 exercises for Duncan');
} else {
  console.log(`Duncan already has ${existingCount.count} exercises, skipping`);
}

console.log('Seed complete!');
console.log('');
console.log('Users:');
const users = db.prepare('SELECT id, name, email FROM users').all();
users.forEach((u: any) => console.log(`  ${u.id}: ${u.name} (${u.email})`));
console.log('');
console.log('Login credentials:');
console.log('  Duncan: duncan@muscafit.local / duncan123');
console.log('  Fred:   fred@muscafit.local / fred123');

db.close();

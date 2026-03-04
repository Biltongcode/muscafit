import Database from 'better-sqlite3';

const DB_PATH = process.env.DATABASE_PATH || './data/tracker.db';
const db = new Database(DB_PATH);

// Add column if missing
try {
  db.exec(`ALTER TABLE users ADD COLUMN avatar_url TEXT`);
  console.log('Added avatar_url column');
} catch {
  console.log('avatar_url column already exists');
}

// Set avatars
db.prepare('UPDATE users SET avatar_url = ? WHERE email = ?').run('/avatars/duncan.jpg', 'duncan@muscafit.local');
db.prepare('UPDATE users SET avatar_url = ? WHERE email = ?').run('/avatars/fred.jpg', 'fred@muscafit.local');

console.log('Avatars set!');
const users = db.prepare('SELECT id, name, email, avatar_url FROM users').all();
users.forEach((u: any) => console.log(`  ${u.name}: ${u.avatar_url}`));

db.close();

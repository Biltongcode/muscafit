import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const DB_PATH = process.env.DATABASE_PATH || './data/tracker.db';

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.log('Usage: npx tsx scripts/change-password.ts <email> <new-password>');
  console.log('Example: npx tsx scripts/change-password.ts user@muscafit.local MyNewPass!456');
  process.exit(1);
}

if (newPassword.length < 8) {
  console.log('Password must be at least 8 characters.');
  process.exit(1);
}

const db = new Database(DB_PATH);
const user = db.prepare('SELECT id, name FROM users WHERE email = ?').get(email) as { id: number; name: string } | undefined;

if (!user) {
  console.log(`No user found with email: ${email}`);
  process.exit(1);
}

const hash = bcrypt.hashSync(newPassword, 12);
db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);

console.log(`Password updated for ${user.name} (${email})`);
db.close();

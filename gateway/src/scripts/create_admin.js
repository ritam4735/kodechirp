const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function createAdmin() {
  const email = process.argv[2] || 'admin@kodechirp.com';
  const password = process.argv[3] || 'admin123';
  const username = process.argv[4] || 'admin';

  console.log(`Creating admin user: ${email} / ${username}`);

  try {
    const checkRes = await db.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (checkRes.rowCount > 0) {
      console.log('User already exists! Updating role to admin...');
      await db.query('UPDATE users SET role = $1 WHERE email = $2 OR username = $3', ['admin', email, username]);
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      await db.query(
        'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        [username, email, passwordHash, 'admin']
      );
      console.log('Admin user created successfully!');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err);
    process.exit(1);
  }
}

createAdmin();

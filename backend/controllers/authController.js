const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');

exports.signup = async (req, res) => {
  try {
    const { email, password } = req.body;
    let username = req.body.username || email.split('@')[0];

    // Check if user exists
    const existingUser = await query('SELECT * FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (existingUser.rows.length > 0) {
      // If username is taken, append some random numbers
      if (existingUser.rows.some(u => u.username === username)) {
        username = `${username}${Math.floor(Math.random() * 10000)}`;
      } else {
        return res.status(400).json({ success: false, error: 'User already exists' });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const result = await query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, avatar_url, bio, created_at, updated_at',
      [username, email, passwordHash]
    );

    const user = result.rows[0];

    // Create token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({ success: true, token, user });
  } catch (err) {
    console.error('[Auth] Signup error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    delete user.password_hash;

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );

    res.status(200).json({ success: true, token, user });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      'SELECT id, username, email, avatar_url, bio, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('[Auth] GetMe error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// gateway/src/controllers/profileController.js
const db = require('../config/database');
const bcrypt = require('bcryptjs');

exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Fetch user details
    const result = await db.query(
      `SELECT id, username, email, display_name, role, avatar_url, bio, rating, 
              github_url, linkedin_url, website_url, preferences_json, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = result.rows[0];

    // Fetch stats
    const statsResult = await db.query(
      `SELECT 
        COUNT(DISTINCT problem_id) as problems_solved,
        COUNT(*) as total_submissions,
        SUM(CASE WHEN status = 'Accepted' THEN 1 ELSE 0 END) as accepted_submissions
       FROM submissions 
       WHERE user_id = $1`,
      [userId]
    );

    const stats = statsResult.rows[0];
    const acceptance_rate = stats.total_submissions > 0 
      ? Math.round((stats.accepted_submissions / stats.total_submissions) * 100) 
      : 0;

    return res.status(200).json({ 
      success: true, 
      user,
      stats: {
        problems_solved: parseInt(stats.problems_solved),
        total_submissions: parseInt(stats.total_submissions),
        acceptance_rate,
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { display_name, username, bio, github_url, linkedin_url, website_url, preferences_json } = req.body;

    // Check username uniqueness if changed
    if (username) {
      const existing = await db.query('SELECT id FROM users WHERE username = $1 AND id != $2', [username, userId]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'Username already taken' });
      }
    }

    const result = await db.query(
      `UPDATE users SET 
        display_name = COALESCE($1, display_name),
        username = COALESCE($2, username),
        bio = COALESCE($3, bio),
        github_url = COALESCE($4, github_url),
        linkedin_url = COALESCE($5, linkedin_url),
        website_url = COALESCE($6, website_url),
        preferences_json = COALESCE($7, preferences_json)
       WHERE id = $8
       RETURNING id, username, email, display_name, role, avatar_url, bio, rating, github_url, linkedin_url, website_url, preferences_json, created_at, updated_at`,
      [display_name, username, bio, github_url, linkedin_url, website_url, preferences_json, userId]
    );

    return res.status(200).json({ success: true, user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(new_password, salt);

    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);

    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};

exports.updateAvatar = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { avatar_url } = req.body;

    if (!avatar_url) {
      return res.status(400).json({ success: false, error: 'Avatar URL is required' });
    }

    if (avatar_url.startsWith('data:image')) {
      // Calculate approximate size in bytes: length of base64 string * (3/4)
      const base64Length = avatar_url.length - (avatar_url.indexOf(',') + 1);
      const sizeInBytes = Math.ceil(base64Length * 0.75);
      
      // Limit to 2MB (2 * 1024 * 1024)
      if (sizeInBytes > 2 * 1024 * 1024) {
        return res.status(400).json({ success: false, error: 'Image size exceeds 2MB limit' });
      }

      // Check file type
      const match = avatar_url.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,/);
      if (!match) {
        return res.status(400).json({ success: false, error: 'Invalid image format. Allowed: PNG, JPEG, WEBP, GIF' });
      }
    } else if (!avatar_url.startsWith('http://') && !avatar_url.startsWith('https://')) {
      return res.status(400).json({ success: false, error: 'Invalid avatar URL' });
    }

    const result = await db.query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING avatar_url',
      [avatar_url, userId]
    );

    return res.status(200).json({ success: true, avatar_url: result.rows[0].avatar_url });
  } catch (err) {
    next(err);
  }
};

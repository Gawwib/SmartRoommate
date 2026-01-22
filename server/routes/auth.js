const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendMail } = require('../utils/mailer');

// register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, birthdate, termsAccepted, emailOptIn } = req.body;
    if (!name || !email || !password || !birthdate) {
      return res.status(400).json({ message: 'Name, email, password, and birthdate are required.' });
    }
    if (!termsAccepted) return res.status(400).json({ message: 'You must accept the terms and conditions.' });

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(400).json({ message: 'Email already used' });

    const hashed = await bcrypt.hash(password, 10);
    const calculateAge = (value) => {
      const dob = new Date(value);
      if (Number.isNaN(dob.getTime())) return null;
      const diff = Date.now() - dob.getTime();
      const ageDate = new Date(diff);
      return Math.abs(ageDate.getUTCFullYear() - 1970);
    };
    const age = calculateAge(birthdate);
    if (age === null) {
      return res.status(400).json({ message: 'Birthdate is invalid.' });
    }
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, birthdate, age, terms_accepted, email_opt_in) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, hashed, birthdate, age, 1, emailOptIn ? 1 : 0]
    );

    const token = jwt.sign({ id: result.insertId }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(400).json({ message: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim();
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (!rows.length) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query('UPDATE users SET reset_token_hash = ?, reset_token_expires = ? WHERE email = ?', [
      tokenHash,
      expires,
      email
    ]);

    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password/${token}`;
    const message = `Reset your password using this link: ${resetLink}`;

    await sendMail({
      to: email,
      subject: 'Reset your SmartRoommate password',
      text: message,
      html: `<p>Reset your password using this link:</p><p><a href="${resetLink}">${resetLink}</a></p>`
    });

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Missing fields' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const [rows] = await pool.query(
      'SELECT id FROM users WHERE reset_token_hash = ? AND reset_token_expires > NOW()',
      [tokenHash]
    );
    if (!rows.length) {
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE users SET password = ?, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = ?',
      [hashed, rows[0].id]
    );

    res.json({ message: 'Password updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

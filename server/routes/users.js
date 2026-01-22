const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/authMiddleware');

const REQUIRED_HABITS_MIN = 3;

const parseHabits = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const toRating = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < 1 || parsed > 5) return null;
  return parsed;
};

const isProfileComplete = (profile) => {
  const habits = parseHabits(profile.habits);
  const hasRatings =
    toRating(profile.tidiness) !== null &&
    toRating(profile.social_energy) !== null &&
    toRating(profile.noise_tolerance) !== null;

  return (
    Boolean(profile.gender) &&
    Boolean(profile.location) &&
    Boolean(profile.bio) &&
    Boolean(profile.profile_image_url) &&
    habits.length >= REQUIRED_HABITS_MIN &&
    hasRatings
  );
};

// get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, age, gender, location, budget, habits, birthdate, profile_image_url, bio, tidiness, social_energy, noise_tolerance, profile_complete FROM users WHERE id = ?',
      [req.userId]
    );
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// update profile
router.put('/me', auth, async (req, res) => {
  try {
    const { gender, location, budget, habits, profile_image_url, bio, tidiness, social_energy, noise_tolerance } = req.body;

    const [existingRows] = await pool.query('SELECT birthdate FROM users WHERE id = ?', [req.userId]);
    const existingBirthdate = existingRows[0]?.birthdate || '2003-01-01';

    const calculateAge = (value) => {
      const dob = new Date(value);
      if (Number.isNaN(dob.getTime())) return null;
      const diff = Date.now() - dob.getTime();
      const ageDate = new Date(diff);
      return Math.abs(ageDate.getUTCFullYear() - 1970);
    };
    const age = calculateAge(existingBirthdate);

    const profileCandidate = {
      gender,
      location,
      habits,
      bio,
      profile_image_url,
      tidiness: toRating(tidiness),
      social_energy: toRating(social_energy),
      noise_tolerance: toRating(noise_tolerance)
    };
    const profileComplete = isProfileComplete(profileCandidate) ? 1 : 0;

    await pool.query(
      'UPDATE users SET age = ?, gender = ?, location = ?, budget = ?, habits = ?, profile_image_url = ?, bio = ?, tidiness = ?, social_energy = ?, noise_tolerance = ?, profile_complete = ? WHERE id = ?',
      [
        age,
        gender,
        location,
        budget,
        habits,
        profile_image_url || null,
        bio || null,
        profileCandidate.tidiness,
        profileCandidate.social_energy,
        profileCandidate.noise_tolerance,
        profileComplete,
        req.userId
      ]
    );
    res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// list roommates (only when profile is complete)
router.get('/roommates', auth, async (req, res) => {
  try {
    const [currentRows] = await pool.query(
      'SELECT id, profile_complete FROM users WHERE id = ?',
      [req.userId]
    );
    if (!currentRows.length) return res.status(404).json({ message: 'User not found' });
    if (!currentRows[0].profile_complete) {
      return res.status(403).json({ message: 'Complete your profile to browse roommates.' });
    }

    const [rows] = await pool.query(
      `SELECT id, name, age, gender, location, habits, profile_image_url, bio, tidiness, social_energy, noise_tolerance
         FROM users
        WHERE profile_complete = 1 AND id <> ?
        ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

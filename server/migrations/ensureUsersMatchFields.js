const pool = require('../db');

async function columnExists(columnName) {
  const [rows] = await pool.query('SHOW COLUMNS FROM users LIKE ?', [columnName]);
  return rows.length > 0;
}

module.exports = async function ensureUsersMatchFields() {
  const fields = [
    { name: 'tidiness', sql: 'ALTER TABLE users ADD COLUMN tidiness TINYINT NULL' },
    { name: 'social_energy', sql: 'ALTER TABLE users ADD COLUMN social_energy TINYINT NULL' },
    { name: 'noise_tolerance', sql: 'ALTER TABLE users ADD COLUMN noise_tolerance TINYINT NULL' },
    { name: 'profile_complete', sql: 'ALTER TABLE users ADD COLUMN profile_complete TINYINT DEFAULT 0' }
  ];

  for (const field of fields) {
    const exists = await columnExists(field.name);
    if (!exists) {
      await pool.query(field.sql);
    }
  }
};

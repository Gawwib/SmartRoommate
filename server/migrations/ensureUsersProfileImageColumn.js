const pool = require('../db');

async function columnExists(columnName) {
  const [rows] = await pool.query('SHOW COLUMNS FROM users LIKE ?', [columnName]);
  return rows.length > 0;
}

module.exports = async function ensureUsersProfileImageColumn() {
  const exists = await columnExists('profile_image_url');
  if (!exists) {
    await pool.query('ALTER TABLE users ADD COLUMN profile_image_url VARCHAR(255) NULL');
  }
};

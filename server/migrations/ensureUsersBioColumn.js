const pool = require('../db');

async function columnExists(columnName) {
  const [rows] = await pool.query('SHOW COLUMNS FROM users LIKE ?', [columnName]);
  return rows.length > 0;
}

module.exports = async function ensureUsersBioColumn() {
  const exists = await columnExists('bio');
  if (!exists) {
    await pool.query('ALTER TABLE users ADD COLUMN bio VARCHAR(100) NULL');
  }
};

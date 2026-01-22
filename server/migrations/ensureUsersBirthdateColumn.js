const pool = require('../db');

async function columnExists(columnName) {
  const [rows] = await pool.query('SHOW COLUMNS FROM users LIKE ?', [columnName]);
  return rows.length > 0;
}

module.exports = async function ensureUsersBirthdateColumn() {
  const exists = await columnExists('birthdate');
  if (!exists) {
    await pool.query('ALTER TABLE users ADD COLUMN birthdate DATE NULL');
  }
};

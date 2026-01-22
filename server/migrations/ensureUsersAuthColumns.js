const pool = require('../db');

async function columnExists(columnName) {
  const [rows] = await pool.query('SHOW COLUMNS FROM users LIKE ?', [columnName]);
  return rows.length > 0;
}

module.exports = async function ensureUsersAuthColumns() {
  const fields = [
    { name: 'terms_accepted', sql: 'ALTER TABLE users ADD COLUMN terms_accepted TINYINT DEFAULT 1' },
    { name: 'email_opt_in', sql: 'ALTER TABLE users ADD COLUMN email_opt_in TINYINT DEFAULT 1' },
    { name: 'reset_token_hash', sql: 'ALTER TABLE users ADD COLUMN reset_token_hash VARCHAR(255) NULL' },
    { name: 'reset_token_expires', sql: 'ALTER TABLE users ADD COLUMN reset_token_expires DATETIME NULL' }
  ];

  for (const field of fields) {
    const exists = await columnExists(field.name);
    if (!exists) {
      await pool.query(field.sql);
    }
  }

  await pool.query('UPDATE users SET terms_accepted = 1, email_opt_in = 1 WHERE terms_accepted IS NULL OR email_opt_in IS NULL');
};

const pool = require('../db');

async function columnExists(columnName) {
  const [rows] = await pool.query('SHOW COLUMNS FROM conversation_members LIKE ?', [columnName]);
  return rows.length > 0;
}

module.exports = async function ensureConversationReadColumn() {
  const exists = await columnExists('last_read_at');
  if (!exists) {
    await pool.query('ALTER TABLE conversation_members ADD COLUMN last_read_at DATETIME NULL');
  }
};

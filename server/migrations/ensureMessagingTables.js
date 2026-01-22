const pool = require('../db');

async function tableExists(tableName) {
  const [rows] = await pool.query('SHOW TABLES LIKE ?', [tableName]);
  return rows.length > 0;
}

module.exports = async function ensureMessagingTables() {
  const hasConversations = await tableExists('conversations');
  if (!hasConversations) {
    await pool.query(`
      CREATE TABLE conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120),
        property_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  const hasMembers = await tableExists('conversation_members');
  if (!hasMembers) {
    await pool.query(`
      CREATE TABLE conversation_members (
        conversation_id INT NOT NULL,
        user_id INT NOT NULL,
        PRIMARY KEY (conversation_id, user_id),
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  }

  const hasMessages = await tableExists('messages');
  if (!hasMessages) {
    await pool.query(`
      CREATE TABLE messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        sender_id INT NOT NULL,
        body TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  }
};

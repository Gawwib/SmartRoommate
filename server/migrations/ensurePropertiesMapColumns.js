const pool = require('../db');

async function columnExists(columnName) {
  const [rows] = await pool.query('SHOW COLUMNS FROM properties LIKE ?', [columnName]);
  return rows.length > 0;
}

module.exports = async function ensurePropertiesMapColumns() {
  const fields = [
    { name: 'latitude', sql: 'ALTER TABLE properties ADD COLUMN latitude DECIMAL(10,7) NULL' },
    { name: 'longitude', sql: 'ALTER TABLE properties ADD COLUMN longitude DECIMAL(10,7) NULL' }
  ];

  for (const field of fields) {
    const exists = await columnExists(field.name);
    if (!exists) {
      await pool.query(field.sql);
    }
  }
};

const pool = require('../db');

async function columnExists(columnName) {
  const [rows] = await pool.query('SHOW COLUMNS FROM properties LIKE ?', [columnName]);
  return rows.length > 0;
}

async function ensureColumn(columnName, definition) {
  const exists = await columnExists(columnName);
  if (!exists) {
    await pool.query(`ALTER TABLE properties ADD COLUMN ${definition}`);
  }
}

module.exports = async function ensurePropertiesMediaColumns() {
  try {
    await ensureColumn('main_image_url', 'main_image_url VARCHAR(255) NULL');
    await ensureColumn('gallery_image_urls', 'gallery_image_urls TEXT NULL');
  } catch (err) {
    console.error('Failed to ensure property media columns', err);
    throw err;
  }
};

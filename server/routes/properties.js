const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/authMiddleware');

const PROPERTY_SELECT_FIELDS = `p.id, p.user_id, p.title, p.location, p.price, p.description, p.rooms, p.property_type,
                                p.main_image_url, p.gallery_image_urls, p.latitude, p.longitude, p.created_at,
                                u.name AS owner_name, u.profile_image_url AS owner_image_url`;

// helper to avoid NaN propagating into SQL
function parseOptionalInt(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? NaN : parsed;
}

function normalizeImageUrl(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function sanitizeGalleryArray(value) {
  if (value === undefined || value === null || value === '') return [];

  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'string' ? item.trim() : String(item).trim())).filter(Boolean);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => (typeof item === 'string' ? item.trim() : String(item).trim())).filter(Boolean);
      }
    } catch {
      /* fallthrough to delimiter split */
    }
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [String(value).trim()].filter(Boolean);
}

function parseGalleryColumn(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapPropertyRow(row) {
  const { gallery_image_urls, ...cleaned } = row;
  return {
    ...cleaned,
    main_image_url: cleaned.main_image_url || null,
    gallery_images: parseGalleryColumn(gallery_image_urls)
  };
}

async function fetchPropertyById(id) {
  const [rows] = await pool.query(
    `SELECT ${PROPERTY_SELECT_FIELDS}
       FROM properties p
       JOIN users u ON u.id = p.user_id
      WHERE p.id = ?`,
    [id]
  );
  if (!rows.length) return null;
  return mapPropertyRow(rows[0]);
}

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ${PROPERTY_SELECT_FIELDS}
         FROM properties p
         JOIN users u ON u.id = p.user_id
        ORDER BY p.created_at DESC`
    );
    res.json(rows.map(mapPropertyRow));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const property = await fetchPropertyById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    res.json(property);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, location, price, description, rooms, property_type, latitude, longitude } = req.body;
    if (!title || !location || price === undefined || price === null || price === '')
      return res.status(400).json({ message: 'Missing required fields' });

    const normalizedPrice = Number(price);
    if (Number.isNaN(normalizedPrice)) return res.status(400).json({ message: 'Invalid price' });

    const normalizedRooms = parseOptionalInt(rooms);
    if (Number.isNaN(normalizedRooms)) return res.status(400).json({ message: 'Invalid rooms value' });

    const galleryList = sanitizeGalleryArray(req.body.galleryImages ?? req.body.gallery_image_urls);
    const galleryPayload = galleryList.length ? JSON.stringify(galleryList) : null;
    const mainImagePayload =
      normalizeImageUrl(req.body.mainImage ?? req.body.main_image_url) || galleryList[0] || null;

    const payload = [
      req.userId,
      title.trim(),
      location.trim(),
      normalizedPrice,
      description?.trim() || null,
      normalizedRooms,
      property_type?.trim() || null,
      mainImagePayload,
      galleryPayload,
      latitude ?? null,
      longitude ?? null
    ];

    const [result] = await pool.query(
      `INSERT INTO properties (user_id, title, location, price, description, rooms, property_type, main_image_url, gallery_image_urls, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      payload
    );

    const property = await fetchPropertyById(result.insertId);
    res.status(201).json(property);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, location, price, description, rooms, property_type, latitude, longitude } = req.body;
    if (!title || !location || price === undefined || price === null || price === '')
      return res.status(400).json({ message: 'Missing required fields' });

    const normalizedPrice = Number(price);
    if (Number.isNaN(normalizedPrice)) return res.status(400).json({ message: 'Invalid price' });

    const normalizedRooms = parseOptionalInt(rooms);
    if (Number.isNaN(normalizedRooms)) return res.status(400).json({ message: 'Invalid rooms value' });

    const galleryList = sanitizeGalleryArray(req.body.galleryImages ?? req.body.gallery_image_urls);
    const galleryPayload = galleryList.length ? JSON.stringify(galleryList) : null;
    const mainImagePayload =
      normalizeImageUrl(req.body.mainImage ?? req.body.main_image_url) || galleryList[0] || null;

    const [result] = await pool.query(
      `UPDATE properties
          SET title = ?, location = ?, price = ?, description = ?, rooms = ?, property_type = ?, main_image_url = ?, gallery_image_urls = ?, latitude = ?, longitude = ?
        WHERE id = ? AND user_id = ?`,
      [
        title.trim(),
        location.trim(),
        normalizedPrice,
        description?.trim() || null,
        normalizedRooms,
        property_type?.trim() || null,
        mainImagePayload,
        galleryPayload,
        latitude ?? null,
        longitude ?? null,
        req.params.id,
        req.userId
      ]
    );

    if (!result.affectedRows) return res.status(404).json({ message: 'Property not found' });

    const property = await fetchPropertyById(req.params.id);
    res.json(property);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM properties WHERE id = ? AND user_id = ?', [
      req.params.id,
      req.userId
    ]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Property not found' });
    res.json({ message: 'Property deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

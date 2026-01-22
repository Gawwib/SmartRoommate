const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/authMiddleware');
const { sendMail } = require('../utils/mailer');

const buildInClause = (values) => values.map(() => '?').join(', ');

const uniqueIds = (list) =>
  Array.from(new Set(list.map((item) => Number(item)).filter((item) => Number.isFinite(item))));

const isMember = async (conversationId, userId) => {
  const [rows] = await pool.query(
    'SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?',
    [conversationId, userId]
  );
  return rows.length > 0;
};

router.get('/', auth, async (req, res) => {
  try {
    const [conversations] = await pool.query(
      `SELECT c.id,
              c.name,
              c.property_id,
              c.created_at,
              (SELECT COUNT(*)
                 FROM messages m
                WHERE m.conversation_id = c.id
                  AND m.sender_id <> ?
                  AND m.created_at > COALESCE(cm_self.last_read_at, '1970-01-01')) AS unread_count,
              (SELECT body
                 FROM messages m
                WHERE m.conversation_id = c.id
                ORDER BY m.created_at DESC
                LIMIT 1) AS last_message,
              (SELECT created_at
                 FROM messages m
                WHERE m.conversation_id = c.id
                ORDER BY m.created_at DESC
                LIMIT 1) AS last_message_at
         FROM conversations c
         JOIN conversation_members cm ON cm.conversation_id = c.id
         JOIN conversation_members cm_self ON cm_self.conversation_id = c.id AND cm_self.user_id = ?
        WHERE cm.user_id = ?
        ORDER BY COALESCE(last_message_at, c.created_at) DESC`,
      [req.userId, req.userId, req.userId]
    );

    if (!conversations.length) {
      return res.json([]);
    }

    const ids = conversations.map((conversation) => conversation.id);
    const [members] = await pool.query(
      `SELECT cm.conversation_id, u.id, u.name, u.profile_image_url
         FROM conversation_members cm
         JOIN users u ON u.id = cm.user_id
        WHERE cm.conversation_id IN (${buildInClause(ids)})`,
      ids
    );

    const groupedMembers = members.reduce((acc, member) => {
      if (!acc[member.conversation_id]) acc[member.conversation_id] = [];
      acc[member.conversation_id].push({
        id: member.id,
        name: member.name,
        profile_image_url: member.profile_image_url
      });
      return acc;
    }, {});

    const payload = conversations.map((conversation) => ({
      ...conversation,
      members: groupedMembers[conversation.id] || []
    }));

    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { recipientId, memberIds, name, propertyId, initialMessage } = req.body;
    let members = [];

    if (recipientId) {
      const parsedRecipient = Number(recipientId);
      if (!Number.isFinite(parsedRecipient)) {
        return res.status(400).json({ message: 'Invalid recipient.' });
      }
      if (parsedRecipient === req.userId) {
        return res.status(400).json({ message: 'You cannot message yourself.' });
      }
      members = uniqueIds([parsedRecipient, req.userId]);
    } else if (Array.isArray(memberIds)) {
      members = uniqueIds([...memberIds, req.userId]);
    }

    if (members.length < 2) {
      return res.status(400).json({ message: 'At least two members are required.' });
    }

    if (members.length === 2) {
      const [existing] = await pool.query(
        `SELECT c.id
           FROM conversations c
           JOIN conversation_members cm ON cm.conversation_id = c.id
          WHERE c.property_id <=> ?
            AND cm.user_id IN (?, ?)
          GROUP BY c.id
         HAVING COUNT(DISTINCT cm.user_id) = 2
            AND (SELECT COUNT(*) FROM conversation_members WHERE conversation_id = c.id) = 2
          LIMIT 1`,
        [propertyId ?? null, members[0], members[1]]
      );
      if (existing.length) {
        return res.json({ id: existing[0].id });
      }
    }

    const [result] = await pool.query(
      'INSERT INTO conversations (name, property_id) VALUES (?, ?)',
      [name || null, propertyId ?? null]
    );
    const conversationId = result.insertId;

    const memberValues = members.map((memberId) => [conversationId, memberId]);
    await pool.query('INSERT INTO conversation_members (conversation_id, user_id) VALUES ?', [memberValues]);

    if (initialMessage && String(initialMessage).trim()) {
      await pool.query(
        'INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)',
        [conversationId, req.userId, String(initialMessage).trim()]
      );
    }

    res.status(201).json({ id: conversationId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id/messages', auth, async (req, res) => {
  try {
    const conversationId = Number(req.params.id);
    if (!Number.isFinite(conversationId)) {
      return res.status(400).json({ message: 'Invalid conversation id.' });
    }

    const allowed = await isMember(conversationId, req.userId);
    if (!allowed) return res.status(403).json({ message: 'Access denied.' });

    const [rows] = await pool.query(
      `SELECT m.id, m.body, m.created_at, m.sender_id, u.name AS sender_name
         FROM messages m
         JOIN users u ON u.id = m.sender_id
        WHERE m.conversation_id = ?
        ORDER BY m.created_at ASC`,
      [conversationId]
    );
    await pool.query(
      'UPDATE conversation_members SET last_read_at = NOW() WHERE conversation_id = ? AND user_id = ?',
      [conversationId, req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/messages', auth, async (req, res) => {
  try {
    const conversationId = Number(req.params.id);
    const body = String(req.body.body || '').trim();
    if (!Number.isFinite(conversationId)) {
      return res.status(400).json({ message: 'Invalid conversation id.' });
    }
    if (!body) {
      return res.status(400).json({ message: 'Message body is required.' });
    }

    const allowed = await isMember(conversationId, req.userId);
    if (!allowed) return res.status(403).json({ message: 'Access denied.' });

    const [result] = await pool.query(
      'INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)',
      [conversationId, req.userId, body]
    );

    await pool.query(
      'UPDATE conversation_members SET last_read_at = NOW() WHERE conversation_id = ? AND user_id = ?',
      [conversationId, req.userId]
    );

    try {
      const [recipients] = await pool.query(
        `SELECT u.email, u.email_opt_in, u.name
           FROM conversation_members cm
           JOIN users u ON u.id = cm.user_id
          WHERE cm.conversation_id = ? AND u.id <> ?`,
        [conversationId, req.userId]
      );
      if (recipients.length) {
        const [senderRows] = await pool.query('SELECT name FROM users WHERE id = ?', [req.userId]);
        const senderName = senderRows[0]?.name || 'Someone';
        for (const recipient of recipients) {
          if (!recipient.email_opt_in) continue;
          await sendMail({
            to: recipient.email,
            subject: `New message from ${senderName}`,
            text: `${senderName} sent you a message: "${body}"`,
            html: `<p><strong>${senderName}</strong> sent you a message:</p><p>${body}</p><p>Open SmartRoommate to reply.</p>`
          });
        }
      }
    } catch (emailErr) {
      console.error('Email notification error', emailErr);
    }

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const conversationId = Number(req.params.id);
    const name = String(req.body.name || '').trim();
    if (!Number.isFinite(conversationId)) {
      return res.status(400).json({ message: 'Invalid conversation id.' });
    }
    if (!name) {
      return res.status(400).json({ message: 'Name is required.' });
    }

    const allowed = await isMember(conversationId, req.userId);
    if (!allowed) return res.status(403).json({ message: 'Access denied.' });

    await pool.query('UPDATE conversations SET name = ? WHERE id = ?', [name, conversationId]);
    res.json({ message: 'Conversation updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/unread-count', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS unread_count
         FROM messages m
         JOIN conversation_members cm ON cm.conversation_id = m.conversation_id AND cm.user_id = ?
        WHERE m.sender_id <> ?
          AND m.created_at > COALESCE(cm.last_read_at, '1970-01-01')`,
      [req.userId, req.userId]
    );
    res.json({ count: rows[0]?.unread_count || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

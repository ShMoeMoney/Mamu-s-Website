const { put } = require('@vercel/blob');
const { requireAuth } = require('../_lib/auth');
const { readStores, writeStores } = require('../_lib/stores');

const MAX_BYTES = 8 * 1024 * 1024; // 8MB per image

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAuth(req, res)) return;

  const { stores: incoming } = req.body || {};
  if (!Array.isArray(incoming)) {
    res.status(400).json({ error: 'Missing stores array' });
    return;
  }

  try {
    const current = await readStores();
    const byId = new Map(current.map((s) => [s.id, s]));

    if (incoming.length !== current.length || !incoming.every((s) => byId.has(s.id))) {
      res.status(409).json({ error: 'Store list changed elsewhere — please refresh and try again' });
      return;
    }

    const updated = [];
    for (const edit of incoming) {
      const stored = byId.get(edit.id);
      let photo = stored.photo;

      if (edit.photoBase64) {
        if (!edit.photoContentType || !edit.photoContentType.startsWith('image/')) {
          res.status(400).json({ error: 'Store photo must be an image' });
          return;
        }
        let buffer;
        try {
          buffer = Buffer.from(edit.photoBase64, 'base64');
        } catch {
          res.status(400).json({ error: 'Invalid store photo data' });
          return;
        }
        if (buffer.length === 0 || buffer.length > MAX_BYTES) {
          res.status(400).json({ error: 'Store photo must be under 8MB' });
          return;
        }
        const ext = (String(edit.photoFilename || '').split('.').pop() || 'jpg').toLowerCase().slice(0, 5);
        const pathname = `stores/${stored.id}-${Date.now()}.${ext}`;
        const blob = await put(pathname, buffer, {
          access: 'public',
          contentType: edit.photoContentType,
          addRandomSuffix: true,
        });
        photo = blob.url;
      }

      updated.push({
        id: stored.id,
        name: String(edit.name ?? stored.name).slice(0, 120),
        photo,
        address: String(edit.address ?? stored.address).slice(0, 300),
        hours: String(edit.hours ?? stored.hours).slice(0, 500),
        phone: String(edit.phone ?? stored.phone).slice(0, 40),
        email: String(edit.email ?? stored.email).slice(0, 200),
      });
    }

    await writeStores(updated);
    res.status(200).json({ ok: true, stores: updated });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
};

const { put } = require('@vercel/blob');
const { requireAuth } = require('../_lib/auth');
const { readStores, writeStores } = require('../_lib/stores');

const MAX_BYTES = 8 * 1024 * 1024; // 8MB per image

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'store';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAuth(req, res)) return;

  const { name, address, hours, phone, email, photoBase64, photoFilename, photoContentType } = req.body || {};

  if (!String(name || '').trim()) {
    res.status(400).json({ error: 'Store name is required' });
    return;
  }
  if (!photoBase64 || !photoContentType || !photoContentType.startsWith('image/')) {
    res.status(400).json({ error: 'A photo is required' });
    return;
  }

  let buffer;
  try {
    buffer = Buffer.from(photoBase64, 'base64');
  } catch {
    res.status(400).json({ error: 'Invalid image data' });
    return;
  }
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    res.status(400).json({ error: 'Photo must be under 8MB' });
    return;
  }

  try {
    const current = await readStores();
    const baseSlug = slugify(name);
    let id = baseSlug;
    let n = 2;
    while (current.some((s) => s.id === id)) {
      id = `${baseSlug}-${n}`;
      n += 1;
    }

    const ext = (String(photoFilename || '').split('.').pop() || 'jpg').toLowerCase().slice(0, 5);
    const pathname = `stores/${id}-${Date.now()}.${ext}`;
    const blob = await put(pathname, buffer, {
      access: 'public',
      contentType: photoContentType,
      addRandomSuffix: true,
    });

    const newStore = {
      id,
      name: String(name).slice(0, 120),
      photo: blob.url,
      address: String(address || '').slice(0, 300),
      hours: String(hours || '').slice(0, 500),
      phone: String(phone || '').slice(0, 40),
      email: String(email || '').slice(0, 200),
    };

    const updated = [...current, newStore];
    await writeStores(updated);
    res.status(200).json({ ok: true, stores: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add store' });
  }
};

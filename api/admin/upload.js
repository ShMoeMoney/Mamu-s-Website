const crypto = require('crypto');
const { put } = require('@vercel/blob');
const { requireAuth } = require('../_lib/auth');
const { readManifest, writeManifest } = require('../_lib/manifest');

const MAX_BYTES = 8 * 1024 * 1024; // 8MB per image

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'photo';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAuth(req, res)) return;

  const { filename, contentType, dataBase64, caption, category } = req.body || {};

  if (!contentType || !contentType.startsWith('image/')) {
    res.status(400).json({ error: 'File must be an image' });
    return;
  }
  if (!dataBase64) {
    res.status(400).json({ error: 'Missing image data' });
    return;
  }

  let buffer;
  try {
    buffer = Buffer.from(dataBase64, 'base64');
  } catch {
    res.status(400).json({ error: 'Invalid image data' });
    return;
  }
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    res.status(400).json({ error: 'Image must be under 8MB' });
    return;
  }

  const ext = (String(filename || '').split('.').pop() || 'jpg').toLowerCase().slice(0, 5);
  const pathname = `gallery/${Date.now()}-${slugify(filename)}.${ext}`;

  try {
    const blob = await put(pathname, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: true,
    });

    const items = await readManifest();
    const newItem = {
      id: crypto.randomUUID(),
      url: blob.url,
      pathname: blob.pathname,
      caption: String(caption || '').slice(0, 200),
      category: slugify(category || 'uncategorized'),
      order: items.length,
      createdAt: new Date().toISOString(),
    };
    items.push(newItem);
    await writeManifest(items);

    res.status(200).json({ ok: true, item: newItem, items });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
};

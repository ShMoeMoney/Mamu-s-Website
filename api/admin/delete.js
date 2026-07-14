const { del } = require('@vercel/blob');
const { requireAuth } = require('../_lib/auth');
const { readManifest, writeManifest } = require('../_lib/manifest');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAuth(req, res)) return;

  const { id } = req.body || {};
  if (!id) {
    res.status(400).json({ error: 'Missing id' });
    return;
  }

  try {
    const items = await readManifest();
    const target = items.find((item) => item.id === id);
    if (!target) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    await del(target.pathname);
    const remaining = items
      .filter((item) => item.id !== id)
      .map((item, i) => ({ ...item, order: i }));
    await writeManifest(remaining);
    res.status(200).json({ ok: true, items: remaining });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
};

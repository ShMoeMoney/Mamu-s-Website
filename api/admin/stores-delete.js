const { del } = require('@vercel/blob');
const { requireAuth } = require('../_lib/auth');
const { readStores, writeStores } = require('../_lib/stores');

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
    const current = await readStores();
    const target = current.find((s) => s.id === id);
    if (!target) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    // Only delete the blob if the photo actually lives in blob storage —
    // seeded stores point at local /images files that aren't ours to delete.
    if (target.photo && target.photo.includes('.public.blob.vercel-storage.com/')) {
      try {
        await del(target.photo);
      } catch {
        // non-fatal — proceed with removing the store entry regardless
      }
    }

    const remaining = current.filter((s) => s.id !== id);
    await writeStores(remaining);
    res.status(200).json({ ok: true, stores: remaining });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
};

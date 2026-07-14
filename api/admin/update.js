const { requireAuth } = require('../_lib/auth');
const { readManifest, writeManifest } = require('../_lib/manifest');

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'uncategorized';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAuth(req, res)) return;

  const { items: incoming } = req.body || {};
  if (!Array.isArray(incoming)) {
    res.status(400).json({ error: 'Missing items array' });
    return;
  }

  try {
    const current = await readManifest();
    const byId = new Map(current.map((item) => [item.id, item]));

    if (incoming.length !== current.length || !incoming.every((i) => byId.has(i.id))) {
      res.status(409).json({ error: 'Gallery changed elsewhere — please refresh and try again' });
      return;
    }

    const updated = incoming.map((edit, index) => {
      const stored = byId.get(edit.id);
      return {
        ...stored,
        caption: String(edit.caption ?? stored.caption ?? '').slice(0, 200),
        category: slugify(edit.category ?? stored.category),
        order: index,
      };
    });

    await writeManifest(updated);
    res.status(200).json({ ok: true, items: updated });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
};

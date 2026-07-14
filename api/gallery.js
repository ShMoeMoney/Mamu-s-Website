const { readManifest } = require('./_lib/manifest');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const items = await readManifest();
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.status(200).json({ items });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load gallery' });
  }
};

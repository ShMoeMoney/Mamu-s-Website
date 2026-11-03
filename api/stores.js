const { readStores } = require('./_lib/stores');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const stores = await readStores();
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.status(200).json({ stores });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load store locations' });
  }
};

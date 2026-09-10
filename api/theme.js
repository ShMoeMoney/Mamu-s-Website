const { readTheme } = require('./_lib/theme');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const theme = await readTheme();
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.status(200).json({ theme });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load theme' });
  }
};

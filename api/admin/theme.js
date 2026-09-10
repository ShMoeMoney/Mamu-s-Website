const { requireAuth } = require('../_lib/auth');
const { writeTheme, VALID_THEMES } = require('../_lib/theme');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAuth(req, res)) return;

  const { theme } = req.body || {};
  if (!VALID_THEMES.includes(theme)) {
    res.status(400).json({ error: 'Invalid theme' });
    return;
  }

  try {
    await writeTheme(theme);
    res.status(200).json({ ok: true, theme });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save theme' });
  }
};

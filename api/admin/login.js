const { createSessionCookie, checkPassword } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { password } = req.body || {};
  if (!password || !checkPassword(password)) {
    res.status(401).json({ error: 'Incorrect password' });
    return;
  }
  res.setHeader('Set-Cookie', createSessionCookie());
  res.status(200).json({ ok: true });
};

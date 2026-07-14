const crypto = require('crypto');

const COOKIE_NAME = 'admin_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function sign(expiry) {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET).update(String(expiry)).digest('hex');
}

function createSessionCookie() {
  const expiry = Date.now() + SESSION_TTL_MS;
  const token = `${expiry}.${sign(expiry)}`;
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=${maxAge}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=0`;
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return out;
}

function isAuthenticated(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (!token) return false;
  const [expiryStr, sig] = token.split('.');
  if (!expiryStr || !sig) return false;
  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false;
  const expected = sign(expiry);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function requireAuth(req, res) {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

// Fixed-length HMAC comparison avoids leaking password length via early-return timing.
function checkPassword(input) {
  const secret = process.env.SESSION_SECRET;
  const a = crypto.createHmac('sha256', secret).update(String(input || '')).digest();
  const b = crypto.createHmac('sha256', secret).update(process.env.ADMIN_PASSWORD || '').digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = { createSessionCookie, clearSessionCookie, isAuthenticated, requireAuth, checkPassword };

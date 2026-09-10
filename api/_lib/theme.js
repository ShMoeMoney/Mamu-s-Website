const { put, list, del } = require('@vercel/blob');

const THEME_PREFIX = 'theme/theme-';
const VALID_THEMES = ['default', 'halloween', 'christmas', 'thanksgiving'];

// Same versioned-write pattern as manifest.js — Vercel Blob enforces a 60s
// minimum CDN cache per URL, so a fresh path per save avoids serving stale reads.
async function readTheme() {
  const { blobs } = await list({ prefix: THEME_PREFIX });
  if (blobs.length === 0) return 'default';
  const latest = blobs.reduce((a, b) => (a.uploadedAt > b.uploadedAt ? a : b));
  const res = await fetch(latest.url, { cache: 'no-store' });
  if (!res.ok) return 'default';
  const data = await res.json();
  return VALID_THEMES.includes(data.theme) ? data.theme : 'default';
}

async function writeTheme(theme) {
  const pathname = `${THEME_PREFIX}${Date.now()}.json`;
  await put(pathname, JSON.stringify({ theme }), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });

  const { blobs } = await list({ prefix: THEME_PREFIX });
  const stale = blobs.filter((b) => b.pathname !== pathname);
  if (stale.length > 0) {
    await del(stale.map((b) => b.url));
  }
}

module.exports = { readTheme, writeTheme, VALID_THEMES };

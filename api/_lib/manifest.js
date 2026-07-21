const { put, list, del } = require('@vercel/blob');

// Legacy single-file path from before versioned manifests — kept only as a read fallback.
const LEGACY_MANIFEST_PATH = 'gallery/manifest.json';
const MANIFEST_PREFIX = 'gallery/manifest-';

// Vercel Blob enforces a 60s minimum CDN cache per URL that can't be disabled,
// so overwriting one fixed path serves stale reads for up to a minute after every
// save. Writing a fresh, never-before-seen URL on each save guarantees a cache miss.
async function readManifest() {
  const { blobs } = await list({ prefix: MANIFEST_PREFIX });
  if (blobs.length > 0) {
    const latest = blobs.reduce((a, b) => (a.uploadedAt > b.uploadedAt ? a : b));
    const res = await fetch(latest.url, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  }

  const { blobs: legacy } = await list({ prefix: LEGACY_MANIFEST_PATH, limit: 1 });
  const legacyBlob = legacy.find((b) => b.pathname === LEGACY_MANIFEST_PATH);
  if (!legacyBlob) return [];
  const res = await fetch(legacyBlob.url, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

async function writeManifest(items) {
  const pathname = `${MANIFEST_PREFIX}${Date.now()}.json`;
  await put(pathname, JSON.stringify(items, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });

  const { blobs } = await list({ prefix: MANIFEST_PREFIX });
  const stale = blobs.filter((b) => b.pathname !== pathname);
  if (stale.length > 0) {
    await del(stale.map((b) => b.url));
  }
}

module.exports = { readManifest, writeManifest };

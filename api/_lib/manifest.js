const { put, list } = require('@vercel/blob');

const MANIFEST_PATH = 'gallery/manifest.json';

async function readManifest() {
  const { blobs } = await list({ prefix: MANIFEST_PATH, limit: 1 });
  const manifestBlob = blobs.find((b) => b.pathname === MANIFEST_PATH);
  if (!manifestBlob) return [];
  const res = await fetch(manifestBlob.url, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

async function writeManifest(items) {
  await put(MANIFEST_PATH, JSON.stringify(items, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
}

module.exports = { readManifest, writeManifest, MANIFEST_PATH };

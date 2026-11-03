const { put, list, del } = require('@vercel/blob');

const STORES_PREFIX = 'stores/stores-';

// Shown until an admin saves real changes — same seed data provided at launch.
const DEFAULT_STORES = [
  {
    id: 'handmade-presence',
    name: 'Handmade Presence',
    photo: 'images/Handmade.JPG',
    address: '111 Garrison Village Dr, Unit 1, Niagara-on-the-Lake, Ontario',
    hours: 'Monday: Closed\nTuesday: 11am – 5pm\nWednesday: 11am – 6pm\nThursday: 11am – 6pm\nFriday: 11am – 6pm\nSaturday: 11am – 5pm\nSunday: 10am – 5pm',
    phone: '289-868-9192',
    email: '',
  },
  {
    id: 'country-christmas-store',
    name: 'The Country Christmas Store',
    photo: 'images/Christmas%20store.JPG',
    address: '1794 Centre Street, Pelham, ON',
    hours: '10am – 5pm\nNovember 5 – December 20',
    phone: '905-714-2069',
    email: '',
  },
];

// Same versioned-write pattern as manifest.js/theme.js — Vercel Blob enforces a 60s
// minimum CDN cache per URL, so a fresh path per save avoids serving stale reads.
async function readStores() {
  const { blobs } = await list({ prefix: STORES_PREFIX });
  if (blobs.length === 0) return DEFAULT_STORES;
  const latest = blobs.reduce((a, b) => (a.uploadedAt > b.uploadedAt ? a : b));
  const res = await fetch(latest.url, { cache: 'no-store' });
  if (!res.ok) return DEFAULT_STORES;
  const data = await res.json();
  return Array.isArray(data) && data.length > 0 ? data : DEFAULT_STORES;
}

async function writeStores(stores) {
  const pathname = `${STORES_PREFIX}${Date.now()}.json`;
  await put(pathname, JSON.stringify(stores, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });

  const { blobs } = await list({ prefix: STORES_PREFIX });
  const stale = blobs.filter((b) => b.pathname !== pathname);
  if (stale.length > 0) {
    await del(stale.map((b) => b.url));
  }
}

module.exports = { readStores, writeStores, DEFAULT_STORES };

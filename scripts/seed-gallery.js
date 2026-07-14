const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { put } = require('@vercel/blob');

const IMAGES_DIR = path.join(__dirname, '..', 'images');
const MANIFEST_PATH = 'gallery/manifest.json';

const SEED = [
  { file: '20260408_121038.jpeg', caption: 'Spring Dragonfly Gnome', category: 'gnomes' },
  { file: '20260427_162831.jpeg', caption: 'Floral Bear Gnome', category: 'gnomes' },
  { file: '20260601_161854.jpeg', caption: 'NHL Original Six Gnome', category: 'gnomes' },
  { file: '1000040736.jpeg', caption: 'Toronto Blue Jays Gnome', category: 'gnomes' },
  { file: '1000041166.jpeg', caption: 'Blue Jays Gnome', category: 'gnomes' },
  { file: '1000040889.jpeg', caption: 'Toronto Maple Leafs Gnome', category: 'gnomes' },
  { file: '1000041183.jpeg', caption: 'Toronto Raptors Gnome', category: 'gnomes' },
  { file: '20260504_175950.jpeg', caption: 'Buffalo Bills Gnome', category: 'gnomes' },
  { file: '20260612_112722.jpeg', caption: 'Canada Pride Gnome', category: 'gnomes' },
  { file: '20260612_112755.jpeg', caption: 'Canada Pride Gnome – Classic', category: 'gnomes' },
  { file: '20260415_163657.jpeg', caption: 'Flower Pot Gnome Collection', category: 'gnomes' },
  { file: '20260504_175136.jpeg', caption: 'Love You Mom – Pebble Art', category: 'pebble' },
  { file: '20260426_135210.jpeg', caption: 'Dad My Hero – Pebble Art', category: 'pebble' },
  { file: '20260504_175233.jpeg', caption: 'Love – Pebble Art', category: 'pebble' },
  { file: '20260515_220829(1).jpeg', caption: 'Welcome to Our Home Sign', category: 'decor' },
];

function contentTypeFor(file) {
  const ext = path.extname(file).slice(1).toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  return `image/${ext}`;
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('BLOB_READ_WRITE_TOKEN not set. Run with: node --env-file=.env.local scripts/seed-gallery.js');
    process.exit(1);
  }

  const items = [];
  for (let i = 0; i < SEED.length; i++) {
    const { file, caption, category } = SEED[i];
    const filePath = path.join(IMAGES_DIR, file);
    const buffer = fs.readFileSync(filePath);
    const safeName = file.replace(/[^a-zA-Z0-9.]/g, '-');
    const pathname = `gallery/${Date.now()}-${i}-${safeName}`;

    const blob = await put(pathname, buffer, {
      access: 'public',
      contentType: contentTypeFor(file),
      addRandomSuffix: true,
    });

    items.push({
      id: crypto.randomUUID(),
      url: blob.url,
      pathname: blob.pathname,
      caption,
      category,
      order: i,
      createdAt: new Date().toISOString(),
    });

    console.log(`Uploaded ${file} -> ${blob.url}`);
  }

  await put(MANIFEST_PATH, JSON.stringify(items, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });

  console.log(`\nManifest written with ${items.length} items.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

const { put, del } = require('@vercel/blob');
const { requireAuth } = require('../_lib/auth');
const { readStores, writeStores } = require('../_lib/stores');

const MAX_BYTES = 8 * 1024 * 1024; // 8MB per image

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'store';
}

async function uploadPhoto(idForPath, base64, filename, contentType) {
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    throw new Error('SIZE');
  }
  const ext = (String(filename || '').split('.').pop() || 'jpg').toLowerCase().slice(0, 5);
  const pathname = `stores/${idForPath}-${Date.now()}.${ext}`;
  const blob = await put(pathname, buffer, {
    access: 'public',
    contentType,
    addRandomSuffix: true,
  });
  return blob.url;
}

// Single endpoint for all store admin actions (update / add / delete) — kept as one
// serverless function rather than three, since Vercel's Hobby plan caps how many
// functions a deployment can have.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAuth(req, res)) return;

  const body = req.body || {};
  const action = body.action || 'update';

  try {
    if (action === 'delete') {
      const { id } = body;
      if (!id) {
        res.status(400).json({ error: 'Missing id' });
        return;
      }
      const current = await readStores();
      const target = current.find((s) => s.id === id);
      if (!target) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      // Only delete the blob if the photo actually lives in blob storage —
      // seeded stores point at local /images files that aren't ours to delete.
      if (target.photo && target.photo.includes('.public.blob.vercel-storage.com/')) {
        try {
          await del(target.photo);
        } catch {
          // non-fatal — proceed with removing the store entry regardless
        }
      }
      const remaining = current.filter((s) => s.id !== id);
      await writeStores(remaining);
      res.status(200).json({ ok: true, stores: remaining });
      return;
    }

    if (action === 'add') {
      const { name, address, hours, phone, email, photoBase64, photoFilename, photoContentType } = body;
      if (!String(name || '').trim()) {
        res.status(400).json({ error: 'Store name is required' });
        return;
      }
      if (!photoBase64 || !photoContentType || !photoContentType.startsWith('image/')) {
        res.status(400).json({ error: 'A photo is required' });
        return;
      }

      const current = await readStores();
      const baseSlug = slugify(name);
      let id = baseSlug;
      let n = 2;
      while (current.some((s) => s.id === id)) {
        id = `${baseSlug}-${n}`;
        n += 1;
      }

      let photo;
      try {
        photo = await uploadPhoto(id, photoBase64, photoFilename, photoContentType);
      } catch {
        res.status(400).json({ error: 'Photo must be under 8MB' });
        return;
      }

      const newStore = {
        id,
        name: String(name).slice(0, 120),
        photo,
        address: String(address || '').slice(0, 300),
        hours: String(hours || '').slice(0, 500),
        phone: String(phone || '').slice(0, 40),
        email: String(email || '').slice(0, 200),
      };

      const updated = [...current, newStore];
      await writeStores(updated);
      res.status(200).json({ ok: true, stores: updated });
      return;
    }

    // action === 'update'
    const incoming = body.stores;
    if (!Array.isArray(incoming)) {
      res.status(400).json({ error: 'Missing stores array' });
      return;
    }

    const current = await readStores();
    const byId = new Map(current.map((s) => [s.id, s]));

    if (incoming.length !== current.length || !incoming.every((s) => byId.has(s.id))) {
      res.status(409).json({ error: 'Store list changed elsewhere — please refresh and try again' });
      return;
    }

    const updated = [];
    for (const edit of incoming) {
      const stored = byId.get(edit.id);
      let photo = stored.photo;

      if (edit.photoBase64) {
        if (!edit.photoContentType || !edit.photoContentType.startsWith('image/')) {
          res.status(400).json({ error: 'Store photo must be an image' });
          return;
        }
        try {
          photo = await uploadPhoto(stored.id, edit.photoBase64, edit.photoFilename, edit.photoContentType);
        } catch {
          res.status(400).json({ error: 'Store photo must be under 8MB' });
          return;
        }
      }

      updated.push({
        id: stored.id,
        name: String(edit.name ?? stored.name).slice(0, 120),
        photo,
        address: String(edit.address ?? stored.address).slice(0, 300),
        hours: String(edit.hours ?? stored.hours).slice(0, 500),
        phone: String(edit.phone ?? stored.phone).slice(0, 40),
        email: String(edit.email ?? stored.email).slice(0, 200),
      });
    }

    await writeStores(updated);
    res.status(200).json({ ok: true, stores: updated });
  } catch (err) {
    res.status(500).json({ error: 'Request failed' });
  }
};

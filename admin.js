const loginSection = document.getElementById('loginSection');
const panelSection = document.getElementById('panelSection');
const logoutBtn = document.getElementById('logoutBtn');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const uploadForm = document.getElementById('uploadForm');
const uploadStatus = document.getElementById('uploadStatus');
const itemList = document.getElementById('itemList');
const categoryOptions = document.getElementById('categoryOptions');
const themeSelect = document.getElementById('themeSelect');
const themeStatus = document.getElementById('themeStatus');

const MAX_ORIGINAL_BYTES = 30 * 1024 * 1024; // sanity ceiling on the picked file, before compression
const TARGET_UPLOAD_BYTES = 2.5 * 1024 * 1024; // compressed target so mobile photos clear the server's size limit
const MAX_DIMENSION = 2000; // longest side, in pixels, after resizing

let currentItems = [];

function showPanel() {
  loginSection.classList.add('hidden');
  panelSection.classList.remove('hidden');
  logoutBtn.classList.remove('hidden');
  loadItems();
  loadTheme();
  loadStores();
}

async function loadTheme() {
  const res = await fetch('/api/theme');
  const data = await res.json();
  themeSelect.value = data.theme || 'default';
}

themeSelect.addEventListener('change', async () => {
  themeStatus.classList.remove('hidden');
  themeStatus.textContent = 'Saving…';
  const res = await fetch('/api/admin/theme', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme: themeSelect.value }),
  });
  if (res.ok) {
    themeStatus.textContent = 'Saved!';
    setTimeout(() => themeStatus.classList.add('hidden'), 2000);
  } else {
    const data = await res.json().catch(() => ({}));
    themeStatus.textContent = data.error || 'Could not save theme';
  }
});

function showLogin() {
  loginSection.classList.remove('hidden');
  panelSection.classList.add('hidden');
  logoutBtn.classList.add('hidden');
}

async function checkSession() {
  const res = await fetch('/api/admin/session');
  const data = await res.json();
  if (data.authenticated) showPanel();
  else showLogin();
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  const password = document.getElementById('password').value;
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (res.ok) {
    loginForm.reset();
    showPanel();
  } else {
    const data = await res.json().catch(() => ({}));
    loginError.textContent = data.error || 'Login failed';
    loginError.classList.remove('hidden');
  }
});

logoutBtn.addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  showLogin();
});

function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function renderCategoryOptions() {
  const cats = [...new Set(currentItems.map((i) => i.category))];
  categoryOptions.innerHTML = cats.map((c) => `<option value="${escapeAttr(c)}"></option>`).join('');
}

function renderItems() {
  renderCategoryOptions();
  if (currentItems.length === 0) {
    itemList.innerHTML = '<p class="admin-hint">No photos yet — upload one above.</p>';
    return;
  }
  itemList.innerHTML = '';
  currentItems.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'admin-item';
    card.dataset.id = item.id;
    card.innerHTML = `
      <img src="${item.url}" alt="${escapeAttr(item.caption || '')}" />
      <div class="admin-item-fields">
        <input type="text" class="cap-input" value="${escapeAttr(item.caption || '')}" placeholder="Caption" />
        <input type="text" class="cat-input" value="${escapeAttr(item.category || '')}" placeholder="Category" />
      </div>
      <div class="admin-item-actions">
        <button type="button" class="btn-icon move-up" title="Move up" ${index === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" class="btn-icon move-down" title="Move down" ${index === currentItems.length - 1 ? 'disabled' : ''}>↓</button>
        <button type="button" class="btn-danger delete-btn" title="Delete">Delete</button>
      </div>
    `;
    itemList.appendChild(card);
  });
}

function collectFromDOM() {
  return [...itemList.querySelectorAll('.admin-item')].map((card) => ({
    id: card.dataset.id,
    caption: card.querySelector('.cap-input').value,
    category: card.querySelector('.cat-input').value,
  }));
}

async function persistUpdate(items) {
  const res = await fetch('/api/admin/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    alert('Could not save changes — please refresh and try again.');
    return null;
  }
  const data = await res.json();
  return data.items;
}

async function loadItems() {
  const res = await fetch('/api/gallery');
  const data = await res.json();
  currentItems = (data.items || []).slice().sort((a, b) => a.order - b.order);
  renderItems();
}

itemList.addEventListener('click', async (e) => {
  const card = e.target.closest('.admin-item');
  if (!card) return;
  const id = card.dataset.id;

  if (e.target.classList.contains('delete-btn')) {
    if (!confirm('Delete this photo? This cannot be undone.')) return;
    const res = await fetch('/api/admin/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      const data = await res.json();
      currentItems = data.items.slice().sort((a, b) => a.order - b.order);
      renderItems();
    } else {
      alert('Delete failed — please try again.');
    }
    return;
  }

  if (e.target.classList.contains('move-up') || e.target.classList.contains('move-down')) {
    const edited = collectFromDOM();
    const index = edited.findIndex((i) => i.id === id);
    const swapWith = e.target.classList.contains('move-up') ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= edited.length) return;
    [edited[index], edited[swapWith]] = [edited[swapWith], edited[index]];
    const saved = await persistUpdate(edited);
    if (saved) {
      currentItems = saved.slice().sort((a, b) => a.order - b.order);
      renderItems();
    }
  }
});

itemList.addEventListener('focusout', async (e) => {
  if (!e.target.classList.contains('cap-input') && !e.target.classList.contains('cat-input')) return;
  const edited = collectFromDOM();
  const saved = await persistUpdate(edited);
  if (saved) {
    currentItems = saved.slice().sort((a, b) => a.order - b.order);
    renderCategoryOptions();
  }
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Phone camera photos (often 8-15MB) blow past the server's request size limit even
// though the same limit rarely bites laptop photos, which tend to already be edited/
// resized. Downscale + re-encode as JPEG in the browser so every upload is small,
// regardless of source device. Falls back to the original file if this fails for any
// reason (e.g. an older browser without createImageBitmap).
async function prepareImageForUpload(file) {
  if (typeof createImageBitmap !== 'function') return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.85;
  let blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  while (blob && blob.size > TARGET_UPLOAD_BYTES && quality > 0.4) {
    quality -= 0.15;
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  }
  return blob || file;
}

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fileInput = document.getElementById('photoFile');
  const file = fileInput.files[0];
  if (!file) return;

  if (file.size > MAX_ORIGINAL_BYTES) {
    uploadStatus.classList.remove('hidden');
    uploadStatus.textContent = 'That photo is too large — please use a smaller file.';
    return;
  }

  uploadStatus.classList.remove('hidden');
  uploadStatus.textContent = 'Preparing photo…';

  const caption = document.getElementById('photoCaption').value;
  const category = document.getElementById('photoCategory').value;
  const uploadBlob = await prepareImageForUpload(file);
  const isJpeg = uploadBlob !== file;

  uploadStatus.textContent = 'Uploading…';
  const dataBase64 = await fileToBase64(uploadBlob);

  const res = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: isJpeg ? file.name.replace(/\.\w+$/, '.jpg') : file.name,
      contentType: isJpeg ? 'image/jpeg' : file.type,
      dataBase64,
      caption,
      category,
    }),
  });

  if (res.ok) {
    const data = await res.json();
    currentItems = data.items.slice().sort((a, b) => a.order - b.order);
    renderItems();
    uploadForm.reset();
    uploadStatus.textContent = 'Uploaded!';
    setTimeout(() => uploadStatus.classList.add('hidden'), 2000);
  } else {
    const data = await res.json().catch(() => ({}));
    uploadStatus.textContent = data.error || 'Upload failed';
  }
});

// ── STORE LOCATIONS ──
const storesList = document.getElementById('storesList');
let currentStores = [];

function renderStores() {
  if (currentStores.length === 0) {
    storesList.innerHTML = '<p class="admin-hint">No stores configured.</p>';
    return;
  }
  storesList.innerHTML = '';
  currentStores.forEach((store) => {
    const card = document.createElement('div');
    card.className = 'store-edit-card';
    card.dataset.id = store.id;
    card.innerHTML = `
      <img src="${escapeAttr(store.photo)}" alt="${escapeAttr(store.name)}" />
      <label>Photo</label>
      <input type="file" class="store-photo-input" accept="image/*" />
      <label>Store Name</label>
      <input type="text" class="store-name-input" value="${escapeAttr(store.name)}" />
      <label>Address</label>
      <input type="text" class="store-address-input" value="${escapeAttr(store.address)}" />
      <label>Hours</label>
      <textarea class="store-hours-input">${escapeAttr(store.hours)}</textarea>
      <label>Phone</label>
      <input type="text" class="store-phone-input" value="${escapeAttr(store.phone)}" />
      <label>Email (optional)</label>
      <input type="text" class="store-email-input" value="${escapeAttr(store.email)}" />
      <button type="button" class="btn-danger store-delete-btn">Delete Store</button>
      <p class="store-edit-status hidden"></p>
    `;
    storesList.appendChild(card);
  });
}

async function persistStores(stores) {
  const res = await fetch('/api/admin/stores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stores }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    alert(data.error || 'Could not save store changes — please refresh and try again.');
    return null;
  }
  const data = await res.json();
  return data.stores;
}

function collectStoresFromDOM() {
  return [...storesList.querySelectorAll('.store-edit-card')].map((card) => ({
    id: card.dataset.id,
    name: card.querySelector('.store-name-input').value,
    address: card.querySelector('.store-address-input').value,
    hours: card.querySelector('.store-hours-input').value,
    phone: card.querySelector('.store-phone-input').value,
    email: card.querySelector('.store-email-input').value,
  }));
}

async function saveStoreField(card) {
  const edited = collectStoresFromDOM();
  const saved = await persistStores(edited);
  if (saved) {
    currentStores = saved;
    const status = card.querySelector('.store-edit-status');
    status.textContent = 'Saved!';
    status.classList.remove('hidden');
    setTimeout(() => status.classList.add('hidden'), 2000);
  }
}

storesList.addEventListener('focusout', (e) => {
  if (!e.target.matches('.store-name-input, .store-address-input, .store-hours-input, .store-phone-input, .store-email-input')) return;
  const card = e.target.closest('.store-edit-card');
  saveStoreField(card);
});

storesList.addEventListener('change', async (e) => {
  if (!e.target.classList.contains('store-photo-input')) return;
  const card = e.target.closest('.store-edit-card');
  const id = card.dataset.id;
  const file = e.target.files[0];
  if (!file) return;

  const status = card.querySelector('.store-edit-status');
  status.classList.remove('hidden');
  status.textContent = 'Uploading photo…';

  const uploadBlob = await prepareImageForUpload(file);
  const isJpeg = uploadBlob !== file;
  const dataBase64 = await fileToBase64(uploadBlob);

  const edited = collectStoresFromDOM().map((s) =>
    s.id === id
      ? {
          ...s,
          photoBase64: dataBase64,
          photoFilename: isJpeg ? file.name.replace(/\.\w+$/, '.jpg') : file.name,
          photoContentType: isJpeg ? 'image/jpeg' : file.type,
        }
      : s
  );

  const saved = await persistStores(edited);
  if (saved) {
    currentStores = saved;
    renderStores();
  } else {
    status.classList.add('hidden');
  }
});

storesList.addEventListener('click', async (e) => {
  if (!e.target.classList.contains('store-delete-btn')) return;
  const card = e.target.closest('.store-edit-card');
  const id = card.dataset.id;
  const name = card.querySelector('.store-name-input').value || 'this store';
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

  const res = await fetch('/api/admin/stores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id }),
  });
  if (res.ok) {
    const data = await res.json();
    currentStores = data.stores;
    renderStores();
  } else {
    const data = await res.json().catch(() => ({}));
    alert(data.error || 'Delete failed — please try again.');
  }
});

async function loadStores() {
  const res = await fetch('/api/stores');
  const data = await res.json();
  currentStores = data.stores || [];
  renderStores();
}

// ── ADD NEW STORE ──
const storeAddForm = document.getElementById('storeAddForm');
const storeAddStatus = document.getElementById('storeAddStatus');

storeAddForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fileInput = document.getElementById('newStorePhoto');
  const file = fileInput.files[0];
  if (!file) return;

  storeAddStatus.classList.remove('hidden');
  storeAddStatus.textContent = 'Uploading…';

  const uploadBlob = await prepareImageForUpload(file);
  const isJpeg = uploadBlob !== file;
  const dataBase64 = await fileToBase64(uploadBlob);

  const res = await fetch('/api/admin/stores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'add',
      name: document.getElementById('newStoreName').value,
      address: document.getElementById('newStoreAddress').value,
      hours: document.getElementById('newStoreHours').value,
      phone: document.getElementById('newStorePhone').value,
      email: document.getElementById('newStoreEmail').value,
      photoBase64: dataBase64,
      photoFilename: isJpeg ? file.name.replace(/\.\w+$/, '.jpg') : file.name,
      photoContentType: isJpeg ? 'image/jpeg' : file.type,
    }),
  });

  if (res.ok) {
    const data = await res.json();
    currentStores = data.stores;
    renderStores();
    storeAddForm.reset();
    storeAddStatus.textContent = 'Store added!';
    setTimeout(() => storeAddStatus.classList.add('hidden'), 2000);
  } else {
    const data = await res.json().catch(() => ({}));
    storeAddStatus.textContent = data.error || 'Could not add store';
  }
});

checkSession();

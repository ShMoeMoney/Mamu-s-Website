// Seasonal theme — loaded from /api/theme, applied as a body class
const THEME_FX = {
  halloween: { particles: ['🦇', '🎃'], accents: ['🕸️', '🎃'] },
  christmas: { particles: ['❄️'], accents: ['⛄'] },
  thanksgiving: { particles: ['🍂', '🍁'], accents: ['🦃'] },
};

function initSeasonalDecor(theme) {
  const config = THEME_FX[theme];
  if (!config) return;

  const fx = document.createElement('div');
  fx.id = 'seasonalFx';
  document.body.appendChild(fx);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion) {
    const count = window.innerWidth < 600 ? 10 : 18;
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('span');
      particle.className = 'fx-particle';
      particle.textContent = config.particles[i % config.particles.length];
      particle.style.left = `${Math.random() * 100}vw`;
      particle.style.fontSize = `${0.9 + Math.random() * 1.2}rem`;
      particle.style.animationDuration = `${8 + Math.random() * 10}s`;
      particle.style.animationDelay = `${Math.random() * -18}s`;
      particle.style.opacity = String(0.5 + Math.random() * 0.5);
      fx.appendChild(particle);
    }
  }

  config.accents.forEach((emoji, i) => {
    const accent = document.createElement('span');
    accent.className = 'fx-accent';
    accent.textContent = emoji;
    accent.style[i % 2 === 0 ? 'left' : 'right'] = '1rem';
    accent.style.animationDelay = `${i * 0.4}s`;
    fx.appendChild(accent);
  });
}

async function applyTheme() {
  try {
    const res = await fetch('/api/theme');
    const data = await res.json();
    if (data.theme && data.theme !== 'default') {
      document.body.classList.add(`theme-${data.theme}`);
      initSeasonalDecor(data.theme);
    }
  } catch (err) {
    // no theme set / request failed — fall back to the default look
  }
}
applyTheme();

// Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
});

// Mobile burger menu
const burger = document.getElementById('burger');
const navLinks = document.querySelector('.nav-links');
burger.addEventListener('click', () => {
  burger.classList.toggle('open');
  navLinks.classList.toggle('open');
});
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    burger.classList.remove('open');
    navLinks.classList.remove('open');
  });
});

// Gallery — loaded dynamically from /api/gallery
const CATEGORY_LABELS = {
  gnomes: 'Gnomes',
  pebble: 'Pebble Art',
  decor: 'Home Décor',
};

function categoryLabel(cat) {
  if (CATEGORY_LABELS[cat]) return CATEGORY_LABELS[cat];
  return cat.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const filterBar = document.getElementById('filterBar');
const galleryGrid = document.getElementById('galleryGrid');

function renderFilterBar(items) {
  const seen = [];
  items.forEach((item) => {
    if (!seen.includes(item.category)) seen.push(item.category);
  });
  filterBar.innerHTML = '';
  seen.forEach((cat) => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.filter = cat;
    btn.textContent = categoryLabel(cat);
    filterBar.appendChild(btn);
  });
}

function renderGalleryGrid(items) {
  galleryGrid.innerHTML = '';
  if (items.length === 0) {
    galleryGrid.innerHTML = '<p class="gallery-loading">No photos yet — check back soon!</p>';
    return;
  }
  const hint = document.createElement('p');
  hint.className = 'gallery-loading';
  hint.id = 'galleryHint';
  hint.textContent = 'Choose a category above to see our creations.';
  galleryGrid.appendChild(hint);

  items.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'gallery-item hidden';
    div.dataset.cat = item.category;

    const img = document.createElement('img');
    img.src = item.url;
    img.alt = item.caption || '';
    img.loading = 'lazy';
    div.appendChild(img);

    if (item.caption) {
      const cap = document.createElement('div');
      cap.className = 'gallery-caption';
      cap.textContent = item.caption;
      div.appendChild(cap);
    }

    galleryGrid.appendChild(div);
  });
}

function initGalleryInteractions() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-item');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      const hint = document.getElementById('galleryHint');
      if (hint) hint.remove();
      galleryItems.forEach(item => {
        if (item.dataset.cat === filter) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      });
    });
  });

  galleryItems.forEach((item) => {
    item.addEventListener('click', () => {
      const visible = [...document.querySelectorAll('.gallery-item:not(.hidden)')];
      const idx = visible.indexOf(item);
      openLightbox(idx);
    });
  });
}

async function loadGallery() {
  try {
    const res = await fetch('/api/gallery');
    const data = await res.json();
    const items = (data.items || []).slice().sort((a, b) => a.order - b.order);
    renderFilterBar(items);
    renderGalleryGrid(items);
  } catch (err) {
    galleryGrid.innerHTML = '<p class="gallery-loading">Couldn\'t load the gallery right now. Please refresh.</p>';
  }
  initGalleryInteractions();
}

loadGallery();

// Lightbox
const lightbox = document.getElementById('lightbox');
const lbBackdrop = document.getElementById('lbBackdrop');
const lbImg = document.getElementById('lbImg');
const lbCaption = document.getElementById('lbCaption');
const lbClose = document.getElementById('lbClose');
const lbPrev = document.getElementById('lbPrev');
const lbNext = document.getElementById('lbNext');

let visibleItems = [];
let currentIndex = 0;

function openLightbox(index) {
  visibleItems = [...document.querySelectorAll('.gallery-item:not(.hidden)')];
  currentIndex = index;
  showLbImage(currentIndex);
  lightbox.classList.add('open');
  lbBackdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('open');
  lbBackdrop.classList.remove('open');
  document.body.style.overflow = '';
}

function showLbImage(i) {
  const item = visibleItems[i];
  const img = item.querySelector('img');
  const cap = item.querySelector('.gallery-caption');
  lbImg.src = img.src;
  lbImg.alt = img.alt;
  lbCaption.textContent = cap ? cap.textContent : '';
}

lbClose.addEventListener('click', closeLightbox);
lbBackdrop.addEventListener('click', closeLightbox);

lbPrev.addEventListener('click', () => {
  currentIndex = (currentIndex - 1 + visibleItems.length) % visibleItems.length;
  showLbImage(currentIndex);
});
lbNext.addEventListener('click', () => {
  currentIndex = (currentIndex + 1) % visibleItems.length;
  showLbImage(currentIndex);
});

document.addEventListener('keydown', e => {
  if (!lightbox.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') lbPrev.click();
  if (e.key === 'ArrowRight') lbNext.click();
});

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

// Gallery filter
const filterBtns = document.querySelectorAll('.filter-btn');
const galleryItems = document.querySelectorAll('.gallery-item');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    galleryItems.forEach(item => {
      if (filter === 'all' || item.dataset.cat === filter) {
        item.classList.remove('hidden');
      } else {
        item.classList.add('hidden');
      }
    });
  });
});

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

galleryItems.forEach((item, _) => {
  item.addEventListener('click', () => {
    const visible = [...document.querySelectorAll('.gallery-item:not(.hidden)')];
    const idx = visible.indexOf(item);
    openLightbox(idx);
  });
});

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


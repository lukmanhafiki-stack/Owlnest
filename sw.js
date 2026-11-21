/* Owlnest service worker
 * Tujuan: buka app terus dari cache (laju), kemas kini senyap di belakang.
 * Setiap kali ubah fail app, tukar VERSION (cth. owlnest-v3). */
const VERSION = 'owlnest-v3';
const SHELL = VERSION + '-shell';
const RUNTIME = VERSION + '-runtime';

const APP_FILES = [
  './', './index.html', './manifest.webmanifest',
  './css/base.css', './css/auth.css', './css/dashboard.css', './css/finance.css',
  './css/start-page.css', './css/brand.css', './css/theme.css', './css/overrides.css',
  './js/tailwind-config.js', './js/config.js', './js/utils.js', './js/presets.js',
  './js/state.js', './js/sync.js', './js/realtime.js', './js/navigation.js',
  './js/dashboard.js', './js/course-outline.js', './js/finance.js', './js/receipt.js',
  './js/start-page.js', './js/render.js', './js/schedule.js', './js/auth.js',
  './js/main.js', './js/pwa.js',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png',
  './assets/icons/favicon-32.png', './assets/icons/apple-touch-icon.png',
  './assets/images/grid-bg.jpg', './assets/images/denim-bg.jpg'
];

const CDN_FILES = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest',
  'https://unpkg.com/@phosphor-icons/web',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Lexend:wght@500;600;700&display=swap'
];

// Hanya host statik ini di-cache. Supabase (data/login) sentiasa terus ke network.
const CDN_HOSTS = [
  'cdn.tailwindcss.com', 'unpkg.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com',
  'fonts.googleapis.com', 'fonts.gstatic.com'
];

const PINNED = /@\d+\.\d+\.\d+|\/\d+\.\d+\.\d+[^/]*\/|\.traineddata|fonts\.gstatic\.com/;

async function precache(cache, req) {
  try {
    const res = await fetch(req);
    if (res && (res.ok || res.type === 'opaque')) await cache.put(req, res);
  } catch (e) { /* fail tiada / tiada internet: langkau */ }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await Promise.all([
      ...APP_FILES.map((u) => precache(cache, new Request(u, { cache: 'reload' }))),
      ...CDN_FILES.map((u) => precache(cache, new Request(u, { mode: 'no-cors' })))
    ]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function cachedMatch(req, opts) {
  return (await caches.match(req, opts));
}

function revalidate(req) {
  return fetch(req).then(async (res) => {
    if (res && (res.ok || res.type === 'opaque')) {
      const cache = await caches.open(RUNTIME);
      await cache.put(req, res.clone());
    }
    return res;
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !CDN_HOSTS.includes(url.hostname)) return;

  // Buka app: paparkan index.html dari cache serta-merta, kemas kini di belakang.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cached = await cachedMatch('./index.html', { ignoreSearch: true });
      const update = revalidate(new Request('./index.html', { cache: 'reload' })).catch(() => null);
      if (cached) { event.waitUntil(update); return cached; }
      const fresh = await update;
      return fresh || Response.error();
    })());
    return;
  }

  // Fail lain: guna cache dahulu, segarkan di belakang (stale-while-revalidate).
  // Fail CDN berversi tetap (cth. @5.1.1, /3.11.174/, .traineddata) tak berubah: cache terus, tiada muat semula.
  event.respondWith((async () => {
    const cached = await cachedMatch(req);
    if (cached && !sameOrigin && PINNED.test(req.url)) return cached;
    const update = revalidate(req).catch(() => null);
    if (cached) { event.waitUntil(update); return cached; }
    const fresh = await update;
    return fresh || Response.error();
  })());
});

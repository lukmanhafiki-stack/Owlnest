/* Owlnest service worker
 * Ubah VERSION setiap kali anda kemas kini fail app supaya pengguna dapat versi terbaru. */
const VERSION = 'owlnest-v4';
const CORE_CACHE = VERSION + '-core';
const RUNTIME_CACHE = VERSION + '-runtime';

const LOCAL_ASSETS = [
    "./",
    "index.html",
    "manifest.webmanifest",
    "css/base.css",
    "css/auth.css",
    "css/dashboard.css",
    "css/finance.css",
    "css/start-page.css",
    "css/brand.css",
    "css/theme.css",
    "css/overrides.css",
    "js/config.js",
    "js/utils.js",
    "js/presets.js",
    "js/state.js",
    "js/sync.js",
    "js/realtime.js",
    "js/navigation.js",
    "js/dashboard.js",
    "js/course-outline.js",
    "js/finance.js",
    "js/receipt.js",
    "js/start-page.js",
    "js/render.js",
    "js/schedule.js",
    "js/auth.js",
    "js/main.js",
    "js/tailwind-config.js",
    "js/pwa.js",
    "assets/images/grid-bg.jpg",
    "assets/images/denim-bg.jpg",
    "assets/icons/icon-192.png",
    "assets/icons/icon-512.png",
    "assets/icons/icon-maskable-512.png",
    "assets/icons/apple-touch-icon.png",
    "assets/icons/favicon-32.png",
    "assets/icons/favicon.ico"
];

const CDN_ASSETS = [
    "https://cdn.tailwindcss.com",
    "https://unpkg.com/lucide@latest",
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
    "https://unpkg.com/@phosphor-icons/web",
    "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Lexend:wght@500;600;700&display=swap"
];

// Hos CDN yang boleh di-cache untuk kegunaan offline
const CACHEABLE_HOSTS = [
    'cdn.tailwindcss.com', 'unpkg.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com',
    'fonts.googleapis.com', 'fonts.gstatic.com'
];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CORE_CACHE);
        await cache.addAll(LOCAL_ASSETS);
        // CDN: cuba simpan, tetapi jangan gagalkan pemasangan jika satu gagal
        await Promise.allSettled(CDN_ASSETS.map(async (url) => {
            const res = await fetch(url, { mode: 'no-cors' });
            await cache.put(url, res);
        }));
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

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // Data Supabase & API lain: sentiasa terus ke rangkaian (jangan cache data pengguna)
    if (url.hostname.endsWith('.supabase.co')) return;

    // Buka halaman: rangkaian dahulu, jika offline guna salinan tersimpan
    if (req.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                const fresh = await fetch(req);
                const cache = await caches.open(CORE_CACHE);
                cache.put('index.html', fresh.clone());
                return fresh;
            } catch (e) {
                return (await caches.match('index.html')) || (await caches.match('./'));
            }
        })());
        return;
    }

    const sameOrigin = url.origin === self.location.origin;
    if (!sameOrigin && !CACHEABLE_HOSTS.includes(url.hostname)) return;

    if (sameOrigin) {
        // Fail app sendiri: ambil versi terbaru dahulu, guna cache hanya jika offline
        event.respondWith((async () => {
            const cache = await caches.open(CORE_CACHE);
            try {
                const res = await fetch(req, { cache: 'no-cache' });
                if (res && res.ok) cache.put(req, res.clone());
                return res;
            } catch (e) {
                return (await cache.match(req)) || Response.error();
            }
        })());
        return;
    }

    // Pustaka CDN: guna cache dahulu (jarang berubah), kemas kini di latar belakang
    event.respondWith((async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(req);
        const network = fetch(req).then((res) => {
            if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
            return res;
        }).catch(() => cached);
        return cached || network;
    })());
});

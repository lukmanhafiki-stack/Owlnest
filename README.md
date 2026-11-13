# Owlnest (PWA)

```
owlnest/
├── index.html              # struktur halaman sahaja
├── manifest.webmanifest    # nama + ikon PWA
├── sw.js                   # service worker (offline)
├── css/                    # base, auth, dashboard, finance, start-page, brand, theme, overrides
├── js/                     # config, utils, state, sync, dashboard, finance, receipt, ... pwa.js
└── assets/
    ├── icons/              # logo Owl Nest — HANYA untuk ikon PWA
    └── images/             # grid-bg.jpg, denim-bg.jpg
```

- Hos pada **HTTPS** (Netlify, Vercel, GitHub Pages, Cloudflare Pages dll). PWA tidak boleh dipasang dari fail `file://`.
- Susunan `<script>` dalam `index.html` penting; jangan ubah.
- Setiap kali kemas kini fail, tukar `VERSION` dalam `sw.js` (cth. `owlnest-v2`) supaya pengguna dapat versi baru.

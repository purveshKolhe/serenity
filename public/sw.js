const CACHE_NAME = 'serenity-cache-v4';

const AVATARS = [
    'Quiet_topper.webp', 'calm_nerd.webp', 'confident_studier.webp', 'cozy_bookworm.webp',
    'energetic_bestie.webp', 'energetic_friend.webp', 'focus_mode.webp', 'gamer_guy.webp',
    'hoodie_pal.webp', 'minimal_clean_girl.webp', 'night_owl.webp', 'soft_aesthetic_girl.webp',
    'soft_smile.webp', 'sunshine.webp'
];

const BACKGROUNDS = ['forest.webp', 'hogwarts.webp', 'library.webp', 'stars.webp', 'tech.webp', 'valley.webp'];

// TIER 1: Essential for the first impression (Core UI + Avatars)
const TIER_1_ASSETS = [
    '/',
    '/index.html',
    '/room.html',
    '/style.css',
    '/landing.js',
    '/room.js',
    '/assets/logo.webp?v=4',
    '/assets/fav.webp?v=4'
];
AVATARS.forEach(av => TIER_1_ASSETS.push(`/avatars/${av}?v=4`));

// ALL ASSETS (for background sync)
const ALL_ASSETS = [
    ...TIER_1_ASSETS,
    '/assets/desk.webp?v=4',
    '/assets/notif.mp3?v=4'
];
BACKGROUNDS.forEach(bg => {
    ALL_ASSETS.push(`/bgs/${bg}?v=4`);
    ALL_ASSETS.push(`/mobile_bgs/${bg}?v=4`);
});
for (let i = 1; i <= 14; i++) {
    ALL_ASSETS.push(`/vids/${i}.webm?v=4`);
    ALL_ASSETS.push(`/vids/${i}s.webm?v=4`);
}

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Caching Tier 1 Assets (Core + Avatars)');
            return Promise.all(
                TIER_1_ASSETS.map(url => cache.add(url).catch(e => console.warn(`Failed Tier 1: ${url}`, e)))
            );
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null)
        ))
    );
    return self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) return cachedResponse;
            
            return fetch(event.request).then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    const url = new URL(event.request.url);
                    // Dynamically cache any requested media if not already in cache
                    if (['/avatars', '/bgs', '/mobile_bgs', '/vids', '/assets'].some(path => url.pathname.startsWith(path))) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
                    }
                }
                return networkResponse;
            });
        })
    );
});

// Priority Caching System
self.addEventListener('message', event => {
    if (event.data.type === 'CACHE_PRIORITY') {
        const urls = event.data.urls;
        console.log('[SW] Priority Caching:', urls);
        caches.open(CACHE_NAME).then(cache => {
            urls.forEach(url => cache.add(url).catch(e => console.warn(`Priority fail: ${url}`, e)));
        });
    }

    if (event.data.type === 'START_BACKGROUND_SYNC') {
        console.log('[SW] Starting Background Sync of all remaining assets...');
        caches.open(CACHE_NAME).then(cache => {
            // Sequential background caching to not choke the connection
            (async () => {
                for (const url of ALL_ASSETS) {
                    const exists = await caches.match(url);
                    if (!exists) {
                        try {
                            await cache.add(url);
                            // Tiny delay to be polite
                            await new Promise(r => setTimeout(r, 200));
                        } catch (e) {
                            console.warn(`Background fail: ${url}`);
                        }
                    }
                }
                console.log('[SW] Background Sync Complete.');
            })();
        });
    }
});

const CACHE_NAME = 'serenity-cache-v8';

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
    '/assets/logo.webp?v=8',
    '/assets/fav.webp?v=8'
];
AVATARS.forEach(av => TIER_1_ASSETS.push(`/avatars/${av}?v=8`));

// ALL ASSETS (for background sync)
const ALL_ASSETS = [
    ...TIER_1_ASSETS,
    '/assets/desk.webp?v=8',
    '/assets/notif.mp3?v=8'
];
BACKGROUNDS.forEach(bg => {
    ALL_ASSETS.push(`/bgs/${bg}?v=8`);
    ALL_ASSETS.push(`/mobile_bgs/${bg}?v=8`);
});
for (let i = 1; i <= 14; i++) {
    ALL_ASSETS.push(`/vids/${i}.webm?v=8`);
    ALL_ASSETS.push(`/vids/${i}s.webm?v=8`);
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
        caches.match(event.request, { ignoreSearch: true }).then(async cachedResponse => {
            if (cachedResponse) {
                // If it's a Range request, we MUST return a 206 for video/audio elements to work in Chrome/Safari
                if (event.request.headers.has('Range')) {
                    const rangeHeader = event.request.headers.get('Range');
                    const blob = await cachedResponse.blob();
                    const size = blob.size;
                    const parts = rangeHeader.replace(/bytes=/, "").split("-");
                    const start = parseInt(parts[0], 10);
                    const end = parts[1] ? parseInt(parts[1], 10) : size - 1;
                    const chunk = blob.slice(start, end + 1);
                    
                    const responseHeaders = new Headers(cachedResponse.headers);
                    responseHeaders.set('Content-Range', `bytes ${start}-${end}/${size}`);
                    responseHeaders.set('Content-Length', chunk.size);
                    responseHeaders.set('Accept-Ranges', 'bytes');

                    return new Response(chunk, {
                        status: 206,
                        statusText: 'Partial Content',
                        headers: responseHeaders
                    });
                }
                return cachedResponse;
            }
            
            return fetch(event.request).then(networkResponse => {
                const url = new URL(event.request.url);
                const isMedia = ['/avatars', '/bgs', '/mobile_bgs', '/vids', '/assets'].some(path => url.pathname.startsWith(path));

                if (networkResponse && networkResponse.status === 200) {
                    if (isMedia) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
                    }
                } else if (networkResponse && networkResponse.status === 206) {
                    if (isMedia) {
                        // Range request returned 206. Fetch full 200 in background to cache it.
                        fetch(event.request.url).then(fullResponse => {
                            if (fullResponse.status === 200) {
                                caches.open(CACHE_NAME).then(cache => cache.put(event.request.url, fullResponse));
                            }
                        });
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
            urls.forEach(async (url) => {
                const exists = await cache.match(url, { ignoreSearch: true });
                if (!exists) {
                    cache.add(url).catch(e => console.warn(`Priority fail: ${url}`, e));
                }
            });
        });
    }

    if (event.data.type === 'START_BACKGROUND_SYNC') {
        console.log('[SW] Starting Background Sync of all remaining assets...');
        caches.open(CACHE_NAME).then(cache => {
            // Sequential background caching to not choke the connection
            (async () => {
                for (const url of ALL_ASSETS) {
                    const exists = await caches.match(url, { ignoreSearch: true });
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

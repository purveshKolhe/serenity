const SHELL_CACHE_NAME = 'serenity-shell-v14';
const MEDIA_CACHE_NAME = 'serenity-media-v11';

const AVATARS = [
    'Quiet_topper.webp', 'calm_nerd.webp', 'confident_studier.webp', 'cozy_bookworm.webp',
    'energetic_bestie.webp', 'energetic_friend.webp', 'focus_mode.webp', 'gamer_guy.webp',
    'hoodie_pal.webp', 'minimal_clean_girl.webp', 'night_owl.webp', 'soft_aesthetic_girl.webp',
    'soft_smile.webp', 'sunshine.webp'
];

const BACKGROUNDS = ['forest.webp', 'hogwarts.webp', 'library.webp', 'stars.webp', 'tech.webp', 'valley.webp'];

// SHELL: Core UI, CSS, JS. Updates often so it's bumped to v10.
const SHELL_ASSETS = [
    '/',
    '/index.html?v=12',
    '/room.html?v=12',
    '/style.css?v=12',
    '/landing.js?v=12',
    '/room.js?v=12',
    '/assets/logo.webp?v=12',
    '/assets/fav.webp?v=12'
];

// MEDIA: Heavy assets like videos, avatars, backgrounds. Rarely changing so they stay at v8.
const MEDIA_ASSETS = [
    '/assets/desk.webp?v=12',
    '/assets/notif.mp3?v=12'
];
AVATARS.forEach(av => MEDIA_ASSETS.push(`/avatars/${av}?v=12`));
BACKGROUNDS.forEach(bg => {
    MEDIA_ASSETS.push(`/bgs/${bg}?v=12`);
    MEDIA_ASSETS.push(`/mobile_bgs/${bg}?v=12`);
});
for (let i = 1; i <= 14; i++) {
    MEDIA_ASSETS.push(`/vids/${i}.webm?v=12`);
    MEDIA_ASSETS.push(`/vids/${i}s.webm?v=12`);
}

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        Promise.all([
            caches.open(SHELL_CACHE_NAME).then(cache => {
                console.log('[SW] Caching Shell Assets');
                return cache.addAll(SHELL_ASSETS);
            })
            // We do not eagerly cache all media on install anymore to save bandwidth.
            // It will be lazily loaded via background sync.
        ])
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                // Delete old shell caches
                if (key.startsWith('serenity-shell-') && key !== SHELL_CACHE_NAME) {
                    return caches.delete(key);
                }
                // Delete old media caches
                if (key.startsWith('serenity-media-') && key !== MEDIA_CACHE_NAME) {
                    return caches.delete(key);
                }
                // Cleanup legacy unified caches
                if (key.startsWith('serenity-cache-')) {
                    return caches.delete(key);
                }
            })
        ))
    );
    return self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    
    // EXPLICITLY ignore socket.io requests to prevent polling loop collapse!
    if (event.request.url.includes('/socket.io/')) return;
    
    const url = new URL(event.request.url);
    const isMedia = ['/avatars', '/bgs', '/mobile_bgs', '/vids', '/assets'].some(path => url.pathname.startsWith(path));
    
    // NETWORK-FIRST for HTML pages so we always get the latest code pointers
    if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
        event.respondWith(
            fetch(event.request).then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(SHELL_CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
                }
                return networkResponse;
            }).catch(() => caches.match(event.request, { ignoreSearch: true }))
        );
        return;
    }

    // CACHE-FIRST for everything else
    // For media, ignore the query string so ?v=12 always hits the media bucket
    // For shell code (CSS, JS), DO NOT ignore search. style.css?v=12 must miss the v10 cache.
    const matchOptions = isMedia ? { ignoreSearch: true } : { ignoreSearch: false };

    event.respondWith(
        caches.match(event.request, matchOptions).then(async cachedResponse => {
            if (cachedResponse) {
                // Handle Range Requests for Videos (Safari/Chrome require 206 responses to allow seeking)
                if (event.request.headers.has('Range')) {
                    const rangeHeader = event.request.headers.get('Range');
                    const blob = await cachedResponse.blob();
                    const size = blob.size;
                    
                    const parts = rangeHeader.replace(/bytes=/, "").split("-");
                    const start = parseInt(parts[0], 10);
                    const end = parts[1] ? parseInt(parts[1], 10) : size - 1;
                    
                    // Slice the full cached blob to create the requested partial response.
                    const chunk = blob.slice(start, end + 1);
                    
                    const responseHeaders = new Headers(cachedResponse.headers);
                    responseHeaders.set('Content-Range', `bytes ${start}-${end}/${size}`);
                    responseHeaders.set('Content-Length', chunk.size.toString());
                    responseHeaders.set('Accept-Ranges', 'bytes');

                    return new Response(chunk, {
                        status: 206,
                        statusText: 'Partial Content',
                        headers: responseHeaders
                    });
                }
                return cachedResponse;
            }
            
            // Uncached request flow
            return fetch(event.request).then(networkResponse => {
                // Only dynamically cache standard 200 OK responses!
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const cacheName = isMedia ? MEDIA_CACHE_NAME : SHELL_CACHE_NAME;
                    const responseToCache = networkResponse.clone();
                    caches.open(cacheName).then(cache => cache.put(event.request, responseToCache));
                }
                return networkResponse;
            });
        })
    );
});

// Priority & Background Sync
self.addEventListener('message', event => {
    if (event.data.type === 'CACHE_PRIORITY') {
        const urls = event.data.urls;
        urls.forEach(async (url) => {
            const isMedia = url.includes('/vids/') || url.includes('/bgs/') || url.includes('/mobile_bgs/') || url.includes('/avatars/') || url.includes('desk.webp') || url.includes('notif.mp3');
            const cacheName = isMedia ? MEDIA_CACHE_NAME : SHELL_CACHE_NAME;
            
            caches.open(cacheName).then(async cache => {
                const exists = await cache.match(url, { ignoreSearch: true });
                if (!exists) {
                    try {
                        // cache.add fetches the full response without Range headers, securing a 200 response
                        await cache.add(url);
                    } catch (e) {
                        console.warn(`Priority fail: ${url}`, e);
                    }
                }
            });
        });
    }

    if (event.data.type === 'START_BACKGROUND_SYNC') {
        caches.open(MEDIA_CACHE_NAME).then(cache => {
            // Process sync sequentially to avoid flooding the network
            (async () => {
                for (const url of MEDIA_ASSETS) {
                    const exists = await cache.match(url, { ignoreSearch: true });
                    if (!exists) {
                        try {
                            await cache.add(url);
                            // Brief polite delay
                            await new Promise(r => setTimeout(r, 200));
                        } catch (e) {
                            console.warn(`Background fail: ${url}`);
                        }
                    }
                }
            })();
        });
    }
});

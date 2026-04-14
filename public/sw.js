const CACHE_NAME = 'serenity-cache-v1';

const BGS = ['forest.webp', 'hogwarts.webp', 'library.webp', 'stars.webp', 'tech.webp', 'valley.webp'];
const AVATARS = [
    'Quiet_topper.webp', 'calm_nerd.webp', 'confident_studier.webp', 'cozy_bookworm.webp',
    'energetic_bestie.webp', 'energetic_friend.webp', 'focus_mode.webp', 'gamer_guy.webp',
    'hoodie_pal.webp', 'minimal_clean_girl.webp', 'night_owl.webp', 'soft_aesthetic_girl.webp',
    'soft_smile.webp', 'sunshine.webp'
];

const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/room.html',
  '/style.css',
  '/landing.js',
  '/room.js',
  '/assets/logo.webp',
  '/assets/fav.webp',
  '/assets/desk.webp',
  '/assets/notif.mp3'
];

BGS.forEach(bg => {
    URLS_TO_CACHE.push(`/bgs/${bg}`);
    URLS_TO_CACHE.push(`/mobile_bgs/${bg}`);
});

AVATARS.forEach(av => URLS_TO_CACHE.push(`/avatars/${av}`));

for (let i = 1; i <= 14; i++) {
    URLS_TO_CACHE.push(`/vids/${i}.webm`);
    URLS_TO_CACHE.push(`/vids/${i}s.webm`);
}

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache assets individually so one failure doesn't stop the rest
      return Promise.all(
        URLS_TO_CACHE.map(url => {
          return cache.add(url).catch(err => {
             console.warn('[SW] Failed to cache', url, err);
          });
        })
      );
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  ).then(() => {
    return self.clients.claim();
  });
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response; // Return from cache
      }
      return fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const url = new URL(event.request.url);
            // Cache any new static media assets dynamically
            if (['/avatars', '/bgs', '/mobile_bgs', '/vids', '/assets'].some(path => url.pathname.startsWith(path))) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });
            }
        }
        return networkResponse;
      });
    })
  );
});

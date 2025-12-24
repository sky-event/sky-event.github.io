// 缓存版本号，用于更新缓存
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `sky-events-${CACHE_VERSION}`;

// 需要缓存的静态资源列表
const STATIC_CACHE_URLS = [
  './index.html',
  './hhs.html',
  './manifest.json',
  './icons/favicon.png',
  './icons/logo.png',
  './icons/logo-192.png',
  './icons/hs.png',
  './icons/gj.svg',
  './libs/font-awesome/css/font-awesome.min.css',
  'https://cdn.tailwindcss.com'
];

// 安装阶段：缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: 缓存静态资源');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活阶段：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // 删除旧版本缓存
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: 删除旧缓存', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 网络请求阶段：实现缓存优先策略
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 如果缓存中存在资源，返回缓存资源
        if (response) {
          return response;
        }

        // 否则从网络获取资源
        return fetch(event.request)
          .then((networkResponse) => {
            // 如果响应有效，将其缓存
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          })
          .catch(() => {
            // 如果网络请求失败，返回默认页面
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// 处理推送通知
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: './icons/logo-192.png',
    badge: './icons/favicon.png',
    data: {
      url: data.url || './index.html'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 处理通知点击
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
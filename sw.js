
const CACHE="scripture-pwa-v3-4-20260826-340";
const ASSETS=[
  "/",
  "/index.html",
  "/styles.css?v=20260826-340",
  "/app.js?v=20260826-340",
  "/scripture.js?v=20260826-340",
  "/manifest.webmanifest",
  "/icon.svg",
  "/journey-background.jpg?v=20260826-340",
  "/praying-child.png?v=20260826-340"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))),
      self.clients.claim()
    ])
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  // Always prefer the newest deployed files; use cache only as offline fallback.
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(r => r || caches.match("/index.html")))
  );
});

self.addEventListener("push", event => {
  let data={title:"성경필사 ✍️",body:"오늘의 필사 시간이 되었습니다.",url:"/"};
  try{data={...data,...event.data.json()}}catch{}
  event.waitUntil(self.registration.showNotification(data.title,{
    body:data.body,
    icon:"/icon.svg",
    badge:"/icon.svg",
    tag:"scripture-reminder",
    renotify:true,
    vibrate:[180,80,180],
    data:{url:data.url||"/"}
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/"));
});


const CACHE="scripture-pwa-v2-approved-ui";
const ASSETS=["/","/index.html","/styles.css","/app.js","/scripture.js","/manifest.webmanifest"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener("fetch",e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
self.addEventListener("push",e=>{
  let data={title:"필사루틴",body:"오늘의 필사 시간이 되었습니다."};
  try{data={...data,...e.data.json()}}catch{}
  e.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:"/icon.svg",badge:"/icon.svg",data:{url:"/"}}));
});
self.addEventListener("notificationclick",e=>{
  e.notification.close(); e.waitUntil(clients.openWindow(e.notification.data?.url||"/"));
});

self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(key=>key.startsWith('dce-command-v3')).map(key=>caches.delete(key))))
    .then(()=>self.registration.unregister())
    .then(()=>self.clients.matchAll({type:'window'}))
    .then(clients=>Promise.all(clients.map(client=>client.navigate(client.url))))
));

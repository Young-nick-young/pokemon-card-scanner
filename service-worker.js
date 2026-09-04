const CACHE_NAME = "tcg-scanner-v11";

const APP_FILES = [
  "/pokemon-card-scanner/",
  "/pokemon-card-scanner/index.html",
  "/pokemon-card-scanner/manifest.json"
];


self.addEventListener("install", event => {

  event.waitUntil(

    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(APP_FILES);
      })

  );

  self.skipWaiting();

});


self.addEventListener("activate", event => {

  event.waitUntil(

    caches.keys()
      .then(cacheNames => {

        return Promise.all(

          cacheNames.map(cacheName => {

            if(cacheName !== CACHE_NAME){
              return caches.delete(cacheName);
            }

          })

        );

      })

  );

  self.clients.claim();

});


self.addEventListener("fetch", event => {

  if(event.request.method !== "GET"){
    return;
  }


  event.respondWith(

    fetch(
      event.request,
      {
        cache: "no-store"
      }
    )
      .then(response => {

        return response;

      })
      .catch(() => {

        return caches.match(
          event.request
        );

      })

  );

});

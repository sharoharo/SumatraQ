// sw.js
const CACHE_NAME = 'sumatra-q-v1';

// Estos son los archivos que se guardarán para funcionar sin internet
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/styles.css',
    './js/app.js',
    './js/auth.js',
    './js/cargador.js',
    './js/db.js',
    './js/estado.js',
    './js/filtros.js',
    './js/fotos.js',
    './js/incidencias.js',
    './js/nube.js',
    './js/visor3d.js',
    './img/SumatraQ_logo.jpg'
];

// 1. INSTALACIÓN: Guardamos los archivos en la caché del móvil
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('📦 Guardián (SW): Descargando y guardando la web entera.');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. ACTIVACIÓN: Limpiamos cachés viejas si actualizamos la app
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys
                .filter(key => key !== CACHE_NAME)
                .map(key => caches.delete(key))
            );
        })
    );
});

// 3. EL INTERCEPTOR DE PETICIONES: Aquí está la magia
self.addEventListener('fetch', (event) => {
    // Si la petición es hacia Google Sheets, que siga su camino (nuestro nube.js se encarga de esto)
    if (event.request.url.includes('script.google.com')) return;

    // Para el resto (HTML, CSS, JS), miramos si lo tenemos en la caché
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Si está en la caché, se lo damos al instante. Si no, lo pedimos a internet.
            return cachedResponse || fetch(event.request);
        })
    );
});
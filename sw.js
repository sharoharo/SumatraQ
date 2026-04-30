// sw.js
// Subimos a v2 para forzar al navegador a borrar la caché antigua y usar esta
const CACHE_NAME = 'sumatra-q-v2';

// 📋 LISTA ACTUALIZADA: Todos los archivos necesarios para funcionar sin internet
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
    './js/ui.js',             // NUEVO
    './js/diccionarios.js',   // NUEVO
    './js/magiaVoz.js',       // NUEVO
    './js/exportador.js',     // NUEVO
    './img/SumatraQ_logo.jpg',
    './img/LogoEmpresa.png'   // NUEVO
];

// 1. INSTALACIÓN: Guardamos los archivos en la caché del móvil
self.addEventListener('install', (event) => {
    // Forzamos a que este SW asuma el control inmediatamente
    self.skipWaiting(); 
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('📦 Guardián (SW): Descargando y guardando la web entera v2.');
            // Tolerancia a fallos: si un archivo de la lista no existe, no rompemos toda la instalación
            return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                console.warn('⚠️ Guardián (SW): Algún archivo secundario no se pudo cachear.', err);
            });
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
    // Reclamamos el control de las pestañas abiertas
    return self.clients.claim(); 
});

// 3. EL INTERCEPTOR DE PETICIONES: Blindado y seguro
self.addEventListener('fetch', (event) => {
    // 🛡️ REGLA 1: Ignorar peticiones extrañas (como WebSockets de Live Server o extensiones de Chrome)
    if (!event.request.url.startsWith('http')) return;

    // 🛡️ REGLA 2: Ignorar peticiones a Google Sheets (nuestro nube.js gestiona si hay internet o no)
    if (event.request.url.includes('script.google.com')) return;

    // Para el resto de archivos, aplicamos la estrategia "Cache First, then Network"
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse; // Lo tenemos en caché, se lo damos al instante
            }

            // Si no está en caché, lo pedimos a internet de forma segura
            return fetch(event.request).catch((error) => {
                console.error('🔴 Error de red interceptado por el SW:', event.request.url);
                // Al fallar de forma controlada evitamos el "Uncaught TypeError" en la consola
            });
        })
    );
});
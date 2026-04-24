// js/db.js

const DB_NAME = 'SumatraQ_OfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'pending_issues';

let dbPromise = null;

// 1. INICIALIZAR LA BASE DE DATOS
export function initDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        // Pedimos al navegador que abra (o cree) la base de datos
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // Si es la primera vez que entramos, creamos el "almacén"
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                // Usaremos el 'id' de la incidencia como llave principal
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            console.log("📦 Caja Fuerte Offline (IndexedDB) inicializada y lista.");
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            console.error("❌ Error abriendo la Caja Fuerte:", event.target.error);
            reject(event.target.error);
        };
    });

    return dbPromise;
}

// 2. GUARDAR UNA INCIDENCIA OFFLINE
export async function saveOfflineIssue(issue) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        // Mete la incidencia entera (fotos incluidas) en el móvil
        const request = store.put(issue);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
}

// 3. LEER TODAS LAS INCIDENCIAS PENDIENTES
export async function getOfflineIssues() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

// 4. BORRAR UNA INCIDENCIA (Cuando ya se haya subido a la nube)
export async function deleteOfflineIssue(id) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const request = store.delete(id);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
}
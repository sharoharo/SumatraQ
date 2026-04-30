// js/diccionarios.js

export const Diccionarios = {
    fases: [], actividades: [], subfases: [], defectos: [],
    mapa4Niveles: {} 
};

// Nuestro "vigilante" de la memoria caché
let estaEnCache = false;

// Función interna para descargar los CSV
async function fetchCSV(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) return [];
        const text = await response.text();
        const rows = text.split('\n').filter(row => row.trim() !== '');
        const headers = rows[0].split(/[,;]/).map(h => h.trim().replace(/"/g, '').toLowerCase());
        
        return rows.slice(1).map(row => {
            const values = row.split(/[,;]/).map(v => v.trim().replace(/"/g, ''));
            let obj = {};
            headers.forEach((h, i) => obj[h] = values[i]);
            return obj;
        });
    } catch (e) { console.error(`Error en ${url}:`, e); return []; }
}

export async function initDiccionarios() {
    // 🛡️ SISTEMA DE CACHÉ (CERO LAG)
    // Si ya lo descargamos antes, devolvemos los datos instantáneamente
    if (estaEnCache) {
        console.log("⚡ Cargando diccionarios desde la memoria RAM (Instantáneo).");
        return Diccionarios;
    }

    // Si es la primera vez que abrimos la app, leemos los archivos
    console.log("🧠 Sincronizando Esquema de 4 Niveles...");

    const phases = await fetchCSV('./data/phases.csv');
    const contexts = await fetchCSV('./data/context.csv'); 
    const subphases = await fetchCSV('./data/subphases.csv');
    const defects = await fetchCSV('./data/Tipos_Incidencias.csv');
    const relations = await fetchCSV('./data/phase_defects.csv');

    Diccionarios.fases = phases;
    Diccionarios.actividades = contexts;
    Diccionarios.subfases = subphases;
    Diccionarios.defectos = defects;

    // CONSTRUCCIÓN DEL MAPA MAESTRO
    relations.forEach(rel => {
        const fId = rel.phase_id;
        const aId = rel.context_id;
        const sId = rel.subphase_id || "0"; 
        const dId = rel.defect_type_id;

        if (!Diccionarios.mapa4Niveles[fId]) Diccionarios.mapa4Niveles[fId] = {};
        if (!Diccionarios.mapa4Niveles[fId][aId]) Diccionarios.mapa4Niveles[fId][aId] = {};
        if (!Diccionarios.mapa4Niveles[fId][aId][sId]) Diccionarios.mapa4Niveles[fId][aId][sId] = [];

        const defObj = defects.find(d => d.id === dId);
        if (defObj) {
            Diccionarios.mapa4Niveles[fId][aId][sId].push({
                id: dId,
                nombre: defObj.name,
                critico: rel.is_critical === "True",
                notaTecnica: rel.notes
            });
        }
    });

    // Marcamos que ya están cargados para que no vuelva a leer los CSV nunca más
    estaEnCache = true; 
    
    return Diccionarios;
}

// Helpers para la cascada
export function getActividades(fId) { return Object.keys(Diccionarios.mapa4Niveles[fId] || {}); }
export function getSubfases(fId, aId) { return Object.keys(Diccionarios.mapa4Niveles[fId]?.[aId] || {}); }
export function getDefectos(fId, aId, sId) { return Diccionarios.mapa4Niveles[fId]?.[aId]?.[sId] || []; }
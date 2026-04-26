// js/nube.js
import { State, CONFIG } from './estado.js';
import { saveOfflineIssue, getOfflineIssues, deleteOfflineIssue } from './db.js';


export async function saveIssueToCloud(issueToUpload) {
  // 1. EL SEMÁFORO PREVIO: ¿Tenemos conexión a Internet?
  if (!navigator.onLine) {
      console.warn("🌐 Sin conexión detectada. Guardando incidencia en la Caja Fuerte local...");
      await saveOfflineIssue(issueToUpload);
      return { status: 'offline' }; 
  }

  // 2. INTENTO DE SUBIDA NORMAL
  try {
    await fetch(CONFIG.GOOGLE_SCRIPT_URL, { 
      method: "POST", 
      mode: "no-cors", 
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(issueToUpload) 
    });
    return { status: 'online' }; 
    
  } catch (error) {
    // 3. EL SALVAVIDAS: Si el fetch falla por un microcorte de red repentino
    console.warn("⚠️ Falló la conexión con la nube. Rescatando y guardando en local...");
    await saveOfflineIssue(issueToUpload);
    return { status: 'offline' };
  }
}

export function saveMovementToCloud(issueToMove) {
  fetch(CONFIG.GOOGLE_SCRIPT_URL, { 
    method: "POST", 
    mode: "no-cors", 
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(issueToMove) 
  }).catch(e => console.error("Error subiendo posición", e));
}

// js/nube.js
export function loadIssuesForFile(fileName) { 
  if (!State.db.incidenciasRegistradas) return;

  const filasPieza = State.db.incidenciasRegistradas.filter(row => row.PIEZA === fileName);
  const incidenciasMap = {};
  
  filasPieza.forEach(row => {
    const id = row.ID;
    if (!incidenciasMap[id]) incidenciasMap[id] = [];
    incidenciasMap[id].push(row);
  });

  Object.keys(incidenciasMap).forEach(id => {
    const historial = incidenciasMap[id].sort((a, b) => new Date(a.FECHA) - new Date(b.FECHA));
    const ultimaFila = historial[historial.length - 1]; 

    if (!State.issues.find(i => i.id === id)) {
      const nuevaIncidencia = {
        id: id,
        fileName: fileName,
        x: parseFloat(String(ultimaFila.COORD_X).replace(',', '.')),
        y: parseFloat(String(ultimaFila.COORD_Y).replace(',', '.')),
        z: parseFloat(String(ultimaFila.COORD_Z).replace(',', '.')),
        fase: ultimaFila.FASE,           // Nuevo: Nivel 1
        actividad: ultimaFila.ACTIVIDAD, // Nuevo: Nivel 2
        subfase: ultimaFila.SUBFASE,     // Nuevo: Nivel 3
        type: ultimaFila.TIPO,           // Nivel 4
        status: ultimaFila.ESTADO,
        priority: ultimaFila.PRIORIDAD || 'media',
        history: historial.map(h => ({
          date: h.FECHA,
          user: h.INSPECTOR || "Anónimo",
          status: h.ESTADO,
          priority: h.PRIORIDAD || 'media',
          fase: h.FASE,           // Guardamos niveles en el historial
          actividad: h.ACTIVIDAD,
          subfase: h.SUBFASE,
          comment: h.COMENTARIO || "",
          photos: [] // (Tu lógica de fotos actual se mantiene igual)
        }))
      };
      State.issues.push(nuevaIncidencia);
    }
  });
}

// ==========================================
// 🗑️ ELIMINAR INCIDENCIA DE LA NUBE
// ==========================================
export async function deleteIssueFromCloud(issueId) {
    // Verificamos que tengamos la URL de tu Google Script
    if (!CONFIG.GOOGLE_SCRIPT_URL) {
        console.warn("Modo Local: No hay URL de Google Script configurada para borrar.");
        return;
    }

    try {
        // Le decimos a Google Script: "Acción: borrar" y le pasamos el ID
        const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Bypass de seguridad CORS estándar
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'delete',
                id: issueId
            })
        });
        
        return response;
    } catch (error) {
        console.error("Fallo crítico en fetch de eliminación:", error);
        throw error;
    }
}

// ==========================================
// 🔄 MOTOR DE SINCRONIZACIÓN AUTOMÁTICA
// ==========================================
export async function syncOfflineIssues() {
    const pendingIssues = await getOfflineIssues();
    if (pendingIssues.length === 0) {
        if (window.updateCloudStatusUI) window.updateCloudStatusUI(); // Asegurar verde si está vacío
        return;
    }

    for (const issue of pendingIssues) {
        try {
            await fetch(CONFIG.GOOGLE_SCRIPT_URL, { 
                method: "POST", 
                mode: "no-cors", 
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(issue) 
            });
            
            await deleteOfflineIssue(issue.id);
            
            // 👇 ACTUALIZACIÓN EN TIEMPO REAL: Bajamos el contador tras cada éxito
            if (window.updateCloudStatusUI) window.updateCloudStatusUI();
            
        } catch (error) {
            console.error(`❌ Falló la sincronización de ${issue.id}`, error);
            break; 
        }
    }
    
    // Al final del todo, forzamos un último refresco
    if (window.updateCloudStatusUI) window.updateCloudStatusUI();
}
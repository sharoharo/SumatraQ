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
        type: ultimaFila.TIPO,
        status: ultimaFila.ESTADO,
        priority: ultimaFila.PRIORIDAD || 'media',
        fase: ultimaFila.FASE || 'estampacion',
        history: historial.map(h => {
          let fotosProcesadas = [];
          if (h.FOTOS_URL && typeof h.FOTOS_URL === 'string' && h.FOTOS_URL.trim() !== "") {
             fotosProcesadas = h.FOTOS_URL.split('|').map(url => {
               let cleanUrl = url.trim();
               const match = cleanUrl.match(/\/d\/(.+?)\//);
               if(match && match[1]) {
                 cleanUrl = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
               }
               return { dataUrl: cleanUrl };
             });
          }
          return {
            date: h.FECHA,
            user: h.INSPECTOR || "Anónimo",
            status: h.ESTADO,
            priority: h.PRIORIDAD || 'media',
            fase: h.FASE || 'estampacion',
            comment: h.COMENTARIO || "",
            photos: fotosProcesadas
          };
        })
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
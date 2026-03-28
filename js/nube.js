// js/nube.js
import { State, CONFIG } from './estado.js';

export async function saveIssueToCloud(issueToUpload) {
  try {
    await fetch(CONFIG.GOOGLE_SCRIPT_URL, { 
      method: "POST", 
      mode: "no-cors", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(issueToUpload) 
    });
    return true; // Éxito
  } catch (error) {
    throw error; // Propagamos el error para que incidencias.js lo atrape
  }
}

export function saveMovementToCloud(issueToMove) {
  fetch(CONFIG.GOOGLE_SCRIPT_URL, { 
    method: "POST", mode: "no-cors", 
    headers: { "Content-Type": "application/json" },
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
            comment: h.COMENTARIO || "",
            photos: fotosProcesadas
          };
        })
      };
      State.issues.push(nuevaIncidencia);
    }
  });
}
// incidencias.js
import * as THREE from 'three';
import { State, CONFIG } from './estado.js';

/* ==========================================
   1. LÓGICA DE RATÓN Y CLICKS (RAYCASTER)
   ========================================== */
function updateMouse(e) {
  const rect = State.renderer.domElement.getBoundingClientRect();
  const cX = e.touches ? e.touches[0].clientX : e.clientX; 
  const cY = e.touches ? e.touches[0].clientY : e.clientY;
  State.mouse.x = ((cX - rect.left) / rect.width) * 2 - 1; 
  State.mouse.y = -((cY - rect.top) / rect.height) * 2 + 1;
}

function getIntersection() {
  State.raycaster.setFromCamera(State.mouse, State.camera);
  return State.raycaster.intersectObjects(Object.values(State.loadedMeshes).filter(m => m.visible));
}

export function onPointerDown(e) { 
  State.isDragging = false; 
  updateMouse(e); 
  State.pressTimer = setTimeout(() => { 
    if(!State.isDragging && Object.keys(State.loadedMeshes).length) handleLongPress(); 
  }, 600); 
}
export function onPointerMove(e) { State.isDragging = true; clearTimeout(State.pressTimer); }
export function onPointerUp(e) { clearTimeout(State.pressTimer); }

function handleLongPress() {
  const hit = getIntersection();
  if(hit.length > 0) {
    if(navigator.vibrate) navigator.vibrate(50);
    State.currentPoint = hit[0].point;
    State.targetFileName = hit[0].object.userData.fileName;
    openNewIssueForm();
  }
}

export function onClick(event){
  if(State.isDragging) return;
  updateMouse(event); 
  State.raycaster.setFromCamera(State.mouse, State.camera);

  const markerObjs = [];
  State.scene.traverse(o => { if(o.userData && o.userData.marker) markerObjs.push(o); });
  const hitMarkers = State.raycaster.intersectObjects(markerObjs, true);
  
  if(hitMarkers.length > 0){ selectMarker(hitMarkers[0].object); return; }

  if(State.moveIssueMode && State.selectedMarker){
    const hit = getIntersection();
    if(hit.length > 0){ 
      const issueToMove = State.issues.find(i => i.id === State.selectedMarker.userData.issueId);
      issueToMove.x = hit[0].point.x;
      issueToMove.y = hit[0].point.y;
      issueToMove.z = hit[0].point.z;
      
      const oldFileName = issueToMove.fileName;
      issueToMove.fileName = hit[0].object.userData.fileName; 
      
      State.selectedMarker.position.copy(hit[0].point);
      saveToStorage(oldFileName); 
      saveToStorage(issueToMove.fileName);
      
      State.moveIssueMode = false; 
      document.getElementById('moveIssueBtn').classList.remove('active'); 
      renderIssues();
    }
    return;
  }

  if(State.mode){
    const hit = getIntersection();
    if(hit.length > 0) {
      State.currentPoint = hit[0].point; 
      State.targetFileName = hit[0].object.userData.fileName; 
      openNewIssueForm();
    }
  }
}

/* ==========================================
   2. FORMULARIOS E HISTORIAL
   ========================================== */
export function openNewIssueForm() {
  deselectMarker();
  document.getElementById('formMainTitle').innerText = "Nueva Incidencia";
  const targetLabel = document.getElementById('issueTargetFile');
  if(targetLabel) targetLabel.innerText = `En pieza: ${State.targetFileName}`;
  
  document.getElementById('saveIssue').innerText = "Crear Incidencia";
  
  const hContainer = document.getElementById('historyContainer');
  const updateDiv = document.getElementById('updateDivider');
  if(hContainer) hContainer.style.display = "none";
  if(updateDiv) updateDiv.style.display = "none";
  
  document.getElementById('issueComment').value = ""; 
  State.currentPhotos = []; 
  renderPhotoGrid();
  
  document.getElementById('form').style.display = "block"; 
  window.togglePanel(true);
  
  State.mode = false; 
  const addBtn = document.getElementById('addBtn');
  if(addBtn) addBtn.classList.remove('active');
}

export function selectMarker(marker){
  deselectMarker(); 
  State.selectedMarker = marker; 
  marker.scale.set(1.5, 1.5, 1.5);
  if(marker.material.emissive) marker.material.emissive.set(0x4285F4);

  const issue = State.issues.find(i => i.id === marker.userData.issueId);
  if(issue){
    document.getElementById('formMainTitle').innerText = "Detalle de Incidencia";
    const targetLabel = document.getElementById('issueTargetFile');
    if(targetLabel) targetLabel.innerText = `En pieza: ${issue.fileName}`;
    
    document.getElementById('saveIssue').innerText = "Añadir Actualización";
    const updateDiv = document.getElementById('updateDivider');
    if(updateDiv) updateDiv.style.display = "block";
    
    State.targetFileName = issue.fileName;
    document.getElementById('issueType').value = issue.type; 
    document.getElementById('issueStatus').value = issue.status;
    document.getElementById('issueComment').value = ""; 
    
    State.currentPhotos = []; 
    renderPhotoGrid();

    // --- RENDERIZAR HISTORIAL RESTAURADO ---
    const hContainer = document.getElementById('historyContainer');
    const hTimeline = document.getElementById('historyTimeline');
    if(hTimeline) hTimeline.innerHTML = "";

    // Si es una incidencia antigua sin historial, se lo creamos
    if(!issue.history || issue.history.length === 0) {
        issue.history = [{
           date: issue.createdAt || issue.date || new Date().toISOString(),
           user: issue.createdBy || issue.user || "Anónimo",
           status: issue.status,
           comment: issue.comment,
           photos: issue.photos || []
        }];
    }

    if(issue.history && issue.history.length > 0) {
       if(hContainer) hContainer.style.display = "block";
       
       issue.history.forEach(entry => {
          const dateObj = new Date(entry.date);
          const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          
          // Color dinámico según la BD o fallback
          const typeInDb = State.db.tiposIncidencias.find(t => t.Nombre_Falla === issue.type);
          const cHex = typeInDb && typeInDb.Color_Hex ? typeInDb.Color_Hex : '#' + getColor(entry.status).toString(16).padStart(6, '0');
          
          let photosHTML = "";
          if(entry.photos && entry.photos.length > 0) {
             photosHTML = `<div style="display:flex; gap:4px; margin-top:6px; flex-wrap:wrap;">` + 
                entry.photos.map(p => `<img src="${p.dataUrl}" style="width:36px; height:36px; object-fit:cover; border-radius:4px; cursor:pointer; border: 1px solid var(--border-color);" onclick="window.openLightbox('${p.dataUrl}')">`).join('') +
             `</div>`;
          }

          const d = document.createElement('div');
          d.className = "history-entry";
          d.innerHTML = `
             <div class="history-dot" style="background:${cHex};"></div>
             <div class="history-date">${dateStr} - 👤 ${entry.user}</div>
             <div class="history-comment">${entry.comment || '<i style="color:#aaa;">Sin comentario adicional</i>'}</div>
             ${photosHTML}
          `;
          if(hTimeline) hTimeline.appendChild(d);
       });
    }

    document.getElementById('form').style.display = "block"; 
    window.togglePanel(true);
  }
}

export function deselectMarker() { 
  if(State.selectedMarker) {
    State.selectedMarker.scale.set(1,1,1); 
    if(State.selectedMarker.material.emissive) State.selectedMarker.material.emissive.set(0x000000);
  }
  State.selectedMarker = null; 
  document.getElementById('form').style.display = "none"; 
}

export function deleteSelectedIssue(){
  if(!State.selectedMarker) return;
  const id = State.selectedMarker.userData.issueId;
  const fName = State.issues.find(i => i.id === id).fileName;
  
  State.issues = State.issues.filter(i => i.id !== id);
  saveToStorage(fName);
  
  State.scene.remove(State.selectedMarker); 
  if(State.selectedMarker.geometry) State.selectedMarker.geometry.dispose();
  if(State.selectedMarker.material) State.selectedMarker.material.dispose();
  
  deselectMarker(); 
  renderIssues();
}

/* ==========================================
   3. GUARDADO, CARGA Y NUBE
   ========================================== */
export async function saveIssueFn() {
  const nowIso = new Date().toISOString();
  let issueToUpload = null;

  if (State.selectedMarker) {
    const issue = State.issues.find(i => i.id === State.selectedMarker.userData.issueId);
    if (issue) {
      const newUpdate = {
        date: nowIso,
        user: State.userName || "Anónimo",
        status: document.getElementById('issueStatus').value,
        comment: document.getElementById('issueComment').value,
        photos: JSON.parse(JSON.stringify(State.currentPhotos))
      };
      if (!issue.history) issue.history = [];
      issue.history.push(newUpdate);
      issue.status = document.getElementById('issueStatus').value;
      issueToUpload = { ...issue, ...newUpdate }; 
    }
  } else {
    if (!State.currentPoint) return;
    const newIssue = { 
      id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(), 
      fileName: State.targetFileName, 
      x: State.currentPoint.x, y: State.currentPoint.y, z: State.currentPoint.z, 
      type: document.getElementById('issueType').value, 
      status: document.getElementById('issueStatus').value, 
      date: nowIso, 
      user: State.userName || "Anónimo", 
      comment: document.getElementById('issueComment').value, 
      photos: JSON.parse(JSON.stringify(State.currentPhotos)) 
    };
    newIssue.history = [{ ...newIssue }];
    State.issues.push(newIssue); 
    issueToUpload = newIssue;
  }

  // Guardar en LocalStorage para no perderlo al recargar
  saveToStorage(issueToUpload.fileName);
  renderIssues(); 
  deselectMarker(); 
  
  const btn = document.getElementById('saveIssue'); 
  const originalText = btn ? btn.innerText : "Guardar";
  if (btn) { btn.innerText = "⏳ Subiendo..."; btn.disabled = true; }
  
  try {
    fetch(CONFIG.GOOGLE_SCRIPT_URL, { 
      method: "POST", 
      mode: "no-cors", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(issueToUpload) 
    });
    setTimeout(() => { 
      alert("✅ Guardado local y enviado a la nube"); 
      if (btn) { btn.innerText = originalText; btn.disabled = false; }
    }, 600);
  } catch (error) { 
    alert("Guardado en local. Error en nube."); 
    if (btn) { btn.innerText = originalText; btn.disabled = false; }
  }
}

// RESTAURADO: Función para cargar incidencias previas
export function loadIssuesForFile(fileName) { 
  if (!State.db.incidenciasRegistradas) return;

  // 1. Filtramos solo las filas de Excel que pertenecen a la pieza actual
  const filasPieza = State.db.incidenciasRegistradas.filter(row => row.PIEZA === fileName);

  // 2. Agrupamos las filas por ID (porque una incidencia puede tener 5 actualizaciones)
  const incidenciasMap = {};
  filasPieza.forEach(row => {
    const id = row.ID;
    if (!incidenciasMap[id]) incidenciasMap[id] = [];
    incidenciasMap[id].push(row);
  });

  // 3. Reconstruimos las esferas y su historial
  Object.keys(incidenciasMap).forEach(id => {
    // Ordenamos las filas por fecha de más antigua a más nueva
    const historial = incidenciasMap[id].sort((a, b) => new Date(a.FECHA) - new Date(b.FECHA));
    // El estado actual de la esfera (color, posición) es el de su última actualización
    const ultimaFila = historial[historial.length - 1]; 

    if (!State.issues.find(i => i.id === id)) {
      const nuevaIncidencia = {
        id: id,
        fileName: fileName,
        // Convertimos las comas del Excel ("10,5") en puntos de coordenadas 3D (10.5)
        x: parseFloat(String(ultimaFila.COORD_X).replace(',', '.')),
        y: parseFloat(String(ultimaFila.COORD_Y).replace(',', '.')),
        z: parseFloat(String(ultimaFila.COORD_Z).replace(',', '.')),
        type: ultimaFila.TIPO,
        status: ultimaFila.ESTADO,
        
        // Reconstruimos la línea de tiempo
        history: historial.map(h => {
          let fotosProcesadas = [];
          if (h.FOTOS_URL && typeof h.FOTOS_URL === 'string' && h.FOTOS_URL.trim() !== "") {
             // Separamos las URLs por el símbolo "|"
             fotosProcesadas = h.FOTOS_URL.split('|').map(url => {
               let cleanUrl = url.trim();
               // Truco para que las fotos de Google Drive se vean como imágenes (<img>)
               const match = cleanUrl.match(/\/d\/(.+?)\//);
               if(match && match[1]) cleanUrl = `https://drive.google.com/uc?export=view&id=${match[1]}`;
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

function saveToStorage(fileName){
  try {
    const fileIssues = State.issues.filter(i => i.fileName === fileName);
    localStorage.setItem(`issues_${fileName}`, JSON.stringify(fileIssues));
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError') alert("⚠️ Almacenamiento local lleno por el peso de las fotos.");
    return false;
  }
}

/* ==========================================
   4. RENDERIZADO DE ESFERAS Y LISTA
   ========================================== */
export function renderIssues() {
  const toRemove = []; 
  State.scene.traverse(obj => { if(obj.userData && obj.userData.marker) toRemove.push(obj); });
  toRemove.forEach(obj => State.scene.remove(obj));

  State.issues.forEach(issue => {
    const mesh = State.loadedMeshes[issue.fileName]; 
    if(!mesh || !mesh.visible) return;
    
    const typeInDb = State.db.tiposIncidencias.find(t => t.Nombre_Falla === issue.type);
    const colorFinal = typeInDb && typeInDb.Color_Hex ? parseInt(typeInDb.Color_Hex.replace('#', '0x')) : getColor(issue.status);
    
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 16, 16), 
      new THREE.MeshPhongMaterial({ color: colorFinal, emissive: 0x000000, shininess: 100 })
    ); 
    sphere.position.set(issue.x, issue.y, issue.z); 
    sphere.userData = { marker: true, issueId: issue.id };
    State.scene.add(sphere);
  });
  
  renderIssueListUI();
}

function renderIssueListUI() {
  const list = document.getElementById('list');
  if(!list) return;
  list.innerHTML = "";
  
  State.issues.forEach(issue => {
    const card = document.createElement('div');
    card.className = 'issue-card';
    
    const fallbackHex = '#' + getColor(issue.status).toString(16).padStart(6, '0');
    const typeInDb = State.db.tiposIncidencias.find(t => t.Nombre_Falla === issue.type);
    const colorHex = typeInDb && typeInDb.Color_Hex ? typeInDb.Color_Hex : fallbackHex;

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <strong>${issue.type}</strong>
        <span style="width:10px; height:10px; border-radius:50%; background:${colorHex};"></span>
      </div>
      <div style="font-size:11px; color:#666; margin-top:4px;">${issue.comment || 'Sin comentario'}</div>
      <div style="font-size:10px; color:#999; margin-top:2px;">👤 ${issue.user || 'Anónimo'}</div>
    `;
    card.onclick = () => {
      State.scene.traverse(obj => {
        if(obj.userData && obj.userData.issueId === issue.id) selectMarker(obj);
      });
    };
    list.appendChild(card);
  });
}

function getColor(status) {
  switch(status) {
    case 'open': return 0xe94335; 
    case 'in_progress': return 0xfbbc04; 
    case 'closed': return 0x34a853; 
    default: return 0x4285f4; 
  }
}

/* ==========================================
   5. FOTOS Y EXPORTACIÓN
   ========================================== */
export function handlePhotoInput(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 1280; 
      let width = img.width, height = img.height;
      if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
      else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      State.currentPhotos.push({ dataUrl: canvas.toDataURL('image/jpeg', 0.8) });
      renderPhotoGrid();
    };
    img.src = ev.target.result;
  }; 
  reader.readAsDataURL(file); 
  e.target.value = ''; 
}

export function renderPhotoGrid() {
  const grid = document.getElementById('photoGrid'); 
  if(!grid) return;
  grid.innerHTML = '';
  State.currentPhotos.forEach((photo, index) => {
    const div = document.createElement('div'); div.className = 'photo-thumb-container';
    div.innerHTML = `
      <img src="${photo.dataUrl}" class="photo-thumb" onclick="window.openLightbox('${photo.dataUrl}')">
      <button class="delete-photo-btn" onclick="event.preventDefault(); State.currentPhotos.splice(${index}, 1); renderPhotoGrid();">✕</button>
    `;
    // Attach event programmatically to avoid scope issues in modules
    div.querySelector('.delete-photo-btn').onclick = (e) => {
      e.preventDefault();
      State.currentPhotos.splice(index, 1);
      renderPhotoGrid();
    };
    grid.appendChild(div);
  });
}

export function exportIssues(singleFileName = null) {
  if(Object.keys(State.loadedMeshes).length === 0) { alert("Carga piezas primero."); return; }
  const filesToExport = singleFileName ? [singleFileName] : Object.keys(State.loadedMeshes);
  const issuesToExport = singleFileName ? State.issues.filter(i => i.fileName === singleFileName) : State.issues;
  const payload = { schemaVersion: 3, exportedAt: new Date().toISOString(), filesIncluded: filesToExport, issues: issuesToExport };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = singleFileName ? `issues_${singleFileName}.json` : `issues_sesion_global.json`;
  a.click(); URL.revokeObjectURL(a.href);
}

export function exportToCSV() {
  if (State.issues.length === 0) { alert("No hay incidencias para exportar."); return; }
  const headers = ["ID_INCIDENCIA", "PIEZA", "COORD_X", "COORD_Y", "COORD_Z", "TIPO", "ESTADO", "FECHA", "USUARIO", "COMENTARIO"];
  const SEPARATOR = ";";
  let rows = [];

  State.issues.forEach(i => {
    if (i.history && i.history.length > 0) {
      i.history.forEach(entry => {
        rows.push([
          i.id, i.fileName,
          i.x ? i.x.toFixed(4).replace('.', ',') : "0,0000",
          i.y ? i.y.toFixed(4).replace('.', ',') : "0,0000",
          i.z ? i.z.toFixed(4).replace('.', ',') : "0,0000",
          i.type, entry.status, entry.date, entry.user || "Anónimo", entry.comment || ""
        ].map(val => `"${String(val).replace(new RegExp(SEPARATOR, 'g'), ' ').replace(/"/g, '""')}"`));
      });
    }
  });

  const csvContent = `sep=${SEPARATOR}\n` + headers.join(SEPARATOR) + "\n" + rows.map(r => r.join(SEPARATOR)).join("\n");
  const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Historial_Trazabilidad_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}
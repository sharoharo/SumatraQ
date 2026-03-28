// incidencias.js
import * as THREE from 'three';
import { State } from './estado.js';
import { animateCamera } from './visor3d.js';
import { saveIssueToCloud, saveMovementToCloud } from './nube.js';
import { renderPhotoGrid } from './fotos.js';

State.currentFilter = 'all';

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
      
      issueToMove.fileName = hit[0].object.userData.fileName; 
      State.selectedMarker.position.copy(hit[0].point);
      
      if (!issueToMove.history) issueToMove.history = [];
      const updateMove = {
        date: new Date().toISOString(),
        user: State.userName || "Sistema",
        status: issueToMove.status,
        comment: "📍 Ubicación del punto modificada en el modelo 3D.",
        photos: []
      };
      issueToMove.history.push(updateMove);

      State.moveIssueMode = false; 
      document.getElementById('moveIssueBtn').classList.remove('active'); 
      renderIssues();

      saveMovementToCloud(issueToMove); // ⬅️ LLAMADA A NUBE.JS
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
  
  const topG = document.getElementById('topGalleryContainer');
  if(topG) topG.innerHTML = '';

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
    
    let allPhotos = [];
    if(issue.history) {
      issue.history.forEach(h => { 
        if(h.photos) allPhotos = allPhotos.concat(h.photos); 
      });
    }
    
    let topGallery = document.getElementById('topGalleryContainer');
    if(!topGallery) { 
      topGallery = document.createElement('div'); 
      topGallery.id = 'topGalleryContainer'; 
      targetLabel.parentNode.insertBefore(topGallery, targetLabel.nextSibling); 
    }
    topGallery.innerHTML = '';

    if(allPhotos.length > 0) {
      let galleryHTML = `<div style="display: flex; overflow-x: auto; gap: 10px; padding: 10px 0; margin-bottom: 15px; border-bottom: 1px solid #eee;">`;
      allPhotos.forEach(p => {
        galleryHTML += `<img src="${p.dataUrl}" style="height: 140px; min-width: 180px; object-fit: cover; border-radius: 8px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" onclick="window.openLightbox('${p.dataUrl}')">`;
      });
      galleryHTML += `</div>`;
      topGallery.innerHTML = galleryHTML;
    }

    document.getElementById('saveIssue').innerText = "Añadir Actualización";
    const updateDiv = document.getElementById('updateDivider');
    if(updateDiv) updateDiv.style.display = "block";
    
    State.targetFileName = issue.fileName;
    document.getElementById('issueType').value = issue.type; 
    document.getElementById('issueStatus').value = issue.status;
    document.getElementById('issueComment').value = ""; 
    
    State.currentPhotos = []; 
    renderPhotoGrid();

    const hContainer = document.getElementById('historyContainer');
    const hTimeline = document.getElementById('historyTimeline');
    if(hTimeline) hTimeline.innerHTML = "";

    if(!issue.history || issue.history.length === 0) {
        issue.history = [{
           date: issue.createdAt || issue.date || new Date().toISOString(),
           user: issue.createdBy || issue.user || "Anónimo",
           status: issue.status,
           comment: issue.comment,
           photos: []
        }];
    }

    if(issue.history && issue.history.length > 0) {
       if(hContainer) hContainer.style.display = "block";
       
       issue.history.forEach(entry => {
          const dateObj = new Date(entry.date);
          const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          
          const typeInDb = State.db.tiposIncidencias.find(t => t.Nombre_Falla === issue.type);
          const cHex = typeInDb && typeInDb.Color_Hex ? typeInDb.Color_Hex : '#' + getColor(entry.status).toString(16).padStart(6, '0');

          const d = document.createElement('div');
          d.className = "history-entry";
          d.innerHTML = `
             <div class="history-dot" style="background:${cHex};"></div>
             <div class="history-date">${dateStr} - 👤 ${entry.user}</div>
             <div class="history-comment">${entry.comment || '<i style="color:#aaa;">Sin comentario adicional</i>'}</div>
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

  const seguro = confirm("⚠️ ¿Estás seguro de que deseas eliminar esta incidencia?\n\nEsta acción no se puede deshacer.");
  if (!seguro) return; 

  const id = State.selectedMarker.userData.issueId;
  State.issues = State.issues.filter(i => i.id !== id);
  
  State.scene.remove(State.selectedMarker); 
  if(State.selectedMarker.geometry) State.selectedMarker.geometry.dispose();
  if(State.selectedMarker.material) State.selectedMarker.material.dispose();
  
  deselectMarker(); 
  renderIssues();
}

/* ==========================================
   3. GUARDADO UI Y LLAMADA A NUBE
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

  renderIssues(); 
  deselectMarker(); 
  
  const btn = document.getElementById('saveIssue'); 
  const originalText = btn ? btn.innerText : "Guardar";
  
  try {
    if (btn) { btn.innerText = "⏳ Subiendo..."; btn.disabled = true; }
    
    await saveIssueToCloud(issueToUpload); // ⬅️ LLAMADA A NUBE.JS

    setTimeout(() => { 
      alert("✅ Enviado a la nube"); 
      if (btn) { btn.innerText = originalText; btn.disabled = false; }
    }, 600);
    
  } catch (error) {
    alert("❌ Error de conexión al guardar en la nube."); 
    if (btn) { btn.innerText = originalText; btn.disabled = false; }
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
    if (State.currentFilter !== 'all' && issue.status !== State.currentFilter) return;
    
    const mesh = State.loadedMeshes[issue.fileName]; 
    if(!mesh || !mesh.visible) return;
    
    const typeInDb = State.db.tiposIncidencias.find(t => t.Nombre_Falla === issue.type);
    const colorFinal = typeInDb && typeInDb.Color_Hex ? parseInt(typeInDb.Color_Hex.replace('#', '0x')) : getColor(issue.status);
    
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(3.0, 16, 16), 
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
    if (State.currentFilter !== 'all' && issue.status !== State.currentFilter) return;

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
        if(obj.userData && obj.userData.issueId === issue.id) {
          selectMarker(obj);
          const targetPos = obj.position.clone();
          const dir = State.camera.position.clone().sub(State.controls.target).normalize();
          const cameraPos = targetPos.clone().addScaledVector(dir, 80); 
          animateCamera(cameraPos, targetPos, 800);
        }
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

export function setFilter(status, buttonClicked) {
  State.currentFilter = status;
  
  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.classList.remove('active');
  });
  
  if (buttonClicked) {
    buttonClicked.classList.add('active');
  } else if (status === 'all') {
    const btnAll = document.querySelector('.filter-chip');
    if (btnAll) btnAll.classList.add('active');
  }
  
  renderIssues();
}

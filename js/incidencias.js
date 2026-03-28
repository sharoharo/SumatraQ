// js/incidencias.js
import * as THREE from 'three';
import { State, CONFIG } from './estado.js';
import { animateCamera } from './visor3d.js';
import { saveIssueToCloud } from './nube.js';
import { renderPhotoGrid } from './fotos.js';

// Inicialización de filtros avanzados
State.currentStatusFilter = 'all';
State.currentPriorityFilter = 'all';

// --- AYUDANTES PARA CHIPS TÁCTILES ---
export function getActiveChip(groupId) {
  const active = document.querySelector(`#${groupId} .ui-chip.active`);
  return active ? active.dataset.val : null;
}

export function setActiveChip(groupId, value) {
  document.querySelectorAll(`#${groupId} .ui-chip`).forEach(chip => {
    chip.classList.toggle('active', chip.dataset.val === value);
  });
}

export function setAdvancedFilter(type, value) {
  if (type === 'status') State.currentStatusFilter = value;
  if (type === 'priority') State.currentPriorityFilter = value;
  renderIssues();
}

export function getColor(status) {
  const colors = { 
    'open': 0xe94335,    // Rojo
    'review': 0xfbbc04,  // Amarillo
    'closed': 0x34a853   // Verde
  };
  return colors[status] || 0x4285f4; 
}

/* ==========================================
   1. LÓGICA DE RATÓN Y CLICKS
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
  document.getElementById('saveIssue').innerText = "Crear Incidencia";
  document.getElementById('issueComment').value = ""; 
  
  const typeSelect = document.getElementById('issueType');
  if(typeSelect) typeSelect.selectedIndex = 0;
  
  State.currentPhotos = [];
  renderPhotoGrid();

  // Valores por defecto ágiles (Chips)
  setActiveChip('statusChips', 'open');
  setActiveChip('priorityChips', 'media');
  setActiveChip('faseChips', 'estampacion');
  
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
  const issue = State.issues.find(i => i.id === marker.userData.issueId);
  if(issue){
    document.getElementById('formMainTitle').innerText = "Detalle";
    document.getElementById('saveIssue').innerText = "Actualizar";
    document.getElementById('issueComment').value = ""; 
    
    const typeSelect = document.getElementById('issueType');
    if(typeSelect && issue.type) typeSelect.value = issue.type;
    
    State.currentPhotos = [];
    renderPhotoGrid();
    
    setActiveChip('statusChips', issue.status || 'open');
    setActiveChip('priorityChips', issue.priority || 'media');
    setActiveChip('faseChips', issue.fase || 'estampacion');

    document.getElementById('form').style.display = "block"; 
    window.togglePanel(true);
  }
}

export function deselectMarker() { 
  if(State.selectedMarker) State.selectedMarker.scale.set(1,1,1);
  State.selectedMarker = null; 
  document.getElementById('form').style.display = "none"; 
}

export function deleteSelectedIssue() {
  if(!State.selectedMarker) return;
  const seguro = confirm("⚠️ ¿Estás seguro de que deseas eliminar esta incidencia?");
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
   3. GUARDADO Y RENDERIZADO (FILTRO CRUZADO)
   ========================================== */
export async function saveIssueFn() {
  const btn = document.getElementById('saveIssue');
  const originalText = btn?.innerText;
  
  // Captura ágil desde los Chips
  const currentStatus = getActiveChip('statusChips');
  const currentPriority = getActiveChip('priorityChips');
  const currentFase = getActiveChip('faseChips');
  const currentComment = document.getElementById('issueComment').value;
  const currentType = document.getElementById('issueType').value;

  let issueUpdateData = {
    status: currentStatus,
    priority: currentPriority,
    fase: currentFase,
    comment: currentComment,
    date: new Date().toISOString(),
    user: State.userName || "Anónimo",
    photos: JSON.parse(JSON.stringify(State.currentPhotos))
  };

  let issueToUpload = null;

  if (State.selectedMarker) {
    const issue = State.issues.find(i => i.id === State.selectedMarker.userData.issueId);
    
    issue.status = currentStatus;
    issue.priority = currentPriority;
    issue.fase = currentFase;
    issue.comment = currentComment;
    if(currentType) issue.type = currentType;
    
    if (!issue.history) issue.history = [];
    issue.history.push({ ...issueUpdateData });
    
    issueToUpload = issue;
  } else {
    // ID seguro que no falla en ningún navegador
    const safeId = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    
    const newIssue = {
      id: safeId,
      fileName: State.targetFileName,
      x: State.currentPoint.x, y: State.currentPoint.y, z: State.currentPoint.z,
      type: currentType,
      ...issueUpdateData,
      history: [{ ...issueUpdateData }]
    };
    State.issues.push(newIssue);
    issueToUpload = newIssue;
  }

// --- MAGIA UX: Resetear filtros a "Todos" para que la nueva esfera sea visible ---
 // State.currentStatusFilter = 'all';
 // State.currentPriorityFilter = 'all';

// Limpiar visualmente los botones de la barra superior
//  document.querySelectorAll('.filter-scroll-area .filter-chip').forEach(c => c.classList.remove('active'));
//  const btnStatusAll = document.querySelector('.filter-chip[data-filter-type="status"][data-val="all"]');
//  const btnPrioAll = document.querySelector('.filter-chip[data-filter-type="priority"][data-val="all"]');
// if (btnStatusAll) btnStatusAll.classList.add('active');
//  if (btnPrioAll) btnPrioAll.classList.add('active');
 // ---------------------------------------------------------------------------------


  renderIssues(); 
  deselectMarker(); 

  try {
    if (btn) { btn.innerText = "⏳ Subiendo..."; btn.disabled = true; }
    await saveIssueToCloud(issueToUpload);
    alert("✅ Guardado correctamente");
  } catch (error) {
    console.error("Fallo al guardar en la nube:", error);
    alert("❌ Error de conexión al guardar."); 
  } finally {
    if (btn) { btn.innerText = originalText; btn.disabled = false; }
  }
}

export function renderIssues() {
  const toRemove = []; 
  State.scene.traverse(obj => { if(obj.userData && obj.userData.marker) toRemove.push(obj); });
  toRemove.forEach(obj => State.scene.remove(obj));

  State.issues.forEach(issue => {
    // FILTRO CRUZADO: Estado + Prioridad
    if (State.currentStatusFilter !== 'all' && issue.status !== State.currentStatusFilter) return;
    if (State.currentPriorityFilter !== 'all' && issue.priority !== State.currentPriorityFilter) return;
    
    const color = getColor(issue.status);
    
    // Jerarquía Visual: Prio 1 es más grande
    const size = (issue.priority === 'prio1') ? 5.0 : 3.0;

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(size, 16, 16), 
      new THREE.MeshPhongMaterial({ color: color })
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
    if (State.currentStatusFilter !== 'all' && issue.status !== State.currentStatusFilter) return;
    if (State.currentPriorityFilter !== 'all' && issue.priority !== State.currentPriorityFilter) return;

    const card = document.createElement('div');
    card.className = 'issue-card';
    card.style.cssText = "padding:10px; border:1px solid #ddd; border-radius:8px; margin-bottom:8px; cursor:pointer; background:#fff;";
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <strong>${issue.type || 'Incidencia'}</strong>
        ${issue.priority === 'prio1' ? '<span style="color:red; font-weight:bold;">🔥 TOP 1</span>' : ''}
      </div>
      <div style="font-size:11px; color:#666; margin-top:4px;">${issue.fase || 'N/A'} | ${issue.status || 'open'}</div>
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
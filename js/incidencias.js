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

// 🏆 ACTUALIZADO: Conectamos la UI antigua con el nuevo Panel de Filtros 🏆
export function setAdvancedFilter(type, value) {
  if (type === 'status') State.currentStatusFilter = value;
  if (type === 'priority') State.currentPriorityFilter = value;
  
  // Actualizar visualmente los chips en el panel principal (por si acaso los usas)
  document.querySelectorAll(`.filter-chip[data-filter-type="${type}"]`).forEach(chip => {
      chip.classList.toggle('active', chip.dataset.val === value);
  });
  
  renderIssues();
}
// Lo colgamos en window para que el HTML (la voz) pueda llamarlo
window.setAdvancedFilter = setAdvancedFilter;

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

// ==========================================
// 📄 GENERACIÓN DE REPORTE PDF (ADAPTADO A FILTROS CRUZADOS)
// ==========================================
export const generatePDF = function() {
  window.generatePDF = generatePDF;

  // 1. Aplicamos el Doble Filtro a las incidencias que se van a imprimir
  const issuesToPrint = State.issues.filter(issue => {
    const passStatus = State.currentStatusFilter === 'all' || issue.status === State.currentStatusFilter;
    const passPriority = State.currentPriorityFilter === 'all' || issue.priority === State.currentPriorityFilter;
    return passStatus && passPriority;
  });

  if (issuesToPrint.length === 0) {
    alert("⚠️ No hay incidencias en este filtro para generar el reporte.");
    return;
  }

  const btn = document.querySelector('button[onclick="window.generatePDF()"]');
  const originalText = btn ? btn.innerHTML : '📄 Generar PDF';
  if (btn) btn.innerHTML = '⏳ Diseñando reporte...';

  const countOpen = issuesToPrint.filter(i => i.status === 'open').length;
  const countRev = issuesToPrint.filter(i => i.status === 'review').length;
  const countClosed = issuesToPrint.filter(i => i.status === 'closed').length;

  const fecha = new Date().toLocaleDateString('es-ES');
  
  // Nombres bonitos para el encabezado del PDF
  const nameStatus = { 'all': 'Todos', 'open': 'Abiertas', 'review': 'En Revisión', 'closed': 'Cerradas' }[State.currentStatusFilter];
  const namePrio = { 'all': 'Todas', 'prio1': 'Top 1', 'alta': 'Alta', 'media': 'Media' }[State.currentPriorityFilter];

  // --- CABECERA TABULAR CON LOGO ---
  let html = `
    <div style="padding: 20px; font-family: Arial, sans-serif; color: #333; background-color: #fff; width: 700px; margin: 0 auto;">
      
      <table style="width: 100%; border-spacing: 0; margin-bottom: 25px; border-bottom: 2px solid #ddd; padding-bottom: 15px;">
        <tr>
          <td style="vertical-align: middle;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <img src="./img/SumatraQ_logo.jpg" alt="Logo Sumatra Q" style="width: 45px; height: 45px; border-radius: 10px; object-fit: contain; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border: 1px solid rgba(0,0,0,0.1);">
              <div>
                <h1 style="color: #4285F4; margin: 0; font-size: 24px; font-weight: bold;">Reporte de Inspección</h1>
                <p style="margin: 2px 0 0 0; color: #666; font-size: 14px; font-weight: bold;">Sumatra Q - Control de Calidad</p>
              </div>
            </div>
          </td>
          <td style="vertical-align: bottom; text-align: right; width: 220px;">
            <p style="margin: 0; color: #666; font-size: 12px;"><strong>Generado:</strong> ${fecha}</p>
            <p style="margin: 4px 0 0 0; color: #666; font-size: 11px;"><strong>Estado:</strong> ${nameStatus} | <strong>Prio:</strong> ${namePrio}</p>
          </td>
        </tr>
      </table>

      <table style="width: 100%; border-spacing: 10px; margin-bottom: 25px;">
        <tr>
          <td style="border: 1px solid #ddd; border-radius: 8px; padding: 10px; text-align: center; background: #fafafa; width: 33%;">
            <div style="font-size: 24px; font-weight: bold; color: #e94335;">${countOpen}</div>
            <div style="font-size: 10px; color: #666; font-weight: bold;">ABIERTAS</div>
          </td>
          <td style="border: 1px solid #ddd; border-radius: 8px; padding: 10px; text-align: center; background: #fafafa; width: 33%;">
            <div style="font-size: 24px; font-weight: bold; color: #fbbc04;">${countRev}</div>
            <div style="font-size: 10px; color: #666; font-weight: bold;">EN REVISIÓN</div>
          </td>
          <td style="border: 1px solid #ddd; border-radius: 8px; padding: 10px; text-align: center; background: #fafafa; width: 33%;">
            <div style="font-size: 24px; font-weight: bold; color: #34a853;">${countClosed}</div>
            <div style="font-size: 10px; color: #666; font-weight: bold;">CERRADAS</div>
          </td>
        </tr>
      </table>
      
      <h3 style="border-bottom: 2px solid #4285F4; padding-bottom: 5px; margin-bottom: 15px; font-size: 18px;">Detalle de Incidencias (${issuesToPrint.length})</h3>
  `;

  issuesToPrint.forEach((issue, index) => {
    const estadoHTML = issue.status === 'open' ? '<span style="color:#e94335; font-weight:bold;">🔴 Abierto</span>' : 
                       (issue.status === 'review' ? '<span style="color:#fbbc04; font-weight:bold;">🟡 Revisión</span>' : '<span style="color:#34a853; font-weight:bold;">🟢 Cerrado</span>');
    
    const prioHTML = issue.priority === 'prio1' ? '<span style="color:#d93025; font-weight:bold; font-size: 12px; margin-left: 10px;">🔥 PRIO 1</span>' : '';

    html += `
      <div style="page-break-inside: avoid; border: 1px solid #eee; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <table style="width: 100%; margin-bottom: 10px;">
          <tr>
            <td style="text-align: left; vertical-align: middle;">
              <h4 style="margin: 0; font-size: 15px;">#${index + 1} - ${issue.type || 'Falla no especificada'} ${prioHTML}</h4>
            </td>
            <td style="text-align: right; vertical-align: middle; width: 100px; white-space: nowrap;">
              ${estadoHTML}
            </td>
          </tr>
        </table>
        
        <p style="margin: 0 0 5px 0; font-size: 13px;"><strong>Comentario:</strong> ${issue.comment || 'N/A'}</p>
        <p style="margin: 0 0 8px 0; font-size: 11px; color: #555;"><strong>Fase:</strong> ${issue.fase || 'N/A'} | <strong>Inspector inicial:</strong> 👤 ${issue.user || 'Desconocido'}</p>
        <p style="margin: 0 0 12px 0; font-size: 10px; color: #888; border-bottom: 1px solid #f5f5f5; padding-bottom: 5px;">
           Pieza: ${issue.fileName || '---'} | 📍 XYZ: ${(issue.x || 0).toFixed(1)}, ${(issue.y || 0).toFixed(1)}, ${(issue.z || 0).toFixed(1)}
        </p>
    `;

    if (issue.history && issue.history.length > 0) {
      html += `<div style="background: #f8f9fa; padding: 10px; border-left: 3px solid #4285F4; margin-bottom: 5px;">
                 <p style="margin: 0 0 5px 0; font-size: 11px; font-weight: bold; color: #333;">Trazabilidad de cambios:</p>
                 <ul style="margin: 0; padding-left: 15px; font-size: 11px; color: #555; list-style-type: none;">`;
      issue.history.forEach(h => {
        const hDate = new Date(h.date).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
        html += `<li style="margin-bottom: 3px;">• <strong>${hDate}</strong> - 👤 ${h.user || 'Anónimo'} - <em>${h.comment || 'Actualización'}</em></li>`;
      });
      html += `</ul></div>`;
    }

    html += `</div>`;
  });
  
  html += `</div>`;

  const opt = {
    margin:       10,
    filename:     `SumatraQ_${nameStatus}_${namePrio}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(html).save().then(() => {
    if (btn) btn.innerHTML = originalText;
  }).catch(err => {
    console.error("Error PDF:", err);
    if (btn) btn.innerHTML = originalText;
    alert("Error generando el PDF.");
  });
};
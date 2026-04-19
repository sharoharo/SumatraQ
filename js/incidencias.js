// js/incidencias.js
import * as THREE from 'three';
import { State, CONFIG } from './estado.js';
import { animateCamera } from './visor3d.js';
import { saveIssueToCloud } from './nube.js';
import { renderPhotoGrid } from './fotos.js';
import { passesFilters, populateFilterSelects } from './filtros.js';

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

export function getColor(status) {
  const colors = { 'open': 0xe94335, 'review': 0xfbbc04, 'closed': 0x34a853 };
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
   2. NAVEGACIÓN ENTRE MODALES: HISTORIAL Y EDICIÓN
   ========================================== */

// 🟢 Caso 1: Punto Nuevo -> Abre directo el Formulario
export function openNewIssueForm() {
  deselectMarker();
  document.getElementById('modalMainTitle').innerText = "Creación de incidencia";
  document.getElementById('saveIssue').innerText = "Guardar Incidencia nueva";
  document.getElementById('issueComment').value = ""; 
  
  const typeSelect = document.getElementById('issueType');
  if(typeSelect) typeSelect.selectedIndex = 0;
  
  State.currentPhotos = [];
  if (typeof renderPhotoGrid === 'function') renderPhotoGrid();

  setActiveChip('statusChips', 'open');
  setActiveChip('priorityChips', 'media');
  setActiveChip('faseChips', 'estampacion');

  // Aseguramos que historial está cerrado y abrimos formulario
  const historyModal = document.getElementById('historyModalOverlay');
  if (historyModal) historyModal.classList.remove('active');
  
  document.getElementById('issueModalOverlay').classList.add('active');

  if (window.asistenteVoz) window.asistenteVoz("Punto de inspección capturado. Por favor, clasifique la falla.");

  State.mode = false; 
  const addBtn = document.getElementById('addBtn');
  if(addBtn) addBtn.classList.remove('active');
}

// 🟢 Caso 2: Clic en Punto Existente -> Abre SOLO el Historial (Lectura)
export function selectMarker(marker){
  deselectMarker(); 
  State.selectedMarker = marker; 
  marker.scale.set(2, 2, 2); 
  
  const issue = State.issues.find(i => i.id === marker.userData.issueId);
  
  if(issue){
    const historyIssueId = document.getElementById('historyIssueId');
    const historyTimeline = document.getElementById('historyTimeline');

    if (historyIssueId) {
        historyIssueId.innerText = `# ID: ${issue.id} - ${issue.type || 'Sin tipo'}`;
    }

    if (historyTimeline) {
        historyTimeline.innerHTML = ''; 
        if (issue.history && issue.history.length > 0) {
            const reversedHistory = [...issue.history].reverse();
            reversedHistory.forEach(h => {
                const dateObj = new Date(h.date);
                const dateStr = isNaN(dateObj.getTime()) ? h.date : dateObj.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });

                let dotColor = '#4285F4'; 
                if(h.status === 'open') dotColor = '#e94335';
                if(h.status === 'review') dotColor = '#fbbc04';
                if(h.status === 'closed') dotColor = '#34a853';

                let photosHtml = '';
                if (h.photos && h.photos.length > 0) {
                    photosHtml = `<div style="display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap;">`;
                    h.photos.forEach(photo => {
                        photosHtml += `<img src="${photo.dataUrl}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" onclick="window.openLightbox('${photo.dataUrl}')" title="Ver imagen ampliada">`;
                    });
                    photosHtml += `</div>`;
                }

                const entryDiv = document.createElement('div');
                entryDiv.className = 'history-entry';
                entryDiv.innerHTML = `
                    <div class="history-dot" style="background-color: ${dotColor}; border-color: ${dotColor}"></div>
                    <div class="history-date">${dateStr} - 👤 ${h.user || 'Anónimo'}</div>
                    <div class="history-comment" style="font-weight: bold; font-size: 11px; text-transform: uppercase;">
                        Estado: ${h.status} | Fase: ${h.fase || 'N/A'}
                    </div>
                    ${h.comment ? `<div class="history-comment" style="color: #444; font-style: italic;">💬 "${h.comment}"</div>` : ''}
                    ${photosHtml} `;
                historyTimeline.appendChild(entryDiv);
            });
        } else {
            historyTimeline.innerHTML = '<p style="font-size: 12px; color: #888;">No hay historial registrado.</p>';
        }
    }

    // 🏆 ¡MAGIA UX! ABRIMOS SOLO EL MODAL DE HISTORIAL
    const issueModal = document.getElementById('issueModalOverlay');
    if (issueModal) issueModal.classList.remove('active');
    
    document.getElementById('historyModalOverlay').classList.add('active');
  }
}

// 🟢 Caso 3: Clic en botón "Actualizar" desde el historial
export function editExistingIssue() {
  if(!State.selectedMarker) return;
  const issue = State.issues.find(i => i.id === State.selectedMarker.userData.issueId);
  if(!issue) return;

  // 1. Ocultar Modal de Historial
  document.getElementById('historyModalOverlay').classList.remove('active');

  // 2. Rellenar Formulario con datos actuales
  document.getElementById('modalMainTitle').innerText = `Actualización de incidencia`;
  document.getElementById('saveIssue').innerText = "Actualizar y Guardar";
  document.getElementById('issueComment').value = ""; 
  
  const typeSelect = document.getElementById('issueType');
  if(typeSelect && issue.type) typeSelect.value = issue.type;
  
  State.currentPhotos = [];
  if (typeof renderPhotoGrid === 'function') renderPhotoGrid();
  
  setActiveChip('statusChips', issue.status || 'open');
  setActiveChip('priorityChips', issue.priority || 'media');
  setActiveChip('faseChips', issue.fase || 'estampacion');

  // 3. Mostrar Modal de Edición
  document.getElementById('issueModalOverlay').classList.add('active');
}
// Lo exponemos al window para el HTML
window.editExistingIssue = editExistingIssue;

// 🟢 Cierre general
export function deselectMarker() { 
  if(State.selectedMarker) State.selectedMarker.scale.set(1,1,1);
  State.selectedMarker = null; 
  const modalForm = document.getElementById('issueModalOverlay');
  const modalHistory = document.getElementById('historyModalOverlay');
  if (modalForm) modalForm.classList.remove('active');
  if (modalHistory) modalHistory.classList.remove('active');
}
window.deselectMarker = deselectMarker;

/* ==========================================
   3. GUARDADO, ELIMINACIÓN Y RENDERIZADO
   ========================================== */
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

export async function saveIssueFn() {
  const btn = document.getElementById('saveIssue');
  const originalText = btn?.innerText;
  
  const currentStatus = getActiveChip('statusChips');
  const currentPriority = getActiveChip('priorityChips');
  const currentFase = getActiveChip('faseChips');
  const currentComment = document.getElementById('issueComment').value;
  const currentType = document.getElementById('issueType').value;

  let issueUpdateData = {
    status: currentStatus, priority: currentPriority, fase: currentFase,
    comment: currentComment, date: new Date().toISOString(),
    user: State.userName || "Anónimo", photos: JSON.parse(JSON.stringify(State.currentPhotos))
  };

  let issueToUpload = null;

  if (State.selectedMarker && State.issues.find(i => i.id === State.selectedMarker.userData.issueId)) {
    const issue = State.issues.find(i => i.id === State.selectedMarker.userData.issueId);
    issue.status = currentStatus; issue.priority = currentPriority;
    issue.fase = currentFase; issue.comment = currentComment;
    if(currentType) issue.type = currentType;
    
    if (!issue.history) issue.history = [];
    issue.history.push({ ...issueUpdateData });
    issueToUpload = issue;
  } else {
    const safeId = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    const newIssue = {
      id: safeId, fileName: State.targetFileName,
      x: State.currentPoint.x, y: State.currentPoint.y, z: State.currentPoint.z,
      type: currentType, ...issueUpdateData, history: [{ ...issueUpdateData }]
    };
    State.issues.push(newIssue);
    issueToUpload = newIssue;
  }

  renderIssues(); 
  deselectMarker(); 

  try {
    if (btn) { btn.innerText = "⏳ Subiendo..."; btn.disabled = true; }
    await saveIssueToCloud(issueToUpload);
    if (window.asistenteVoz) window.asistenteVoz("Incidencia guardada correctamente.");
    alert("✅ Guardado correctamente");
  } catch (error) {
    if (window.asistenteVoz) window.asistenteVoz("Error al guardar en la nube.");
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
    // 🧠 El Juez Universal (filtros.js)
    if (!passesFilters(issue)) return;
    
    const color = getColor(issue.status);
    const size = (issue.priority === 'prio1') ? 5.0 : 3.0;

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(size, 30, 30), 
      new THREE.MeshPhongMaterial({ color: color })
    ); 
    sphere.position.set(issue.x, issue.y, issue.z); 
    sphere.userData = { marker: true, issueId: issue.id };
    State.scene.add(sphere);
  });
  renderIssueListUI();
}

window.renderIssues = renderIssues;

export function renderIssueListUI() {
  const list = document.getElementById('list');
  if(!list) return;
  list.innerHTML = "";
  
  if (typeof populateFilterSelects === 'function') populateFilterSelects();

  State.issues.forEach(issue => {
    // 🧠 El Juez Universal (filtros.js)
    if (!passesFilters(issue)) return;

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
// 📄 GENERACIÓN DE REPORTE PDF (ADAPTADO AL JUEZ)
// ==========================================
export const generatePDF = function() {
  window.generatePDF = generatePDF;

  // 1. Aplicamos el Doble Filtro a las incidencias que se van a imprimir
  const issuesToPrint = State.issues.filter(issue => passesFilters(issue));

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
  
  // Título dinámico para saber qué se está imprimiendo
  let filtroTexto = "Reporte Filtrado";
  if (State.filters.status === 'all' && State.filters.priority === 'all' && State.filters.user === 'all' && State.filters.type === 'all' && !State.filters.dateFrom && !State.filters.dateTo) {
      filtroTexto = "Reporte Global";
  }

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
            <p style="margin: 4px 0 0 0; color: #666; font-size: 11px;"><strong>Contexto:</strong> ${filtroTexto}</p>
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
    filename:     `SumatraQ_Reporte_Inspect.pdf`,
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

 deselectMarker();
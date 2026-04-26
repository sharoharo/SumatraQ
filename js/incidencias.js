// js/incidencias.js
import * as THREE from 'three';
import { State, CONFIG } from './estado.js';
import { animateCamera } from './visor3d.js';
import { saveIssueToCloud, deleteIssueFromCloud } from './nube.js';
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

// 🟢 Caso 1: Punto Nuevo -> Abre directo el Formulario "Panel Dios"
export function openNewIssueForm() {
  if (State.rapidPhotoMode) {
      const newIssueId = "RAF-" + Date.now().toString();
      State.rapidPhotoTargetId = newIssueId;
      const newIssue = {
          id: newIssueId, fileName: State.targetFileName || "pieza_actual",
          x: State.currentPoint ? State.currentPoint.x : 0,
          y: State.currentPoint ? State.currentPoint.y : 0,
          z: State.currentPoint ? State.currentPoint.z : 0,
          type: "Pendiente", priority: "Pendiente", status: "open",                     
          fase: State.rapidPhotoDefaults ? State.rapidPhotoDefaults.fase : "estampacion", 
          history: []
      };
      State.issues.push(newIssue);
      document.getElementById('inputCameraNivelDios')?.click(); // 👈 ¡Arreglado!
      return; 
  }

  deselectMarker(); 
  State.mode = false; 
  const addBtn = document.getElementById('addBtn');
  if(addBtn) addBtn.classList.remove('active');

  const tituloPanel = document.querySelector('.panel-header h3');
  if (tituloPanel) tituloPanel.innerText = `📋 Creación incidencia`;
  const btnGuardar = document.getElementById('saveIssue');
  if (btnGuardar) btnGuardar.innerText = "✓ Guardar Incidencia";
  
  State.currentPhotos = [];
  if (typeof renderPhotoGrid === 'function') renderPhotoGrid();
  const textoNotas = document.getElementById('textoIncidenciaNivelDios');
  if (textoNotas) textoNotas.value = ""; 

  const historyModal = document.getElementById('historyModalOverlay');
  if (historyModal) historyModal.classList.remove('active');
  
  import('./diccionarios.js').then(module => {
      const dict = module.Diccionarios;
      const contenedorFases = document.getElementById('chipsFases');
      if (contenedorFases) contenedorFases.innerHTML = '';
      
      dict.fases.forEach(fase => {
          const btn = crearChip(fase.phase_name || fase.nombre || fase.name, () => {
              activarChip('.chip-fase', btn);
              actualizarActividades(fase.id, module);
          }, 'chip-fase');
          if (contenedorFases) contenedorFases.appendChild(btn);
      });

      if(contenedorFases && contenedorFases.firstChild) contenedorFases.firstChild.click();
      
      document.querySelectorAll('.chip-prio').forEach(c => c.classList.remove('seleccionado'));
      const prioDefecto = document.querySelector('.chip-prio[data-val="media"]');
      if (prioDefecto) prioDefecto.classList.add('seleccionado');

      document.querySelectorAll('.chip-estado').forEach(c => c.classList.remove('seleccionado'));
      const estadoDefecto = document.querySelector('.chip-estado[data-val="open"]');
      if (estadoDefecto) estadoDefecto.classList.add('seleccionado');
  });

  const panel = document.getElementById('panelIncidencias');
  if (panel) panel.classList.remove('oculta');

  if (window.asistenteVoz) window.asistenteVoz("Punto de inspección capturado. Por favor, clasifique la falla.");
} 

// --- HELPERS DE LA CASCADA ---
function actualizarActividades(fId, module) {
    const contenedor = document.getElementById('chipsActividades');
    if (!contenedor) return;
    contenedor.innerHTML = '';
    const ids = module.getActividades(fId);

    if (ids.length === 0) {
        contenedor.innerHTML = '<span class="placeholder-text">Sin actividades.</span>';
        actualizarSubfases(fId, null, module);
        return;
    }

    ids.forEach(aId => {
        const data = module.Diccionarios.actividades.find(a => a.id == aId);
        // 🛡️ Buscamos la propiedad se llame como se llame en tu CSV
        const nombre = data ? (data.context_name || data.Nombre || data.nombre || data.Name || data.name) : "Actividad " + aId;
        const btn = crearChip(nombre, () => {
            activarChip('.chip-actividad', btn);
            actualizarSubfases(fId, aId, module);
        }, 'chip-actividad');
        contenedor.appendChild(btn);
    });
    if(contenedor.firstChild) contenedor.firstChild.click();
}

function actualizarSubfases(fId, aId, module) {
    const contenedor = document.getElementById('chipsSubfases');
    if (!contenedor) return;
    contenedor.innerHTML = '';
    const ids = module.getSubfases(fId, aId);

    if (ids.length === 0) {
        contenedor.innerHTML = '<span class="placeholder-text">Sin subfases.</span>';
        actualizarDefectos(fId, aId, null, module);
        return;
    }

    ids.forEach(sId => {
        const isZero = (sId === "0" || sId == 0);
        let nombre = "General / Proceso";
        if (!isZero) {
            const data = module.Diccionarios.subfases.find(s => s.id == sId);
            // 🛡️ Protección contra mayúsculas del CSV
            if (data) nombre = data.subphase_name || data.Nombre || data.nombre || data.Name || data.name;
        }
        
        const btn = crearChip(nombre, () => {
            activarChip('.chip-subfase', btn);
            actualizarDefectos(fId, aId, sId, module);
        }, 'chip-subfase');
        contenedor.appendChild(btn);
    });
    if(contenedor.firstChild) contenedor.firstChild.click();
}

function actualizarDefectos(fId, aId, sId, module) {
    const contenedor = document.getElementById('chipsDefectos');
    if (!contenedor) return;
    contenedor.innerHTML = '';
    const lista = module.getDefectos(fId, aId, sId);

    if (lista.length === 0) {
        contenedor.innerHTML = '<span class="placeholder-text">No hay defectos.</span>';
        return;
    }

    lista.forEach(def => {
        // 🛡️ Protección en los defectos
        const nombreDefecto = def.Nombre_Falla || def.Nombre || def.nombre || def.Name || def.name || def.id;
        const btn = crearChip(nombreDefecto, () => activarChip('.chip-defecto', btn), 'chip-defecto');
        contenedor.appendChild(btn);
    });
}

function crearChip(texto, accion, clase) {
    const btn = document.createElement('button');
    btn.className = `chip ${clase}`;
    btn.innerText = texto;
    btn.onclick = (e) => { e.preventDefault(); accion(); };
    return btn;
}

function activarChip(selector, target) {
    document.querySelectorAll(selector).forEach(c => c.classList.remove('seleccionado'));
    target.classList.add('seleccionado');
}

export function selectMarker(marker){
  if (State.rapidPhotoMode) {
      State.rapidPhotoTargetId = marker.userData.issueId;
      document.getElementById('inputCameraNivelDios')?.click(); // 👈 ¡Arreglado!
      return; 
  }

  deselectMarker(); 
  State.selectedMarker = marker; 
  marker.scale.set(5, 5, 5);
  
  const issue = State.issues.find(i => i.id === marker.userData.issueId);
  
  if(issue){
    const historyIssueId = document.getElementById('historyIssueId');
    const historyTimeline = document.getElementById('historyTimeline');
    const historyScreenshot = document.getElementById('historyScreenshot');

    if(historyScreenshot && State.renderer) {
        State.renderer.render(State.scene, State.camera); 
        historyScreenshot.src = State.renderer.domElement.toDataURL('image/jpeg', 0.8);
    }

    if (historyIssueId) {
        historyIssueId.innerText = `# ID: ${issue.id} - ${issue.type || 'Sin tipo'}`;
    }

    if (historyTimeline) {
        historyTimeline.innerHTML = ''; 
        if (issue.history && issue.history.length > 0) {
            const reversedHistory = [...issue.history].reverse();
            
            reversedHistory.forEach((h, reversedIndex) => {
                const originalIndex = issue.history.length - 1 - reversedIndex;
                const dateObj = new Date(h.date);
                const dateStr = isNaN(dateObj.getTime()) ? h.date : dateObj.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });

                let dotColor = '#4285F4'; 
                if(h.status === 'open') dotColor = '#e94335';
                if(h.status === 'review') dotColor = '#fbbc04';
                if(h.status === 'closed') dotColor = '#34a853';

                let photosHtml = '';
                if (h.photos && h.photos.length > 0) {
                    photosHtml = `<div style="display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap;">`;
                    h.photos.forEach(photo => {
                        photosHtml += `<img src="${photo.dataUrl}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" onclick="window.openLightbox('${photo.dataUrl}')" title="Ver imagen ampliada">`;
                    });
                    photosHtml += `</div>`;
                }

                const entryDiv = document.createElement('div');
                entryDiv.className = 'history-entry';
                entryDiv.style.marginBottom = '30px'; 
                entryDiv.style.position = 'relative'; 

                const usuarioActual = (State.userName || "").trim().toLowerCase();
                const autorComentario = (h.user || "").trim().toLowerCase();

                const tieneNombreAdmin = usuarioActual.includes("admin");
                let listaAdmins = ["admin", "sharoharo", "sergio haro"]; 

                if (State.usuarios && Array.isArray(State.usuarios)) {
                    State.usuarios.forEach(u => {
                        if (u.Rol && u.Rol.trim().toLowerCase() === 'admin' && u.Nombre) {
                            listaAdmins.push(u.Nombre.trim().toLowerCase());
                        }
                    });
                }

                const esAdmin = tieneNombreAdmin || listaAdmins.includes(usuarioActual);
                const esDueño = usuarioActual === autorComentario && usuarioActual !== "anónimo";
                const puedeBorrar = esAdmin || esDueño;

                const trashBtnHTML = puedeBorrar ? 
                    `<button onclick="window.deleteHistoryEntry('${issue.id}', ${originalIndex}, '${h.date}')" 
                            style="position: absolute; right: 0; top: 0; background: none; border: none; font-size: 18px; cursor: pointer; color: #d93025; padding: 5px;" 
                            title="Borrar esta actualización">🗑️</button>` : '';

                entryDiv.innerHTML = `
                    ${trashBtnHTML}
                    <div class="history-dot" style="background-color: ${dotColor}; border-color: ${dotColor}; width: 14px; height: 14px; left: -24px; top: 2px;"></div>
                    <div class="history-date" style="font-size: 13px; padding-right: 30px;">${dateStr} - 👤 ${h.user || 'Anónimo'}</div>
                    <div class="history-comment" style="font-weight: bold; font-size: 14px; text-transform: uppercase; margin-top: 6px;">
                        Estado: ${h.status} | Fase: ${h.fase || 'N/A'}
                    </div>
                    ${h.comment ? `<div class="history-comment" style="color: #444; font-style: italic; background: #f4f7f6; padding: 12px; border-radius: 8px; margin-top: 8px; font-size: 14px;">💬 "${h.comment}"</div>` : ''}
                    ${photosHtml} `;

                historyTimeline.appendChild(entryDiv);
            });
        } else {
            historyTimeline.innerHTML = '<p style="font-size: 14px; color: #888;">No hay historial registrado.</p>';
        }
    }

    const issueModal = document.getElementById('issueModalOverlay');
    if (issueModal) issueModal.classList.remove('active');
    
    const historyModal = document.getElementById('historyModalOverlay');
    if (historyModal) historyModal.classList.add('active');
  }
}

// 🟢 Caso 3: Clic en botón "Actualizar" desde el historial
export function editExistingIssue() {
  if(!State.selectedMarker) return;
  const issue = State.issues.find(i => i.id === State.selectedMarker.userData.issueId);
  if(!issue) return;

  const historyModal = document.getElementById('historyModalOverlay');
  if (historyModal) historyModal.classList.remove('active');

  const tituloPanel = document.querySelector('.panel-header h3');
  if (tituloPanel) tituloPanel.innerText = `🔄 Actualizar incidencia`;
  
  const btnGuardar = document.getElementById('saveIssue');
  if (btnGuardar) btnGuardar.innerText = "✓ Guardar Cambios";
  
  const textoNotas = document.getElementById('textoIncidenciaNivelDios');
  if (textoNotas) textoNotas.value = issue.comment || ""; 
  
  State.currentPhotos = [];
  if (typeof renderPhotoGrid === 'function') renderPhotoGrid();

  document.querySelectorAll('.chip-estado').forEach(c => c.classList.remove('seleccionado'));
  const estadoChip = document.querySelector(`.chip-estado[data-val="${issue.status || 'open'}"]`);
  if (estadoChip) estadoChip.classList.add('seleccionado');

  document.querySelectorAll('.chip-prio').forEach(c => c.classList.remove('seleccionado'));
  const prioChip = document.querySelector(`.chip-prio[data-val="${issue.priority || 'media'}"]`);
  if (prioChip) prioChip.classList.add('seleccionado');

  // 🛠️ LA MAGIA: Obligamos a cargar y pintar los diccionarios ANTES de buscar la fase
  import('./diccionarios.js').then(module => {
      const dict = module.Diccionarios;
      const contenedorFases = document.getElementById('chipsFases');
      if (contenedorFases) contenedorFases.innerHTML = '';

      // 1. Pintamos las Fases en la pantalla
      dict.fases.forEach(fase => {
          const btn = crearChip(fase.phase_name || fase.nombre || fase.name, () => {
              activarChip('.chip-fase', btn);
              actualizarActividades(fase.id, module);
          }, 'chip-fase');
          if (contenedorFases) contenedorFases.appendChild(btn);
      });

      // 2. Buscamos qué Fase tenía la incidencia vieja para hacer "clic" virtual
      const faseChips = Array.from(document.querySelectorAll('.chip-fase'));
      const faseChipMatcheada = faseChips.find(c => c.innerText.trim().toLowerCase() === (issue.fase || '').trim().toLowerCase());
      
      if (faseChipMatcheada) {
          faseChipMatcheada.click(); 
          
          // Desplegamos Actividades (dando 50ms para que se pinten)
          setTimeout(() => {
              const actChips = Array.from(document.querySelectorAll('.chip-actividad'));
              const actChipMatcheada = actChips.find(c => c.innerText.trim().toLowerCase() === (issue.actividad || '').trim().toLowerCase());
              if(actChipMatcheada) actChipMatcheada.click();
              
              // Desplegamos Subfases
              setTimeout(() => {
                  const subfaseChips = Array.from(document.querySelectorAll('.chip-subfase'));
                  const subfaseChipMatcheada = subfaseChips.find(c => c.innerText.trim().toLowerCase() === (issue.subfase || '').trim().toLowerCase());
                  if (subfaseChipMatcheada) subfaseChipMatcheada.click(); 
                  
                  // Marcamos el Defecto
                  setTimeout(() => {
                      const defectoChips = Array.from(document.querySelectorAll('.chip-defecto'));
                      const defectoChipMatcheado = defectoChips.find(c => c.innerText.trim().toLowerCase() === (issue.type || '').trim().toLowerCase());
                      
                      if (defectoChipMatcheado) {
                          document.querySelectorAll('.chip-defecto').forEach(c => c.classList.remove('seleccionado'));
                          defectoChipMatcheado.classList.add('seleccionado');
                      }
                  }, 50);
              }, 50);
          }, 50);
      } else {
          // Si por lo que sea no cuadra la fase antigua, pintamos la primera por defecto
          if(contenedorFases && contenedorFases.firstChild) contenedorFases.firstChild.click();
      }
  });

  const panelDios = document.getElementById('panelIncidencias');
  if (panelDios) panelDios.classList.remove('oculta');
}
window.editExistingIssue = editExistingIssue;

// 🟢 Cierre general y limpieza de interfaz
export function deselectMarker() { 
  if(State.selectedMarker) {
      State.selectedMarker.scale.set(1, 1, 1);
  }
  State.selectedMarker = null; 
  
  document.getElementById('issueModalOverlay')?.classList.remove('active');
  document.getElementById('historyModalOverlay')?.classList.remove('active');

  const panelDios = document.getElementById('panelIncidencias');
  if (panelDios) panelDios.classList.add('oculta');

  const addBtn = document.getElementById('addBtn');
  if (addBtn) addBtn.classList.remove('active');
  State.mode = false;
}
window.deselectMarker = deselectMarker;

// ==========================================
// 📸 LIGHTBOX UNIVERSAL
// ==========================================
window.openLightbox = function(imageSrc) {
    const existing = document.getElementById('sumatraLightbox');
    if (existing) existing.remove();

    const lightbox = document.createElement('div');
    lightbox.id = 'sumatraLightbox';
    lightbox.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; 
        background: rgba(0,0,0,0.85); z-index: 999999; display: flex; 
        justify-content: center; align-items: center; cursor: zoom-out; 
        backdrop-filter: blur(5px); opacity: 0; transition: opacity 0.2s ease;
    `;
    
    const img = document.createElement('img');
    img.src = imageSrc;
    img.style.cssText = `
        max-width: 90vw; max-height: 90vh; border-radius: 8px; 
        box-shadow: 0 10px 40px rgba(0,0,0,0.5); object-fit: contain; 
        transform: scale(0.9); transition: transform 0.2s ease;
    `;
    
    const closeBtn = document.createElement('div');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
        position: absolute; top: 25px; right: 35px; color: white; 
        font-size: 35px; cursor: pointer; font-family: sans-serif; 
        opacity: 0.8; transition: opacity 0.2s;
    `;
    closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
    closeBtn.onmouseout = () => closeBtn.style.opacity = '0.8';

    lightbox.appendChild(img);
    lightbox.appendChild(closeBtn);
    document.body.appendChild(lightbox);

    requestAnimationFrame(() => {
        lightbox.style.opacity = '1';
        img.style.transform = 'scale(1)';
    });

    lightbox.onclick = () => {
        lightbox.style.opacity = '0';
        img.style.transform = 'scale(0.9)';
        setTimeout(() => lightbox.remove(), 200);
    };
};

/* ==========================================
   3. GUARDADO, ELIMINACIÓN Y RENDERIZADO
   ========================================== */
export async function deleteSelectedIssue() {
  if(!State.selectedMarker) return;
  const seguro = confirm("⚠️ ¿Estás seguro de que deseas eliminar esta incidencia de forma permanente?");
  if (!seguro) return; 

  const id = State.selectedMarker.userData.issueId;
  const markerToRemove = State.selectedMarker;
  
  State.issues = State.issues.filter(i => i.id !== id);
  State.scene.remove(markerToRemove); 
  if(markerToRemove.geometry) markerToRemove.geometry.dispose();
  if(markerToRemove.material) markerToRemove.material.dispose();
  
  deselectMarker(); 
  renderIssues();

  try {
    if (window.asistenteVoz) window.asistenteVoz("Eliminando incidencia de la base de datos...");
    await deleteIssueFromCloud(id);
    if (window.asistenteVoz) window.asistenteVoz("Incidencia eliminada definitivamente.");
  } catch (error) {
    console.error("Error al borrar en la nube:", error);
    alert("⚠️ Se borró de la pantalla, pero hubo un error de conexión al intentar borrarla de Google Sheets.");
  }
}

// 🌐 LA FUNCIÓN REPARADA PARA EL MODO OFFLINE Y LOS 4 NIVELES
export async function saveIssueFn() {
  const btn = document.getElementById('saveIssue');
  const originalText = btn?.innerText;
  
  const currentStatus = document.querySelector('.chip-estado.seleccionado')?.dataset.val || 'open';
  const currentPriority = document.querySelector('.chip-prio.seleccionado')?.dataset.val || 'media';
  
  const objFase = document.querySelector('.chip-fase.seleccionado');
  const currentFase = objFase ? objFase.innerText : 'Estampación';
 
  const currentActividad = document.querySelector('.chip-actividad.seleccionado')?.innerText || 'N/A';
  const currentSubfase = document.querySelector('.chip-subfase.seleccionado')?.innerText || 'N/A';

  const currentType = document.querySelector('.chip-defecto.seleccionado')?.innerText || 'Sin clasificar';
  const currentComment = document.getElementById('textoIncidenciaNivelDios')?.value || '';

  let issueUpdateData = {
    status: currentStatus, priority: currentPriority, fase: currentFase,
    actividad: currentActividad,
    subfase: currentSubfase,
    comment: currentComment, date: new Date().toISOString(),
    user: State.userName || "Anónimo", photos: JSON.parse(JSON.stringify(State.currentPhotos || []))
  };

  let issueToUpload = null;

  if (State.selectedMarker && State.issues.find(i => i.id === State.selectedMarker.userData.issueId)) {
    const issue = State.issues.find(i => i.id === State.selectedMarker.userData.issueId);
    
    issue.status = currentStatus; 
    issue.priority = currentPriority;
    issue.fase = currentFase; 
    issue.actividad = currentActividad;
    issue.subfase = currentSubfase;
    issue.comment = currentComment;
    issue.type = currentType;
    issue.date = issueUpdateData.date;       
    issue.user = issueUpdateData.user;       
    issue.photos = issueUpdateData.photos;   
    
    if (!issue.history) issue.history = [];
    issue.history.push({ ...issueUpdateData });
    issueToUpload = issue;
  } else {
    const safeId = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    const newIssue = {
      id: safeId, fileName: State.targetFileName || 'Pieza_Desconocida',
      x: State.currentPoint.x, y: State.currentPoint.y, z: State.currentPoint.z,
      type: currentType, ...issueUpdateData, history: [{ ...issueUpdateData }]
    };
    State.issues.push(newIssue);
    issueToUpload = newIssue;
  }

  window.saveIssueFn = saveIssueFn;
  
  renderIssues(); 
  deselectMarker(); 

  try {
    if (btn) { btn.innerText = "⏳ Subiendo..."; btn.disabled = true; }
    
    // El Interceptor hace la magia aquí
    const result = await saveIssueToCloud(issueToUpload);
    
    if (result && result.status === 'offline') {
        if (window.asistenteVoz) window.asistenteVoz("Sin conexión. Incidencia guardada en el móvil.");
        alert("⚠️ Sin conexión. Incidencia guardada en la memoria del dispositivo.");
    } else {
        if (window.asistenteVoz) window.asistenteVoz("Incidencia guardada correctamente en la nube.");
        alert("✅ Guardado correctamente en la nube.");
    }

  } catch (error) {
    console.error("Error crítico de guardado:", error);
    alert("❌ Error desconocido al guardar."); 
  } finally {
    if (btn) { btn.innerText = originalText; btn.disabled = false; }
  }
}

// ==========================================
// 🔴 RESTAURACIÓN: FUNCIONES DE RENDERIZADO 🔴
// ==========================================
export function renderIssues() {
  const toRemove = []; 
  State.scene.traverse(obj => { if(obj.userData && obj.userData.marker) toRemove.push(obj); });
  toRemove.forEach(obj => State.scene.remove(obj));

  State.issues.forEach(issue => {
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
  
  let filtroTexto = "Reporte Filtrado";
  if (State.filters.status === 'all' && State.filters.priority === 'all' && State.filters.user === 'all' && State.filters.type === 'all' && !State.filters.dateFrom && !State.filters.dateTo) {
      filtroTexto = "Reporte Global";
  }

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

// ==========================================
// 📸 CAPTURA 3D INTERNA
// ==========================================
window.take3DScreenshot = function(e) {
    if (e) e.preventDefault(); 
    
    if (State.renderer && State.scene && State.camera) {
        const modal = document.getElementById('issueModalOverlay');
        const wasActive = modal ? modal.classList.contains('active') : false;
        if (wasActive) modal.style.opacity = '0'; 

        State.renderer.render(State.scene, State.camera);
        const dataUrl = State.renderer.domElement.toDataURL('image/jpeg', 0.9);
        
        if (wasActive) modal.style.opacity = '1';

        State.currentPhotos.push({ dataUrl: dataUrl });
        if (typeof renderPhotoGrid === 'function') renderPhotoGrid();
        
        if (window.asistenteVoz) window.asistenteVoz("Vista 3D capturada con éxito.");
    } else {
        console.warn("No se pudo hacer la captura: el visor 3D no está inicializado.");
    }
};

// ==========================================
// 📋 LEER DEL PORTAPAPELES
// ==========================================
window.pasteFromClipboard = async function(e) {
    if(e) e.preventDefault();
    try {
        const items = await navigator.clipboard.read();
        for (let item of items) {
            const imageTypes = item.types.filter(type => type.startsWith('image/'));
            if (imageTypes.length > 0) {
                const blob = await item.getType(imageTypes[0]);
                const reader = new FileReader();
                reader.onload = (event) => {
                    State.currentPhotos.push({ dataUrl: event.target.result });
                    if (typeof renderPhotoGrid === 'function') renderPhotoGrid();
                };
                reader.readAsDataURL(blob);
                return; 
            }
        }
        alert("⚠️ No hay ninguna imagen copiada en tu portapapeles. ¡Copia un recorte primero!");
    } catch (err) {
        console.error("Error al leer el portapapeles:", err);
        alert("⚠️ Permiso denegado o función no soportada en este dispositivo.");
    }
};

document.addEventListener('paste', (e) => {
    const modal = document.getElementById('issueModalOverlay');
    if (!modal || !modal.classList.contains('active')) return;

    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            const reader = new FileReader();
            reader.onload = (event) => {
                State.currentPhotos.push({ dataUrl: event.target.result });
                if (typeof renderPhotoGrid === 'function') renderPhotoGrid();
            };
            reader.readAsDataURL(blob);
            e.preventDefault(); 
            return;
        }
    }
});

// ==========================================
// 🗑️ BORRADO PARCIAL (Modo Francotirador)
// ==========================================
window.deleteHistoryEntry = async function(issueId, arrayIndex, dateString) {
    const seguro = confirm("⚠️ ¿Borrar este estado del historial? Esta acción no se puede deshacer.");
    if (!seguro) return;

    const issue = State.issues.find(i => i.id === issueId);
    if (issue && issue.history && issue.history[arrayIndex]) {
        issue.history.splice(arrayIndex, 1); 
        
        if (issue.history.length === 0) {
            deleteSelectedIssue(); 
            return;
        } else {
            selectMarker(State.selectedMarker); 
        }
    }

    try {
        await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete_history_row', id: issueId, date: dateString })
        });
    } catch (err) {
        console.error("Error borrando el historial de la nube:", err);
    }
};

// ==========================================
// ⚡ MOTOR DE GUARDADO AUTO (MODO RÁFAGA V3)
// ==========================================
window.processRapidPhoto = async function(photoDataUrl) {
    const issueId = State.rapidPhotoTargetId;
    const issue = State.issues.find(i => i.id === issueId);
    
    if (!issue) return;

    const textoComentario = (State.rapidPhotoDefaults && State.rapidPhotoDefaults.comentario && State.rapidPhotoDefaults.comentario.trim() !== "") 
        ? State.rapidPhotoDefaults.comentario 
        : "📸 Captura rápida en campo";

    const historyEntry = {
        date: new Date().toISOString(),
        user: State.userName || "Inspector",
        status: issue.status,      
        priority: issue.priority,  
        fase: State.rapidPhotoDefaults.fase, 
        comment: textoComentario,
        photos: [{ dataUrl: photoDataUrl }]
    };

    if (!issue.history) issue.history = [];
    issue.history.push(historyEntry);
    
    issue.fase = historyEntry.fase;
    issue.date = historyEntry.date;
    issue.user = historyEntry.user;
    issue.photos = historyEntry.photos; 

    if (window.asistenteVoz) window.asistenteVoz("Sincronizando con la base de datos...");

    try {
        // En Ráfaga también usamos el interceptor Offline
        const result = await saveIssueToCloud(issue);
        if (result && result.status === 'offline') {
            console.log("⚡ Ráfaga guardada en OFFLINE.");
        } else {
            console.log("⚡ Ráfaga guardada con éxito en Google.");
        }
        
        if (window.asistenteVoz) window.asistenteVoz("Guardado. Listo para el siguiente punto.");
        
        State.rapidPhotoTargetId = null;
        if (typeof deselectMarker === 'function') deselectMarker();
        if (window.renderIssues) window.renderIssues(); 
        
    } catch (e) {
        console.error("❌ Error crítico de guardado:", e);
        if (window.asistenteVoz) window.asistenteVoz("Error de conexión. Reintente.");
    }
};

// ==========================================
// ⚡ EVENTOS DE INTERFAZ (MODO RÁFAGA)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const rapidBtn = document.getElementById('rapidModeBtn');
    const rapidModal = document.getElementById('rapidModeModal');
    const startRapidBtn = document.getElementById('startRapidMode');

    if (rapidBtn && rapidModal) {
        rapidBtn.addEventListener('click', () => {
            if (State.rapidPhotoMode) {
                deactivateRapidMode();
            } else {
                rapidModal.classList.add('active');
            }
        });
    }

    if (startRapidBtn) {
        startRapidBtn.addEventListener('click', () => {
            State.rapidPhotoDefaults = {
                fase: document.getElementById('rapidFase').value,
                comentario: document.getElementById('rapidComentario').value
            };
            
            State.rapidPhotoMode = true;
            
            if (rapidBtn) {
                rapidBtn.style.backgroundColor = '#f5b400';
                rapidBtn.style.color = '#000';
                rapidBtn.classList.add('pulsing-warning'); 
            }

            rapidModal.classList.remove('active');
            
            if (window.asistenteVoz) window.asistenteVoz("Modo ráfaga activado. Toque un punto para capturar foto.");
            
            State.mode = true; 
            const addBtn = document.getElementById('addBtn');
            if(addBtn) addBtn.classList.add('active');
        });
    }

    function deactivateRapidMode() {
        State.rapidPhotoMode = false;
        State.rapidPhotoDefaults = null;
        State.rapidPhotoTargetId = null;
        
        if (rapidBtn) {
            rapidBtn.style.backgroundColor = '';
            rapidBtn.style.color = '';
            rapidBtn.classList.remove('pulsing-warning');
        }
        
        State.mode = false;
        const addBtn = document.getElementById('addBtn');
        if(addBtn) addBtn.classList.remove('active');
        
        if (window.asistenteVoz) window.asistenteVoz("Modo ráfaga desactivado.");
    }
});

// ==========================================
// 🎤 MOTOR DE DICTADO POR VOZ (SPEECH TO TEXT)
// ==========================================
function initVoiceDictation(inputId, btnId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    
    if (!input || !btn) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        btn.style.display = 'none'; 
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES'; 
    recognition.continuous = true; 
    recognition.interimResults = true; 

    let isRecording = false;
    let textBeforeRecording = "";

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (isRecording) {
            recognition.stop(); 
        } else {
            textBeforeRecording = input.value + (input.value.trim() !== "" ? " " : "");
            recognition.start(); 
        }
    });

    recognition.onstart = () => {
        isRecording = true;
        btn.classList.add('recording');
        input.placeholder = "🔴 Escuchando...";
        if (navigator.vibrate) navigator.vibrate(50); 
    };

    recognition.onresult = (event) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
        }
        input.value = textBeforeRecording + currentTranscript;
    };

    recognition.onend = () => {
        isRecording = false;
        btn.classList.remove('recording');
        input.placeholder = "Ej: Captura de campo...";
    };

    recognition.onerror = (event) => {
        isRecording = false;
        btn.classList.remove('recording');
        if (event.error === 'not-allowed') {
            alert("⚠️ Permiso denegado para el micrófono.");
        }
    };
}

document.addEventListener('DOMContentLoaded', () => {
    initVoiceDictation('issueComment', 'micBtnNormal');
    initVoiceDictation('rapidComentario', 'micBtnRapid');
});
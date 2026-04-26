// js/app.js
import { State } from './estado.js';
import { fetchDatabase, processLogin, processLogout, checkAuthStatus } from './auth.js';
import { init3D, loadSTLs, updateFileListUI, toggleMeshVisibility, removeMesh, setView, applyShadingAll } from './visor3d.js';
import { onClick, onPointerDown, onPointerMove, onPointerUp, saveIssueFn, deleteSelectedIssue } from './incidencias.js';
import { exportIssues, exportToCSV, generatePDF } from './exportador.js';
import { handlePhotoInput } from './fotos.js';
import { initUI } from './ui.js';
import { initMagiaVoz } from './magiaVoz.js';
import { deselectMarker } from './incidencias.js'; 
import { initDiccionarios } from './diccionarios.js'; 


/* --- EXPONER FUNCIONES AL HTML (PÚBLICAS) --- */
window.processLogin = processLogin;
window.processLogout = processLogout;
window.toggleMeshVisibility = toggleMeshVisibility;
window.removeMesh = removeMesh;
window.exportIssues = exportIssues;
window.exportToCSV = exportToCSV;
window.generatePDF = generatePDF;










/* --- ASIGNAR EVENTOS A LOS BOTONES --- */
window.onload = async () => {
 
  await initDiccionarios();
 
  initUI(); // Arranca los menús y paneles (togglePanel y openLightbox ya viven aquí)
  initMagiaVoz(); // Encendemos el micro

  // Eventos del Canvas 3D
  const canvas = State.renderer.domElement;
  canvas.addEventListener("click", onClick);
  canvas.addEventListener("mousedown", onPointerDown);
  canvas.addEventListener("mousemove", onPointerMove);
  canvas.addEventListener("mouseup", onPointerUp);

  // Botones UI Principales
 document.getElementById('fileInput').onchange = (e) => {
    loadSTLs(e); // 1. Cargamos el 3D
    // 2. Ocultamos el menú de carga automáticamente
    const modalCarga = document.getElementById('modalCargaModelos');
    if (modalCarga) modalCarga.style.display = 'none';
  };
  
  const saveBtn = document.getElementById('saveIssue');
  if(saveBtn) saveBtn.onclick = saveIssueFn;
  
  const deleteBtn = document.getElementById('deleteIssueBtn');
  if(deleteBtn) deleteBtn.onclick = deleteSelectedIssue;

  const addBtn = document.getElementById('addBtn');
  if(addBtn) {
    addBtn.onclick = () => { 
      State.mode = !State.mode; 
      addBtn.classList.toggle('active', State.mode); 
    };
  }

  // CIERRE DEL PANEL DIOS
  const btnCerrarPanel = document.getElementById('btnCerrarPanel');
  const panelDios = document.getElementById('panelIncidencias');
  if (btnCerrarPanel && panelDios) {
      btnCerrarPanel.addEventListener('click', () => {
          panelDios.classList.add('oculta');
          deselectMarker(); 
      });
  }

  // --- CONECTAR BOTONES DE VISTAS (ZOOM EXTENSIÓN, ISOMÉTRICO) ---
  document.querySelectorAll('.fab[data-view]').forEach(btn => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });

  // --- CONECTAR BOTONES DE ESTILO (SOMBREADO, ARISTAS, ALAMBRE) ---
  document.querySelectorAll('.layer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active'); 
      applyShadingAll(btn.dataset.mode);
    });
  });

  // --- CIERRE DE MODALES DE INCIDENCIAS (LAS "X") ---
  const btnCloseIssueModal = document.getElementById('btnCloseIssueModal');
  const issueModal = document.getElementById('issueModalOverlay');
  if (btnCloseIssueModal && issueModal) {
      btnCloseIssueModal.addEventListener('click', () => {
          issueModal.classList.remove('active');
          deselectMarker(); 
      });
  }

  const btnCloseHistoryModal = document.getElementById('btnCloseHistoryModal');
  const historyModal = document.getElementById('historyModalOverlay');
  if (btnCloseHistoryModal && historyModal) {
      btnCloseHistoryModal.addEventListener('click', () => {
          historyModal.classList.remove('active');
          deselectMarker(); 
      });
  }

  // INICIAR APLICACIÓN
  checkAuthStatus();
  fetchDatabase();
  init3D();
  animate();
  
  // Splash Screen
  setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    if (splash) {
      splash.style.opacity = '0';
      splash.style.visibility = 'hidden';
    }
  }, 1500); 

  // 🎙️ ENCENDER MICRO DEL NUEVO DISEÑO
  if (window.initVoiceDictation) {
      window.initVoiceDictation('textoIncidenciaNivelDios', 'btnVozNivelDios');
  }

  // 📷 CONECTAR BOTONES DE EVIDENCIA DEL NUEVO DISEÑO
  const btnGalleryNivelDios = document.getElementById('btnGalleryNivelDios');
  const btnCameraNivelDios = document.getElementById('btnCameraNivelDios');
  const inputGalleryNivelDios = document.getElementById('inputGalleryNivelDios');
  const inputCameraNivelDios = document.getElementById('inputCameraNivelDios');

  if(btnGalleryNivelDios && inputGalleryNivelDios) btnGalleryNivelDios.onclick = (e) => { e.preventDefault(); inputGalleryNivelDios.click(); };
  if(btnCameraNivelDios && inputCameraNivelDios) btnCameraNivelDios.onclick = (e) => { e.preventDefault(); inputCameraNivelDios.click(); };
  
  // (Importante: asume que handlePhotoInput ya está importado arriba)
  if(inputGalleryNivelDios) inputGalleryNivelDios.onchange = handlePhotoInput;
  if(inputCameraNivelDios) inputCameraNivelDios.onchange = handlePhotoInput;

  // Lógica de clic para los círculos de Prioridad y Estado
  document.querySelectorAll('.chip-prio, .chip-estado').forEach(btn => {
      btn.onclick = (e) => {
          e.preventDefault();
          const isEstado = btn.classList.contains('chip-estado');
          const selector = isEstado ? '.chip-estado' : '.chip-prio';
          document.querySelectorAll(selector).forEach(c => c.classList.remove('seleccionado'));
          btn.classList.add('seleccionado');
      };
  });
};

function animate() { 
  requestAnimationFrame(animate); 
  if(State.controls) State.controls.update(); 
  if(State.renderer) State.renderer.render(State.scene, State.camera); 
}


// --- VIGILANTE DEL ESTADO VACÍO (UX MAGIC) ---
// Observa si el nombre del archivo cambia en la barra superior. Si cambia, oculta el cartel central de forma fluida.
document.addEventListener("DOMContentLoaded", () => {
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const emptyState = document.getElementById('emptyState');
    
    if (fileNameDisplay && emptyState) {
        // 1. Aseguramos que tenga una transición suave (por si no está en styles.css)
        emptyState.style.transition = 'opacity 0.5s ease-out';

        // 2. Creamos al Vigilante
        const observer = new MutationObserver(() => {
            const currentText = fileNameDisplay.innerText.toLowerCase();
            
            // Si el texto ya no contiene la palabra "cargar", asumimos que hay una pieza
            if (!currentText.includes('cargar')) {
                // Iniciamos el desvanecimiento (Fade-out)
                emptyState.style.opacity = '0';
                
                // Esperamos medio segundo y lo quitamos del medio para que no bloquee clics
                setTimeout(() => {
                    emptyState.style.display = 'none';
                }, 500); 
                
                // Apagamos el vigilante para ahorrar batería y memoria en el móvil
                observer.disconnect(); 
            }
        });
        
        // 3. Le decimos al Vigilante qué tiene que mirar (cambios en el texto del nombre)
        observer.observe(fileNameDisplay, { 
            childList: true, 
            characterData: true, 
            subtree: true 
        });
    }
});
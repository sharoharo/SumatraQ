// js/app.js
import { State } from './estado.js';
import { fetchDatabase, processLogin, processLogout, checkAuthStatus } from './auth.js';
import { init3D, loadSTLs, updateFileListUI, toggleMeshVisibility, removeMesh, setView, applyShadingAll } from './visor3d.js';
import { onClick, onPointerDown, onPointerMove, onPointerUp, saveIssueFn, deleteSelectedIssue, deselectMarker } from './incidencias.js';
import { exportIssues, exportToCSV, generatePDF } from './exportador.js';
import { handlePhotoInput } from './fotos.js';
import { initUI } from './ui.js';
import { initMagiaVoz } from './magiaVoz.js';
import { initDiccionarios } from './diccionarios.js'; 
import { syncOfflineIssues } from './nube.js';
import { getOfflineIssues } from './db.js';

/* --- EXPONER FUNCIONES AL HTML (PÚBLICAS) --- */
window.processLogin = processLogin;
window.processLogout = processLogout;
window.toggleMeshVisibility = toggleMeshVisibility;
window.removeMesh = removeMesh;
window.exportIssues = exportIssues;
window.exportToCSV = exportToCSV;
window.generatePDF = generatePDF;




window.inyectarDemo = async function(ruta, nombre) {
    try {
        console.log("📥 Descargando demo de pruebas: " + nombre);
        
        // 1. Descargamos el archivo de la carpeta local
        const response = await fetch(ruta);
        if (!response.ok) throw new Error("Archivo no encontrado");
        const blob = await response.blob();
        
        // 2. Lo empaquetamos como si fuera un archivo real
        const file = new File([blob], nombre, { type: 'model/stl' });
        
        // 3. Simulamos que el usuario lo ha subido a mano
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        
        // 4. Se lo mandamos a tu cargador 3D oficial
        loadSTLs({ target: { files: dataTransfer.files } });
        
        // Cerramos el modal para limpiar la vista
        const modal = document.getElementById('modalCargaModelos');
        if (modal) modal.style.display = 'none';

    } catch (error) {
        console.error("Error al inyectar demo:", error);
        alert("⚠️ No se pudo cargar la pieza. Asegúrate de que el archivo existe en la carpeta /demos/.");
    }
};


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
  document.querySelectorAll('.toolbar-btn[data-view]').forEach(btn => {
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
          historyModal.classList.add('oculta'); 
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

// ==========================================
// 📡 VIGILANTES DE CONEXIÓN A INTERNET
// ==========================================

// Función para repintar la Nube
window.updateCloudStatusUI = async function() {
    const btn = document.getElementById('cloudStatusBtn');
    const badge = document.getElementById('offlineBadge');
    if (!btn || !badge) return;

    const pendingIssues = await getOfflineIssues();
    const count = pendingIssues.length;

    // 🟢 CASO 1: ONLINE Y TODO SINCRONIZADO
    if (navigator.onLine && count === 0) {
        btn.className = 'toolbar-btn sync-online';
        btn.title = "Nube sincronizada";
        badge.style.display = 'none';
        return;
    }

    // 🟡 CASO 2: ONLINE PERO SUBIENDO DATOS
    if (navigator.onLine && count > 0) {
        btn.className = 'toolbar-btn sync-uploading';
        btn.title = `Sincronizando ${count} incidencias...`;
        badge.style.display = 'flex';
        badge.innerText = count;
        return;
    }

    // 🔴 CASO 3: OFFLINE
    if (!navigator.onLine) {
        btn.className = 'toolbar-btn sync-offline';
        btn.title = "Trabajando sin conexión";
        if (count > 0) {
            badge.style.display = 'flex';
            badge.innerText = count;
        } else {
            badge.style.display = 'none';
        }
    }
};

// Refresco extra al volver a tener red
window.addEventListener('online', () => {
    setTimeout(() => { // Damos 500ms para que el sistema se asiente
        window.updateCloudStatusUI();
        syncOfflineIssues();
    }, 500);
});

// Escuchadores de red
window.addEventListener('online', () => {
    console.log("🟢 Conexión a Internet Restaurada");
    window.updateCloudStatusUI(); // Repintamos a amarillo (sincronizando)
    syncOfflineIssues();
});

window.addEventListener('offline', () => {
    console.warn("🔴 Conexión a Internet Perdida. Entrando en Modo Offline.");
    window.updateCloudStatusUI(); // Repintamos a rojo
    if (window.asistenteVoz) window.asistenteVoz("Sin conexión a internet. Guardando en modo local.");
});

// Al arrancar la app, pintamos la nube
document.addEventListener('DOMContentLoaded', () => {
    window.updateCloudStatusUI();
    if (navigator.onLine) {
        syncOfflineIssues();
    }
});

// ==========================================
// 📸 VISOR DE FOTOS GLOBAL
// ==========================================
window.openPhotoViewer = function(imgSrc) {
    const modal = document.getElementById('photoViewerModal');
    const img = document.getElementById('photoViewerImage');
    if (modal && img) {
        img.src = imgSrc;
        modal.classList.add('active');
    }
};

// Escuchador global: Si haces clic en cualquier foto miniatura, se abre en grande
document.addEventListener('click', function(e) {
    if (e.target.tagName === 'IMG' && (
        e.target.classList.contains('photo-thumb') || 
        e.target.classList.contains('history-thumb') || 
        e.target.classList.contains('photo-item')
    )) {
        window.openPhotoViewer(e.target.src);
    }
});
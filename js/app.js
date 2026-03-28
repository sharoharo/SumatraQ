// js/app.js
import { State } from './estado.js';
import { fetchDatabase, processLogin, processLogout, checkAuthStatus } from './auth.js';
import { init3D, loadSTLs, updateFileListUI, toggleMeshVisibility, removeMesh, setView, applyShadingAll } from './visor3d.js';
import { setAdvancedFilter, onClick, onPointerDown, onPointerMove, onPointerUp, saveIssueFn, deleteSelectedIssue } from './incidencias.js';
import { exportIssues, exportToCSV, generatePDF } from './exportador.js';
import { handlePhotoInput } from './fotos.js';
import { initUI } from './ui.js';

/* --- EXPONER FUNCIONES AL HTML (PÚBLICAS) --- */
window.processLogin = processLogin;
window.processLogout = processLogout;
window.toggleMeshVisibility = toggleMeshVisibility;
window.removeMesh = removeMesh;
window.exportIssues = exportIssues;
window.exportToCSV = exportToCSV;
window.setAdvancedFilter = setAdvancedFilter;
window.generatePDF = generatePDF;

/* --- ASIGNAR EVENTOS A LOS BOTONES --- */
window.onload = () => {
  initUI(); // Arranca los menús y paneles (togglePanel y openLightbox ya viven aquí)
  
  // Eventos del Canvas 3D
  const canvas = State.renderer.domElement;
  canvas.addEventListener("click", onClick);
  canvas.addEventListener("mousedown", onPointerDown);
  canvas.addEventListener("mousemove", onPointerMove);
  canvas.addEventListener("mouseup", onPointerUp);

  // Botones UI Principales
  document.getElementById('fileInput').onchange = loadSTLs;
  
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

  // Inputs ocultos de cámara/galería
  const btnGallery = document.getElementById('btnGallery');
  const btnCamera = document.getElementById('btnCamera');
  const inputGallery = document.getElementById('inputGallery');
  const inputCamera = document.getElementById('inputCamera');

  if(btnGallery && inputGallery) btnGallery.onclick = (e) => { e.preventDefault(); inputGallery.click(); };
  if(btnCamera && inputCamera) btnCamera.onclick = (e) => { e.preventDefault(); inputCamera.click(); };
  if(inputGallery) inputGallery.onchange = handlePhotoInput;
  if(inputCamera) inputCamera.onchange = handlePhotoInput;

  // --- MAGIA UX: LÓGICA VISUAL DE CHIPS EN EL FORMULARIO ---
  document.querySelectorAll('.chip-group .ui-chip').forEach(chip => {
    chip.onclick = (e) => {
      e.preventDefault();
      const group = chip.closest('.chip-group');
      group.querySelectorAll('.ui-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    };
  });

  // --- MAGIA UX: LÓGICA DE LA BARRA DE FILTROS SUPERIOR ---
  document.querySelectorAll('.filter-scroll-area .filter-chip').forEach(chip => {
    chip.onclick = (e) => {
      e.preventDefault();
      const container = chip.parentElement;
      container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const type = chip.dataset.filterType;
      const val = chip.dataset.val;
      window.setAdvancedFilter(type, val);
    };
  });

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
};

function animate() { 
  requestAnimationFrame(animate); 
  if(State.controls) State.controls.update(); 
  if(State.renderer) State.renderer.render(State.scene, State.camera); 
}
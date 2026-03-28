// app.js
import { State } from './estado.js';
import { fetchDatabase, processLogin, processLogout, checkAuthStatus } from './auth.js';
import { init3D, loadSTLs, updateFileListUI, toggleMeshVisibility, removeMesh, setView, applyShadingAll } from './visor3d.js';
import { 
  onClick, onPointerDown, onPointerMove, onPointerUp, 
  saveIssueFn, deleteSelectedIssue, setFilter 
} from './incidencias.js';
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
window.setFilter = setFilter;
window.generatePDF = generatePDF;

/* --- ASIGNAR EVENTOS A LOS BOTONES --- */
window.onload = () => {
  initUI(); // Arranca los menús y paneles (togglePanel y openLightbox ya viven aquí)
  
  // Canvas 3D
  const canvas = State.renderer.domElement;
  canvas.addEventListener("click", onClick);
  canvas.addEventListener("mousedown", onPointerDown);
  canvas.addEventListener("mousemove", onPointerMove);
  canvas.addEventListener("mouseup", onPointerUp);

  // Botones UI Principales
  document.getElementById('fileInput').onchange = loadSTLs;
  document.getElementById('saveIssue').onclick = saveIssueFn;
  document.getElementById('deleteIssueBtn').onclick = deleteSelectedIssue;

  const addBtn = document.getElementById('addBtn');
  if(addBtn) {
    addBtn.onclick = () => { 
      State.mode = !State.mode; 
      addBtn.classList.toggle('active', State.mode); 
    };
  }

  // Conectar inputs ocultos de cámara/galería
  const btnGallery = document.getElementById('btnGallery');
  const btnCamera = document.getElementById('btnCamera');
  const inputGallery = document.getElementById('inputGallery');
  const inputCamera = document.getElementById('inputCamera');

  if(btnGallery && inputGallery) btnGallery.onclick = (e) => { e.preventDefault(); inputGallery.click(); };
  if(btnCamera && inputCamera) btnCamera.onclick = (e) => { e.preventDefault(); inputCamera.click(); };
  if(inputGallery) inputGallery.onchange = handlePhotoInput;
  if(inputCamera) inputCamera.onchange = handlePhotoInput;

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
  
  // 👇 MAGIA DEL SPLASH SCREEN 👇
  // Esperamos 1.5 segundos para que la animación se luzca y el 3D cargue por detrás
  setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    if (splash) {
      splash.style.opacity = '0';
      splash.style.visibility = 'hidden';
    }
  }, 1500); 
  // 👆 FIN MAGIA SPLASH SCREEN 👆
};

function animate() { 
  requestAnimationFrame(animate); 
  if(State.controls) State.controls.update(); 
  if(State.renderer) State.renderer.render(State.scene, State.camera); 
}
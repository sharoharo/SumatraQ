// app.js
import { State } from './estado.js';
import { fetchDatabase, processLogin, processLogout, checkAuthStatus } from './auth.js';
import { init3D, loadSTLs, updateFileListUI, toggleMeshVisibility, removeMesh } from './visor3d.js';
import { 
  onClick, onPointerDown, onPointerMove, onPointerUp, 
  saveIssueFn, deleteSelectedIssue, handlePhotoInput, exportIssues, exportToCSV // <-- Añadido aquí
} from './incidencias.js';

/* --- EXPONER FUNCIONES AL HTML (PÚBLICAS) --- */
window.processLogin = processLogin;
window.processLogout = processLogout;
window.toggleMeshVisibility = toggleMeshVisibility;
window.removeMesh = removeMesh;
window.exportIssues = exportIssues;
window.exportToCSV = exportToCSV; // <-- Añadido aquí

window.togglePanel = function(forceOpen = false) {
  const panel = document.getElementById('functionalityPanel');
  if (forceOpen) { panel.classList.add('open'); document.body.classList.add('panel-open'); } 
  else { panel.classList.toggle('open'); document.body.classList.toggle('panel-open'); }
};

window.openLightbox = function(src) {
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightbox').classList.add('active');
};

/* --- ASIGNAR EVENTOS A LOS BOTONES --- */
window.onload = () => {
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

  // BOTONES DE CÁMARA Y GALERÍA (EL FIX ESTÁ AQUÍ)
  const btnGallery = document.getElementById('btnGallery');
  const btnCamera = document.getElementById('btnCamera');
  const inputGallery = document.getElementById('inputGallery');
  const inputCamera = document.getElementById('inputCamera');

  // Conectamos los botones bonitos con los inputs ocultos
  if(btnGallery && inputGallery) {
    btnGallery.onclick = (e) => { e.preventDefault(); inputGallery.click(); };
  }
  if(btnCamera && inputCamera) {
    btnCamera.onclick = (e) => { e.preventDefault(); inputCamera.click(); };
  }

  // Cuando los inputs ocultos reciben la foto, llaman a la función
  if(inputGallery) inputGallery.onchange = handlePhotoInput;
  if(inputCamera) inputCamera.onchange = handlePhotoInput;

  // INICIAR APLICACIÓN
  checkAuthStatus();
  fetchDatabase();
  init3D();
  animate();
};

function animate() { 
  requestAnimationFrame(animate); 
  if(State.controls) State.controls.update(); 
  if(State.renderer) State.renderer.render(State.scene, State.camera); 
}
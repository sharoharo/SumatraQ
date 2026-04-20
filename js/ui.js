// js/ui.js
export function initUI() {
  // Abre/Cierra el menú lateral derecho
  window.togglePanel = function(forceOpen = false) {
    const panel = document.getElementById('functionalityPanel');
    if (forceOpen) { 
      panel.classList.add('open'); 
      document.body.classList.add('panel-open'); 
    } else { 
      panel.classList.toggle('open'); 
      document.body.classList.toggle('panel-open'); 
    }
  };

  // 🗑️ NOTA DE DESARROLLO: 
  // La función antigua de window.openLightbox y lightboxClose se han eliminado de aquí.
  // El nuevo "Lightbox Universal" se inyecta dinámicamente desde incidencias.js
}
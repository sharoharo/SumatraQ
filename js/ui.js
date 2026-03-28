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

  // Abre el visor de fotos en pantalla completa
  window.openLightbox = function(src) {
    document.getElementById('lightboxImg').src = src;
    document.getElementById('lightbox').classList.add('active');
  };

  // Cierra el visor de fotos al pulsar la 'X'
  const lightboxClose = document.getElementById('lightboxClose');
  if(lightboxClose) {
    lightboxClose.onclick = () => {
      document.getElementById('lightbox').classList.remove('active');
    };
  }
}
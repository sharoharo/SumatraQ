// js/fotos.js
import { State } from './estado.js';

export function handlePhotoInput(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 1280; 
      let width = img.width, height = img.height;
      if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
      else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      State.currentPhotos.push({ dataUrl: canvas.toDataURL('image/jpeg', 0.8) });
      renderPhotoGrid();
    };
    img.src = ev.target.result;
  }; 
  reader.readAsDataURL(file); 
  e.target.value = ''; 
}

export function renderPhotoGrid() {
  const grid = document.getElementById('photoGrid'); 
  if(!grid) return;
  grid.innerHTML = '';
  State.currentPhotos.forEach((photo, index) => {
    const div = document.createElement('div'); 
    div.className = 'photo-thumb-container';
    div.innerHTML = `
      <img src="${photo.dataUrl}" class="photo-thumb" onclick="window.openLightbox('${photo.dataUrl}')">
      <button class="delete-photo-btn">✕</button>
    `;
    // Asignamos el evento de borrar directamente al botón
    div.querySelector('.delete-photo-btn').onclick = (e) => {
      e.preventDefault();
      State.currentPhotos.splice(index, 1);
      renderPhotoGrid();
    };
    grid.appendChild(div);
  });
}
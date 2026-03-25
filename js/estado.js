// estado.js
import * as THREE from 'three';

export const CONFIG = {
  // Tu URL de Google Apps Script
  GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbz_2sNkomYiq--CXf6B_JkVLly5olBVFg2_PTZ9mCqouGrFStnNF9gf4oGN9QLbIBgI/exec"
};

export const State = {
  // Datos de la Nube
  db: { usuarios: [], tiposIncidencias: [], repositorioPiezas: [] },
  userName: localStorage.getItem('userName') || "",
  
  // Memoria de la App
  issues: [],
  loadedMeshes: {},
  currentPhotos: [],
  
  // Variables de Estado de la UI
  mode: false,           // Modo añadir incidencia
  moveIssueMode: false,  // Modo mover incidencia
  isDragging: false,     // Diferenciar click de arrastrar cámara
  
  // Variables de Selección
  selectedMarker: null,
  targetFileName: null,
  currentPoint: null,
  
  // Instancias principales de Three.js
  scene: new THREE.Scene(),
  camera: new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100000),
  renderer: new THREE.WebGLRenderer({ antialias: true }),
  controls: null,
  raycaster: new THREE.Raycaster(),
  mouse: new THREE.Vector2(),
  
  // Posicionamiento de Cámara
  bounds: { center: new THREE.Vector3(), size: new THREE.Vector3(), radius: 1 },
  viewDistance: 200
};
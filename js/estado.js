// js/estado.js
import * as THREE from 'three';

export const CONFIG = {
  // Tu URL de Google Apps Script
  GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzNG8rP3GuJp5M55SsQtzEdTlXXly7lEdOUzwSCcqG4yhDY1-DtCM7H7FBzPEt-uBGN/exec"
};

export const State = {
  // Datos de la Nube
  db: { usuarios: [], tiposIncidencias: [], repositorioPiezas: [], incidenciasRegistradas: [] },
  userName: localStorage.getItem('userName') || "",
  
  // Memoria de la App
  issues: [],
  loadedMeshes: {},
  currentPhotos: [],
  
  // Variables de Estado de la UI
  mode: false,           
  moveIssueMode: false,  
  isDragging: false,     
  
  // Filtros Avanzados
  currentStatusFilter: 'all',
  currentPriorityFilter: 'all',
  
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
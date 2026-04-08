// js/visor3d.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { State } from './estado.js';
import { renderIssues } from './incidencias.js';
import { loadIssuesForFile } from './nube.js'; 

let logoModel = null;

export function init3D() {
  State.scene.background = new THREE.Color(0xe5e3df);
  State.camera.position.set(200, 200, 200);

  State.renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('map-container').appendChild(State.renderer.domElement);

  State.controls = new OrbitControls(State.camera, State.renderer.domElement);
  State.controls.enableDamping = true;

  State.scene.add(new THREE.AmbientLight(0x777777));
  const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(300, 400, 200); State.scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.4); fill.position.set(-200, 100, -300); State.scene.add(fill);
  const back = new THREE.DirectionalLight(0xffffff, 0.3); back.position.set(0, -300, 300); State.scene.add(back);

  // Carga del Logo 3D
  const loader = new STLLoader();
  loader.load('./SUMATRAQ_LITE.stl', (geometry) => {
    const material = new THREE.MeshPhongMaterial({
      color: 0x4285F4, 
      specular: 0x222222,
      shininess: 100
    });

    logoModel = new THREE.Mesh(geometry, material);
    
    logoModel.scale.set(0.5, 0.5, 0.5); 
    logoModel.rotation.x = -Math.PI / 2;
    logoModel.position.set(0, 0, 0);

    State.scene.add(logoModel);

    // Encuadre automático e inteligente al arrancar
    focusOnLogo(0);
  });

  window.addEventListener("resize", () => {
    State.camera.aspect = window.innerWidth / window.innerHeight;
    State.camera.updateProjectionMatrix();
    State.renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

export function loadSTLs(e) {
  const files = Array.from(e.target.files);
  if(files.length === 0) return;

  if (logoModel && Object.keys(State.loadedMeshes).length === 0) {
    logoModel.visible = false;
  }

  files.forEach(file => {
    if(State.loadedMeshes[file.name]) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const geo = new STLLoader().parse(evt.target.result);
      geo.computeVertexNormals();
      let mesh = new THREE.Mesh( geo, new THREE.MeshPhongMaterial({color: 0xffffff, side: THREE.DoubleSide}) );
      mesh.userData.fileName = file.name;
      
      State.loadedMeshes[file.name] = mesh;
      State.scene.add(mesh);

      loadIssuesForFile(file.name);
      
      const activeMode = document.querySelector('.layer-btn.active')?.dataset?.mode || 'shaded';
      applyShadingAll(activeMode);
      
      updateFileListUI();
      renderIssues();
      fitCameraGlobal(true);
    };
    reader.readAsArrayBuffer(file);
  });
  if(document.getElementById('fileNameDisplay')) document.getElementById('fileNameDisplay').innerText = `${Object.keys(State.loadedMeshes).length + files.length} Pieza(s) en escena`;
  e.target.value = '';
}

export function updateFileListUI() {
  const fileListUI = document.getElementById('fileListUI');
  fileListUI.innerHTML = "";
  const names = Object.keys(State.loadedMeshes);
  
  if(names.length === 0) {
    fileListUI.innerHTML = '<p style="font-size: 13px; color: var(--text-secondary); text-align: center; margin: 10px 0;">No hay piezas.</p>';
    if(document.getElementById('fileNameDisplay')) document.getElementById('fileNameDisplay').innerText = "Añade STLs...";
    return;
  }

  names.forEach(name => {
    const isVisible = State.loadedMeshes[name].visible;
    const item = document.createElement('div'); item.className = 'file-item';
    item.innerHTML = `
      <div class="file-item-name" title="${name}">${name}</div>
      <div class="file-item-actions">
        <button class="icon-action-btn ${isVisible ? 'active-eye' : ''}" onclick="window.toggleMeshVisibility('${name}')">👁️</button>
        <button class="icon-action-btn" onclick="window.exportIssues('${name}')">⬇️</button>
        <button class="icon-action-btn" onclick="window.removeMesh('${name}')">🗑️</button>
      </div>
    `;
    fileListUI.appendChild(item);
  });
}

export function fitCameraGlobal(immediate=true) {
  const meshesArray = Object.values(State.loadedMeshes).filter(m => m.visible);
  if(meshesArray.length === 0) return;
  const combinedBox = new THREE.Box3();
  meshesArray.forEach(m => {
    m.geometry.computeBoundingBox();
    combinedBox.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld));
  });
  combinedBox.getCenter(State.bounds.center); combinedBox.getSize(State.bounds.size);
  State.bounds.radius = combinedBox.getBoundingSphere(new THREE.Sphere()).radius;
  
  const vFov = THREE.MathUtils.degToRad(State.camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov/2)*State.camera.aspect);
  State.viewDistance = Math.max(State.bounds.radius/Math.tan(vFov/2), State.bounds.radius/Math.tan(hFov/2))*1.2;
  
  const toPos = State.bounds.center.clone().addScaledVector(new THREE.Vector3(1,1,1).normalize(), State.viewDistance);
  State.camera.position.copy(toPos); State.controls.target.copy(State.bounds.center); State.controls.update();
}

export function applyShadingAll(mode) {
  Object.values(State.loadedMeshes).forEach(mesh => {
    mesh.material.wireframe = (mode === "wireframe");
    if(mesh.userData.edgesHelper) {
      State.scene.remove(mesh.userData.edgesHelper); mesh.userData.edgesHelper.geometry.dispose();
      mesh.userData.edgesHelper.material.dispose(); mesh.userData.edgesHelper = null;
    }
    if(mode==="shadedEdges"){
      const helper = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 15), new THREE.LineBasicMaterial({color: 0x444444}));
      helper.visible = mesh.visible; mesh.userData.edgesHelper = helper; State.scene.add(helper);
    }
  });
}

export function toggleMeshVisibility(name) {
  if (State.loadedMeshes[name]) {
    State.loadedMeshes[name].visible = !State.loadedMeshes[name].visible;
    if (State.loadedMeshes[name].userData.edgesHelper) {
      State.loadedMeshes[name].userData.edgesHelper.visible = State.loadedMeshes[name].visible;
    }
    updateFileListUI();
    renderIssues(); 
  }
}

export function removeMesh(name) {
  if (State.loadedMeshes[name]) {
    State.scene.remove(State.loadedMeshes[name]);
    if (State.loadedMeshes[name].userData.edgesHelper) {
      State.scene.remove(State.loadedMeshes[name].userData.edgesHelper);
    }
    State.loadedMeshes[name].geometry.dispose(); 
    State.loadedMeshes[name].material.dispose();
    delete State.loadedMeshes[name];
    
    State.issues = State.issues.filter(i => i.fileName !== name);
    updateFileListUI(); 
    renderIssues(); 
    
    if (Object.keys(State.loadedMeshes).length === 0) {
      if (logoModel) {
        logoModel.visible = true;
        // Encuadre automático con animación al borrar todo
        focusOnLogo(800); 
      }
    } else {
      fitCameraGlobal(false);
    }
  }
}

export function animateCamera(toPos, toTarget = State.bounds.center, ms = 500) {
  const fromPos = State.camera.position.clone(); 
  const fromTgt = State.controls.target.clone();
  const start = performance.now(); 
  const ease = t => 0.5 - 0.5 * Math.cos(Math.PI * t);
  
  function step(now){
    const p = Math.min(1, (now - start) / ms); 
    const e = ease(p);
    State.camera.position.lerpVectors(fromPos, toPos, e); 
    State.controls.target.lerpVectors(fromTgt, toTarget, e);
    State.controls.update(); 
    if(p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

export function setView(kind, immediate = false) {
  if (Object.keys(State.loadedMeshes).length === 0 && kind !== "fit") return;
  const dirs = { iso: new THREE.Vector3(1, 1, 1).normalize() };
  
  if (kind === "fit") {
    const dir = State.camera.position.clone().sub(State.controls.target).normalize();
    const toPos = State.bounds.center.clone().addScaledVector(dir, State.viewDistance);
    if (immediate) {
      State.camera.position.copy(toPos); 
      State.controls.target.copy(State.bounds.center); 
      State.controls.update();
    } else animateCamera(toPos, State.bounds.center);
    return;
  }
  
  const dir = dirs[kind] ? dirs[kind].clone() : new THREE.Vector3(1, 1, 1).normalize(); 
  const toPos = State.bounds.center.clone().addScaledVector(dir, State.viewDistance);
  if (immediate) { 
    State.camera.position.copy(toPos); 
    State.controls.target.copy(State.bounds.center); 
    State.controls.update(); 
  } else animateCamera(toPos, State.bounds.center);
}

// 🔹 NUEVO: Función inteligente para encuadrar el logo perfectamente 🔹
function focusOnLogo(ms = 0) {
  if (!logoModel) return;

  // Creamos una caja invisible alrededor del logo para saber cuánto mide
  const box = new THREE.Box3().setFromObject(logoModel);
  const center = new THREE.Vector3();
  box.getCenter(center);

  // Calculamos el tamaño del logo
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(sphere.radius, 5); // Evitamos valores muy locos

  // Calculamos la distancia ideal basada en la apertura de la lente (FOV)
  const vFov = THREE.MathUtils.degToRad(State.camera.fov);
  const dist = (radius / Math.tan(vFov / 2)) * 1.5; // El 1.5 le da un pequeño margen de respiro

  // Ángulo de la cámara: Levemente desde arriba y de frente
  const dir = new THREE.Vector3(0, 0.4, 1).normalize();
  const toPos = center.clone().addScaledVector(dir, dist);

  // Ejecutamos el movimiento (de golpe al cargar, o animado al borrar piezas)
  if (ms > 0) {
    animateCamera(toPos, center, ms);
  } else {
    State.camera.position.copy(toPos);
    State.controls.target.copy(center);
    State.controls.update();
  }
}
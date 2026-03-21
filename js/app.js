
  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { STLLoader } from 'three/addons/loaders/STLLoader.js';

    /* ==== Variables Multi-Pieza ==== */
    let scene, camera, renderer, controls;
    let loadedMeshes = {}; // DICCIONARIO para multiples mallas. Key = fileName
    
    let raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2();
    let mode = false;
    let currentPoint = null;
    let currentNormal = null;
    let targetFileName = null; // A qué pieza va la incidencia actual
    let issues = []; // TODAS las incidencias cargadas en la sesión
    let selectedMarker = null;
    let moveIssueMode = false;
    let bounds = { center: new THREE.Vector3(), size: new THREE.Vector3(), radius: 1 };
    let viewDistance = 200;
    let currentPhotos = [];

    // Pulsación larga
    let pressTimer;
    let isDragging = false;

    /* Referencias DOM */
    const elIssueType = document.getElementById('issueType');
    const elIssueComment = document.getElementById('issueComment');
    const elIssueStatus = document.getElementById('issueStatus');
    const form = document.getElementById('form');
    const list = document.getElementById('list');
    const addBtn = document.getElementById('addBtn');
    const panel = document.getElementById('functionalityPanel');
    const photoGrid = document.getElementById('photoGrid');
    const fileListUI = document.getElementById('fileListUI');

    const userName = localStorage.getItem('userName') || 'anon';

    function storageKey(fileName) {
      return `issues_${fileName}`;
    }

    window.togglePanel = function(forceOpen = false) {
      if (forceOpen) {
        panel.classList.add('open');
        document.body.classList.add('panel-open');
      } else {
        panel.classList.toggle('open');
        document.body.classList.toggle('panel-open');
      }
    }

    init();
    animate();

    function init(){
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xe5e3df);

      camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100000);
      camera.position.set(200, 200, 200);

      renderer = new THREE.WebGLRenderer({antialias:true});
      renderer.setSize(window.innerWidth, window.innerHeight);
      document.getElementById('map-container').appendChild(renderer.domElement);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      scene.add(new THREE.AmbientLight(0x777777));
      const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(300, 400, 200); scene.add(key);
      const fill = new THREE.DirectionalLight(0xffffff, 0.4); fill.position.set(-200, 100, -300); scene.add(fill);
      const back = new THREE.DirectionalLight(0xffffff, 0.3); back.position.set(0, -300, 300); scene.add(back);

      window.addEventListener("resize", resize);

      const canvas = renderer.domElement;
      canvas.addEventListener("click", onClick);
      canvas.addEventListener("mousedown", onPointerDown);
      canvas.addEventListener("mousemove", onPointerMove);
      canvas.addEventListener("mouseup", onPointerUp);
      canvas.addEventListener("touchstart", onPointerDown, {passive: false});
      canvas.addEventListener("touchmove", onPointerMove, {passive: false});
      canvas.addEventListener("touchend", onPointerUp);

      document.getElementById('fileInput').onchange = loadSTLs;
      document.getElementById('saveIssue').onclick = saveIssueFn;
      document.getElementById('deleteIssueBtn').onclick = deleteSelectedIssue;
      addBtn.onclick = () => {
        mode = !mode;
        addBtn.classList.toggle('active', mode);
      };
      document.getElementById('moveIssueBtn').onclick = () => {
        if(!selectedMarker){ alert("Selecciona una esfera de incidencia primero."); return; }
        moveIssueMode = true;
        document.getElementById('moveIssueBtn').classList.add('active');
      };
      document.querySelectorAll('.fab[data-view]').forEach(btn => {
        btn.addEventListener('click', () => setView(btn.dataset.view));
      });
      document.querySelectorAll('.layer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          applyShadingAll(btn.dataset.mode);
        });
      });

      document.getElementById('exportGlobalBtn').onclick = () => exportIssues();
      document.getElementById('importBtn').onclick = () => document.getElementById('importInput').click();
      document.getElementById('importInput').onchange = handleImport;

      // FOTOS
      document.getElementById('btnGallery').onclick = (e) => { e.preventDefault(); document.getElementById('inputGallery').click(); };
      document.getElementById('btnCamera').onclick = (e) => { e.preventDefault(); document.getElementById('inputCamera').click(); };
      document.getElementById('inputGallery').onchange = handlePhotoInput;
      document.getElementById('inputCamera').onchange = handlePhotoInput;
      document.getElementById('lightboxClose').onclick = () => document.getElementById('lightbox').classList.remove('active');
    }

    function resize(){
      camera.aspect = window.innerWidth/window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /* ================== COMPRESIÓN FOTOS ================== */
    function handlePhotoInput(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 1280; 
          let width = img.width; let height = img.height;
          if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
          else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          currentPhotos.push({
            dataUrl: dataUrl, width: Math.round(width), height: Math.round(height), sizeBytes: Math.round(dataUrl.length * (3/4))
          });
          renderPhotoGrid();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
      e.target.value = ''; 
    }

    function renderPhotoGrid() {
      photoGrid.innerHTML = '';
      currentPhotos.forEach((photo, index) => {
        const div = document.createElement('div'); div.className = 'photo-thumb-container';
        const img = document.createElement('img'); img.src = photo.dataUrl; img.className = 'photo-thumb';
        img.onclick = () => { document.getElementById('lightboxImg').src = photo.dataUrl; document.getElementById('lightbox').classList.add('active'); };
        const delBtn = document.createElement('button'); delBtn.className = 'delete-photo-btn'; delBtn.innerHTML = '✕';
        delBtn.onclick = (e) => { e.preventDefault(); currentPhotos.splice(index, 1); renderPhotoGrid(); };
        div.appendChild(img); div.appendChild(delBtn); photoGrid.appendChild(div);
      });
    }

    /* ================== CARGA MÚLTIPLE STL ================== */
    function loadSTLs(e){
      const files = Array.from(e.target.files);
      if(files.length === 0) return;

      files.forEach(file => {
        if(loadedMeshes[file.name]) { console.warn("Ya está cargado", file.name); return; }
        
        const reader = new FileReader();
        reader.onload = (evt) => {
          const loader = new STLLoader();
          const geo = loader.parse(evt.target.result);
          geo.computeVertexNormals();

          let mesh = new THREE.Mesh( geo, new THREE.MeshPhongMaterial({color: 0xffffff, side: THREE.DoubleSide}) );
          mesh.userData.fileName = file.name; // ID crucial
          
          loadedMeshes[file.name] = mesh;
          scene.add(mesh);

          // Cargar sus incidencias del localStorage
          loadIssuesForFile(file.name);
          
          const activeMode = document.querySelector('.layer-btn.active').dataset.mode;
          applyShadingAll(activeMode);
          
          updateFileListUI();
          renderIssues();
          fitCameraGlobal(true);
        };
        reader.readAsArrayBuffer(file);
      });
      document.getElementById('fileNameDisplay').innerText = `${Object.keys(loadedMeshes).length + files.length} Pieza(s) en escena`;
      e.target.value = '';
    }

    /* ================== UI "MIS PIEZAS" ================== */
    function updateFileListUI() {
      fileListUI.innerHTML = "";
      const names = Object.keys(loadedMeshes);
      if(names.length === 0) {
        fileListUI.innerHTML = '<p style="font-size: 13px; color: var(--text-secondary); text-align: center; margin: 10px 0;">No hay piezas en sesión.</p>';
        document.getElementById('fileNameDisplay').innerText = "Añade STLs (soporta múltiples)...";
        return;
      }

      names.forEach(name => {
        const mesh = loadedMeshes[name];
        const isVisible = mesh.visible;

        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `
          <div class="file-item-name" title="${name}">${name}</div>
          <div class="file-item-actions">
            <button class="icon-action-btn ${isVisible ? 'active-eye' : ''}" onclick="toggleMeshVisibility('${name}')" title="${isVisible ? 'Ocultar' : 'Mostrar'}">👁️</button>
            <button class="icon-action-btn" onclick="exportIssues('${name}')" title="Descargar JSON de esta pieza">⬇️</button>
            <button class="icon-action-btn" onclick="removeMesh('${name}')" title="Cerrar pieza">🗑️</button>
          </div>
        `;
        fileListUI.appendChild(item);
      });
    }

    window.toggleMeshVisibility = function(name) {
      if(loadedMeshes[name]) {
        loadedMeshes[name].visible = !loadedMeshes[name].visible;
        // Si hay un helper de aristas, lo ocultamos también
        if(loadedMeshes[name].userData.edgesHelper) {
          loadedMeshes[name].userData.edgesHelper.visible = loadedMeshes[name].visible;
        }
        updateFileListUI();
        renderIssues(); // Solo renderiza marcadores de mallas visibles
      }
    };

    window.removeMesh = function(name) {
      if(loadedMeshes[name]) {
        scene.remove(loadedMeshes[name]);
        if(loadedMeshes[name].userData.edgesHelper) scene.remove(loadedMeshes[name].userData.edgesHelper);
        loadedMeshes[name].geometry.dispose();
        loadedMeshes[name].material.dispose();
        delete loadedMeshes[name];
        
        // Quitar de memoria de sesión (el localStorage NO se borra, por si vuelve a cargar)
        issues = issues.filter(i => i.fileName !== name);
        
        updateFileListUI();
        renderIssues();
        fitCameraGlobal(false);
        document.getElementById('fileNameDisplay').innerText = `${Object.keys(loadedMeshes).length} Pieza(s) en escena`;
      }
    };

    /* ================== CÁMARA GLOBAL ================== */
    function fitCameraGlobal(immediate=true){
      const meshesArray = Object.values(loadedMeshes).filter(m => m.visible);
      if(meshesArray.length === 0) return;

      const combinedBox = new THREE.Box3();
      meshesArray.forEach(m => {
        m.geometry.computeBoundingBox();
        let box = m.geometry.boundingBox.clone();
        box.applyMatrix4(m.matrixWorld);
        combinedBox.union(box);
      });

      combinedBox.getCenter(bounds.center);
      combinedBox.getSize(bounds.size);
      bounds.radius = combinedBox.getBoundingSphere(new THREE.Sphere()).radius;

      const vFov = THREE.MathUtils.degToRad(camera.fov);
      const hFov = 2 * Math.atan(Math.tan(vFov/2)*camera.aspect);
      const dV = bounds.radius/Math.tan(vFov/2);
      const dH = bounds.radius/Math.tan(hFov/2);
      viewDistance = Math.max(dV,dH)*1.2;

      setView("iso", immediate);
    }

    function animateCamera(toPos, toTarget=bounds.center, ms=500){
      const fromPos = camera.position.clone();
      const fromTgt = controls.target.clone();
      const start = performance.now();
      const ease = t => 0.5 - 0.5*Math.cos(Math.PI*t);
      function step(now){
        const p = Math.min(1, (now-start)/ms);
        const e = ease(p);
        camera.position.lerpVectors(fromPos, toPos, e);
        controls.target.lerpVectors(fromTgt, toTarget, e);
        controls.update();
        if(p<1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function setView(kind, immediate=false){
      if(Object.keys(loadedMeshes).length === 0 && kind!=="fit") return;
      const dirs = { iso: new THREE.Vector3(1,1,1).normalize() };
      if(kind==="fit"){
        const dir = camera.position.clone().sub(controls.target).normalize();
        const toPos = bounds.center.clone().addScaledVector(dir, viewDistance);
        return immediate ? (camera.position.copy(toPos), controls.target.copy(bounds.center), controls.update()) : animateCamera(toPos, bounds.center);
      }
      const dir = dirs[kind].clone();
      const toPos = bounds.center.clone().addScaledVector(dir, viewDistance);
      if(immediate){ camera.position.copy(toPos); controls.target.copy(bounds.center); controls.update(); }
      else { animateCamera(toPos, bounds.center); }
    }

    /* ================== SOMBREADO ================== */
    function applyShadingAll(mode){
      Object.values(loadedMeshes).forEach(mesh => {
        mesh.material.wireframe = (mode === "wireframe");
        if(mesh.userData.edgesHelper) {
          scene.remove(mesh.userData.edgesHelper);
          mesh.userData.edgesHelper.geometry.dispose();
          mesh.userData.edgesHelper.material.dispose();
          mesh.userData.edgesHelper = null;
        }
        if(mode==="shadedEdges"){
          const eg = new THREE.EdgesGeometry(mesh.geometry, 15);
          const em = new THREE.LineBasicMaterial({color: 0x444444});
          const helper = new THREE.LineSegments(eg, em);
          helper.visible = mesh.visible;
          mesh.userData.edgesHelper = helper;
          scene.add(helper);
        }
      });
    }

    /* ================== RAYCASTER MULTI ================== */
    function updateMouse(e) {
      const rect = renderer.domElement.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    }
    
    function getIntersection() {
      raycaster.setFromCamera(mouse, camera);
      // Intersectar solo con las mallas VISIBLES
      const visibleMeshes = Object.values(loadedMeshes).filter(m => m.visible);
      return raycaster.intersectObjects(visibleMeshes);
    }

    function onPointerDown(e) {
      isDragging = false; updateMouse(e);
      pressTimer = setTimeout(() => { if(!isDragging && Object.keys(loadedMeshes).length) handleLongPress(); }, 600);
    }
    function onPointerMove(e) { isDragging = true; clearTimeout(pressTimer); }
    function onPointerUp(e) { clearTimeout(pressTimer); }

    function handleLongPress() {
      const hit = getIntersection();
      if(hit.length > 0) {
        if(navigator.vibrate) navigator.vibrate(50);
        const h = hit[0];
        currentPoint = h.point;
        currentNormal = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : null;
        targetFileName = h.object.userData.fileName;
        openNewIssueForm();
      }
    }

    function onClick(event){
      if(isDragging) return;
      updateMouse(event);
      raycaster.setFromCamera(mouse, camera);

      // 1) Esferas
      const markerObjs = [];
      scene.traverse(o => { if(o.userData && o.userData.marker) markerObjs.push(o); });
      const hitMarkers = raycaster.intersectObjects(markerObjs, true);
      if(hitMarkers.length > 0){ selectMarker(hitMarkers[0].object); return; }

      // 2) Mover
      if(moveIssueMode && selectedMarker){
        const hit = getIntersection();
        if(hit.length > 0){
          moveSelectedIssue(hit[0]);
          moveIssueMode = false;
          document.getElementById('moveIssueBtn').classList.remove('active');
        }
        return;
      }

      // 3) Añadir manual con +
      if(mode){
        const hit = getIntersection();
        if(hit.length > 0) {
          const h = hit[0];
          currentPoint = h.point;
          currentNormal = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : null;
          targetFileName = h.object.userData.fileName;
          openNewIssueForm();
        }
      }
    }

    /* ================== LÓGICA INCIDENCIAS ================== */
    function openNewIssueForm() {
      deselectMarker();
      elIssueComment.value = "";
      document.getElementById('issueTargetFile').innerText = `En pieza: ${targetFileName}`;
      currentPhotos = []; renderPhotoGrid();
      
      form.style.display = "block"; window.togglePanel(true);
      mode = false; addBtn.classList.remove('active');
    }

    function selectMarker(marker){
      deselectMarker();
      selectedMarker = marker; marker.scale.set(1.5,1.5,1.5);
      if(marker.material.emissive) marker.material.emissive.set(0x4285F4);
      const issue = issues.find(i => i.id === marker.userData.issueId);
      if(issue){
        document.getElementById('issueTargetFile').innerText = `En pieza: ${issue.fileName}`;
        targetFileName = issue.fileName; // por si guarda cambios
        elIssueType.value = issue.type; elIssueComment.value = issue.comment; elIssueStatus.value = issue.status;
        currentPhotos = issue.photos ? JSON.parse(JSON.stringify(issue.photos)) : [];
        renderPhotoGrid();
        form.style.display = "block"; window.togglePanel(true);
      }
    }

    function deselectMarker() {
      if(selectedMarker){
        selectedMarker.scale.set(1,1,1);
        if(selectedMarker.material.emissive) selectedMarker.material.emissive.set(0x000000);
      }
      selectedMarker = null; form.style.display = "none";
    }

    function deleteSelectedIssue(){
      if(!selectedMarker) return;
      const id = selectedMarker.userData.issueId;
      const fName = issues.find(i => i.id === id).fileName;
      issues = issues.filter(i => i.id !== id);
      saveToStorage(fName); // Actualiza LS de esa pieza
      scene.remove(selectedMarker); selectedMarker.geometry.dispose(); selectedMarker.material.dispose();
      deselectMarker(); renderIssues();
    }

    function moveSelectedIssue(hit){
      if(!selectedMarker) return;
      const issue = issues.find(i => i.id === selectedMarker.userData.issueId);
      if(!issue) return;
      issue.x = hit.point.x; issue.y = hit.point.y; issue.z = hit.point.z;
      if(hit.face) {
        let n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
        issue.normal = {x:n.x, y:n.y, z:n.z};
      }
      // Si movemos de una pieza a otra!
      const oldFileName = issue.fileName;
      issue.fileName = hit.object.userData.fileName; 
      issue.updatedAt = new Date().toISOString(); issue.updatedBy = userName;
      
      selectedMarker.position.copy(hit.point);
      saveToStorage(oldFileName); // Guarda los borrados del viejo
      saveToStorage(issue.fileName); // Guarda insercion en el nuevo
      renderIssues();
    }

    function saveIssueFn(){
      const nowIso = new Date().toISOString();
      if(selectedMarker){
        const issue = issues.find(i => i.id === selectedMarker.userData.issueId);
        if(issue){
          issue.type = elIssueType.value; issue.comment = elIssueComment.value; issue.status = elIssueStatus.value;
          issue.photos = JSON.parse(JSON.stringify(currentPhotos)); issue.updatedAt = nowIso; issue.updatedBy = userName;
          if(saveToStorage(issue.fileName)) { renderIssues(); deselectMarker(); }
          return;
        }
      }
      if(!targetFileName){ alert("Asocia la incidencia a una pieza."); return; }
      const issue = {
        id: (crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now(),
        fileName: targetFileName,
        x: currentPoint.x, y: currentPoint.y, z: currentPoint.z,
        normal: currentNormal ? {x:currentNormal.x, y:currentNormal.y, z:currentNormal.z} : null,
        type: elIssueType.value, comment: elIssueComment.value, status: elIssueStatus.value,
        photos: JSON.parse(JSON.stringify(currentPhotos)),
        createdAt: nowIso, updatedAt: nowIso, createdBy: userName, updatedBy: userName
      };
      issues.push(issue);
      if(saveToStorage(targetFileName)) { renderIssues(); deselectMarker(); } 
      else { issues.pop(); } // revierte si falla la cuota
    }

    function getColor(status){ return status==="open" ? 0xEA4335 : status==="review" ? 0xFBBC04 : 0x34A853; }

    function renderIssues(){
      list.innerHTML = "";
      // Limpiar esferas
      const toRemove = [];
      scene.traverse(obj => { if(obj.userData && obj.userData.marker===true) toRemove.push(obj); });
      toRemove.forEach(obj => { if(obj.parent) obj.parent.remove(obj); obj.geometry.dispose(); obj.material.dispose(); });

      // Agrupar para la lista UI
      const issuesPorPieza = {};
      issues.forEach(i => {
        // Solo renderizamos (3D y UI) si la malla está visible
        if(loadedMeshes[i.fileName] && loadedMeshes[i.fileName].visible) {
          if(!issuesPorPieza[i.fileName]) issuesPorPieza[i.fileName] = [];
          issuesPorPieza[i.fileName].push(i);

          // Crear bolita 3D
          let m = new THREE.Mesh(new THREE.SphereGeometry(2,16,16), new THREE.MeshStandardMaterial({color: getColor(i.status)}));
          m.position.set(i.x, i.y, i.z); m.userData = { marker: true, issueId: i.id };
          scene.add(m);
        }
      });

      if(Object.keys(issuesPorPieza).length === 0) {
        list.innerHTML = '<p style="font-size: 13px; color: var(--text-secondary); text-align: center;">No hay incidencias visibles.</p>';
        return;
      }

      for(const [fileName, fileIssues] of Object.entries(issuesPorPieza)) {
        let header = document.createElement("div");
        header.style.cssText = "font-size: 11px; font-weight: bold; color: var(--primary-blue); margin: 12px 0 6px 0; text-transform: uppercase;";
        header.innerText = fileName;
        list.appendChild(header);

        fileIssues.forEach(i => {
          let el = document.createElement("div"); el.className = "issue";
          let cHex = '#' + getColor(i.status).toString(16).padStart(6, '0');
          const cText = (i.comment && i.comment.trim().length > 0) ? i.comment : 'Sin comentario';
          const pBadge = (i.photos && i.photos.length > 0) ? `<span style="font-size:10px; background:#e8eaed; color:#5f6368; padding:2px 6px; border-radius:10px; margin-left:6px;">📸 ${i.photos.length}</span>` : '';
          el.innerHTML = `<div style="flex-grow:1;"><strong style="font-size:14px;">${i.type}</strong> ${pBadge}<br><span style="color:var(--text-secondary); font-size:12px;">${cText}</span></div><div class="status-dot" style="background-color: ${cHex};"></div>`;
          el.onclick = () => {
            controls.target.set(i.x, i.y, i.z);
            animateCamera(new THREE.Vector3(i.x+50, i.y+50, i.z+50), new THREE.Vector3(i.x, i.y, i.z));
            let target = null; scene.traverse(o => { if(o.userData && o.userData.marker && o.userData.issueId===i.id) target=o; });
            if(target) selectMarker(target);
          };
          list.appendChild(el);
        });
      }
    }

    // === PERSISTENCIA ===
    function loadIssuesForFile(fileName){
      const saved = JSON.parse(localStorage.getItem(storageKey(fileName)) || '[]');
      // Añadimos al global evitando duplicados por si se llama 2 veces
      saved.forEach(s => { if(!issues.find(i => i.id === s.id)) issues.push(s); });
    }

    function saveToStorage(fileName){
      try {
        const fileIssues = issues.filter(i => i.fileName === fileName);
        localStorage.setItem(storageKey(fileName), JSON.stringify(fileIssues));
        return true;
      } catch (e) {
        if (e.name === 'QuotaExceededError') alert("⚠️ Almacenamiento lleno. No se ha podido guardar debido al peso de las fotos.");
        else alert("⚠️ Error al guardar: " + e.message);
        return false;
      }
    }

    // === EXPORTAR / IMPORTAR ===
    window.exportIssues = function(singleFileName = null) {
      if(Object.keys(loadedMeshes).length === 0) { alert("Carga piezas primero."); return; }
      
      const filesToExport = singleFileName ? [singleFileName] : Object.keys(loadedMeshes);
      const issuesToExport = singleFileName ? issues.filter(i => i.fileName === singleFileName) : issues;

      const payload = {
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        filesIncluded: filesToExport,
        issues: issuesToExport
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = singleFileName ? `issues_${singleFileName}.json` : `issues_sesion_global.json`;
      a.click(); URL.revokeObjectURL(a.href);
    }

    function handleImport(e){
      const file = e.target.files[0]; if(!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if(!data || !Array.isArray(data.issues)) throw new Error('Estructura JSON no válida.');
          
          let affectedFiles = new Set();
          data.issues.forEach(i => {
             const fname = i.fileName || 'desconocido';
             affectedFiles.add(fname);
             // Reemplazar o actualizar en el array global si está cargado
             const idx = issues.findIndex(old => old.id === i.id);
             if(idx >= 0) issues[idx] = i; else issues.push(i);
          });
          
          affectedFiles.forEach(fname => saveToStorage(fname));
          renderIssues();
          alert("Importación correcta. Si las piezas están en pantalla, verás sus marcadores.");
        } catch(err){
          if(err.name === 'QuotaExceededError') alert('⚠️ El archivo llenó el almacenamiento local.');
          else alert('Error al importar: ' + err.message);
        } finally { e.target.value = ''; }
      };
      reader.readAsText(file);
    }

    function animate(){ requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); }
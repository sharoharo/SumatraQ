// js/filtros.js
import { State } from './estado.js';

// 1. Estado centralizado de los filtros
State.filters = {
  status: 'all',
  priority: 'all',
  user: 'all',
  type: 'all',
  dateFrom: '',
  dateTo: ''
};

// 2. Actualizar desde los desplegables o chips
export function updateFilters(key, value, btnElement = null) {
  State.filters[key] = value;
  
  if (btnElement) {
    const container = btnElement.parentElement;
    container.querySelectorAll('.filter-chip').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
  }

  // --- NUEVO: Control del botón "Mis Puntos" ---
  if (key === 'user') {
      const btnMis = document.getElementById('btnMisPuntos');
      const selectUser = document.getElementById('filterUser');
      
      if (btnMis) {
          // Si el usuario seleccionado soy yo, le pongo el borde negro al muñequito
          if (value === State.userName && value !== 'all') {
              btnMis.classList.add('active');
          } else {
              btnMis.classList.remove('active');
          }
      }
      // Sincronizar el select visualmente si pulsamos el botón
      if (selectUser && value !== selectUser.value) {
          const optionExists = Array.from(selectUser.options).some(opt => opt.value === value);
          if (optionExists) selectUser.value = value;
      }
  }
  // ---------------------------------------------
  
  // Repintamos el 3D y la lista
  if (window.renderIssues) window.renderIssues();
}

// 3. Limpiar todos los filtros
export function clearAllFilters() {
  State.filters = { status: 'all', priority: 'all', user: 'all', type: 'all', dateFrom: '', dateTo: '' };
  
  document.querySelectorAll('#filterStatusContainer .filter-chip, #filterPriorityContainer .filter-chip').forEach(btn => btn.classList.remove('active'));
  const allStatusBtn = document.querySelector('#filterStatusContainer .filter-chip[data-val="all"]');
  const allPrioBtn = document.querySelector('#filterPriorityContainer .filter-chip[data-val="all"]');
  if (allStatusBtn) allStatusBtn.classList.add('active');
  if (allPrioBtn) allPrioBtn.classList.add('active');

  const filterUser = document.getElementById('filterUser');
  const filterType = document.getElementById('filterType');
  const filterDateFrom = document.getElementById('filterDateFrom');
  const filterDateTo = document.getElementById('filterDateTo');
  const btnMis = document.getElementById('btnMisPuntos');
  
  if(filterUser) filterUser.value = 'all';
  if(filterType) filterType.value = 'all';
  if(filterDateFrom) filterDateFrom.value = '';
  if(filterDateTo) filterDateTo.value = '';
  if (btnMis) btnMis.classList.remove('active');
  if (window.renderIssues) window.renderIssues();
  if (window.asistenteVoz) window.asistenteVoz("Filtros limpiados.");
}

// 4. El "Juez Universal" - A PRUEBA DE BALAS
export function passesFilters(issue) {
    try {
        // 1. ESTADO
        if (State.filters.status !== 'all' && issue.status !== State.filters.status) return false;

        // 2. PRIORIDAD
        if (State.filters.priority !== 'all' && issue.priority !== State.filters.priority) return false;

        // 3. USUARIO (Ignora mayúsculas, espacios y busca en el historial)
        if (State.filters.user !== 'all') {
            const filtroUsr = String(State.filters.user).trim().toLowerCase();
            const creador = issue.user ? String(issue.user).trim().toLowerCase() : "";
            
            // Comprobamos si es el creador
            const esCreador = (creador === filtroUsr);
            
            // Comprobamos si ha participado en el historial
            const estaEnHistorial = issue.history && issue.history.some(h => {
                return h.user && String(h.user).trim().toLowerCase() === filtroUsr;
            });

            if (!esCreador && !estaEnHistorial) return false;
        }

        // 4. TIPO DE FALLA (Ignora mayúsculas y espacios)
        if (State.filters.type !== 'all') {
            const filtroTipo = String(State.filters.type).trim().toLowerCase();
            const tipoIncidencia = issue.type ? String(issue.type).trim().toLowerCase() : "";
            
            if (tipoIncidencia !== filtroTipo) return false;
        }
        
        // 5. FECHAS (Protegido contra incidencias sin fecha)
        if (State.filters.dateFrom || State.filters.dateTo) {
            const issueDateRaw = issue.date || (issue.history && issue.history.length > 0 ? issue.history[0].date : null);
            if (!issueDateRaw) return false; 

            const issueDate = new Date(issueDateRaw);
            if (isNaN(issueDate.getTime())) return false; // Protegido contra fechas corruptas

            if (State.filters.dateFrom) {
                const fromDate = new Date(State.filters.dateFrom);
                fromDate.setHours(0, 0, 0, 0); // Desde las 00:00 del día inicial
                if (issueDate < fromDate) return false;
            }
            if (State.filters.dateTo) {
                const toDate = new Date(State.filters.dateTo);
                toDate.setHours(23, 59, 59, 999); // Hasta las 23:59 del día final
                if (issueDate > toDate) return false;
            }
        }

        return true; // Superó todos los filtros
        
    } catch (error) {
        console.warn("Fallo al filtrar incidencia (datos antiguos), mostrándola por seguridad:", error);
        return true; 
    }
}

// 5. Poblar combos leyendo la base de datos real
export function populateFilterSelects() {
    const userSelect = document.getElementById('filterUser');
    const typeSelect = document.getElementById('filterType');
    if (!userSelect || !typeSelect) return;

    // LEER USUARIOS DE LA BASE DE DATOS
    let listaUsuarios = [];
    if (State.db && State.db.usuarios && State.db.usuarios.length > 0) {
        listaUsuarios = [...new Set(State.db.usuarios.map(u => u.Nombre || u.nombre).filter(Boolean))];
    } else {
        listaUsuarios = [...new Set(State.issues.map(i => i.user).filter(Boolean))]; // Fallback
    }

    // LEER TIPOS DE FALLA DE LA BASE DE DATOS
    let listaTipos = [];
    if (State.db && State.db.tiposIncidencias && State.db.tiposIncidencias.length > 0) {
        listaTipos = [...new Set(State.db.tiposIncidencias.map(inc => inc.Nombre_Falla || inc.ID).filter(Boolean))];
    } else {
        listaTipos = [...new Set(State.issues.map(i => i.type).filter(Boolean))]; // Fallback
    }

    const currentUser = State.filters.user;
    const currentType = State.filters.type;

    userSelect.innerHTML = '<option value="all">Todos los usuarios</option>';
    listaUsuarios.sort().forEach(u => userSelect.innerHTML += `<option value="${u}">${u}</option>`);
    userSelect.value = currentUser;

    typeSelect.innerHTML = '<option value="all">Todos los tipos</option>';
    listaTipos.sort().forEach(t => typeSelect.innerHTML += `<option value="${t}">${t}</option>`);
    typeSelect.value = currentType;
}

// 6. Botón rápido: Mis Puntos
export function toggleMisPuntos() {
    const btn = document.getElementById('btnMisPuntos');
    const select = document.getElementById('filterUser');
    const miNombre = State.userName || "Anónimo";

    if (btn && btn.classList.contains('active')) {
        // Si ya está activo (borde negro), lo apagamos
        if (select) select.value = 'all';
        updateFilters('user', 'all');
    } else {
        // Si está apagado, filtramos por nuestro nombre
        updateFilters('user', miNombre);
    }
}

// ==========================================
// 🚨 ¡SÚPER IMPORTANTE! NO BORRES ESTAS LÍNEAS 🚨
// Estas líneas entregan las funciones al HTML (a tus onchange/onclick)
// ==========================================
window.updateFilters = updateFilters;
window.clearAllFilters = clearAllFilters;
window.toggleMisPuntos = toggleMisPuntos; // <--- LA LÍNEA CRÍTICA
window.setAdvancedFilter = function(type, value) {
    const selector = `.filter-chip[data-filter-type="${type}"][data-val="${value}"]`;
    const btn = document.querySelector(selector);
    updateFilters(type, value, btn);
};
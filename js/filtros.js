// js/filtros.js
import { State } from './estado.js';

// 1. Estado centralizado de los filtros (¡AHORA CON LOS 4 NIVELES!)
State.filters = {
  status: 'all',
  priority: 'all',
  user: 'all',
  type: 'all',
  fase: 'all',       // NUEVO NIVEL 1
  actividad: 'all',  // NUEVO NIVEL 2
  subfase: 'all',    // NUEVO NIVEL 3
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

  // --- Control del botón "Mis Puntos" (INTACTO) ---
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

// 3. Limpiar todos los filtros (ACTUALIZADO CON 4 NIVELES)
export function clearAllFilters() {
  State.filters = { status: 'all', priority: 'all', user: 'all', type: 'all', fase: 'all', actividad: 'all', subfase: 'all', dateFrom: '', dateTo: '' };
  
  document.querySelectorAll('#filterStatusContainer .filter-chip, #filterPriorityContainer .filter-chip').forEach(btn => btn.classList.remove('active'));
  const allStatusBtn = document.querySelector('#filterStatusContainer .filter-chip[data-val="all"]');
  const allPrioBtn = document.querySelector('#filterPriorityContainer .filter-chip[data-val="all"]');
  if (allStatusBtn) allStatusBtn.classList.add('active');
  if (allPrioBtn) allPrioBtn.classList.add('active');

  const filterUser = document.getElementById('filterUser');
  const filterType = document.getElementById('filterType');
  // Nuevos selects
  const filterFase = document.getElementById('filterFase');
  const filterActividad = document.getElementById('filterActividad');
  const filterSubfase = document.getElementById('filterSubfase');
  
  const filterDateFrom = document.getElementById('filterDateFrom');
  const filterDateTo = document.getElementById('filterDateTo');
  const btnMis = document.getElementById('btnMisPuntos');
  
  if(filterUser) filterUser.value = 'all';
  if(filterType) filterType.value = 'all';
  if(filterFase) filterFase.value = 'all';
  if(filterActividad) filterActividad.value = 'all';
  if(filterSubfase) filterSubfase.value = 'all';
  if(filterDateFrom) filterDateFrom.value = '';
  if(filterDateTo) filterDateTo.value = '';
  if (btnMis) btnMis.classList.remove('active');

  if (window.renderIssues) window.renderIssues();
  if (window.asistenteVoz) window.asistenteVoz("Filtros limpiados.");
}

// 4. El "Juez Universal" - A PRUEBA DE BALAS (TU LÓGICA + 4 NIVELES)
export function passesFilters(issue) {
    try {
        // 0. BUSCADOR DE TEXTO LIBRE
        if (State.filters.search && State.filters.search !== '') {
            const term = State.filters.search.toLowerCase();
            const matchId = (issue.id || '').toLowerCase().includes(term);
            const matchComment = (issue.comment || '').toLowerCase().includes(term);
            if (!matchId && !matchComment) return false;
        }
        // 1. ESTADO
        if (State.filters.status !== 'all' && issue.status !== State.filters.status) return false;

        // 2. PRIORIDAD
        if (State.filters.priority !== 'all' && issue.priority !== State.filters.priority) return false;

        // 3. USUARIO (Tu búsqueda profunda en historial)
        if (State.filters.user !== 'all') {
            const filtroUsr = String(State.filters.user).trim().toLowerCase();
            const creador = issue.user ? String(issue.user).trim().toLowerCase() : "";
            
            const esCreador = (creador === filtroUsr);
            const estaEnHistorial = issue.history && issue.history.some(h => {
                return h.user && String(h.user).trim().toLowerCase() === filtroUsr;
            });

            if (!esCreador && !estaEnHistorial) return false;
        }

        // 4. LOS 4 NIVELES (La nueva magia)
        if (State.filters.fase !== 'all' && issue.fase !== State.filters.fase) return false;
        if (State.filters.actividad !== 'all' && issue.actividad !== State.filters.actividad) return false;
        if (State.filters.subfase !== 'all' && issue.subfase !== State.filters.subfase) return false;
        
        // El tipo de falla lo procesamos con tu sistema de ignorar mayúsculas
        if (State.filters.type !== 'all') {
            const filtroTipo = String(State.filters.type).trim().toLowerCase();
            const tipoIncidencia = issue.type ? String(issue.type).trim().toLowerCase() : "";
            
            if (tipoIncidencia !== filtroTipo) return false;
        }
        
        // 5. FECHAS (Tu protección contra fallos)
        if (State.filters.dateFrom || State.filters.dateTo) {
            const issueDateRaw = issue.date || (issue.history && issue.history.length > 0 ? issue.history[0].date : null);
            if (!issueDateRaw) return false; 

            const issueDate = new Date(issueDateRaw);
            if (isNaN(issueDate.getTime())) return false; 

            if (State.filters.dateFrom) {
                const fromDate = new Date(State.filters.dateFrom);
                fromDate.setHours(0, 0, 0, 0); 
                if (issueDate < fromDate) return false;
            }
            if (State.filters.dateTo) {
                const toDate = new Date(State.filters.dateTo);
                toDate.setHours(23, 59, 59, 999); 
                if (issueDate > toDate) return false;
            }
        }

        return true; 
        
    } catch (error) {
        console.warn("Fallo al filtrar incidencia (datos antiguos), mostrándola por seguridad:", error);
        return true; 
    }
}

// 5. Poblar combos leyendo la base de datos real (TU LÓGICA + LOS NUEVOS NIVELES)
export function populateFilterSelects() {
    const userSelect = document.getElementById('filterUser');
    const typeSelect = document.getElementById('filterType');
    
    // Selects de los nuevos niveles
    const faseSelect = document.getElementById('filterFase');
    const actividadSelect = document.getElementById('filterActividad');
    const subfaseSelect = document.getElementById('filterSubfase');

    // --- LEER USUARIOS DE LA BASE DE DATOS (Intacto) ---
    let listaUsuarios = [];
    if (State.db && State.db.usuarios && State.db.usuarios.length > 0) {
        listaUsuarios = [...new Set(State.db.usuarios.map(u => u.Nombre || u.nombre).filter(Boolean))];
    } else {
        listaUsuarios = [...new Set(State.issues.map(i => i.user).filter(Boolean))]; 
    }

    // --- LEER TIPOS DE FALLA (Intacto) ---
    let listaTipos = [];
    if (State.db && State.db.tiposIncidencias && State.db.tiposIncidencias.length > 0) {
        listaTipos = [...new Set(State.db.tiposIncidencias.map(inc => inc.Nombre_Falla || inc.ID).filter(Boolean))];
    } else {
        listaTipos = [...new Set(State.issues.map(i => i.type).filter(Boolean))]; 
    }

    // --- LEER FASES, ACTIVIDADES Y SUBFASES DE LAS INCIDENCIAS CREADAS ---
    const listaFases = [...new Set(State.issues.map(i => i.fase).filter(Boolean))];
    const listaActividades = [...new Set(State.issues.map(i => i.actividad).filter(Boolean).filter(a => a !== 'N/A'))];
    const listaSubfases = [...new Set(State.issues.map(i => i.subfase).filter(Boolean).filter(s => s !== 'N/A'))];

    // VOLCAR DATOS A LOS SELECTS
    if (userSelect) {
        userSelect.innerHTML = '<option value="all">Todos los usuarios</option>';
        listaUsuarios.sort().forEach(u => userSelect.innerHTML += `<option value="${u}">${u}</option>`);
        userSelect.value = State.filters.user;
    }

    if (typeSelect) {
        typeSelect.innerHTML = '<option value="all">Todos los tipos</option>';
        listaTipos.sort().forEach(t => typeSelect.innerHTML += `<option value="${t}">${t}</option>`);
        typeSelect.value = State.filters.type;
    }

    if (faseSelect) {
        faseSelect.innerHTML = '<option value="all">Todas las fases</option>';
        listaFases.sort().forEach(f => faseSelect.innerHTML += `<option value="${f}">${f}</option>`);
        faseSelect.value = State.filters.fase;
    }

    if (actividadSelect) {
        actividadSelect.innerHTML = '<option value="all">Todas las actividades</option>';
        listaActividades.sort().forEach(a => actividadSelect.innerHTML += `<option value="${a}">${a}</option>`);
        actividadSelect.value = State.filters.actividad;
    }

    if (subfaseSelect) {
        subfaseSelect.innerHTML = '<option value="all">Todas las subfases</option>';
        listaSubfases.sort().forEach(s => subfaseSelect.innerHTML += `<option value="${s}">${s}</option>`);
        subfaseSelect.value = State.filters.subfase;
    }
}

// 6. Botón rápido: Mis Puntos (INTACTO)
export function toggleMisPuntos() {
    const btn = document.getElementById('btnMisPuntos');
    const select = document.getElementById('filterUser');
    const miNombre = State.userName || "Anónimo";

    if (btn && btn.classList.contains('active')) {
        if (select) select.value = 'all';
        updateFilters('user', 'all');
    } else {
        updateFilters('user', miNombre);
    }
}

// ==========================================
// 🚨 ¡SÚPER IMPORTANTE! NO BORRES ESTAS LÍNEAS 🚨
// ==========================================
window.updateFilters = updateFilters;
window.clearAllFilters = clearAllFilters;
window.toggleMisPuntos = toggleMisPuntos; 
window.setAdvancedFilter = function(type, value) {
    const selector = `.filter-chip[data-filter-type="${type}"][data-val="${value}"]`;
    const btn = document.querySelector(selector);
    updateFilters(type, value, btn);
};
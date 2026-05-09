// js/filtros.js
import { State } from './estado.js';

// 1. Estado centralizado de los filtros
State.filters = {
  status: 'all', priority: 'all', user: 'all', type: 'all',
  fase: 'all', actividad: 'all', subfase: 'all', dateFrom: '', dateTo: '', search: ''
};

// 2. Actualizar desde los desplegables o chips
export function updateFilters(key, value, btnElement = null) {
  State.filters[key] = value;
  
  if (btnElement) {
    const container = btnElement.parentElement;
    container.querySelectorAll('.filter-chip').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
  }

  // Control del botón "Mis Puntos"
  if (key === 'user') {
      const btnMis = document.getElementById('btnMisPuntos');
      const selectUser = document.getElementById('filterUser');
      if (btnMis) {
          if (value === State.userName && value !== 'all') btnMis.classList.add('active');
          else btnMis.classList.remove('active');
      }
      if (selectUser && value !== selectUser.value) {
          const optionExists = Array.from(selectUser.options).some(opt => opt.value === value);
          if (optionExists) selectUser.value = value;
      }
  }
  
  if (window.renderIssues) window.renderIssues();
  actualizarIconoFiltro();
}

// 3. Limpiar todos los filtros
export function clearAllFilters() {
  State.filters = { status: 'all', priority: 'all', user: 'all', type: 'all', fase: 'all', actividad: 'all', subfase: 'all', dateFrom: '', dateTo: '', search: '' };
  
  document.querySelectorAll('#filterStatusContainer .filter-chip, #filterPriorityContainer .filter-chip, .date-quick-btn').forEach(btn => btn.classList.remove('active'));
  const allStatusBtn = document.querySelector('#filterStatusContainer .filter-chip[data-val="all"]');
  const allPrioBtn = document.querySelector('#filterPriorityContainer .filter-chip[data-val="all"]');
  if (allStatusBtn) allStatusBtn.classList.add('active');
  if (allPrioBtn) allPrioBtn.classList.add('active');

  const inputs = ['filterUser', 'filterType', 'filterFase', 'filterActividad', 'filterSubfase', 'filterSearch', 'filterDateFrom', 'filterDateTo'];
  inputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = (id.includes('Date') || id === 'filterSearch') ? '' : 'all';
  });

  const btnMis = document.getElementById('btnMisPuntos');
  if (btnMis) btnMis.classList.remove('active');

  if (window.renderIssues) window.renderIssues();
  if (window.asistenteVoz) window.asistenteVoz("Filtros limpiados.");
  actualizarIconoFiltro();
}

// 4. El "Juez Universal"
export function passesFilters(issue) {
    try {
        if (State.filters.search && State.filters.search !== '') {
            const term = State.filters.search.toLowerCase();
            const matchId = (issue.id || '').toLowerCase().includes(term);
            const matchComment = (issue.comment || '').toLowerCase().includes(term);
            if (!matchId && !matchComment) return false;
        }
        if (State.filters.status !== 'all' && issue.status !== State.filters.status) return false;
        if (State.filters.priority !== 'all' && issue.priority !== State.filters.priority) return false;

        if (State.filters.user !== 'all') {
            const filtroUsr = String(State.filters.user).trim().toLowerCase();
            const creador = issue.user ? String(issue.user).trim().toLowerCase() : "";
            const esCreador = (creador === filtroUsr);
            const estaEnHistorial = issue.history && issue.history.some(h => h.user && String(h.user).trim().toLowerCase() === filtroUsr);
            if (!esCreador && !estaEnHistorial) return false;
        }

        if (State.filters.fase !== 'all' && issue.fase !== State.filters.fase) return false;
        if (State.filters.actividad !== 'all' && issue.actividad !== State.filters.actividad) return false;
        if (State.filters.subfase !== 'all' && issue.subfase !== State.filters.subfase) return false;
        
        if (State.filters.type !== 'all') {
            const filtroTipo = String(State.filters.type).trim().toLowerCase();
            const tipoIncidencia = issue.type ? String(issue.type).trim().toLowerCase() : "";
            if (tipoIncidencia !== filtroTipo) return false;
        }
        
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
        console.warn("Fallo al filtrar incidencia, mostrándola por seguridad:", error);
        return true; 
    }
}

// 5. Poblar combos leyendo de la escena (YA SIN LETRAS NEGRAS)
export function populateFilterSelects() {
    const userSelect = document.getElementById('filterUser');
    const typeSelect = document.getElementById('filterType');
    const faseSelect = document.getElementById('filterFase');
    const actividadSelect = document.getElementById('filterActividad');
    const subfaseSelect = document.getElementById('filterSubfase');

    let listaUsuarios = [];
    if (State.db && State.db.usuarios && State.db.usuarios.length > 0) {
        listaUsuarios = [...new Set(State.db.usuarios.map(u => u.Nombre || u.nombre).filter(Boolean))];
    } else {
        listaUsuarios = [...new Set(State.issues.map(i => i.user).filter(Boolean))]; 
    }

    const listaFases = [...new Set(State.issues.map(i => i.fase).filter(Boolean))];
    const listaActividades = [...new Set(State.issues.map(i => i.actividad).filter(Boolean).filter(a => a !== 'N/A'))];
    const listaSubfases = [...new Set(State.issues.map(i => i.subfase).filter(Boolean).filter(s => s !== 'N/A'))];
    const listaTipos = [...new Set(State.issues.map(i => i.type).filter(Boolean).filter(t => t !== 'Sin clasificar'))];

    if (userSelect) {
        userSelect.innerHTML = '<option value="all">Todos los usuarios</option>';
        listaUsuarios.sort().forEach(u => userSelect.innerHTML += `<option value="${u}">${u}</option>`);
        userSelect.value = State.filters.user;
    }
    if (typeSelect) {
        typeSelect.innerHTML = '<option value="all">Todos los defectos</option>';
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

// 6. Botón rápido: Mis Puntos
export function toggleMisPuntos() {
    const btn = document.getElementById('btnMisPuntos');
    const select = document.getElementById('filterUser');
    if (btn && btn.classList.contains('active')) {
        if (select) select.value = 'all';
        updateFilters('user', 'all');
    } else {
        updateFilters('user', State.userName || "Anónimo");
    }
}

// 7. Lógica de los botones de fechas rápidas
export function setQuickDate(range, btnElement) {
    const fromInput = document.getElementById('filterDateFrom');
    const toInput = document.getElementById('filterDateTo');
    const today = new Date();
    let fromDate = new Date();
    let toDate = new Date();

    if (range === 'hoy') {
        // Hoy a hoy
    } else if (range === 'ayer') {
        fromDate.setDate(today.getDate() - 1);
        toDate.setDate(today.getDate() - 1);
    } else if (range === 'semana') {
        fromDate.setDate(today.getDate() - 7);
    } else if (range === 'mes') {
        fromDate.setMonth(today.getMonth() - 1);
    }

    const fromStr = fromDate.toISOString().split('T')[0];
    const toStr = toDate.toISOString().split('T')[0];

    if (fromInput) fromInput.value = fromStr;
    if (toInput) toInput.value = toStr;

    State.filters.dateFrom = fromStr;
    State.filters.dateTo = toStr;

    document.querySelectorAll('.date-quick-btn').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    if (window.renderIssues) window.renderIssues();
    actualizarIconoFiltro();
}

// 8. Feedback de Estado (Chivato Amarillo)
function actualizarIconoFiltro() {
    const f = State.filters;
    const btnFiltro = document.getElementById('btnOpenFilterPanel');
    if (!btnFiltro) return;

    const hayFiltroActivo = (
        (f.status && f.status !== 'all') || (f.priority && f.priority !== 'all') || 
        (f.user && f.user !== 'all') || (f.type && f.type !== 'all') || 
        (f.fase && f.fase !== 'all') || (f.actividad && f.actividad !== 'all') || 
        (f.subfase && f.subfase !== 'all') || (f.dateFrom && f.dateFrom !== '') || 
        (f.dateTo && f.dateTo !== '') || (f.search && f.search !== '')
    );

    if (hayFiltroActivo) btnFiltro.classList.add('filter-active');
    else btnFiltro.classList.remove('filter-active');
}

// ==========================================
// 🚨 EXPORTACIONES A LA VENTANA GLOBAL 🚨
// ==========================================
window.updateFilters = updateFilters;
window.clearAllFilters = clearAllFilters;
window.toggleMisPuntos = toggleMisPuntos; 
window.setQuickDate = setQuickDate;
window.setAdvancedFilter = function(type, value) {
    const selector = `.filter-chip[data-filter-type="${type}"][data-val="${value}"]`;
    const btn = document.querySelector(selector);
    updateFilters(type, value, btn);
};
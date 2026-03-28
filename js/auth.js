// js/auth.js
import { CONFIG, State } from './estado.js';

export async function fetchDatabase() {
  const btn = document.getElementById('loginBtn');
  if (btn) { btn.innerText = "⏳ Conectando con Google..."; btn.disabled = true; }
  
  try {
    const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL);
    const textData = await response.text(); 
    
    try {
      const data = JSON.parse(textData);
      
      State.db.usuarios = data.usuarios || [];
      State.db.tiposIncidencias = data.tiposIncidencias || [];
      State.db.repositorioPiezas = data.repositorioPiezas || [];
      State.db.incidenciasRegistradas = data.incidenciasRegistradas || [];
      
      // Llenamos el desplegable de incidencias
      const elIssueType = document.getElementById('issueType');
      if (elIssueType && State.db.tiposIncidencias.length > 0) {
        elIssueType.innerHTML = "";
        State.db.tiposIncidencias.forEach(inc => {
          const option = document.createElement('option');
          option.value = inc.Nombre_Falla || inc.ID;
          option.textContent = `${inc.ID ? inc.ID + ' - ' : ''}${inc.Nombre_Falla || 'Sin Nombre'}`;
          elIssueType.appendChild(option);
        });
      }
      
      if (btn) { btn.innerText = "Entrar al Sistema"; btn.disabled = false; }
      console.log("✅ Base de Datos Sincronizada Correctamente");
      
    } catch (parseError) {
      console.error("❌ Google bloqueó la petición. Recibimos HTML en vez de datos.");
      if (btn) { btn.innerText = "Error Permisos (Modo Local)"; btn.disabled = false; }
      alert("⚠️ Google está bloqueando la conexión. Asegúrate de que tu Apps Script sea público.");
    }
    
  } catch (error) {
    console.error("❌ Error de red:", error);
    if (btn) { btn.innerText = "Error Red (Modo Local)"; btn.disabled = false; }
  }
}

export function processLogin() {
  const emailInput = document.getElementById('loginEmail')?.value.trim().toLowerCase();
  const passInput = document.getElementById('loginPassword')?.value.trim();
  
  if (!emailInput || !passInput) { 
    alert("Introduce email y contraseña."); 
    return; 
  }

  // MODO EMERGENCIA: Si la nube está vacía por un error, entramos en local
  if (State.db.usuarios.length === 0) {
    State.userName = emailInput.split('@')[0] || "Admin";
    localStorage.setItem('userName', State.userName);
    checkAuthStatus();
    return;
  }

  const userMatch = State.db.usuarios.find(u => {
    const uEmail = String(u.Email || u.email || "").trim().toLowerCase();
    const uPass = String(u.Password || u.password || "").trim();
    return uEmail === emailInput && uPass === passInput;
  });

  if (userMatch) {
    State.userName = userMatch.Nombre || userMatch.nombre || "Usuario";
    localStorage.setItem('userName', State.userName);
    checkAuthStatus();
  } else {
    alert("❌ Credenciales incorrectas. Revisa tu Excel.");
  }
}

export function processLogout() {
  localStorage.removeItem('userName');
  State.userName = "";
  location.reload(); 
}

export function checkAuthStatus() {
  State.userName = localStorage.getItem('userName') || "";
  const overlay = document.getElementById('loginOverlay');
  
  if (!State.userName) {
    if (overlay) overlay.style.display = 'flex';
  } else {
    if (overlay) overlay.style.display = 'none';
    if (document.getElementById('currentUserDisplay')) {
      document.getElementById('currentUserDisplay').innerText = State.userName;
    }
    if (document.getElementById('userAvatarLetter')) {
      document.getElementById('userAvatarLetter').innerText = State.userName.charAt(0).toUpperCase();
    }
  }
}
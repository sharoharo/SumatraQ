// js/voz.js

// ==========================================
// MOTOR DE VOZ GLOBAL (J.A.R.V.I.S)
// ==========================================
window.asistenteVoz = function(texto) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const mensaje = new SpeechSynthesisUtterance(texto);
        
        mensaje.lang = 'es-ES'; 
        mensaje.rate = 1.0;     
        mensaje.pitch = 1.0;    
        mensaje.volume = 1.0;   
        
        window.speechSynthesis.speak(mensaje);
    } else {
        console.warn("Tu navegador no soporta síntesis de voz.");
    }
};
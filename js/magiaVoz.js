// js/magiaVoz.js
import { State } from './estado.js';

export function initMagiaVoz() {
    const btnVoice = document.getElementById('btnMagicVoice');
    const voiceStatusText = document.getElementById('voiceStatus');
    const filterPanel = document.getElementById('filterPanelOverlay');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition && btnVoice) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        recognition.interimResults = false;

        // 🔐 EL CANDADO: Controlamos si ya estamos escuchando
        let isListening = false;

        btnVoice.addEventListener('click', () => {
            if (!isListening) {
                try {
                    recognition.start();
                } catch (error) {
                    console.warn("El micrófono ya estaba en uso.");
                }
            } else {
                // Si ya estaba escuchando y pulsan el botón, lo detenemos (toggle)
                recognition.stop();
            }
        });

        recognition.onstart = () => {
            isListening = true;
            btnVoice.classList.add('listening');
            voiceStatusText.textContent = "Escuchando... Di un comando.";
            voiceStatusText.style.color = "#e94335";
        };

        recognition.onend = () => {
            isListening = false;
            btnVoice.classList.remove('listening');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            voiceStatusText.textContent = `Dijiste: "${transcript}"`;
            voiceStatusText.style.color = "#333";

            let understood = false;

            // 1. Detectar Estado
            if (transcript.includes('abierta') || transcript.includes('abierto')) { window.updateFilters('status', 'open'); understood = true; }
            else if (transcript.includes('revisión') || transcript.includes('revision')) { window.updateFilters('status', 'review'); understood = true; }
            else if (transcript.includes('cerrada') || transcript.includes('cerrado')) { window.updateFilters('status', 'closed'); understood = true; }
            else if (transcript.includes('todos los estados')) { window.updateFilters('status', 'all'); understood = true; }

            // 2. Detectar Prioridad
            if (transcript.includes('prio 1') || transcript.includes('prioridad 1') || transcript.includes('top') || transcript.includes('urgente')) { window.updateFilters('priority', 'prio1'); understood = true; }
            else if (transcript.includes('alta')) { window.updateFilters('priority', 'alta'); understood = true; }
            else if (transcript.includes('media')) { window.updateFilters('priority', 'media'); understood = true; }

            // 3. Detectar Usuario (DINÁMICO DESDE LA BASE DE DATOS)
            if (State.db && State.db.usuarios) {
                const foundUser = State.db.usuarios.find(u => {
                    const nombre = (u.Nombre || u.nombre || "").toLowerCase();
                    return nombre && transcript.includes(nombre);
                });
                if (foundUser) { window.updateFilters('user', foundUser.Nombre || foundUser.nombre); understood = true; }
            }

            // 4. Detectar Tipo de Falla (DINÁMICO DESDE LA BASE DE DATOS)
            if (State.db && State.db.tiposIncidencias) {
                const foundType = State.db.tiposIncidencias.find(t => {
                    const falla = (t.Nombre_Falla || t.ID || "").toLowerCase();
                    return falla && transcript.includes(falla);
                });
                if (foundType) { window.updateFilters('type', foundType.Nombre_Falla || foundType.ID); understood = true; }
            }

            // 5. Detectar Fechas (Comandos Naturales)
            const hoy = new Date().toISOString().split('T')[0];
            if (transcript.includes('hoy')) {
                window.updateFilters('dateFrom', hoy);
                window.updateFilters('dateTo', hoy);
                understood = true;
            } else if (transcript.includes('ayer')) {
                const ayerDate = new Date();
                ayerDate.setDate(ayerDate.getDate() - 1);
                window.updateFilters('dateFrom', ayerDate.toISOString().split('T')[0]);
                window.updateFilters('dateTo', ayerDate.toISOString().split('T')[0]);
                understood = true;
            } else if (transcript.includes('limpiar fechas')) {
                window.updateFilters('dateFrom', '');
                window.updateFilters('dateTo', '');
                understood = true;
            }

            // --- RESPUESTA DEL ASISTENTE ---
            if (understood) {
                if (window.asistenteVoz) window.asistenteVoz("Aplicando filtros solicitados.");
                setTimeout(() => {
                    if(filterPanel) filterPanel.classList.remove('active');
                    voiceStatusText.textContent = 'Prueba a decir: "Muéstrame solo las abiertas Prio 1"';
                    voiceStatusText.style.color = "#888";
                }, 1500);
            } else {
                voiceStatusText.textContent = "No detecté filtros. Prueba de nuevo.";
                voiceStatusText.style.color = "#e94335";
                if (window.asistenteVoz) window.asistenteVoz("No he detectado ningún parámetro. Inténtalo de nuevo.");
            }
        };

        recognition.onerror = (event) => {
            isListening = false;
            btnVoice.classList.remove('listening');
            voiceStatusText.textContent = "Error con el micrófono o inactivo.";
            voiceStatusText.style.color = "#e94335";
        };
    } else if (btnVoice) {
        btnVoice.style.display = 'none';
        if (voiceStatusText) voiceStatusText.textContent = "Navegador no compatible con voz.";
    }
}
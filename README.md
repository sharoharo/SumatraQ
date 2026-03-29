# 🏭 Sumatra Q - Visor CAD & Control de Calidad 3D

![Versión](https://img.shields.io/badge/version-1.5.0--STABLE-blue.svg)
![Three.js](https://img.shields.io/badge/Three.js-r169-black?logo=three.js)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%20Modules-f7df1e?logo=javascript&logoColor=black)

**Sumatra Q** es una plataforma web interactiva diseñada para la inspección, trazabilidad y control de calidad de piezas industriales. Permite a los operarios e inspectores cargar modelos 3D (STL), marcar defectos directamente sobre la geometría y sincronizar los datos en tiempo real con una base de datos en la nube (Google Workspace).

## ✨ Novedades en esta versión v1.5.0 (Voice & UI Update)
Esta versión da un salto gigante en la experiencia de usuario a pie de máquina, introduciendo controles por voz y limpiando la interfaz visual:
* **Control por Voz (La Magia 🪄):** Integración de *Web Speech API* para filtrar incidencias hablando directamente al dispositivo (ej: *"Muéstrame las abiertas prioridad 1"*), ideal para operarios con guantes en planta.
* **Panel de Filtros Dinámico (Bottom Sheet):** La antigua barra superior de chips se ha sustituido por un elegante botón flotante (FAB) que despliega un panel inferior con filtros cruzados (Estado + Prioridad), maximizando el espacio para el visor 3D.
* **Generación de PDFs Inteligente:** El motor de reportes ahora respeta los filtros cruzados activos, generando documentos ejecutivos precisos (ej. PDF solo con "Cerradas - Prio 1").
* **Separación de Estado y Prioridad:** Permite crear matrices de calor reales, destacando visualmente las incidencias urgentes ("🔥 Prio 1") en el entorno 3D.

## 🚀 Características Principales

- 🧊 **Visualización 3D Multi-Pieza:** Carga dinámica de múltiples archivos `.stl` simultáneos con controles de cámara, isométricas y vistas (Sombreado, Aristas, Alambre).
- 📍 **Marcadores Interactivos (Raycasting):** Creación de chinchetas 3D ancladas a las coordenadas exactas de la malla con detección de colisiones.
- 🎙️ **Zero-Typing (Agile UX):** "Chips" táctiles rápidos y motor de reconocimiento de lenguaje natural para operar la app sin teclear.
- 📸 **Evidencia Visual:** Captura de fotos directamente desde la cámara del dispositivo o carga desde la galería, redimensionadas y procesadas en cliente.
- 🗄️ **Backend Serverless (Google Apps Script):** Conexión directa con Google Sheets (Base de Datos) y Google Drive (Almacenamiento de imágenes).
- 📊 **Trazabilidad Inmutable:** Historial de cambios por usuario y fecha sin sobreescribir datos anteriores.

## 📂 Arquitectura del Proyecto

El Frontend está estructurado en Módulos ES6 para garantizar un mantenimiento limpio y escalable:

```text
📁 / (Raíz)
 ├── index.html       # Interfaz principal (UI) con modales y Bottom Sheets
 ├── css/styles.css   # Estilos Material Design y Agile UX
 └── js/
     ├── app.js          # Orquestador principal y eventos DOM
     ├── estado.js       # Almacenamiento global de variables (State Management)
     ├── auth.js         # Lógica de Login y descarga de base de datos
     ├── visor3d.js      # Motor Three.js (Cámaras, Luces, Renderizado)
     ├── incidencias.js  # Lógica de Raycaster, Formularios, Filtros cruzados y Voz
     ├── fotos.js        # Procesamiento y redimensionado de imágenes
     ├── nube.js         # Comunicación Fetch (CORS bypass) con Backend
     ├── exportador.js   # Generación de reportes PDF y CSV
     └── ui.js           # Control de menús y paneles laterales

Guía de Uso (Workflow)
1.Login: Accede con las credenciales dadas de alta en el sistema (Excel/Apps Script).

2. Cargar Pieza: Usa el botón superior (icono de tuerca) para subir uno o varios archivos STL.

3. Inspeccionar: Navega por la pieza (rotar, zoom). Pulsa el botón flotante (+) (inferior derecho) y haz clic/toque sobre la pieza 3D para registrar un fallo.

4. Tipificar: Rellena la Fase, Tipo de fallo y Prioridad usando la interfaz táctil rápida. Toma una fotografía de la evidencia si es necesario.

5. Guardar: Los datos se sincronizan automáticamente vía Apps Script con Google Sheets y Drive.

6. Filtrar (La Magia): Pulsa el botón azul del embudo (izquierda). Usa los botones táctiles o pulsa el micrófono y di un comando (ej. "Filtra por abiertas alta").

7. Reportar: Con la vista filtrada a tu gusto, abre el menú lateral izquierdo (☰) y pulsa "Generar PDF" o "Exportar a EXCEL" para enviar el reporte de calidad a dirección.

⚙️ Tecnologías Utilizadas
Three.js (v0.169.0) - Renderizado 3D WebGL
HTML2PDF.js - Generación de documentos ejecutivos
Web Speech API - Reconocimiento de voz nativo del navegador
HTML5 / CSS3 / Vanilla JS (ES6) - Frontend responsivo y modular
Google Apps Script - Backend Serverless
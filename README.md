# 🏭 Sumatra Q - Plataforma CAD de Inspección y Control de Calidad 3D

![Versión](https://img.shields.io/badge/version-1.8.0--STABLE-blue.svg)
![Three.js](https://img.shields.io/badge/Three.js-r169-black?logo=three.js)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%20Modules-f7df1e?logo=javascript&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-Offline_Ready-4CAF50?logo=pwa)
![Google Workspace](https://img.shields.io/badge/Backend-Google_Apps_Script-34A853?logo=google)

**Sumatra Q** es una solución de software industrial web, diseñada para la inspección visual, trazabilidad y control de calidad sobre geometría 3D. Permite a los operarios en planta cargar modelos CAD (STL), geolocalizar defectos directamente sobre la malla tridimensional y mantener un registro inmutable sincronizado en la nube mediante un backend Serverless, soportando operabilidad total sin conexión.

---

## 🚀 Novedades en la versión v1.8.0 (Dark Premium & Stability Update)

Esta versión (Release 1.8.0 - STABLE) marca la madurez visual y arquitectónica del proyecto. Se ha congelado el desarrollo de nuevas *features* para garantizar una experiencia sin *bugs* críticos (P0/P1) y una interfaz de usuario a nivel de las mejores aplicaciones del mercado.

* **Rediseño UX/UI "Dark Premium":** Transición a un diseño minimalista, inmersivo y oscuro (`#1c1c1e`). Se han eliminado las tarjetas flotantes redundantes en favor de pantallas *full-screen* integradas (Splash Screen, Login y Accesos). Incorporación de efectos *glassmorphism* (blur), sombras suaves y adaptación de logotipos corporativos monocromáticos en tiempo real mediante filtros CSS (`filter: invert`).
* **Arquitectura de Capas Blindada (Z-Index Master Patch):** Reescritura del sistema de jerarquías visuales. El motor 3D (Three.js) convive ahora en perfecta armonía con los componentes de la UI. Los menús desplegables (Sesión Activa) y la barra de herramientas colapsan dinámicamente sin solaparse, utilizando cálculos de ancho fluidos (`width: auto`, `calc()`).
* **Responsive Móvil Nativo (Bottom-Sheets):** En pantallas pequeñas (<768px), los paneles laterales (Filtros, Historial e Incidencias) actúan como modales nativos de iOS/Android, emergiendo desde la parte inferior de la pantalla para máxima accesibilidad con una sola mano (operarios con tablets/móviles).
* **Robustez del Guardián Offline (Service Worker):** Mejoras drásticas en la intercepción de red (`sw.js`). La aplicación es capaz de sobrevivir a la pérdida total de conexión, almacenando incidencias y fotografías localmente para su sincronización asíncrona una vez recuperada la red.
* **Separación Lectura/Escritura:** Interfaz desacoplada. Las incidencias se consultan en paneles inmutables de "Solo Lectura" para evitar accidentes táctiles, requiriendo un flujo explícito para actualizar datos o fotografías.

---

## ✨ Características Principales

* **Geolocalización 3D:** Marcado de defectos mediante *Raycasting* sobre la geometría real del modelo STL.
* **J.A.R.V.I.S (Voice NLP):** Motor de procesamiento de lenguaje natural. Permite aplicar filtros multidimensionales ("Muéstrame las grietas urgentes de ayer") y controlar la interfaz mediante comandos de voz.
* **El Juez (Motor de Filtros):** Filtrado universal cruzado de altísimo rendimiento en memoria para Estados, Prioridades, Usuarios y Fechas.
* **Centro de Reportes:** Generación nativa en cliente de informes PDF enriquecidos (con capturas del visor 3D y fotografías de la incidencia) y exportación a CSV.
* **Modo Ráfaga (Fast Track):** Flujo de trabajo acelerado para captura múltiple de puntos y evidencias fotográficas en lote.

---

## 📂 Arquitectura del Proyecto

El Frontend está estructurado mediante **Módulos ES6**, garantizando un mantenimiento ágil, separación de responsabilidades (SoC) y una carga optimizada:
```text
📁 / (Raíz)
 ├── index.html          # Interfaz Principal Dark Premium, Canvas 3D y Modales
 ├── sw.js               # Guardián Offline (Service Worker) y cachés de red
 ├── css/
 │   └── styles.css      # Sistema de diseño, CSS Variables y Media Queries
 └── js/
     ├── app.js          # Orquestador principal y enrutador de eventos DOM
     ├── estado.js       # Store centralizado (State Management en memoria)
     ├── auth.js         # Autenticación y puente de seguridad corporativa
     ├── visor3d.js      # Motor Gráfico (Luces, Controles, Renderizado Three.js)
     ├── incidencias.js  # Lógica de creación, edición e historial de puntos
     ├── filtros.js      # Cerebro de cruce de datos y filtrado de la UI
     ├── magiaVoz.js     # Motor NLP para procesamiento semántico
     ├── fotos.js        # Compresión Base64 y gestión de hardware de cámara
     ├── nube.js         # Sincronización asíncrona y colas de subida a G-Sheets
     ├── exportador.js   # Generador dinámico de reportes (PDF interactivos)
     ├── cargador.js     # Gestor de memoria e inyección de modelos STL
     └── voz.js          # Síntesis de voz para feedback auditivo del sistema



🛠️ Stack Tecnológico
Frontend: HTML5, CSS3, JavaScript Vanilla (ES6 Modules).

Motor 3D: Three.js (r169).

PWA: Service Workers, Cache Storage API, Web App Manifest.

Backend / Base de Datos: Google Apps Script (GAS) + Google Sheets actuando como Base de Datos Serverless.

Utilidades: jsPDF (Generación de Informes).
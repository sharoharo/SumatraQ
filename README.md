# 🏭 Sumatra Q - Plataforma CAD de Inspección y Control de Calidad 3D

![Versión](https://img.shields.io/badge/version-1.7.0--STABLE-blue.svg)
![Three.js](https://img.shields.io/badge/Three.js-r169-black?logo=three.js)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%20Modules-f7df1e?logo=javascript&logoColor=black)
![Google Workspace](https://img.shields.io/badge/Backend-Google_Apps_Script-34A853?logo=google)

**Sumatra Q** es una solución de software industrial web diseñada para la inspección visual, trazabilidad y control de calidad sobre geometría 3D. Permite a los operarios cargar modelos CAD (STL), geolocalizar defectos directamente sobre la malla tridimensional y mantener un registro inmutable sincronizado en la nube mediante un backend Serverless.

---

## 🚀 Novedades en la versión v1.7.1 (The Enterprise Update)

Esta versión marca la transición de Sumatra Q hacia un estándar corporativo, priorizando la ergonomía de trabajo (UX), la arquitectura escalable y la Inteligencia Artificial:

* **Arquitectura de Interfaz Desacoplada (Lectura vs. Escritura):** Implementación del patrón UX corporativo. Las incidencias existentes se abren en modo "Solo Lectura" (Historial inmutable), previniendo ediciones accidentales. La modificación requiere acceso explícito mediante un panel de actualización aislado.
* **Gestor de Modelos 3D Centralizado:** Nuevo hub unificado para cargar archivos locales, gestionar modelos en escena y lanzar piezas de demostración, eliminando la saturación visual del panel principal.
* **J.A.R.V.I.S (Inteligencia de Voz y NLP):** El sistema integra ahora un motor de reconocimiento de voz que cruza comandos naturales con la base de datos (Ej: *"Muéstrame las grietas urgentes de ayer"*), aplicando filtros multidimensionales de forma autónoma con feedback auditivo.
* **Filtro Universal Cruzado (El Juez):** Nuevo motor centralizado (`filtros.js`) capaz de cruzar Estados, Prioridades, Usuarios, Fechas y Tipos de Falla leyendo directamente desde el origen de datos.
* **Centro de Herramientas (⚙️):** Extracción de la lógica de reportes (PDF interactivos y CSV) a un modal de herramientas dedicado, limpiando el espacio de trabajo del operario.
* **Marca Blanca (White-labeling):** Soporte dinámico para inyección de logotipo corporativo en el "Empty State" de la aplicación.

---

## 📂 Arquitectura del Proyecto

El Frontend está estructurado mediante **Módulos ES6**, garantizando un mantenimiento ágil y separación de responsabilidades (SoC):

```text
📁 / (Raíz)
 ├── index.html       # UI Principal, Canvas 3D, Modales y Bottom Sheets
 ├── css/styles.css   # Diseño Material, Responsive UI y animaciones
 └── js/
     ├── app.js          # Orquestador principal y enrutador de eventos DOM
     ├── estado.js       # Store centralizado de la aplicación (State Management)
     ├── auth.js         # Autenticación y puente de datos con Google Sheets
     ├── visor3d.js      # Motor Gráfico (Cámaras, Luces, Renderizado Three.js)
     ├── incidencias.js  # Raycaster, marcadores 3D y lógica de Modales (Read/Write)
     ├── filtros.js      # Cerebro del Juez Universal de Filtrado Cruzado
     ├── magiaVoz.js     # Motor NLP para procesamiento de comandos de voz
     ├── fotos.js        # Procesamiento Base64 y galería de evidencias
     ├── nube.js         # API Fetch (CORS bypass) para sincronización con Backend
     ├── exportador.js   # Generador dinámico de reportes PDF y hojas CSV
     ├── cargador.js     # Gestor de Modelos 3D e inyección de STLs
     └── voz.js          # Módulo síncrono para síntesis de voz (Text-to-Speech)
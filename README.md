# 🏭 Sumatra Q - Visor CAD & Control de Calidad 3D

![Versión](https://img.shields.io/badge/version-1.4.0--STABLE-blue.svg)
![Three.js](https://img.shields.io/badge/Three.js-r169-black?logo=three.js)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%20Modules-f7df1e?logo=javascript&logoColor=black)

**Sumatra Q** es una plataforma web interactiva diseñada para la inspección, trazabilidad y control de calidad de piezas industriales. Permite a los operarios e inspectores cargar modelos 3D (STL), marcar defectos directamente sobre la geometría y sincronizar los datos en tiempo real con una base de datos en la nube (Google Workspace).

## ✨ Novedades en esta versión (Agile UX Update)
Esta versión marca un hito en la arquitectura de la aplicación, introduciendo un enfoque **"Zero-Typing"** para entornos industriales:
* **Separación de Estado y Prioridad:** Permite crear matrices de calor reales, destacando visualmente las incidencias urgentes ("🔥 Prio 1") en el entorno 3D, independientemente de si están abiertas o en revisión.
* **Agile UX Form:** Implementación de "Chips" táctiles para la rápida introducción de datos (Fase Productiva, Prioridad, Estado) sin necesidad de desplegables, ideal para tablets a pie de línea.
* **Arquitectura Modular ES6:** El código monolítico se ha dividido en micro-módulos lógicos (`estado.js`, `visor3d.js`, `incidencias.js`, etc.) para facilitar su escalabilidad.
* **Historial Inmutable:** Cada actualización sobre una incidencia no sobreescribe la anterior, sino que genera un log de trazabilidad de cambios en la base de datos.

## 🚀 Características Principales

- 🧊 **Visualización 3D Multi-Pieza:** Carga dinámica de múltiples archivos `.stl` simultáneos con controles de cámara, isométricas y vistas (Sombreado, Aristas, Alambre).
- 📍 **Marcadores Interactivos (Raycasting):** Creación de chichetras 3D ancladas a las coordenadas exactas de la malla con detección de colisiones.
- 📸 **Evidencia Visual:** Captura de fotos directamente desde la cámara del dispositivo o carga desde la galería, redimensionadas y procesadas en cliente.
- 🗄️ **Backend Serverless (Google Apps Script):** Conexión directa con Google Sheets (Base de Datos) y Google Drive (Almacenamiento de imágenes).
- 📊 **Filtros Avanzados:** Filtrado cruzado en tiempo real por Estado y Prioridad.
- 📄 **Reportes:** Generación automática de PDFs de inspección con capturas fotográficas y exportación de historiales a formato CSV (Excel).

## 📂 Arquitectura del Proyecto

El Frontend está estructurado en Módulos ES6 para un mantenimiento limpio:

```text
📁 / (Raíz)
 ├── index.html           # Interfaz principal (UI)
 ├── css/styles.css       # Estilos Material Design y Agile UX
 └── js/
      ├── app.js          # Orquestador principal y eventos DOM
      ├── estado.js       # Almacenamiento global de variables (State Management)
      ├── auth.js         # Lógica de Login y descarga de base de datos
      ├── visor3d.js      # Motor Three.js (Cámaras, Luces, Renderizado)
      ├── incidencias.js  # Lógica de Raycaster, Formularios y Filtros cruzados
      ├── fotos.js        # Procesamiento y redimensionado de imágenes
      ├── nube.js         # Comunicación Fetch (CORS bypass) con Backend
      ├── exportador.js   # Generación de reportes PDF y CSV
      └── ui.js           # Control de menús y paneles laterales


📖 Guía de Uso (Workflow)
Login: Accede con las credenciales dadas de alta en el sistema (Excel).

Cargar: Usa el botón + superior para subir archivos STL.

Inspeccionar: Navega por la pieza. Usa el botón + (FAB inferior) y haz clic en la pieza para registrar un fallo.

Tipificar: Rellena la Fase, Tipo de fallo y Prioridad usando la interfaz táctil. Toma una fotografía si es necesario.

Guardar: Los datos se sincronizan vía Apps Script con Sheets y Drive.

Reportar: Utiliza los filtros superiores para aislar "Prio 1" y haz clic en "Generar PDF" para enviar el reporte de calidad a planta.


⚙️ Tecnologías Utilizadas
Three.js (v0.169.0) - Renderizado 3D WebGL
HTML2PDF.js - Generación de documentos
HTML5 / CSS3 / Vanilla JS
Google Apps Script - Backend Serverless
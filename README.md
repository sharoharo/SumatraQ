# 🏭 Sumatra Q - Visor CAD & Control de Calidad 3D

![Versión](https://img.shields.io/badge/version-1.7.0--STABLE-blue.svg)
![Three.js](https://img.shields.io/badge/Three.js-r169-black?logo=three.js)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%20Modules-f7df1e?logo=javascript&logoColor=black)

**Sumatra Q** es una plataforma web interactiva diseñada para la inspección, trazabilidad y control de calidad de piezas industriales. Permite a los operarios e inspectores cargar modelos 3D (STL), marcar defectos directamente sobre la geometría y sincronizar los datos en tiempo real con una base de datos en la nube (Google Workspace).

## ✨ Novedades en la versión v1.7.0 (The Industrial & J.A.R.V.I.S Update)
Esta versión marca la madurez de la aplicación hacia un estándar corporativo, introduciendo herramientas avanzadas de auditoría y asistencia:
* **Asistente de Voz Integrado:** Feedback auditivo nativo que informa al operario del estado del sistema ("Incidencia guardada", "Filtros aplicados"), ideal para entornos industriales ruidosos o uso con guantes.
* **Filtro Universal Cruzado:** Un nuevo motor centralizado permite cruzar Estados, Prioridades, Rangos de Fechas, Usuarios y Tipos de Falla de forma instantánea.
* **PDFs Dinámicos con Autodiagnóstico:** El generador de reportes ahora mueve la cámara 3D de forma autónoma, tomando capturas exactas de cada defecto y dibujando etiquetas estilo CAD en tiempo real. Además, firma el documento leyendo el Rol y Email del inspector desde Drive.
* **Editor de Recortes Fotográficos:** Integración de herramienta de "cropping" in-app para aislar visualmente el defecto en las fotos de evidencia, optimizando el tamaño en la nube.
* **Modo Demo Integrado:** Nuevo selector para cargar piezas de prueba preconcebidas y evaluar la herramienta rápidamente.

## 🚀 Características Principales

- 🧊 **Visualización 3D Multi-Pieza:** Carga dinámica de múltiples archivos `.stl` simultáneos con controles de cámara, isométricas y vistas (Sombreado, Aristas, Alambre).
- 📍 **Marcadores Interactivos (Raycasting):** Creación de chinchetas 3D ancladas a las coordenadas exactas de la malla con detección de colisiones.
- 🎙️ **Zero-Typing & Audio Feedback:** Búsqueda por lenguaje natural y respuesta de voz del sistema para operar la app sin distracciones visuales.
- 📸 **Evidencia Visual & Cropping:** Captura de fotos, recorte (crop) en el cliente y guardado optimizado en Base64.
- 🗄️ **Backend Serverless (Google Apps Script):** Conexión directa con Google Sheets (Base de Datos) y Google Drive (Almacenamiento de imágenes).
- 📊 **Trazabilidad Inmutable:** Historial de cambios por usuario y fecha sin sobreescribir datos anteriores.

## 📂 Arquitectura del Proyecto

El Frontend está estructurado en Módulos ES6 para garantizar un mantenimiento limpio y escalable:

```text
📁 / (Raíz)
 ├── index.html       # Interfaz principal (UI), Modales y Bottom Sheets
 ├── css/styles.css   # Estilos Material Design y Agile UX
 └── js/
     ├── app.js          # Orquestador principal y eventos DOM
     ├── estado.js       # Almacenamiento global de variables (State Management)
     ├── auth.js         # Lógica de Login y descarga de base de datos
     ├── visor3d.js      # Motor Three.js (Cámaras, Luces, Renderizado)
     ├── incidencias.js  # Lógica de Raycaster, Formularios y Filtros cruzados
     ├── fotos.js        # Procesamiento, Cropper.js y galería de imágenes
     ├── nube.js         # Comunicación Fetch (CORS bypass) con Backend
     ├── exportador.js   # Generación de reportes PDF dinámicos y CSV
     ├── cargador.js     # Lógica de importación de STLs locales y demos
     └── voz.js          # Motor global de asistencia y síntesis de voz (Script síncrono)
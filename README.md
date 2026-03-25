# 🏭 Sumatra Q - Visor CAD 3D y Trazabilidad de Incidencias

Aplicación web interactiva para la inspección de modelos 3D (STL), registro de incidencias de calidad y trazabilidad total. Diseñada con una arquitectura modular y conectada en tiempo real a una base de datos en la nube (Google Sheets + Google Drive).

![Estado](https://img.shields.io/badge/Estado-Producci%C3%B3n-success)
![Tecnología](https://img.shields.io/badge/Tecnolog%C3%ADa-Three.js-black)
![Backend](https://img.shields.io/badge/Backend-Google_Apps_Script-blue)

## ✨ Características Principales

* **🌍 Visor 3D Avanzado:** Carga de múltiples piezas STL simultáneas. Modos de visualización (Sombreado, Aristas, Alambre) y controles de cámara fluidos (Isométrica, Zoom Extensión, Vuelo hacia el punto).
* **☁️ Sincronización Bidireccional:** Conexión en tiempo real con Google Sheets. Las incidencias previas se cargan automáticamente desde la nube al abrir una pieza.
* **📍 Raycasting y Posicionamiento:** Clic sobre el modelo 3D para registrar coordenadas exactas (X, Y, Z). Detección de movimiento de puntos con registro automático en el historial.
* **📸 Galería Estilo Google Maps:** Visualización de imágenes subidas a Google Drive integradas nativamente en la web mediante una galería de carrusel horizontal.
* **⏳ Trazabilidad Completa:** Cada incidencia cuenta con una línea de tiempo (historial) que registra estados (Abierto, En revisión, Cerrado), inspector, fecha y comentarios.
* **🔐 Autenticación Integrada:** Sistema de login seguro que valida las credenciales directamente contra la base de datos de la nube.
* **📊 Exportación de Datos:** Capacidad de exportar la sesión visual actual a JSON y el historial completo de trazabilidad a formato CSV (Excel).

## 🏗️ Arquitectura del Proyecto

El proyecto está construido utilizando **Vanilla JavaScript (ES6 Modules)**, separando la lógica para un mantenimiento escalable y profesional:

* `index.html` / `styles.css`: Estructura e interfaz de usuario (UI/UX).
* `app.js`: Archivo principal (Director de orquesta) que inicializa la app y expone métodos al DOM.
* `estado.js`: Gestor del estado global de la aplicación (Escena 3D, configuración, caché de datos).
* `auth.js`: Lógica de inicio de sesión y validación de sesiones.
* `visor3d.js`: Motor gráfico basado en Three.js (Luces, renderizado, carga de STLs, cámaras).
* `incidencias.js`: Motor de lógica de negocio (Raycasting, reconstrucción de historiales desde la nube, gestión de la galería de imágenes y envíos a Apps Script).

## 🚀 Instalación y Uso Local

1. **Clonar el repositorio:**
   ```bash
   git clone [https://github.com/TU_USUARIO/sumatra-q-visor3d.git](https://github.com/TU_USUARIO/sumatra-q-visor3d.git)
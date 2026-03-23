# SumatraQ
# 🛠️ 3D Issue Tracker & Google Cloud Sync

Una aplicación web de alto rendimiento para la gestión de incidencias directamente sobre modelos 3D (STL), con sincronización en tiempo real a **Google Sheets** y almacenamiento de imágenes en **Google Drive**.

![Estado del Proyecto](https://img.shields.io/badge/Estado-Operativo-brightgreen)
![Tecnologías](https://img.shields.io/badge/Stack-Three.js%20%7C%20Google%20Apps%20Script%20%7C%20JS%20Vanilla-blue)

## 🚀 Funcionalidades Actuales

- **Visor 3D Multi-Pieza:** Carga de múltiples archivos STL simultáneamente mediante `Three.js`.
- **Anotación Espacial:** Colocación de marcadores de incidencia mediante clic o pulsación larga en puntos exactos de la geometría.
- **Trazabilidad Completa:** Historial detallado por cada incidencia (quién, cuándo y qué cambió).
- **Gestión de Medios:** Captura y compresión de fotos (cámara o galería) asociadas a cada reporte.
- **Nube Híbrida:** - Guardado local instantáneo (`LocalStorage`).
    - Backup asíncrono en **Google Sheets**.
    - Repositorio de fotos organizado en **Google Drive**.
- **Herramientas de Análisis:** Diferentes modos de visualización (Sombreado, Alámbrico, Aristas) y exportación de datos a **CSV**.

## 🛠️ Instalación y Configuración

### 1. Requisitos previos
- Un servidor local (ej. Live Server en VS Code).
- Una cuenta de Google para el backend.

### 2. Configuración del Backend (Google Apps Script)
1. Crea un nuevo script en [script.google.com](https://script.google.com).
2. Pega el código de `doPost(e)` proporcionado en la documentación técnica del proyecto.
3. Configura la constante `FOLDER_ID` con el ID de tu carpeta de Google Drive.
4. Implementa como **Aplicación Web** con acceso para "Cualquier persona".
5. Copia la URL de ejecución y pégala en la constante `GOOGLE_SCRIPT_URL` dentro de `app.js`.

### 3. Ejecución Local
```bash
# No requiere instalación de dependencias externas (usa módulos ESM)
# Simplemente sirve el directorio mediante un servidor web
python -m http.server 8000
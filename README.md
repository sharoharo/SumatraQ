# 🦧 Sumatra Q - Visor CAD e Inspección 3D

**Sumatra Q** es una plataforma web profesional de inspección de calidad y trazabilidad de piezas industriales. Permite la visualización de archivos STL, el registro geolocalizado de incidencias en 3D y la gestión de datos en tiempo real mediante integración con Google Cloud.

![Status](https://img.shields.io/badge/Status-Estable-success)
![Version](https://img.shields.io/badge/Version-1.2.0-blue)

## ✨ Características Principales

* **🖥️ Visor 3D Multi-Pieza:** Carga de múltiples archivos STL con modos de visualización (Sombreado, Aristas, Alambre).
* **📍 Sistema de Incidencias:** Registro de fallas mediante clic directo sobre la superficie 3D.
* **📂 Gestión de Datos Pro:**
    * Sincronización bidireccional con **Google Sheets**.
    * Almacenamiento de imágenes de inspección en **Google Drive**.
* **📊 Reportes y Exportación:**
    * Generación de reportes detallados en **PDF** con resumen analítico.
    * Exportación de bases de datos a **Excel (CSV)**.
* **🎨 Interfaz Corporativa:** * Splash Screen de carga profesional.
    * Filtros dinámicos por estado (Abierto, Revisión, Cerrado).

## 🚀 Tecnologías Utilizadas

* **Three.js:** Motor gráfico para el renderizado 3D.
* **HTML5/CSS3/JS:** Arquitectura modular y diseño responsive.
* **html2pdf.js:** Motor de generación de documentos PDF.
* **Google Apps Script:** Backend serverless para gestión de base de datos.

## 🛠️ Instalación y Uso

1. Clona este repositorio:
   ```bash
   git clone [https://github.com/TU_USUARIO/SumatraQ.git](https://github.com/TU_USUARIO/SumatraQ.git)


   SumatraQ/
├── css/            # Estilos CSS (diseño y animaciones)
├── js/             # Lógica modular (3D, Auth, Incidencias)
├── img/            # Recursos visuales y logotipos
├── index.html      # Punto de entrada de la aplicación
└── README.md       # Documentación técnica
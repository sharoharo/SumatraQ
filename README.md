# 🏭 Sumatra Q - Visor 3D y Control de Calidad

**Sumatra Q** es una plataforma web interactiva diseñada para la inspección y el control de calidad de piezas industriales. Permite a los inspectores cargar modelos 3D (archivos STL), interactuar con ellos en tiempo real y registrar incidencias (defectos, fallas, etc.) marcando el punto exacto sobre la geometría 3D.

## ✨ Características Principales

- 🧊 **Visualización 3D Avanzada:** Renderizado de archivos STL con soporte para múltiples piezas simultáneas. Controles de cámara intuitivos (orbitar, hacer zoom, desplazar) y diferentes modos de renderizado (Sombreado, Aristas, Alambre).
- 📍 **Marcadores Interactivos:** Creación de incidencias haciendo un toque prolongado (o clic) directamente sobre la malla 3D de la pieza mediante *Raycasting*.
- 📋 **Gestión de Incidencias:** Registro detallado de fallas incluyendo tipo de error (rebaba, fisura, etc.), comentarios, inspector asignado y estado dinámico (🔴 Abierto, 🟡 En Revisión, 🟢 Cerrado).
- ⏱️ **Trazabilidad Absoluta:** Cada incidencia guarda un historial inmutable de actualizaciones, registrando qué usuario hizo el cambio, en qué fecha y hora exacta, y qué comentarios añadió.
- 📸 **Evidencias Fotográficas:** Capacidad para adjuntar fotografías a cada incidencia (compatibilidad con enlaces directos y miniaturas de Google Drive).
- ☁️ **Sincronización en la Nube:** Integración con Google Apps Script para guardar y cargar las bases de datos de incidencias en tiempo real.
- 📄 **Reportes PDF Corporativos:** Generación de informes en PDF altamente detallados (y filtrables), con diseño tabular anticortes, recuento de estados, trazabilidad de inspectores y evidencias fotográficas.
- 📱 **Diseño 100% Responsive:** Interfaz adaptada a dispositivos móviles con paneles inferiores deslizantes (Bottom Sheets) y menús flotantes, optimizada para su uso a pie de máquina.

---

## 🛠️ Tecnologías Utilizadas

El proyecto está construido con un stack frontend ligero y potente (Vanilla JS), sin frameworks pesados, garantizando máxima velocidad y rendimiento en cualquier navegador:

- **HTML5 & CSS3:** Estructura semántica y diseño moderno (Flexbox, Grid, Media Queries para diseño *Mobile-First*).
- **Vanilla JavaScript (ES6+):** Lógica de la aplicación estructurada en módulos.
- **[Three.js](https://threejs.org/):** Motor gráfico WebGL para la renderización, iluminación y cálculo matemático del entorno 3D.
- **[html2pdf.js](https://ekoopmans.github.io/html2pdf.js/):** Librería para la captura y renderizado del DOM a formato PDF corporativo.
- **Google Apps Script (Backend):** Usado como API y base de datos ligera para la sincronización de las incidencias del equipo.

---

## 📁 Estructura del Proyecto

El código fuente está organizado de forma modular para facilitar su mantenimiento:

```text
SUMATRA-Q/
│
├── index.html           # Interfaz principal de la aplicación
├── README.md            # Documentación del proyecto
│
├── css/
│   └── styles.css       # Estilos globales, diseño responsive y componentes UI
│
├── img/
│   └── SumatraQ_logo.jpg # Logotipo de la aplicación para reportes PDF
│
└── js/
    ├── app.js           # Archivo de entrada (Entry point), inicialización y eventos
    ├── estado.js        # Gestor de estado global (Variables, configuraciones y datos de la Nube)
    ├── visor3d.js       # Lógica de Three.js (Cámara, Escena, Luces, Carga de STL)
    └── incidencias.js   # Lógica de negocio (Crear/Editar puntos, Trazabilidad, Filtros y exportación PDF)
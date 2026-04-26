// js/cargador.js

// 1. Cierra el menú emergente
window.cerrarMenuCarga = function() {
    const modal = document.getElementById('modalCargaModelos');
    if (modal) modal.style.display = 'none';
};

// 2. Abre el buscador de archivos normal de Windows/Mac
window.cargarDesdePC = function() {
    cerrarMenuCarga();
    // Apunta directamente a tu input oculto en el HTML
    document.getElementById('fileInput').click(); 
};

// 3. Descarga la demo y simula que la subió el usuario
window.inyectarDemo = async function(rutaArchivo, nombreArchivo) {
    cerrarMenuCarga();
    
    try {
        console.log("Descargando demo de pruebas:", nombreArchivo);
        
        // Obtenemos el archivo de tu carpeta local /demos/
        const respuesta = await fetch(rutaArchivo);
        if (!respuesta.ok) throw new Error("No se encontró el archivo demo");
        
        // Convertimos la respuesta en un archivo en crudo (Blob)
        const blob = await respuesta.blob();
        const archivoSimulado = new File([blob], nombreArchivo, { type: "model/stl" });
        
        // Apuntamos a tu input oculto
        const inputElement = document.getElementById('fileInput');
        
        // Usamos DataTransfer para inyectar el archivo en el input HTML
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(archivoSimulado);
        inputElement.files = dataTransfer.files;
        
        // Disparamos el evento 'change' para que tu aplicación empiece a cargar el 3D
        const evento = new Event('change', { bubbles: true });
        inputElement.dispatchEvent(evento);
        
    } catch (error) {
        console.error("Error cargando la demo:", error);
        alert("No se pudo cargar la demo. Revisa que el nombre del archivo en la carpeta 'demos' sea correcto.");
    }
};

window.inyectarDemo = inyectarDemo;
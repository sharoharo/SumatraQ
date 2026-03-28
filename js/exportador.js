// js/exportador.js
import { State } from './estado.js';

export function exportIssues(singleFileName = null) {
  if(Object.keys(State.loadedMeshes).length === 0) { alert("Carga piezas primero."); return; }
  const filesToExport = singleFileName ? [singleFileName] : Object.keys(State.loadedMeshes);
  const issuesToExport = singleFileName ? State.issues.filter(i => i.fileName === singleFileName) : State.issues;
  const payload = { schemaVersion: 3, exportedAt: new Date().toISOString(), filesIncluded: filesToExport, issues: issuesToExport };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = singleFileName ? `issues_${singleFileName}.json` : `issues_sesion_global.json`;
  a.click(); URL.revokeObjectURL(a.href);
}

export function exportToCSV() {
  if (State.issues.length === 0) { alert("No hay incidencias para exportar."); return; }
  const headers = ["ID_INCIDENCIA", "PIEZA", "COORD_X", "COORD_Y", "COORD_Z", "TIPO", "ESTADO", "FECHA", "USUARIO", "COMENTARIO"];
  const SEPARATOR = ";";
  let rows = [];

  State.issues.forEach(i => {
    if (i.history && i.history.length > 0) {
      i.history.forEach(entry => {
        rows.push([
          i.id, i.fileName,
          i.x ? i.x.toFixed(4).replace('.', ',') : "0,0000",
          i.y ? i.y.toFixed(4).replace('.', ',') : "0,0000",
          i.z ? i.z.toFixed(4).replace('.', ',') : "0,0000",
          i.type, entry.status, entry.date, entry.user || "Anónimo", entry.comment || ""
        ].map(val => `"${String(val).replace(new RegExp(SEPARATOR, 'g'), ' ').replace(/"/g, '""')}"`));
      });
    }
  });

  const csvContent = `sep=${SEPARATOR}\n` + headers.join(SEPARATOR) + "\n" + rows.map(r => r.join(SEPARATOR)).join("\n");
  const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Historial_Trazabilidad_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

export const generatePDF = function() {
  window.generatePDF = generatePDF;

  const activeFilter = State.currentFilter || 'all';
  const issuesToPrint = State.issues.filter(issue => {
    if (activeFilter === 'all') return true;
    return issue.status === activeFilter;
  });

  if (issuesToPrint.length === 0) {
    alert("⚠️ No hay incidencias en este filtro para generar el reporte.");
    return;
  }

  const btn = document.querySelector('button[onclick="window.generatePDF()"]');
  const originalText = btn ? btn.innerHTML : '📄 Generar PDF';
  if (btn) btn.innerHTML = '⏳ Diseñando reporte...';

  const countOpen = issuesToPrint.filter(i => i.status === 'open').length;
  const countRev = issuesToPrint.filter(i => i.status === 'review').length;
  const countClosed = issuesToPrint.filter(i => i.status === 'closed').length;

  const fecha = new Date().toLocaleDateString('es-ES');
  const filtroNombres = { 'all': 'Todas las incidencias', 'open': 'Sólo Abiertas', 'review': 'En Revisión', 'closed': 'Sólo Cerradas' };

  let html = `
    <div style="padding: 20px; font-family: Arial, sans-serif; color: #333; background-color: #fff; width: 700px; margin: 0 auto;">
      <table style="width: 100%; border-spacing: 0; margin-bottom: 25px; border-bottom: 2px solid #ddd; padding-bottom: 15px;">
        <tr>
          <td style="vertical-align: middle;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <img src="./img/SumatraQ_logo.jpg" alt="Logo Sumatra Q" style="width: 45px; height: 45px; border-radius: 10px; object-fit: contain; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border: 1px solid rgba(0,0,0,0.1);">
              <div>
                <h1 style="color: #4285F4; margin: 0; font-size: 24px; font-weight: bold;">Reporte de Inspección</h1>
                <p style="margin: 2px 0 0 0; color: #666; font-size: 14px; font-weight: bold;">Sumatra Q - Control de Calidad</p>
              </div>
            </div>
          </td>
          <td style="vertical-align: bottom; text-align: right; width: 220px;">
            <p style="margin: 0; color: #666; font-size: 12px;"><strong>Generado:</strong> ${fecha}</p>
            <p style="margin: 4px 0 0 0; color: #666; font-size: 11px;"><strong>Filtro:</strong> ${filtroNombres[activeFilter]}</p>
          </td>
        </tr>
      </table>
      <table style="width: 100%; border-spacing: 10px; margin-bottom: 25px;">
        <tr>
          <td style="border: 1px solid #ddd; border-radius: 8px; padding: 10px; text-align: center; background: #fafafa; width: 33%;">
            <div style="font-size: 24px; font-weight: bold; color: #e94335;">${countOpen}</div>
            <div style="font-size: 10px; color: #666; font-weight: bold;">ABIERTAS</div>
          </td>
          <td style="border: 1px solid #ddd; border-radius: 8px; padding: 10px; text-align: center; background: #fafafa; width: 33%;">
            <div style="font-size: 24px; font-weight: bold; color: #fbbc04;">${countRev}</div>
            <div style="font-size: 10px; color: #666; font-weight: bold;">EN REVISIÓN</div>
          </td>
          <td style="border: 1px solid #ddd; border-radius: 8px; padding: 10px; text-align: center; background: #fafafa; width: 33%;">
            <div style="font-size: 24px; font-weight: bold; color: #34a853;">${countClosed}</div>
            <div style="font-size: 10px; color: #666; font-weight: bold;">CERRADAS</div>
          </td>
        </tr>
      </table>
      <h3 style="border-bottom: 2px solid #4285F4; padding-bottom: 5px; margin-bottom: 15px; font-size: 18px;">Detalle de Incidencias Filtradas</h3>
  `;

  issuesToPrint.forEach((issue, index) => {
    const estadoHTML = issue.status === 'open' ? '<span style="color:#e94335; font-weight:bold;">🔴 Abierto</span>' : 
                       (issue.status === 'review' ? '<span style="color:#fbbc04; font-weight:bold;">🟡 Revisión</span>' : '<span style="color:#34a853; font-weight:bold;">🟢 Cerrado</span>');

    html += `
      <div style="page-break-inside: avoid; border: 1px solid #eee; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <table style="width: 100%; margin-bottom: 10px;">
          <tr>
            <td style="text-align: left; vertical-align: middle;">
              <h4 style="margin: 0; font-size: 15px;">#${index + 1} - ${issue.type || 'Falla no especificada'}</h4>
            </td>
            <td style="text-align: right; vertical-align: middle; width: 100px; white-space: nowrap;">
              ${estadoHTML}
            </td>
          </tr>
        </table>
        <p style="margin: 0 0 5px 0; font-size: 13px;"><strong>Comentario original:</strong> ${issue.comment || 'N/A'}</p>
        <p style="margin: 0 0 8px 0; font-size: 11px; color: #555;"><strong>Inspector inicial:</strong> 👤 ${issue.user || 'Desconocido'}</p>
        <p style="margin: 0 0 12px 0; font-size: 10px; color: #888; border-bottom: 1px solid #f5f5f5; padding-bottom: 5px;">
           Pieza: ${issue.fileName || '---'} | 📍 XYZ: ${(issue.x || 0).toFixed(1)}, ${(issue.y || 0).toFixed(1)}, ${(issue.z || 0).toFixed(1)}
        </p>
    `;

    if (issue.history && issue.history.length > 0) {
      html += `<div style="background: #f8f9fa; padding: 10px; border-left: 3px solid #4285F4; margin-bottom: 5px;">
                 <p style="margin: 0 0 5px 0; font-size: 11px; font-weight: bold; color: #333;">Trazabilidad de cambios:</p>
                 <ul style="margin: 0; padding-left: 15px; font-size: 11px; color: #555; list-style-type: none;">`;
      issue.history.forEach(h => {
        const hDate = new Date(h.date).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
        html += `<li style="margin-bottom: 3px;">• <strong>${hDate}</strong> - 👤 ${h.user || 'Anónimo'} - ${h.action || 'Actualización'}</li>`;
      });
      html += `</ul></div>`;
    }
    html += `</div>`;
  });
  
  html += `</div>`;

  const opt = {
    margin:       10,
    filename:     `Inspeccion_${filtroNombres[activeFilter].replace(/ /g, '_')}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, letterRendering: true, allowTaint: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(html).save().then(() => {
    if (btn) btn.innerHTML = originalText;
  }).catch(err => {
    console.error("Error PDF:", err);
    if (btn) btn.innerHTML = originalText;
    alert("Error generando el PDF.");
  });
};
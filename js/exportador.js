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
  const headers = ["ID_INCIDENCIA", "PIEZA", "COORD_X", "COORD_Y", "COORD_Z", "TIPO", "FASE", "PRIORIDAD", "ESTADO", "FECHA", "USUARIO", "COMENTARIO"];
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
          i.type, i.fase || "N/A", i.priority || "N/A", entry.status, entry.date, entry.user || "Anónimo", entry.comment || ""
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

function getThumbUrl(url) {
    if (!url) return '';
    if (url.startsWith('data:')) return url; 
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=200&output=jpeg`;
}

function preloadImage(url) {
    return new Promise((resolve) => {
        if (!url) return resolve();
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = resolve;
        img.onerror = resolve; 
        img.src = url;
    });
}

const fallbackImg = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZWVlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5Ij5ObyBkaXNwLjwvdGV4dD48L3N2Zz4=";

export const generatePDF = async function() {
  const activeStatus = State.currentStatusFilter || 'all';
  const activePriority = State.currentPriorityFilter || 'all';
  
  const issuesToPrint = State.issues.filter(issue => {
    let matchStatus = (activeStatus === 'all') || (issue.status === activeStatus);
    let matchPriority = (activePriority === 'all') || (issue.priority === activePriority);
    return matchStatus && matchPriority;
  });

  if (issuesToPrint.length === 0) {
    alert("⚠️ No hay incidencias en estos filtros.");
    return;
  }

  const btn = document.querySelector('button[onclick*="generatePDF"]');
  const originalText = btn ? btn.innerHTML : 'Exportar PDF';
  if (btn) btn.innerHTML = '⏳ Ajustando al ancho de página...';

  let globalSnapshot = '';
  try {
    if (State && State.renderer && State.scene && State.camera) {
        State.renderer.render(State.scene, State.camera);
        globalSnapshot = State.renderer.domElement.toDataURL('image/jpeg', 0.95);
    }
  } catch(e) { console.warn("No capture", e); }

  const urlsToPreload = [];
  issuesToPrint.forEach(issue => {
      if (issue.snapshot3D) urlsToPreload.push(issue.snapshot3D);
      if (issue.history) {
          issue.history.forEach(h => {
              if (h.photos) {
                  h.photos.forEach(p => {
                      let urlOriginal = typeof p === 'string' ? p : (p.url || p.dataUrl || '');
                      if (urlOriginal && !urlOriginal.startsWith('data:')) urlsToPreload.push(getThumbUrl(urlOriginal));
                  });
              }
          });
      }
  });

  await Promise.all(urlsToPreload.map(url => preloadImage(url)));

  const countOpen = issuesToPrint.filter(i => i.status === 'open').length;
  const countRev = issuesToPrint.filter(i => i.status === 'review').length;
  const countClosed = issuesToPrint.filter(i => i.status === 'closed').length;
  const fecha = new Date().toLocaleDateString('es-ES');

  // 🔹 DISEÑO CON ANCHOS DINÁMICOS (width: 100%) 🔹
  let html = `
    <style>
      .no-cortar { page-break-inside: avoid !important; break-inside: avoid !important; display: block; margin-bottom: 20px; width: 100%; box-sizing: border-box; }
      img { max-width: 100%; height: auto; border-radius: 4px; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      td { overflow: hidden; word-wrap: break-word; }
    </style>
    <div style="padding: 10px; font-family: Arial, sans-serif; color: #111; background-color: #fff; width: 100%; box-sizing: border-box;">
      
      <div class="no-cortar" style="border-bottom: 3px solid #1a73e8; padding-bottom: 10px; margin-bottom: 20px;">
        <table>
          <tr>
            <td style="width: 60px;"><img src="./img/SumatraQ_logo.jpg" style="height: 45px; border: 1px solid #ccc;"></td>
            <td style="vertical-align: middle; padding-left: 15px;">
              <h1 style="color: #1a73e8; margin: 0; font-size: 22px; font-weight: bold;">REPORTE DE INSPECCIÓN</h1>
              <p style="margin: 2px 0 0 0; color: #555; font-size: 12px; font-weight: bold;">Sumatra Q - Control de Calidad | Fecha: ${fecha}</p>
            </td>
          </tr>
        </table>
      </div>

      <div class="no-cortar" style="margin-bottom: 25px;">
        <table style="border-spacing: 10px 0; border-collapse: separate; margin-left: -10px;">
          <tr>
            <td style="background: #fce8e6; border: 1px solid #d93025; padding: 12px; text-align: center; border-radius: 6px;">
              <div style="font-size: 22px; font-weight: bold; color: #d93025;">${countOpen}</div>
              <div style="font-size: 10px; font-weight: bold; color: #d93025;">ABIERTAS</div>
            </td>
            <td style="background: #fef7e0; border: 1px solid #f29900; padding: 12px; text-align: center; border-radius: 6px;">
              <div style="font-size: 22px; font-weight: bold; color: #f29900;">${countRev}</div>
              <div style="font-size: 10px; font-weight: bold; color: #f29900;">EN REVISIÓN</div>
            </td>
            <td style="background: #e6f4ea; border: 1px solid #188038; padding: 12px; text-align: center; border-radius: 6px;">
              <div style="font-size: 22px; font-weight: bold; color: #188038;">${countClosed}</div>
              <div style="font-size: 10px; font-weight: bold; color: #188038;">CERRADAS</div>
            </td>
          </tr>
        </table>
      </div>

      ${globalSnapshot ? `
      <div class="no-cortar" style="border: 1px solid #ccc; padding: 8px; background: #f8f9fa; border-radius: 6px; text-align: center;">
        <h3 style="margin: 0 0 8px 0; font-size: 13px; color: #1a73e8; text-align: left;">MAPA GLOBAL DE INSPECCIÓN</h3>
        <img src="${globalSnapshot}" style="max-height: 300px; border: 1px solid #ddd; display: block; margin: 0 auto;" />
      </div>
      ` : ''}

      <h2 class="no-cortar" style="border-bottom: 2px solid #1a73e8; padding-bottom: 5px; margin: 25px 0 15px 0; font-size: 18px; color: #1a73e8;">DETALLE DE INCIDENCIAS</h2>
  `;

  issuesToPrint.forEach((issue, index) => {
    let estadoColor = issue.status === 'open' ? '#d93025' : (issue.status === 'review' ? '#e37400' : '#188038');
    let estadoTexto = issue.status === 'open' ? 'ABIERTO' : (issue.status === 'review' ? 'EN REVISIÓN' : 'CERRADO');
    let prioText = issue.priority === 'prio1' ? 'PRIO 1' : (issue.priority === 'alta' ? 'ALTA' : (issue.priority === 'media' ? 'MEDIA' : 'BAJA'));

    html += `
      <div style="margin-bottom: 25px; border: 1px solid #bbb; border-radius: 8px; background: #fff; width: 100%; box-sizing: border-box; overflow: hidden;">
        
        <div class="no-cortar" style="background: #f1f3f4; padding: 12px; border-bottom: 1px solid #ccc;">
           <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #000;">#${index + 1} - ${issue.type || 'Falla no especificada'}</h3>
           <div style="margin-bottom: 8px;">
              <span style="display: inline-block; padding: 3px 8px; background: #fff; border: 1px solid #ccc; font-size: 11px; font-weight: bold; margin-right: 8px; border-radius: 4px;">PRIORIDAD: ${prioText}</span>
              <span style="display: inline-block; padding: 3px 8px; color: ${estadoColor}; background: ${estadoColor}15; border: 1px solid ${estadoColor}; font-size: 11px; font-weight: bold; border-radius: 4px;">ESTADO: ${estadoTexto}</span>
           </div>
           <div style="font-size: 12px; background: #e8f0fe; color: #1a73e8; padding: 8px; border: 1px solid #8ab4f8; border-radius: 4px;">
              <strong>PIEZA:</strong> ${issue.fileName || 'N/A'}
           </div>
        </div>

        ${issue.snapshot3D ? `
        <div class="no-cortar" style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
          <p style="margin: 0 0 5px 0; font-size: 11px; font-weight: bold; color: #555; text-align: left;">UBICACIÓN 3D:</p>
          <img src="${issue.snapshot3D}" style="max-height: 200px; border: 1px solid #1a73e8;" />
        </div>
        ` : ''}

        <div style="padding: 12px;">
          <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: #000;">HISTORIAL DE TRAZABILIDAD:</p>
    `;

    if (issue.history) {
      const reversedHistory = [...issue.history].reverse();
      reversedHistory.forEach((h, idx) => {
        const hDate = new Date(h.date).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
        const borderBottom = idx === reversedHistory.length - 1 ? 'none' : '1px dashed #ccc';
        let hColor = h.status === 'open' ? '#d93025' : (h.status === 'review' ? '#e37400' : '#188038');

        html += `
        <div class="no-cortar" style="padding-bottom: 15px; margin-top: 10px; border-bottom: ${borderBottom};">
           <p style="margin: 0; font-size: 12px; color: #000;"><strong>📅 ${hDate}</strong> | 👤 ${h.user || 'Anónimo'}</p>
           <p style="margin: 4px 0; font-size: 11px; color: #555; font-weight: bold;">ESTADO: <span style="color: ${hColor};">${h.status.toUpperCase()}</span> | FASE: ${h.fase ? h.fase.toUpperCase() : 'N/A'}</p>
           ${h.comment ? `<div style="font-size: 12px; font-style: italic; color: #222; background: #f9f9f9; padding: 8px; border-left: 3px solid #ccc; border-radius: 4px; margin-bottom: 8px;">"${h.comment}"</div>` : ''}
           
           <div style="display: flex; flex-wrap: wrap; gap: 10px;">
        `;

        if (h.photos) {
            h.photos.forEach((p) => {
                let urlOriginal = typeof p === 'string' ? p : (p.url || p.dataUrl || '');
                let thumb = urlOriginal.startsWith('data:') ? urlOriginal : getThumbUrl(urlOriginal);
                html += `
                <div style="display: inline-block; width: 45%;">
                  <table>
                    <tr>
                      <td style="width: 100px; padding-right: 8px;"><img src="${thumb}" onerror="this.src='${fallbackImg}'" style="width: 100px; height: 80px; object-fit: cover; border: 1px solid #ccc;"></td>
                      <td style="vertical-align: middle;">
                        <a href="${urlOriginal}" target="_blank" style="color: #00bcd4; text-decoration: none; font-size: 14px; font-weight: bold;">ampliar ↗</a><br>
                        <span style="font-size: 9px; color: #888;">(Ctrl+Clic)</span>
                      </td>
                    </tr>
                  </table>
                </div>`;
            });
        }
        html += `</div></div>`;
      });
    }
    html += `</div></div>`;
  });
  html += `</div>`;

  const opt = {
    margin: [15, 15, 15, 15],
    filename: `Reporte_Sumatra_${new Date().getTime()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 1, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'], avoid: '.no-cortar' }
  };

  html2pdf().set(opt).from(html).save().then(() => { if (btn) btn.innerHTML = originalText; });
};

window.generatePDF = generatePDF;
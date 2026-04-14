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
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=300&output=jpeg`;
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
  if (btn) btn.innerHTML = '⏳ Preparando reporte corporativo...';

  const userInDb = State.db.usuarios.find(u => (u.Nombre || u.nombre) === State.userName) || {};
  const userEmail = userInDb.Email || userInDb.email || 'No disponible';
  const userRole = userInDb.Rol || userInDb.rol || 'Operador';

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

  if (btn) btn.innerHTML = '⏳ Construyendo PDF...';

  const countOpen = issuesToPrint.filter(i => i.status === 'open').length;
  const countRev = issuesToPrint.filter(i => i.status === 'review').length;
  const countClosed = issuesToPrint.filter(i => i.status === 'closed').length;
  const fecha = new Date().toLocaleDateString('es-ES');

  let html = `
    <style>
      .no-cortar { page-break-inside: avoid !important; break-inside: avoid !important; display: block; width: 100%; clear: both; margin-bottom: 15px; box-sizing: border-box; }
      .salto-pagina { page-break-before: always !important; break-before: page !important; } 
      .pdf-wrapper { padding: 5px; font-family: Arial, sans-serif; color: #111; background-color: #fff; width: 100%; box-sizing: border-box; }
      .user-info-table { width: 100%; font-size: 11px; color: #444; margin-top: 10px; border-top: 1px dashed #ccc; padding-top: 10px; box-sizing: border-box; }
    </style>
    <div class="pdf-wrapper">
      
      <div class="no-cortar" style="border-bottom: 3px solid #1a73e8; padding-bottom: 10px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 60px;"><img src="./img/SumatraQ_logo.jpg" style="height: 45px; border: 1px solid #ccc; border-radius: 4px;"></td>
            <td style="vertical-align: middle; padding-left: 15px;">
              <h1 style="color: #1a73e8; margin: 0; font-size: 22px; font-weight: bold;">REPORTE DE INSPECCIÓN</h1>
              <p style="margin: 2px 0 0 0; color: #555; font-size: 12px; font-weight: bold;">Sumatra Q - Control de Calidad | Fecha: ${fecha}</p>
              
              <div class="user-info-table">
                <strong>Inspector:</strong> ${State.userName} | 
                <strong>Email:</strong> ${userEmail} | 
                <strong>Rol:</strong> ${userRole.toUpperCase()}
              </div>
            </td>
          </tr>
        </table>
      </div>

      <div class="no-cortar">
        <table style="width: 100%; border-collapse: separate; border-spacing: 10px 0; margin-left: -10px;">
          <tr>
            <td style="background: #fce8e6; border: 1px solid #d93025; padding: 12px; text-align: center; border-radius: 6px; width: 33%; box-sizing: border-box;">
              <div style="font-size: 22px; font-weight: bold; color: #d93025;">${countOpen}</div>
              <div style="font-size: 10px; font-weight: bold; color: #d93025;">ABIERTAS</div>
            </td>
            <td style="background: #fef7e0; border: 1px solid #f29900; padding: 12px; text-align: center; border-radius: 6px; width: 33%; box-sizing: border-box;">
              <div style="font-size: 22px; font-weight: bold; color: #f29900;">${countRev}</div>
              <div style="font-size: 10px; font-weight: bold; color: #f29900;">EN REVISIÓN</div>
            </td>
            <td style="background: #e6f4ea; border: 1px solid #188038; padding: 12px; text-align: center; border-radius: 6px; width: 33%; box-sizing: border-box;">
              <div style="font-size: 22px; font-weight: bold; color: #188038;">${countClosed}</div>
              <div style="font-size: 10px; font-weight: bold; color: #188038;">CERRADAS</div>
            </td>
          </tr>
        </table>
      </div>

      ${globalSnapshot ? `
      <div class="no-cortar" style="padding: 0; margin-bottom: 0;">
        <h3 style="margin: 0 0 8px 0; font-size: 13px; color: #1a73e8; text-transform: uppercase;">MAPA GLOBAL DE INSPECCIÓN</h3>
        <div style="height: 170mm; width: 100%; background: #eaeaec; border: 2px solid #8ab4f8; border-radius: 4px; overflow: hidden; display: block; position: relative; box-sizing: border-box;">
            <img src="${globalSnapshot}" style="width: 100%; height: 100%; object-fit: contain; position: absolute; top: 0; left: 0;" />
        </div>
      </div>
      ` : ''}

      <div class="salto-pagina"></div>

      <h2 class="no-cortar" style="border-bottom: 2px solid #1a73e8; padding-bottom: 5px; margin: 0 0 15px 0; font-size: 18px; color: #1a73e8; padding-top: 15px; box-sizing: border-box;">DETALLE DE INCIDENCIAS</h2>
  `;

  issuesToPrint.forEach((issue, index) => {
    let estadoColor = issue.status === 'open' ? '#d93025' : (issue.status === 'review' ? '#e37400' : '#188038');
    let estadoTexto = issue.status === 'open' ? 'ABIERTO' : (issue.status === 'review' ? 'EN REVISIÓN' : 'CERRADO');
    let prioText = issue.priority === 'prio1' ? 'PRIO 1' : (issue.priority === 'alta' ? 'ALTA' : (issue.priority === 'media' ? 'MEDIA' : 'BAJA'));

    // --- CORRECCIÓN APLICADA: box-sizing: border-box en las cajas de información de la pieza ---
    html += `
      <div style="margin-bottom: 25px; border: 1px solid #bbb; border-radius: 8px; background: #fff; width: 100%; box-sizing: border-box; padding: 0; overflow: hidden;">
        
        <div class="no-cortar" style="background: #f1f3f4; padding: 12px; border-bottom: 1px solid #ccc; border-radius: 6px 6px 0 0; width: 100%; box-sizing: border-box; margin-bottom: 0;">
           <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #000;">#${index + 1} - ${issue.type || 'Falla no especificada'}</h3>
           <div style="margin-bottom: 8px;">
              <span style="display: inline-block; padding: 3px 8px; background: #fff; border: 1px solid #ccc; font-size: 11px; font-weight: bold; margin-right: 8px; border-radius: 4px; box-sizing: border-box;">PRIORIDAD: ${prioText}</span>
              <span style="display: inline-block; padding: 3px 8px; color: ${estadoColor}; background: ${estadoColor}15; border: 1px solid ${estadoColor}; font-size: 11px; font-weight: bold; border-radius: 4px; box-sizing: border-box;">ESTADO: ${estadoTexto}</span>
           </div>
           <div style="font-size: 12px; background: #e8f0fe; color: #1a73e8; padding: 8px; border: 1px solid #8ab4f8; border-radius: 4px; width: 100%; box-sizing: border-box;">
              <strong>PIEZA:</strong> ${issue.fileName || 'N/A'}
           </div>
        </div>

        ${issue.snapshot3D ? `
        <div class="no-cortar" style="padding: 12px; border-bottom: 1px solid #eee; width: 100%; box-sizing: border-box; margin-bottom: 0;">
          <p style="margin: 0 0 5px 0; font-size: 11px; font-weight: bold; color: #555;">UBICACIÓN 3D:</p>
          <img src="${issue.snapshot3D}" style="width: 100%; max-height: 250px; object-fit: contain; border: 1px solid #1a73e8; border-radius: 4px; box-sizing: border-box;" />
        </div>
        ` : ''}

        <div style="padding: 12px; width: 100%; box-sizing: border-box;">
          <p class="no-cortar" style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: #000; box-sizing: border-box;">HISTORIAL DE TRAZABILIDAD:</p>
    `;

    if (issue.history) {
      const reversedHistory = [...issue.history].reverse();
      reversedHistory.forEach((h, idx) => {
        const hDate = new Date(h.date).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
        const borderBottom = idx === reversedHistory.length - 1 ? 'none' : '1px dashed #ccc';
        let hColor = h.status === 'open' ? '#d93025' : (h.status === 'review' ? '#e37400' : '#188038');

        html += `
        <div class="no-cortar" style="padding-bottom: 15px; margin-top: 10px; border-bottom: ${borderBottom}; width: 100%; box-sizing: border-box;">
           <p style="margin: 0; font-size: 12px; color: #000;"><strong>📅 ${hDate}</strong> | 👤 ${h.user || 'Anónimo'}</p>
           <p style="margin: 4px 0; font-size: 11px; color: #555; font-weight: bold;">ESTADO: <span style="color: ${hColor};">${h.status.toUpperCase()}</span> | FASE: ${h.fase ? h.fase.toUpperCase() : 'N/A'}</p>
           ${h.comment ? `<div style="font-size: 12px; font-style: italic; color: #222; background: #f9f9f9; padding: 8px; border-left: 3px solid #ccc; border-radius: 4px; margin-bottom: 10px; width: 100%; box-sizing: border-box;">"${h.comment}"</div>` : ''}
        `;

        if (h.photos && h.photos.length > 0) {
            html += `<table style="width: 100%; border-collapse: collapse; box-sizing: border-box;">`;
            
            for (let i = 0; i < h.photos.length; i += 2) {
                html += `<tr>`;
                
                let url1 = typeof h.photos[i] === 'string' ? h.photos[i] : (h.photos[i].url || h.photos[i].dataUrl || '');
                let thumb1 = url1.startsWith('data:') ? url1 : getThumbUrl(url1);
                
                html += `
                <td style="width: 50%; padding-bottom: 10px; vertical-align: top; box-sizing: border-box;">
                  <table style="border-collapse: collapse; box-sizing: border-box;">
                    <tr>
                      <td style="padding-right: 10px; box-sizing: border-box;">
                        <img src="${thumb1}" onerror="this.src='${fallbackImg}'" style="width: 110px; height: 80px; object-fit: cover; border: 1px solid #ccc; border-radius: 4px; display: block; box-sizing: border-box;">
                      </td>
                      <td style="vertical-align: middle; box-sizing: border-box;">
                        <a href="${url1}" target="_blank" style="color: #00bcd4; text-decoration: none; font-size: 15px; font-weight: bold; display: block; padding: 5px 0;">ampliar ↗</a>
                        <span style="font-size: 9px; color: #888;">(Ctrl+Clic)</span>
                      </td>
                    </tr>
                  </table>
                </td>`;

                if (i + 1 < h.photos.length) {
                    let url2 = typeof h.photos[i+1] === 'string' ? h.photos[i+1] : (h.photos[i+1].url || h.photos[i+1].dataUrl || '');
                    let thumb2 = url2.startsWith('data:') ? url2 : getThumbUrl(url2);
                    
                    html += `
                    <td style="width: 50%; padding-bottom: 10px; vertical-align: top; box-sizing: border-box;">
                      <table style="border-collapse: collapse; box-sizing: border-box;">
                        <tr>
                          <td style="padding-right: 10px; box-sizing: border-box;">
                            <img src="${thumb2}" onerror="this.src='${fallbackImg}'" style="width: 110px; height: 80px; object-fit: cover; border: 1px solid #ccc; border-radius: 4px; display: block; box-sizing: border-box;">
                          </td>
                          <td style="vertical-align: middle; box-sizing: border-box;">
                            <a href="${url2}" target="_blank" style="color: #00bcd4; text-decoration: none; font-size: 15px; font-weight: bold; display: block; padding: 5px 0;">ampliar ↗</a>
                            <span style="font-size: 9px; color: #888;">(Ctrl+Clic)</span>
                          </td>
                        </tr>
                      </table>
                    </td>`;
                } else {
                    html += `<td style="width: 50%; box-sizing: border-box;"></td>`; 
                }
                html += `</tr>`;
            }
            html += `</table>`;
        }
        html += `</div>`;
      });
    }
    html += `</div></div>`;
  });
  html += `</div></div>`;

  const opt = {
    margin:       [15, 10, 15, 10],
    filename:     `Reporte_Sumatra_${new Date().getTime()}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, logging: false },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak:    { mode: ['css', 'legacy'], avoid: '.no-cortar', before: '.salto-pagina' } 
  };

  html2pdf().set(opt).from(html).save().then(() => { 
      if (btn) btn.innerHTML = originalText; 
  }).catch(err => {
      console.error(err);
      if (btn) btn.innerHTML = originalText; 
  });
};

window.generatePDF = generatePDF;
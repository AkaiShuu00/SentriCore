// src/utils/exportUtils.js
// Shared export helpers para sa buong admin — walang extra library.
//  • exportExcel → tunay na .xls (binubuksan ng Excel/Google Sheets, may format)
//  • exportPDF   → malinis, branded na print template (SentriCore header + table)
// Gamit:
//   exportExcel('visitor-logs', 'Visitor Logs', header, rows);
//   exportPDF('Visitor Logs', header, rows, { subtitle: 'Complete history' });

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const stamp = () =>
  new Date().toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });

// ── EXCEL (.xls via HTML table — natively nabubuksan ng Excel) ──────────────
export function exportExcel(filename, sheetName, header, rows) {
  if (!rows || rows.length === 0) { alert('No data to export.'); return; }

  const head = header.map((h) => `<th>${esc(h)}</th>`).join('');
  const body = rows
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
    .join('');

  const table = `
    <table border="1">
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>`;

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8" />
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
        <x:Name>${esc(sheetName || 'Sheet1')}</x:Name>
        <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
      </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      <style>
        table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
        th { background: #0E2A2E; color: #fff; font-weight: bold; padding: 6px 10px; text-align: left; }
        td { padding: 5px 10px; border: 1px solid #cfd6d6; }
      </style>
    </head>
    <body>${table}</body></html>`;

  const blob = new Blob(['﻿', html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF (branded print template) ────────────────────────────────────────────
export function exportPDF(title, header, rows, opts = {}) {
  if (!rows || rows.length === 0) { alert('No data to export.'); return; }
  const subtitle = opts.subtitle || '';

  const head = header.map((h) => `<th>${esc(h)}</th>`).join('');
  const body = rows
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
    .join('');

  const html = `
    <html><head><meta charset="UTF-8" /><title>SentriCore — ${esc(title)}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a2b2b; margin: 0; padding: 32px 36px; }
      .brandbar { display:flex; align-items:center; justify-content:space-between;
                  border-bottom: 3px solid #0F6E6E; padding-bottom: 14px; margin-bottom: 20px; }
      .wordmark { font-size: 22px; font-weight: 800; letter-spacing: 3px; color: #0E2A2E; }
      .wordmark span { color: #0F6E6E; }
      .meta { text-align: right; font-size: 11px; color: #667; line-height: 1.5; }
      h1 { font-size: 18px; color: #0F6E6E; margin: 0 0 2px; }
      .sub { font-size: 12px; color: #778; margin: 0 0 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th { background: #0E2A2E; color: #fff; text-align: left; padding: 8px 10px; font-weight: 600; }
      td { padding: 7px 10px; border-bottom: 1px solid #e4e9e9; }
      tbody tr:nth-child(even) { background: #f6f4ec; }
      .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #ddd;
                font-size: 10px; color: #99a; display:flex; justify-content:space-between; }
      @media print { body { padding: 12px; } }
    </style></head>
    <body>
      <div class="brandbar">
        <div class="wordmark">SENTRI<span>CORE</span></div>
        <div class="meta">Visitor Management System<br/>Generated: ${esc(stamp())}</div>
      </div>
      <h1>${esc(title)}</h1>
      ${subtitle ? `<p class="sub">${esc(subtitle)}</p>` : ''}
      <table>
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
      <div class="footer">
        <span>SentriCore — Confidential</span>
        <span>${rows.length} record${rows.length === 1 ? '' : 's'}</span>
      </div>
    </body></html>`;

  const w = window.open('', '_blank');
  if (!w) { alert('Please allow pop-ups to export the PDF.'); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}
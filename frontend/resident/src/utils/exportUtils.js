// src/utils/exportUtils.js
// Shared export helpers para sa buong admin.
//  • exportExcel     → tunay na .xls (binubuksan ng Excel/Google Sheets, may format)
//  • exportPDF       → DIREKTANG nagda-download ng .pdf (jsPDF + autoTable) — walang print dialog
//  • exportRecordPDF → solo/isahang record bilang .pdf (hal. isang bisita)
//
// Kailangan ng dependency (minsanang install sa VM):
//   npm i jspdf jspdf-autotable
//
// Gamit:
//   exportExcel('visitor-logs', 'Visitor Logs', header, rows);
//   exportPDF('Visitor Logs', header, rows, { subtitle: 'Complete history' });
//   exportRecordPDF('Visitor Record', [['Name','Juan'],['Pass No.','V-001']], { subtitle: 'P-123' });

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

const slugify = (s) =>
  String(s || 'export').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'export';

// Theme (tugma sa SentriCore)
const INK = [14, 42, 46];     // #0E2A2E
const TEAL = [15, 110, 110];  // #0F6E6E
const ZEBRA = [246, 244, 236];// #f6f4ec

// -- Branded header + footer (ginagamit ng dalawang PDF export) --
function drawChrome(doc, title, subtitle) {
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text('SENTRI', 36, 42);
  const w = doc.getTextWidth('SENTRI');
  doc.setTextColor(TEAL[0], TEAL[1], TEAL[2]);
  doc.text('CORE', 36 + w, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 125);
  doc.text('Visitor Management System', pageW - 36, 34, { align: 'right' });
  doc.text('Generated: ' + stamp(), pageW - 36, 46, { align: 'right' });

  doc.setDrawColor(TEAL[0], TEAL[1], TEAL[2]);
  doc.setLineWidth(2);
  doc.line(36, 54, pageW - 36, 54);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(TEAL[0], TEAL[1], TEAL[2]);
  doc.text(title || 'Report', 36, 76);

  let top = 88;
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 135);
    doc.text(subtitle, 36, top);
    top += 10;
  }
  return top + 6;
}

function drawFooter(doc, countLabel) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(36, pageH - 30, pageW - 36, pageH - 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 165);
    doc.text('SentriCore - Confidential', 36, pageH - 18);
    const right = countLabel ? (countLabel + '   .   Page ' + i + ' of ' + pages) : ('Page ' + i + ' of ' + pages);
    doc.text(right, pageW - 36, pageH - 18, { align: 'right' });
  }
}

// -- EXCEL (.xls via HTML table) --
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

// -- PDF (DIREKTANG download - walang print dialog) --
export function exportPDF(title, header, rows, opts = {}) {
  if (!rows || rows.length === 0) { alert('No data to export.'); return; }
  const subtitle = opts.subtitle || '';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const startY = drawChrome(doc, title, subtitle);

  autoTable(doc, {
    head: [header],
    body: rows.map((r) => r.map((c) => (c == null ? '' : String(c)))),
    startY,
    margin: { left: 36, right: 36 },
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 5, textColor: [26, 43, 43], overflow: 'linebreak' },
    headStyles: { fillColor: INK, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    alternateRowStyles: { fillColor: ZEBRA },
    theme: 'grid',
    tableLineColor: [228, 233, 233],
    tableLineWidth: 0.5,
  });

  drawFooter(doc, `${rows.length} record${rows.length === 1 ? '' : 's'}`);
  doc.save(`${slugify(opts.filename || title)}.pdf`);
}

// -- SOLO RECORD PDF (isahan - hal. isang bisita) --
// fields: array ng [label, value]. Idi-display bilang 2-kolum na key/value table.
export function exportRecordPDF(title, fields, opts = {}) {
  if (!fields || fields.length === 0) { alert('No record to export.'); return; }
  const subtitle = opts.subtitle || '';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const startY = drawChrome(doc, title, subtitle);

  autoTable(doc, {
    body: fields.map(([label, value]) => [String(label), value == null || value === '' ? '-' : String(value)]),
    startY,
    margin: { left: 36, right: 36 },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 8, textColor: [26, 43, 43], overflow: 'linebreak', valign: 'middle' },
    columnStyles: {
      0: { cellWidth: 150, fontStyle: 'bold', fillColor: ZEBRA, textColor: [80, 90, 90] },
      1: { textColor: [15, 110, 110], fontStyle: 'bold' },
    },
    theme: 'grid',
    tableLineColor: [228, 233, 233],
    tableLineWidth: 0.5,
  });

  drawFooter(doc, 'Visitor Record');
  doc.save(`${slugify(opts.filename || title)}.pdf`);
}
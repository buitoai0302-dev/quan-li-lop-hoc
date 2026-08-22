import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportColumn<T> {
  header: string;
  accessor: keyof T | ((row: T) => string | number);
}

function getCellValue<T>(row: T, accessor: ExportColumn<T>['accessor']): string {
  if (typeof accessor === 'function') {
    return String(accessor(row) ?? '');
  }
  return String(row[accessor] ?? '');
}

// ---------------------------------------------------------------------------
// Export to Excel (.xlsx)
// ---------------------------------------------------------------------------
export function exportToExcel<T>(data: T[], columns: ExportColumn<T>[], filename: string): void {
  const headers = columns.map((col) => col.header);
  const rows = data.map((row) => columns.map((col) => getCellValue(row, col.accessor)));

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Auto column width
  const colWidths = headers.map((h, i) => ({
    wch: Math.max(h.length, ...rows.map((row) => String(row[i] ?? '').length)) + 2,
  }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// ---------------------------------------------------------------------------
// Export to PDF (Landscape, A4)
// ---------------------------------------------------------------------------
export async function exportToPDF<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
  title: string
): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 18);

  // Subtitle: date
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Exported: ${new Date().toLocaleDateString('vi-VN')}`, 14, 25);
  doc.setTextColor(0);

  try {
    const fontUrl =
      'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf';
    const res = await fetch(fontUrl);
    const blob = await res.blob();
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(blob);
    });
    doc.addFileToVFS('Roboto-Regular.ttf', base64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto', 'normal');
  } catch (error) {
    console.warn('Failed to load font for PDF', error);
  }

  const head = [columns.map((col) => col.header)];
  const body = data.map((row) => columns.map((col) => getCellValue(row, col.accessor)));

  autoTable(doc, {
    head,
    body,
    startY: 30,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [99, 102, 241], // indigo-500
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${filename}.pdf`);
}

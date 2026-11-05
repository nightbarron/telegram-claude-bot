import ExcelJS from 'exceljs';

export type CellInput = string | number | boolean | null;

export interface SheetInput {
  name?: string;
  columns: string[];
  rows: CellInput[][];
}

const MAX_SHEETS = 20;
const MAX_ROWS_PER_SHEET = 5000;
const MIN_COL_WIDTH = 8;
const MAX_COL_WIDTH = 60;

// Ten sheet Excel: toi da 31 ky tu, khong chua \ / ? * [ ] :, khong trung nhau.
function safeSheetName(raw: string | undefined, index: number, used: Set<string>): string {
  let name = (raw ?? '').replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || `Sheet${index + 1}`;
  let candidate = name;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${n})`;
    candidate = name.slice(0, 31 - suffix.length) + suffix;
    n += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

// Chuoi so thuan ("1200", "-3.5") thanh number de Excel tinh toan duoc.
// Giu nguyen chuoi co so 0 dau (SDT, ma SP) hoac qua dai (de khong mat chu so).
function toCellValue(value: CellInput): ExcelJS.CellValue {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (trimmed.startsWith('=') && trimmed.length > 1) {
    return { formula: trimmed.slice(1) };
  }
  if (/^-?(0|[1-9]\d{0,14})(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  return value;
}

function displayLength(value: ExcelJS.CellValue): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'object' && 'formula' in value) return 12;
  return Math.max(...String(value).split('\n').map((line) => line.length));
}

export async function generateXlsx(title: string, sheets: SheetInput[]): Promise<Buffer> {
  if (!Array.isArray(sheets) || sheets.length === 0) {
    throw new Error('Can it nhat 1 sheet');
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Tro ly Mi';
  workbook.title = title;
  workbook.created = new Date();

  const usedNames = new Set<string>();

  sheets.slice(0, MAX_SHEETS).forEach((sheetInput, index) => {
    const columns = Array.isArray(sheetInput.columns) ? sheetInput.columns.map(String) : [];
    const rows = Array.isArray(sheetInput.rows) ? sheetInput.rows.slice(0, MAX_ROWS_PER_SHEET) : [];
    const colCount = Math.max(columns.length, ...rows.map((r) => (Array.isArray(r) ? r.length : 0)), 1);

    const sheet = workbook.addWorksheet(safeSheetName(sheetInput.name, index, usedNames));
    const widths = new Array<number>(colCount).fill(MIN_COL_WIDTH);

    if (columns.length > 0) {
      const header = sheet.addRow(columns);
      header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      header.alignment = { vertical: 'middle', wrapText: true };
      header.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5597' } };
      });
      columns.forEach((c, i) => {
        widths[i] = Math.max(widths[i], c.length + 2);
      });
      sheet.views = [{ state: 'frozen', ySplit: 1 }];
    }

    for (const row of rows) {
      const values = (Array.isArray(row) ? row : [row]).map(toCellValue);
      sheet.addRow(values);
      values.forEach((v, i) => {
        widths[i] = Math.max(widths[i], displayLength(v) + 2);
      });
    }

    widths.forEach((w, i) => {
      sheet.getColumn(i + 1).width = Math.min(w, MAX_COL_WIDTH);
    });

    sheet.eachRow((r, rowNumber) => {
      if (rowNumber === 1 && columns.length > 0) return;
      r.eachCell((cell) => {
        if (typeof cell.value === 'number' && !Number.isInteger(cell.value)) {
          cell.numFmt = '#,##0.##';
        } else if (typeof cell.value === 'number' && Math.abs(cell.value) >= 1000) {
          cell.numFmt = '#,##0';
        }
        if (typeof cell.value === 'string' && cell.value.length > MAX_COL_WIDTH) {
          cell.alignment = { wrapText: true, vertical: 'top' };
        }
      });
    });

    if (columns.length > 0 && rows.length > 0) {
      sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colCount } };
    }
  });

  const data = await workbook.xlsx.writeBuffer();
  return Buffer.from(data as ArrayBuffer);
}

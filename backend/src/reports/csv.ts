export type CsvCell = string | number | null;

// Spreadsheet apps treat a cell starting with these as a formula (CSV/formula injection).
const FORMULA_START = /^[=+\-@\t\r]/;

/** RFC 4180 cell. Text that could run as a formula is prefixed with an apostrophe. */
export function csvCell(value: CsvCell): string {
  if (value === null) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  const text = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: readonly string[], rows: CsvCell[][]): string {
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

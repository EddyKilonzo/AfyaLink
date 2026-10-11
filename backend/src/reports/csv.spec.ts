import { csvCell, toCsv } from './csv.js';

describe('CSV export', () => {
  it.each(['=SUM(1,2)', '+1', '-1+1', '@cmd', '\tx', '\rx'])('neutralises formula-like text %j', (text) => {
    expect(csvCell(text).replace(/^"/, '')).toMatch(/^'/);
  });

  it('leaves numbers, including negative coordinates, as numbers', () => {
    expect(csvCell(-1.3675)).toBe('-1.3675');
    expect(csvCell(4)).toBe('4');
    expect(csvCell(Number.NaN)).toBe('');
  });

  it('quotes commas, quotes and newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('writes null as an empty cell and ends rows with CRLF', () => {
    expect(toCsv(['a', 'b'], [[null, 'x']])).toBe('a,b\r\n,x\r\n');
  });
});

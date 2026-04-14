import { RowError } from '../types/index';

export function validateRow(row: Record<string, string>, requiredColumns: string[]): void {
  for (const col of requiredColumns) {
    if (!row[col] || row[col].trim() === '') {
      throw new Error(`Row is missing required field: ${col}`);
    }
  }
}

/** Parse a single CSV line respecting double-quoted fields (RFC 4180). */
function parseLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      // Quoted field
      let field = '';
      i++; // skip opening quote
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          field += '"';
          i += 2;
        } else if (line[i] === '"') {
          i++; // skip closing quote
          break;
        } else {
          field += line[i++];
        }
      }
      fields.push(field.trim());
      if (line[i] === ',') i++; // skip comma after closing quote
    } else {
      // Unquoted field
      const end = line.indexOf(',', i);
      if (end === -1) {
        fields.push(line.slice(i).trim());
        break;
      } else {
        fields.push(line.slice(i, end).trim());
        i = end + 1;
      }
    }
  }
  return fields;
}

export function parseCSV<T>(
  csvText: string,
  columns: string[],
  validator: (row: Record<string, string>, rowIndex: number) => T | null
): { successes: T[]; failures: RowError[] } {
  const lines = csvText.split('\n').map(l => l.trimEnd());
  const successes: T[] = [];
  const failures: RowError[] = [];

  if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === '')) {
    return { successes, failures };
  }

  const headers = parseLine(lines[0]);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;

    const values = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? '';
    });

    columns.forEach((col, idx) => {
      if (!(col in row)) {
        row[col] = values[idx] ?? '';
      }
    });

    try {
      const result = validator(row, i);
      if (result !== null) {
        successes.push(result);
      } else {
        failures.push({ row: i, reason: 'Validation returned null' });
      }
    } catch (err) {
      failures.push({ row: i, reason: err instanceof Error ? err.message : String(err) });
    }
  }

  return { successes, failures };
}

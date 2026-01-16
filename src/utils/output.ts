export type OutputFormat = 'json' | 'toon';

export interface GlobalOptions {
  dryRun: boolean;
  format: OutputFormat;
}

export function encodeToon(data: unknown): string {
  if (Array.isArray(data)) {
    return encodeToonTable(data);
  }

  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    const lines: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        lines.push(`[${key}]`);
        lines.push(encodeToonTable(value));
      } else if (typeof value === 'object' && value !== null) {
        lines.push(`[${key}]`);
        lines.push(encodeToon(value));
      } else {
        lines.push(`${key}: ${formatValue(value)}`);
      }
    }
    return lines.join('\n');
  }

  return String(data);
}

function encodeToonTable(items: unknown[]): string {
  if (items.length === 0) return '';

  const firstItem = items[0] as Record<string, unknown>;
  const keys = Object.keys(firstItem);

  const header = keys.join('\t');
  const rows = items.map((item) => {
    const row = item as Record<string, unknown>;
    return keys.map((k) => formatValue(row[k])).join('\t');
  });

  return [header, ...rows].join('\n');
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(',');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function output(data: unknown, format: OutputFormat): void {
  if (format === 'toon') {
    console.log(encodeToon(data));
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

export function outputError(error: string, statusCode: number, hint?: string): void {
  console.log(JSON.stringify({ error, status: statusCode, hint }, null, 2));
  process.exit(1);
}

export function outputSuccess(data: unknown, format: OutputFormat): void {
  output(data, format);
}

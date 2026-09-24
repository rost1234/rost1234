import { LATEST_SCHEMA_VERSION, TABLE_COLUMNS, TABLES, type ColumnType, type TableName } from '../db/schema';

export type SqlValue = string | number | null;
export type BackupRow = Record<string, SqlValue>;
export type BackupTables = Record<TableName, BackupRow[]>;

export interface BackupFile {
  app: 'momentum';
  schemaVersion: number;
  exportedAt: string;
  tables: BackupTables;
}

export type BackupValidation =
  | { ok: true; backup: BackupFile; counts: Record<TableName, number> }
  | { ok: false; error: BackupError };

export type BackupErrorCode = 'invalid_json' | 'not_momentum' | 'no_version' | 'newer_version' | 'no_tables' | 'malformed_table' | 'invalid_row';

/** Machine-readable reason; the UI turns it into a translated message. */
export interface BackupError {
  code: BackupErrorCode;
  detail?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function coerce(value: unknown, type: ColumnType): SqlValue | undefined {
  switch (type) {
    case 'text':
      return typeof value === 'string' ? value : undefined;
    case 'nullable_text':
      return value === null || value === undefined ? null : typeof value === 'string' ? value : undefined;
    case 'integer':
      if (typeof value === 'boolean') return value ? 1 : 0;
      return typeof value === 'number' && Number.isInteger(value) ? value : undefined;
    case 'nullable_integer':
      if (value === null || value === undefined) return null;
      return typeof value === 'number' && Number.isInteger(value) ? value : undefined;
  }
}

function validateRow(table: TableName, raw: unknown, index: number): BackupRow | string {
  if (!isRecord(raw)) return `${table}[${index}] is not an object`;
  const row: BackupRow = {};
  for (const [column, type] of Object.entries(TABLE_COLUMNS[table])) {
    const value = coerce(raw[column], type);
    if (value === undefined) return `${table}[${index}].${column} is missing or has the wrong type`;
    row[column] = value;
  }
  return row;
}

/** Parses and validates a Momentum JSON export. Never throws. */
export function parseBackup(json: string): BackupValidation {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { ok: false, error: { code: 'invalid_json' } };
  }
  if (!isRecord(data) || data.app !== 'momentum') {
    return { ok: false, error: { code: 'not_momentum' } };
  }
  const schemaVersion = data.schemaVersion;
  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion) || schemaVersion < 1) {
    return { ok: false, error: { code: 'no_version' } };
  }
  if (schemaVersion > LATEST_SCHEMA_VERSION) {
    return { ok: false, error: { code: 'newer_version' } };
  }
  if (!isRecord(data.tables)) return { ok: false, error: { code: 'no_tables' } };

  const tables = {} as BackupTables;
  const counts = {} as Record<TableName, number>;
  for (const table of TABLES) {
    const rawRows = data.tables[table] ?? [];
    if (!Array.isArray(rawRows)) return { ok: false, error: { code: 'malformed_table', detail: table } };
    const rows: BackupRow[] = [];
    for (let i = 0; i < rawRows.length; i += 1) {
      const result = validateRow(table, rawRows[i], i);
      if (typeof result === 'string') return { ok: false, error: { code: 'invalid_row', detail: result } };
      rows.push(result);
    }
    tables[table] = rows;
    counts[table] = rows.length;
  }

  return {
    ok: true,
    backup: {
      app: 'momentum',
      schemaVersion,
      exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
      tables,
    },
    counts,
  };
}

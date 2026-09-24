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
  | { ok: false; error: string };

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
    return { ok: false, error: 'The file is not valid JSON.' };
  }
  if (!isRecord(data) || data.app !== 'momentum') {
    return { ok: false, error: 'This is not a Momentum backup file.' };
  }
  const schemaVersion = data.schemaVersion;
  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion) || schemaVersion < 1) {
    return { ok: false, error: 'The backup has no valid schema version.' };
  }
  if (schemaVersion > LATEST_SCHEMA_VERSION) {
    return { ok: false, error: 'This backup was made by a newer version of Momentum. Update the app first.' };
  }
  if (!isRecord(data.tables)) return { ok: false, error: 'The backup contains no tables.' };

  const tables = {} as BackupTables;
  const counts = {} as Record<TableName, number>;
  for (const table of TABLES) {
    const rawRows = data.tables[table] ?? [];
    if (!Array.isArray(rawRows)) return { ok: false, error: `Table "${table}" is malformed.` };
    const rows: BackupRow[] = [];
    for (let i = 0; i < rawRows.length; i += 1) {
      const result = validateRow(table, rawRows[i], i);
      if (typeof result === 'string') return { ok: false, error: `Invalid data: ${result}.` };
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

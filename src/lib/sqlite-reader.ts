"use client";

// ============================================================================
// SQLite Reader — Browser-side using sql.js (SQLite compiled to WASM)
// ============================================================================
// Opens a SQLite database from bytes, queries tables, and returns row data.
// sql-wasm.wasm must be served at /sql-wasm.wasm (copied to public/).

import initSqlJs, { type Database, type Statement } from "sql.js";

let SQLPromise: Promise<any> | null = null;

/** Lazy-init sql.js (loads WASM once) */
function getSql() {
  if (!SQLPromise) {
    SQLPromise = initSqlJs({
      locateFile: () => "/sql-wasm.wasm",
    });
  }
  return SQLPromise;
}

export interface SQLiteDatabase {
  exec: (sql: string) => any[][];
  prepare: (sql: string) => Statement;
  close: () => void;
}

/** Open SQLite database from raw bytes */
export async function readSQLite(bytes: Uint8Array): Promise<SQLiteDatabase> {
  const SQL = await getSql();
  return new SQL.Database(new Uint8Array(bytes));
}

/** Get all table names (excluding internal sqlite_* tables) */
export function getTableNames(db: SQLiteDatabase): string[] {
  const result = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  if (!result[0]) return [];
  const names: string[] = [];
  for (const row of result[0].values as unknown as any[][]) {
    if (row[0]) names.push(String(row[0]));
  }
  return names;
}

/** Query all rows from a table as array of objects */
export function queryTable(db: SQLiteDatabase, table: string): Record<string, any>[] {
  // Quote table name to handle edge cases
  const stmt = db.prepare(`SELECT * FROM "${table}" ORDER BY id DESC`);
  const rows: Record<string, any>[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as Record<string, any>);
  }
  stmt.free();
  return rows;
}

/** Query with custom ORDER BY */
export function queryTableOrdered(
  db: SQLiteDatabase,
  table: string,
  orderBy: string,
  direction: "ASC" | "DESC" = "DESC"
): Record<string, any>[] {
  const stmt = db.prepare(
    `SELECT * FROM "${table}" ORDER BY ${orderBy} ${direction}`
  );
  const rows: Record<string, any>[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as Record<string, any>);
  }
  stmt.free();
  return rows;
}

/** Check if a column name looks like it contains image data */
export function isImageColumn(colName: string): boolean {
  const lower = colName.toLowerCase();
  return (
    lower.includes("image") ||
    lower.includes("photo") ||
    lower.includes("picture") ||
    lower.includes("gambar") ||
    lower.includes("foto") ||
    lower === "icon" ||
    lower === "thumbnail" ||
    lower === "qr" ||
    lower.includes("qris") ||
    lower.includes("barcode")
  );
}

/** Check if a column name looks like it contains base64 image data (long text) */
export function isBase64ImageValue(value: any): boolean {
  if (typeof value !== "string") return false;
  // Base64 images are typically long strings starting with common prefixes
  if (value.length < 100) return false;
  // Check for base64 image prefixes
  return (
    value.startsWith("/9j/") || // JPEG
    value.startsWith("iVBOR") || // PNG
    value.startsWith("R0lGOD") || // GIF
    value.startsWith("UklGR") || // WEBP
    value.startsWith("PHN2Zy") || // SVG
    (value.length > 500 && /^[A-Za-z0-9+/=]+$/.test(value.substring(0, 100)))
  );
}

/** Try to detect image columns from actual data */
export function detectImageColumns(
  rows: Record<string, any>[]
): Set<string> {
  const imageCols = new Set<string>();
  if (rows.length === 0) return imageCols;

  const cols = Object.keys(rows[0]);
  for (const col of cols) {
    if (isImageColumn(col)) {
      imageCols.add(col);
      continue;
    }
    // Check first 10 rows for base64 image data
    let imageCount = 0;
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      if (isBase64ImageValue(rows[i][col])) imageCount++;
    }
    if (imageCount > 3) imageCols.add(col);
  }
  return imageCols;
}

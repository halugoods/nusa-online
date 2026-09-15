"use client";

// ============================================================================
// BackupViewer — Spreadsheet-like viewer for .nus1 / .backup.sqlite.enc
// ============================================================================
// Features:
//   - Dropzone for .nus1 file upload
//   - Manual UID input for decryption
//   - Table tabs (switch between SQLite tables)
//   - Data table with image tooltip preview on hover (B2.3)
//   - Export CSV / JSON buttons
//   - Search/filter within table
// ============================================================================

import { useState, useCallback, useMemo, useRef } from "react";
import { decryptBackupRaw, parseNus1 } from "@/lib/backup-decrypt";
import {
  readSQLite,
  getTableNames,
  queryTable,
  detectImageColumns,
  type SQLiteDatabase,
} from "@/lib/sqlite-reader";

// ── Types ──────────────────────────────────────────────────────────────

interface BackupViewerProps {
  /** Pre-fill Google UID (optional) */
  initialUid?: string;
}

// ── Component ──────────────────────────────────────────────────────────

export default function BackupViewer({ initialUid = "" }: BackupViewerProps) {
  const [googleUid, setGoogleUid] = useState(initialUid);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Decrypted state
  const [nus1Entries, setNus1Entries] = useState<string[]>([]);
  const [sqliteDb, setSqliteDb] = useState<SQLiteDatabase | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [activeTable, setActiveTable] = useState("");
  const [tableData, setTableData] = useState<Record<string, any>[]>([]);
  const [imageColumns, setImageColumns] = useState<Set<string>>(new Set());
  const [rowCount, setRowCount] = useState(0);

  // Preview tooltip state
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });

  // Search/filter
  const [searchTerm, setSearchTerm] = useState("");

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Decrypt & load .nus1 ────────────────────────────────────────────

  const handleFile = useCallback(
    async (file: File) => {
      if (!googleUid.trim()) {
        setError("Masukkan Google UID terlebih dahulu");
        return;
      }

      setLoading(true);
      setError("");
      setFileName(file.name);
      setNus1Entries([]);
      setSqliteDb(null);
      setTables([]);
      setActiveTable("");
      setTableData([]);
      setSearchTerm("");

      try {
        // Step 1: Read raw bytes
        const rawBytes = new Uint8Array(await file.arrayBuffer());

        // Step 2: Detect format — is it a NUS1 archive or raw encrypted?
        let sqliteEncBytes: Uint8Array;

        if (
          rawBytes[0] === 0x4e &&
          rawBytes[1] === 0x55 &&
          rawBytes[2] === 0x53 &&
          rawBytes[3] === 0x31
        ) {
          // NUS1 archive — extract the encrypted SQLite from it
          const parsed = parseNus1(rawBytes);
          const entries = Array.from(parsed.keys());
          setNus1Entries(entries);

          // Look for the encrypted backup file (could be backup.sqlite.enc or nusa_kasir.sqlite)
          const encEntry =
            parsed.get("backup.sqlite.enc") ||
            parsed.get("nusa_kasir.sqlite") ||
            null;

          if (!encEntry) {
            setError(
              `File .nus1 tidak mengandung database. Entri tersedia: ${entries.join(", ")}`
            );
            return;
          }
          sqliteEncBytes = encEntry;
        } else {
          // Raw encrypted file (not NUS1 wrapped)
          sqliteEncBytes = rawBytes;
          setNus1Entries(["(raw encrypted file)"]);
        }

        // Step 3: Decrypt the encrypted SQLite bytes → raw SQLite
        const decryptedBytes = await decryptBackupRaw(
          sqliteEncBytes,
          googleUid.trim()
        );

        // Step 4: Open SQLite from decrypted bytes
        const db = await readSQLite(decryptedBytes);
        const tableNames = getTableNames(db).filter(
          (t) => !t.startsWith("sqlite_")
        );

        if (tableNames.length === 0) {
          setError("Database SQLite tidak punya tabel");
          return;
        }

        setSqliteDb(db);
        setTables(tableNames);
        setActiveTable(tableNames[0]);

        // Load first table
        const rows = queryTable(db, tableNames[0]);
        setTableData(rows);
        setRowCount(rows.length);
        setImageColumns(detectImageColumns(rows));
      } catch (e: any) {
        setError(e.message ?? "Gagal membaca file");
      } finally {
        setLoading(false);
      }
    },
    [googleUid]
  );

  // ── Switch table ────────────────────────────────────────────────────

  const switchTable = useCallback(
    (tableName: string) => {
      if (!sqliteDb) return;
      setActiveTable(tableName);
      setSearchTerm("");
      const rows = queryTable(sqliteDb, tableName);
      setTableData(rows);
      setRowCount(rows.length);
      setImageColumns(detectImageColumns(rows));
    },
    [sqliteDb]
  );

  // ── Filtered data ───────────────────────────────────────────────────

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return tableData;
    const q = searchTerm.toLowerCase();
    return tableData.filter((row) =>
      Object.values(row).some((v) =>
        String(v ?? "")
          .toLowerCase()
          .includes(q)
      )
    );
  }, [tableData, searchTerm]);

  // ── Image preview handlers ─────────────────────────────────────────

  const handleImageHover = useCallback(
    (
      e: React.MouseEvent,
      value: string | null
    ) => {
      if (!value) return;
      setPreviewImage(value);
      setPreviewPos({ x: e.clientX, y: e.clientY });
    },
    []
  );

  const handleImageLeave = useCallback(() => {
    setPreviewImage(null);
  }, []);

  // ── Export ─────────────────────────────────────────────────────────

  const exportCSV = useCallback(() => {
    if (filteredData.length === 0) return;
    const cols = Object.keys(filteredData[0]);
    const header = cols.join(",");
    const rows = filteredData.map((row) =>
      cols
        .map((col) => {
          const val = row[col];
          if (val == null) return "";
          const s = String(val);
          // Escape CSV: wrap in quotes if contains comma, quote, or newline
          if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    downloadBlob(blob, `${activeTable}_export.csv`);
  }, [filteredData, activeTable]);

  const exportJSON = useCallback(() => {
    if (filteredData.length === 0) return;
    const json = JSON.stringify(filteredData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    downloadBlob(blob, `${activeTable}_export.json`);
  }, [filteredData, activeTable]);

  // ── Drag & drop ────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // ── Reset ──────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setFileName("");
    setNus1Entries([]);
    setSqliteDb(null);
    setTables([]);
    setActiveTable("");
    setTableData([]);
    setImageColumns(new Set());
    setPreviewImage(null);
    setSearchTerm("");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">
            Backup File Viewer
          </h3>
          {fileName && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 truncate max-w-[200px]">
                {fileName}
              </span>
              <button
                onClick={reset}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── UID Input ──────────────────────────────────────────────── */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
        <label className="text-xs text-gray-600 whitespace-nowrap">
          Google UID:
        </label>
        <input
          type="text"
          value={googleUid}
          onChange={(e) => setGoogleUid(e.target.value)}
          placeholder="21-digit Google UID (contoh: 114275999320339813466)"
          className="flex-1 px-3 py-1.5 border border-gray-200 rounded-md text-xs focus:outline-none focus:border-blue-400 font-mono"
        />
      </div>

      {/* ── Error ──────────────────────────────────────────────────── */}
      {error && (
        <div className="px-5 py-3 bg-red-50 border-b border-red-100 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* ── Dropzone ───────────────────────────────────────────────── */}
      {!sqliteDb && (
        <div className="p-5">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-blue-400 bg-blue-50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            } ${loading ? "pointer-events-none opacity-50" : ""}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".nus1,.enc,.sqlite.enc"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {loading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-600">
                  Decrypt & parse database...
                </p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <p className="text-sm text-gray-700 font-medium">
                  Drop file .nus1 di sini
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  atau klik untuk pilih file
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Decrypted info ─────────────────────────────────────────── */}
      {nus1Entries.length > 0 && (
        <div className="px-5 py-2 bg-green-50 border-b border-green-100 text-xs text-green-700">
          ✓ {nus1Entries.length} file di-archive:{" "}
          <span className="font-mono">{nus1Entries.join(", ")}</span>
        </div>
      )}

      {/* ── Table Tabs ─────────────────────────────────────────────── */}
      {tables.length > 0 && (
        <div className="border-b border-gray-100 overflow-x-auto">
          <div className="flex px-2 pt-2 gap-0">
            {tables.map((t) => (
              <button
                key={t}
                onClick={() => switchTable(t)}
                className={`px-3 py-2 text-xs font-medium rounded-t-md transition-colors whitespace-nowrap ${
                  activeTable === t
                    ? "bg-white border border-gray-200 border-b-white text-blue-600 -mb-px"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Data Table ─────────────────────────────────────────────── */}
      {tableData.length > 0 && (
        <div>
          {/* Toolbar */}
          <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-600">
                <span className="font-medium">{filteredData.length}</span> dari{" "}
                <span className="font-medium">{rowCount}</span> baris
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari di tabel..."
                className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-blue-400 w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportCSV}
                className="px-2.5 py-1 bg-blue-600 text-white text-xs rounded hover:opacity-80"
              >
                Export CSV
              </button>
              <button
                onClick={exportJSON}
                className="px-2.5 py-1 bg-gray-600 text-white text-xs rounded hover:opacity-80"
              >
                Export JSON
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-auto max-h-[500px]">
            <table className="w-full text-xs">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 w-10">
                    #
                  </th>
                  {Object.keys(tableData[0]).map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap"
                    >
                      {col}
                      {imageColumns.has(col) && (
                        <span className="ml-1 text-blue-400">🖼</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredData.map((row, i) => (
                  <tr key={i} className="hover:bg-blue-50/50">
                    <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                    {Object.entries(row).map(([col, val]) => (
                      <td
                        key={col}
                        className="px-3 py-1.5 max-w-[200px] truncate"
                      >
                        {imageColumns.has(col) && val ? (
                          <ImageCell
                            value={String(val)}
                            onHover={handleImageHover}
                            onLeave={handleImageLeave}
                          />
                        ) : val === null ? (
                          <span className="text-gray-300 italic">NULL</span>
                        ) : (
                          <span className="text-gray-700">
                            {String(val).slice(0, 80)}
                            {String(val).length > 80 ? "…" : ""}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredData.length === 0 && searchTerm && (
            <div className="text-center py-8 text-gray-400 text-xs">
              Tidak ada baris cocok dengan &quot;{searchTerm}&quot;
            </div>
          )}
        </div>
      )}

      {/* ── Image Preview Tooltip ──────────────────────────────────── */}
      {previewImage && (
        <div
          className="fixed z-50 bg-white shadow-2xl rounded-lg p-2 border border-gray-200 pointer-events-none"
          style={{
            left: previewPos.x + 16,
            top: previewPos.y - 100,
          }}
        >
          <img
            src={`data:image/jpeg;base64,${previewImage}`}
            alt="Preview"
            className="max-w-[240px] max-h-[240px] object-contain rounded"
            onError={(e) => {
              // Try PNG if JPEG fails
              (e.target as HTMLImageElement).src =
                `data:image/png;base64,${previewImage}`;
            }}
          />
          <p className="text-[10px] text-gray-400 text-center mt-1">
            {(previewImage.length * 0.75 / 1024).toFixed(0)} KB (base64)
          </p>
        </div>
      )}
    </div>
  );
}

// ── Image Cell with hover preview ──────────────────────────────────────

function ImageCell({
  value,
  onHover,
  onLeave,
}: {
  value: string;
  onHover: (e: React.MouseEvent, value: string) => void;
  onLeave: () => void;
}) {
  // Show a small thumbnail preview
  return (
    <div
      className="inline-flex items-center gap-1 cursor-pointer"
      onMouseEnter={(e) => onHover(e, value)}
      onMouseLeave={onLeave}
    >
      <img
        src={`data:image/jpeg;base64,${value}`}
        className="w-8 h-8 object-cover rounded border border-gray-200"
        onError={(e) => {
          (e.target as HTMLImageElement).src =
            `data:image/png;base64,${value}`;
        }}
      />
      <span className="text-blue-500 text-[10px]">hover</span>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

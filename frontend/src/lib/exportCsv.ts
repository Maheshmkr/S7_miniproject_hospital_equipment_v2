import { toast } from "sonner";

export interface CsvColumn<T = any> {
  header: string;
  key?: keyof T | string;
  accessor?: (row: T) => string | number | boolean | null | undefined;
}

export interface ExportCsvOptions<T = any> {
  filename: string;
  title?: string;
  metadata?: Record<string, string | number | undefined | null>;
  columns: CsvColumn<T>[];
  data: T[];
}

/**
 * Escapes a cell value for standard RFC 4180 CSV compliance.
 */
function escapeCsvValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports data to a CSV file respecting active filters and metadata header.
 */
export function exportToCsv<T = any>({
  filename,
  title,
  metadata = {},
  columns,
  data,
}: ExportCsvOptions<T>): void {
  try {
    const lines: string[] = [];

    // Header metadata block
    if (title) {
      lines.push(`# Medixa Hospital Asset Intelligence - Export Report`);
      lines.push(`# Report Title: ${title}`);
    }
    const metaEntries = Object.entries(metadata).filter(
      ([, v]) => v !== undefined && v !== null && v !== "",
    );
    if (metaEntries.length > 0) {
      metaEntries.forEach(([k, v]) => {
        lines.push(`# ${k}: ${v}`);
      });
    }
    lines.push(`# Exported At: ${new Date().toISOString().replace("T", " ").substring(0, 19)}`);
    lines.push(`# Filtered Records Count: ${data.length}`);
    lines.push("#");

    // Table header
    const headerLine = columns.map((col) => escapeCsvValue(col.header)).join(",");
    lines.push(headerLine);

    // Rows
    data.forEach((row) => {
      const rowLine = columns
        .map((col) => {
          let val: unknown;
          if (col.accessor) {
            val = col.accessor(row);
          } else if (col.key && typeof row === "object" && row !== null) {
            val = (row as Record<string, unknown>)[col.key as string];
          }
          return escapeCsvValue(val);
        })
        .join(",");
      lines.push(rowLine);
    });

    const csvContent = lines.join("\r\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const finalFilename = filename.toLowerCase().endsWith(".csv") ? filename : `${filename}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", finalFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Export downloaded: ${finalFilename}`);
  } catch (err) {
    console.error("CSV export failed", err);
    toast.error("Failed to export CSV report");
  }
}

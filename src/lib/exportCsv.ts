/**
 * Generic CSV export utility.
 * Takes an array of objects and column definitions, generates a CSV, and triggers download.
 */
export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => string | number;
}

export function exportToCsv<T>(
  filename: string,
  data: T[],
  columns: CsvColumn<T>[]
) {
  if (data.length === 0) return;

  const separator = ";";
  const header = columns.map((c) => `"${c.header}"`).join(separator);
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const val = c.accessor(row);
        if (typeof val === "number") return String(val);
        return `"${String(val ?? "").replace(/"/g, '""')}"`;
      })
      .join(separator)
  );

  const bom = "\uFEFF"; // UTF-8 BOM for Excel compatibility
  const csv = bom + [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

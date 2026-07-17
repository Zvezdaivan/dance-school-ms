// Excel workbook builder used by every report. Produces a consistently
// formatted sheet: title, filter subtitle, styled header row, data rows,
// bold totals row, and an optional summary block.

import ExcelJS from "exceljs";

export interface ReportColumn {
  header: string;
  key: string;
  width?: number;
  format?: "currency" | "number" | "hours" | "text";
}

export interface ReportDefinition {
  title: string;
  subtitle?: string;
  sheetName?: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  /** Values keyed by column key; rendered as a bold TOTAL row. */
  totals?: Record<string, number | string>;
  /** Label/value pairs rendered below the table. */
  summary?: [string, string | number][];
}

const CURRENCY_FMT = '"HK$"#,##0.00';
const HOURS_FMT = "0.00";

export async function buildWorkbook(def: ReportDefinition): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Dance School Management System";
  wb.created = new Date();
  // Excel forbids * ? : \ / [ ] in sheet names and caps them at 31 chars.
  const sheetName = (def.sheetName ?? def.title).replace(/[*?:\\/[\]]/g, "-").slice(0, 31);
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: def.subtitle ? 4 : 3 }],
  });

  ws.columns = def.columns.map((c) => ({ key: c.key, width: c.width ?? 18 }));
  const colCount = def.columns.length;

  // Title + subtitle
  const titleRow = ws.addRow([def.title]);
  titleRow.font = { bold: true, size: 14 };
  ws.mergeCells(titleRow.number, 1, titleRow.number, Math.max(colCount, 1));
  const generated = ws.addRow([`Generated ${new Date().toISOString().replace("T", " ").slice(0, 16)} UTC${def.subtitle ? ` — ${def.subtitle}` : ""}`]);
  generated.font = { italic: true, size: 9, color: { argb: "FF6B7280" } };
  ws.mergeCells(generated.number, 1, generated.number, Math.max(colCount, 1));
  if (def.subtitle) ws.addRow([]);

  // Header
  const header = ws.addRow(def.columns.map((c) => c.header));
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
    cell.border = { bottom: { style: "thin" } };
    cell.alignment = { vertical: "middle" };
  });

  // Data
  for (const row of def.rows) {
    const r = ws.addRow(def.columns.map((c) => row[c.key] ?? ""));
    def.columns.forEach((c, i) => {
      const cell = r.getCell(i + 1);
      if (c.format === "currency") cell.numFmt = CURRENCY_FMT;
      if (c.format === "hours" || c.format === "number") cell.numFmt = HOURS_FMT;
      cell.border = { bottom: { style: "hair", color: { argb: "FFE5E7EB" } } };
    });
  }

  // Totals
  if (def.totals) {
    const r = ws.addRow(
      def.columns.map((c, i) => (i === 0 ? "TOTAL" : (def.totals as Record<string, unknown>)[c.key] ?? ""))
    );
    r.font = { bold: true };
    def.columns.forEach((c, i) => {
      const cell = r.getCell(i + 1);
      if (c.format === "currency" && i > 0) cell.numFmt = CURRENCY_FMT;
      if ((c.format === "hours" || c.format === "number") && i > 0) cell.numFmt = HOURS_FMT;
      cell.border = { top: { style: "double" } };
    });
  }

  // Summary block
  if (def.summary && def.summary.length > 0) {
    ws.addRow([]);
    const sTitle = ws.addRow(["Summary"]);
    sTitle.font = { bold: true, size: 12 };
    for (const [label, value] of def.summary) {
      const r = ws.addRow([label, value]);
      r.getCell(1).font = { color: { argb: "FF4B5563" } };
      if (typeof value === "number" && !Number.isInteger(value)) r.getCell(2).numFmt = CURRENCY_FMT;
      r.getCell(2).font = { bold: true };
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

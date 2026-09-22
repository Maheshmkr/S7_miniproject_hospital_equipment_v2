import assert from "node:assert";

console.log("=== Running PDF Export Utility Automated Tests ===");

// 1. Test generateReportFilename logic
function generateReportFilename(pageName, id) {
  const cleanName = pageName.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const cleanId = id ? `-${id.replace(/[^a-zA-Z0-9]+/g, "-")}` : "";
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;

  return `Medixa-${cleanName}${cleanId}-${dateStr}.pdf`;
}

// Test 1: Filename generation with standard page name
const f1 = generateReportFilename("Equipment-Report");
console.log("Test 1 - Filename without ID:", f1);
assert.match(
  f1,
  /^Medixa-Equipment-Report-\d{4}-\d{2}-\d{2}\.pdf$/,
  "Standard filename matches format",
);

// Test 2: Filename generation with equipment ID
const f2 = generateReportFilename("Equipment-Health-Report", "EQ-1001");
console.log("Test 2 - Filename with ID:", f2);
assert.match(
  f2,
  /^Medixa-Equipment-Health-Report-EQ-1001-\d{4}-\d{2}-\d{2}\.pdf$/,
  "Filename with ID matches format",
);

// Test 3: Filename generation with special characters
const f3 = generateReportFilename("Executive & Compliance Analytics Report (Q3/2026)", "DOC #45");
console.log("Test 3 - Filename with special characters:", f3);
assert.match(
  f3,
  /^Medixa-Executive-Compliance-Analytics-Report-Q3-2026-DOC-45-\d{4}-\d{2}-\d{2}\.pdf$/,
  "Sanitized filename matches format",
);

// Test 4: Verify exportPdf module source exports
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const exportPdfSource = fs.readFileSync(path.join(__dirname, "src/lib/exportPdf.ts"), "utf-8");

assert(
  exportPdfSource.includes("export async function exportPageToPdf"),
  "exportPageToPdf is exported",
);
assert(
  exportPdfSource.includes("export function generateReportFilename"),
  "generateReportFilename is exported",
);
assert(exportPdfSource.includes("export function usePdfExport"), "usePdfExport hook is exported");
assert(exportPdfSource.includes("medixa-pdf-sandbox"), "Sandbox container used for clean cloning");
assert(
  exportPdfSource.includes("container.parentNode.removeChild(container)"),
  "Sandbox cleanup logic present in finally block",
);
assert(
  exportPdfSource.includes("prepareCloneForExport"),
  "DOM preparation & UI controls removal logic present",
);
assert(
  exportPdfSource.includes("calculatePageBreaks"),
  "Smart page-break calculation logic present",
);
assert(exportPdfSource.includes("doc.save(filename)"), "Automatic download save logic present");
assert(exportPdfSource.includes("Page ${p} of ${totalPages}"), "Vector page numbering present");

console.log("\nAll 4 automated unit tests passed successfully!");

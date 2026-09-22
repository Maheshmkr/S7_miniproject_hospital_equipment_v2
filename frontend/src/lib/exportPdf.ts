import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import { toCanvas } from "html-to-image";
import { toast } from "sonner";
import { useState, useCallback } from "react";

export interface ExportPdfOptions {
  /** Target HTMLElement or CSS selector. Defaults to 'main' or document.body */
  element?: HTMLElement | string | null;
  /** File name to save as. Defaults to a Medixa standard formatted name */
  filename?: string;
  /** Title shown in the PDF header */
  title?: string;
  /** Subtitle shown in the PDF header */
  subtitle?: string;
  /** Metadata to include in header (e.g. Equipment ID, Department, Generated Date) */
  metadata?: Record<string, string | number | undefined | null>;
  /** Page orientation: 'portrait' | 'landscape' (default 'portrait') */
  orientation?: "portrait" | "landscape";
  /** Selectors for elements to exclude from the PDF (e.g. action buttons) */
  excludeSelectors?: string[];
  /** Custom canvas scale factor (default 2 for high-DPI clarity) */
  scale?: number;
}

/**
 * Generate a standard hospital report filename with date.
 * Example: Medixa-Equipment-Health-Report-EQ-1001-2026-09-20.pdf
 */
export function generateReportFilename(pageName: string, id?: string): string {
  const cleanName = pageName.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const cleanId = id ? `-${id.replace(/[^a-zA-Z0-9]+/g, "-")}` : "";
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;

  return `Medixa-${cleanName}${cleanId}-${dateStr}.pdf`;
}

/**
 * Format a date as DD/MM/YYYY
 */
function formatDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format date and time as DD/MM/YYYY HH:mm
 */
function formatDateTime(d: Date): string {
  const dateStr = formatDate(d);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${dateStr} ${hours}:${minutes}`;
}

/**
 * Resolve CSS variable to actual computed RGB/HEX color string.
 */
function resolveCssVar(varStr: string, element: HTMLElement): string {
  if (!varStr || !varStr.includes("var(")) return varStr;
  const match = varStr.match(/var\((--[^,)]+)(?:,\s*([^)]+))?\)/);
  if (!match) return varStr;
  const varName = match[1].trim();
  const fallback = match[2] ? match[2].trim() : "";
  const val = getComputedStyle(element).getPropertyValue(varName).trim();
  return val || fallback || varStr;
}

/**
 * Pre-process cloned DOM to ensure Recharts SVGs, colors, and layout are pristine for canvas capture.
 */
function prepareCloneForExport(
  clone: HTMLElement,
  original: HTMLElement,
  excludeSelectors: string[],
) {
  // 1. Remove non-report UI elements (buttons, inputs, action controls, breadcrumbs actions)
  const defaultExcludes = [
    ".no-export",
    "[data-no-export]",
    "button:not([data-preserve-export])",
    "a[role='button']",
    "input[type='search']",
    "input[type='text']",
    "select",
    ".workflow-tabs",
    "header.app-header",
    "aside",
    ".fixed",
    ".sticky",
  ];

  const allExcludes = [...defaultExcludes, ...excludeSelectors];
  allExcludes.forEach((selector) => {
    try {
      const els = clone.querySelectorAll(selector);
      els.forEach((el) => el.remove());
    } catch {
      // Ignore invalid selectors
    }
  });

  // 2. Expand scrollable containers so all rows/content are rendered
  const scrollables = clone.querySelectorAll<HTMLElement>(
    ".overflow-x-auto, .overflow-y-auto, .overflow-hidden, .overflow-scroll, [class*='max-h-'], [class*='h-[']",
  );
  scrollables.forEach((el) => {
    el.style.overflow = "visible";
    el.style.maxHeight = "none";
  });

  // 3. Resolve CSS variables in SVG elements (critical for Recharts fidelity)
  const origSvgs = original.querySelectorAll<SVGElement>("svg");
  const cloneSvgs = clone.querySelectorAll<SVGElement>("svg");

  cloneSvgs.forEach((svg, i) => {
    const origSvg = origSvgs[i];
    if (origSvg) {
      const rect = origSvg.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        svg.setAttribute("width", String(rect.width));
        svg.setAttribute("height", String(rect.height));
        svg.style.width = `${rect.width}px`;
        svg.style.height = `${rect.height}px`;
      }
    }

    // Replace CSS variables in SVG presentation attributes and inline styles
    const svgElements = svg.querySelectorAll<SVGElement>("*");
    svgElements.forEach((el) => {
      const attrs = ["fill", "stroke", "stop-color", "color"];
      attrs.forEach((attr) => {
        const val = el.getAttribute(attr);
        if (val && val.includes("var(")) {
          el.setAttribute(attr, resolveCssVar(val, original));
        }
      });

      // Also check inline style
      if (el.style) {
        if (el.style.fill && el.style.fill.includes("var(")) {
          el.style.fill = resolveCssVar(el.style.fill, original);
        }
        if (el.style.stroke && el.style.stroke.includes("var(")) {
          el.style.stroke = resolveCssVar(el.style.stroke, original);
        }
        if (el.style.stopColor && el.style.stopColor.includes("var(")) {
          el.style.stopColor = resolveCssVar(el.style.stopColor, original);
        }
      }
    });
  });

  // 4. Ensure background is solid white/light for crisp report printing
  clone.style.backgroundColor = "#ffffff";
  clone.style.color = "#0f172a";
}

/**
 * Calculate smart page breaks so elements (cards, charts, table rows) are never split across pages.
 */
function calculatePageBreaks(
  container: HTMLElement,
  usableHeightPx: number,
  totalHeightPx: number,
): number[] {
  const breaks: number[] = [0];
  if (totalHeightPx <= usableHeightPx) {
    breaks.push(totalHeightPx);
    return breaks;
  }

  // Find break candidates: sections, panels, cards, tables, table rows, charts
  const candidates = Array.from(
    container.querySelectorAll<HTMLElement>(
      "section, article, [class*='glass-card'], [class*='rounded-'], table, tr, .recharts-wrapper, dl, ol, ul, h1, h2, h3",
    ),
  );

  let currentTop = 0;
  const containerRect = container.getBoundingClientRect();

  while (currentTop + usableHeightPx < totalHeightPx) {
    const idealEnd = currentTop + usableHeightPx;
    let bestBreak = idealEnd;
    let foundCleanBreak = false;

    // Look for an element that spans across idealEnd and push break before it
    for (const el of candidates) {
      const elRect = el.getBoundingClientRect();
      const elTop = elRect.top - containerRect.top;
      const elBottom = elRect.bottom - containerRect.top;
      const elHeight = elBottom - elTop;

      // If element starts on this page and crosses the ideal page boundary
      if (elTop > currentTop + 40 && elTop < idealEnd && elBottom > idealEnd) {
        // If element is small enough to fit on the next page, break right before it
        if (elHeight <= usableHeightPx) {
          bestBreak = elTop;
          foundCleanBreak = true;
          break;
        }
      }
    }

    // If no single element crossed cleanly or element is huge, look for any element top near idealEnd
    if (!foundCleanBreak) {
      let nearestTopBefore = currentTop;
      for (const el of candidates) {
        const elRect = el.getBoundingClientRect();
        const elTop = elRect.top - containerRect.top;
        if (elTop > currentTop + 80 && elTop <= idealEnd && elTop > nearestTopBefore) {
          nearestTopBefore = elTop;
        }
      }
      // If we found a candidate within the lower 35% of the page, use it
      if (nearestTopBefore > currentTop + usableHeightPx * 0.65) {
        bestBreak = nearestTopBefore;
      } else {
        bestBreak = idealEnd;
      }
    }

    // Ensure forward progress by at least 150px
    if (bestBreak <= currentTop + 150) {
      bestBreak = idealEnd;
    }

    breaks.push(bestBreak);
    currentTop = bestBreak;
  }

  if (breaks[breaks.length - 1] < totalHeightPx) {
    breaks.push(totalHeightPx);
  }

  return breaks;
}

/**
 * Main export function: captures rendered React DOM and downloads a publication-grade PDF.
 */
export async function exportPageToPdf(options: ExportPdfOptions = {}): Promise<void> {
  const {
    element,
    filename = generateReportFilename(options.title || "Report"),
    title = "Hospital Report",
    subtitle,
    metadata = {},
    orientation = "portrait",
    excludeSelectors = [],
    scale = 2,
  } = options;

  // Resolve target DOM element
  let targetEl: HTMLElement | null = null;
  if (typeof element === "string") {
    targetEl = document.querySelector<HTMLElement>(element);
  } else if (element instanceof HTMLElement) {
    targetEl = element;
  } else {
    targetEl =
      document.querySelector<HTMLElement>("main") ||
      document.querySelector<HTMLElement>("[data-export-root]") ||
      document.querySelector<HTMLElement>(".mx-auto.max-w-\\[1600px\\]") ||
      document.body;
  }

  if (!targetEl) {
    throw new Error("No content element found to export.");
  }

  // Setup offscreen sandbox for clone rendering
  const clone = targetEl.cloneNode(true) as HTMLElement;
  const container = document.createElement("div");
  container.className = "medixa-pdf-sandbox";
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.width = orientation === "landscape" ? "1400px" : "1120px";
  container.style.backgroundColor = "#ffffff";
  container.style.zIndex = "-1000";
  container.appendChild(clone);
  document.body.appendChild(container);

  try {
    // Sanitize clone
    prepareCloneForExport(clone, targetEl, excludeSelectors);

    // Wait for any images / SVGs to stabilize
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Capture clone with html2canvas-pro, fallback to html-to-image if needed
    let canvas: HTMLCanvasElement;
    try {
      canvas = await html2canvas(clone, {
        scale,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: orientation === "landscape" ? 1400 : 1120,
      });
    } catch (err) {
      console.warn("html2canvas-pro encountered an issue, using toCanvas fallback:", err);
      canvas = await toCanvas(clone, {
        pixelRatio: scale,
        backgroundColor: "#ffffff",
      });
    }

    // Setup jsPDF
    const isLandscape = orientation === "landscape";
    const doc = new jsPDF({
      orientation: isLandscape ? "landscape" : "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = isLandscape ? 297 : 210;
    const pageHeight = isLandscape ? 210 : 297;

    const margins = {
      top: 26, // Reserved for professional header
      bottom: 18, // Reserved for professional footer
      left: 14,
      right: 14,
    };

    const usableWidthMm = pageWidth - margins.left - margins.right;
    const usableHeightMm = pageHeight - margins.top - margins.bottom;

    // Convert dimensions between canvas pixels and PDF mm
    const pxPerMm = canvas.width / usableWidthMm;
    const usableHeightPx = usableHeightMm * pxPerMm;

    // Calculate smart page breaks
    const breaks = calculatePageBreaks(clone, usableHeightPx, canvas.height);
    const numPages = Math.max(1, breaks.length - 1);

    for (let i = 0; i < numPages; i++) {
      if (i > 0) {
        doc.addPage("a4", isLandscape ? "landscape" : "portrait");
      }

      const yStartPx = breaks[i];
      const yEndPx = breaks[i + 1] || canvas.height;
      const sliceHeightPx = yEndPx - yStartPx;
      const sliceHeightMm = sliceHeightPx / pxPerMm;

      // Create slice canvas
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeightPx;
      const sliceCtx = sliceCanvas.getContext("2d");

      if (sliceCtx) {
        sliceCtx.fillStyle = "#ffffff";
        sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        sliceCtx.drawImage(
          canvas,
          0,
          yStartPx,
          canvas.width,
          sliceHeightPx,
          0,
          0,
          sliceCanvas.width,
          sliceHeightPx,
        );

        const imgData = sliceCanvas.toDataURL("image/jpeg", 0.95);
        doc.addImage(imgData, "JPEG", margins.left, margins.top, usableWidthMm, sliceHeightMm);
      }

      // Draw Professional Vector Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(24, 76, 120); // Medixa brand primary
      doc.text("MEDIXA", margins.left, 11);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Hospital Equipment Asset Lifecycle Management System", margins.left, 15);

      // Title & Subtitle
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      const headerTitle = i === 0 ? title : `${title} (Continued)`;
      doc.text(headerTitle, margins.left, 20.5);

      if (subtitle && i === 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(subtitle, margins.left, 24.5);
      }

      // Right metadata
      const now = new Date();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${formatDateTime(now)}`, pageWidth - margins.right, 11, {
        align: "right",
      });

      // Show first 2 metadata items on page 1 header if provided
      if (i === 0 && Object.keys(metadata).length > 0) {
        const metaEntries = Object.entries(metadata)
          .filter(([_, v]) => v !== undefined && v !== null && v !== "")
          .slice(0, 3);
        const metaStr = metaEntries.map(([k, v]) => `${k}: ${v}`).join("  |  ");
        if (metaStr) {
          doc.text(metaStr, pageWidth - margins.right, 16, { align: "right" });
        }
      }

      // Header separator line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margins.left, 25.5, pageWidth - margins.right, 25.5);

      // Draw Professional Vector Footer
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margins.left, pageHeight - 11, pageWidth - margins.right, pageHeight - 11);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        "Medixa Hospital Equipment Asset Lifecycle Management System",
        margins.left,
        pageHeight - 6.5,
      );

      doc.text(`Generated on ${formatDate(now)}`, pageWidth - margins.right, pageHeight - 6.5, {
        align: "right",
      });
    }

    // Add Page Numbers "Page X of Y" across all pages
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Page ${p} of ${totalPages}`, pageWidth / 2, pageHeight - 6.5, {
        align: "center",
      });
    }

    // Save and download automatically
    doc.save(filename);
  } finally {
    // Always clean up sandbox
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

/**
 * Reusable React hook for handling PDF export with loading state,
 * sonner toasts, and double-click prevention.
 */
export function usePdfExport() {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(
    async (options: ExportPdfOptions = {}) => {
      if (exporting) return false;
      setExporting(true);
      const toastId = toast.loading("Exporting PDF...");

      try {
        await exportPageToPdf(options);
        toast.success("PDF downloaded successfully", { id: toastId });
        return true;
      } catch (err: unknown) {
        console.error("PDF export failed:", err);
        const errMsg =
          err instanceof Error ? err.message : "Unable to export PDF. Please try again.";
        toast.error(`Export failed: ${errMsg}`, { id: toastId });
        return false;
      } finally {
        setExporting(false);
      }
    },
    [exporting],
  );

  return { exporting, handleExport };
}

import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import { toCanvas } from "html-to-image";
import { generateReportFilename } from "./exportPdf";

export interface EquipmentHealthReportData {
  equipment: {
    id: string;
    name: string;
    department: string;
    category: string;
    criticality: string;
    location: string;
    model: string;
    serialNumber: string;
    manufactureDate: string;
    warrantyExpiry: string;
    status: string;
    assignedEngineer: string;
  };
  healthScore: {
    score: number;
    status: string;
    breakdown: {
      operational: { score: number; max: number; weight: number };
      complaints: { score: number; max: number; weight: number };
      maintenance: { score: number; max: number; weight: number };
      preventiveMaintenance: { score: number; max: number; weight: number };
      calibration: { score: number; max: number; weight: number };
      warranty: { score: number; max: number; weight: number };
      safety: { score: number; max: number; weight: number };
    };
  };
  complaints: {
    total: number;
    open: number;
    resolved: number;
    critical: number;
    recent: Array<{
      date: string;
      id: string;
      priority: string;
      status: string;
      description: string;
    }>;
  };
  maintenance: {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
    failed: number;
    lastDate: string;
    lastStatus: string;
    recent: Array<{
      date: string;
      type: string;
      status: string;
      engineer: string;
      notes: string;
    }>;
  };
  metrics: {
    avgResolutionTime: string;
    mtbf: string;
    checklistPassRate: string;
    calibrationStatus: string;
  };
  trend?: Array<{ date: string; score: number }>;
}

function formatDate(d: Date): string {
  const day = d.getDate();
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatTime(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/**
 * Generate SVG for the Health Score circular ring
 */
function renderRingSvg(score: number): string {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score));
  const offset = circ - (pct / 100) * circ;
  const strokeColor = pct >= 80 ? "#10B981" : pct >= 60 ? "#F59E0B" : "#EF4444";

  return `
    <svg width="96" height="96" viewBox="0 0 96 96" style="display:block;margin:auto;">
      <circle cx="48" cy="48" r="${r}" fill="none" stroke="#E2E8F0" stroke-width="9" />
      <circle cx="48" cy="48" r="${r}" fill="none" stroke="${strokeColor}" stroke-width="9"
        stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
        stroke-linecap="round"
        transform="rotate(-90 48 48)" />
      <text x="48" y="44" text-anchor="middle" font-size="18" font-weight="700" fill="#0F172A" font-family="system-ui, sans-serif">${score.toFixed(1)}</text>
      <text x="48" y="58" text-anchor="middle" font-size="9" font-weight="500" fill="#64748B" font-family="system-ui, sans-serif">/ 100</text>
    </svg>
  `;
}

/**
 * Generate SVG for the 7-bar Health Score Breakdown
 */
function renderBarChartSvg(breakdown: EquipmentHealthReportData["healthScore"]["breakdown"]): string {
  const items = [
    { label: "Operational", score: breakdown.operational.score, max: breakdown.operational.max, color: "#2563EB" },
    { label: "Complaints", score: breakdown.complaints.score, max: breakdown.complaints.max, color: "#10B981" },
    { label: "Maintenance", score: breakdown.maintenance.score, max: breakdown.maintenance.max, color: "#F59E0B" },
    { label: "Preventive<tspan x='248' dy='10'>Maintenance</tspan>", score: breakdown.preventiveMaintenance.score, max: breakdown.preventiveMaintenance.max, color: "#8B5CF6", isMultiline: true },
    { label: "Calibration", score: breakdown.calibration.score, max: breakdown.calibration.max, color: "#06B6D4" },
    { label: "Warranty", score: breakdown.warranty.score, max: breakdown.warranty.max, color: "#6366F1" },
    { label: "Safety", score: breakdown.safety.score, max: breakdown.safety.max, color: "#EF4444" },
  ];

  const w = 480;
  const h = 175;
  const chartTop = 22;
  const chartBottom = 135;
  const chartHeight = chartBottom - chartTop;

  // Grid lines: 0, 5, 10, 15, 20
  let gridLines = "";
  [0, 5, 10, 15, 20].forEach((val) => {
    const y = chartBottom - (val / 20) * chartHeight;
    gridLines += `
      <line x1="30" y1="${y}" x2="${w - 10}" y2="${y}" stroke="#F1F5F9" stroke-width="1" />
      <text x="22" y="${y + 3}" text-anchor="end" font-size="8.5" fill="#94A3B8" font-family="system-ui, sans-serif">${val}</text>
    `;
  });

  const barWidth = 36;
  const startX = 48;
  const gap = 60;

  let bars = "";
  items.forEach((item, idx) => {
    const x = startX + idx * gap;
    const barHeight = Math.max(3, (item.score / 20) * chartHeight);
    const y = chartBottom - barHeight;

    bars += `
      <!-- Bar -->
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="${item.color}" />
      <!-- Value on top -->
      <text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" font-size="9" font-weight="600" fill="#1E293B" font-family="system-ui, sans-serif">${item.score}/${item.max}</text>
      <!-- Label below -->
      <text x="${x + barWidth / 2}" y="${chartBottom + 14}" text-anchor="middle" font-size="8" fill="#475569" font-family="system-ui, sans-serif">${item.label}</text>
    `;
  });

  return `
    <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" style="display:block;">
      ${gridLines}
      <line x1="30" y1="${chartBottom}" x2="${w - 10}" y2="${chartBottom}" stroke="#CBD5E1" stroke-width="1" />
      ${bars}
    </svg>
  `;
}

/**
 * Generate SVG for Health Score Trend
 */
function renderTrendSvg(trend: Array<{ date: string; score: number }>): string {
  const w = 480;
  const h = 175;
  const chartTop = 22;
  const chartBottom = 135;
  const chartHeight = chartBottom - chartTop;

  let gridLines = "";
  [0, 20, 40, 60, 80, 100].forEach((val) => {
    const y = chartBottom - (val / 100) * chartHeight;
    gridLines += `
      <line x1="35" y1="${y}" x2="${w - 10}" y2="${y}" stroke="#F1F5F9" stroke-width="1" />
      <text x="26" y="${y + 3}" text-anchor="end" font-size="8.5" fill="#94A3B8" font-family="system-ui, sans-serif">${val}</text>
    `;
  });

  const stepX = (w - 70) / Math.max(1, trend.length - 1);
  const points = trend.map((t, idx) => {
    const x = 45 + idx * stepX;
    const y = chartBottom - (t.score / 100) * chartHeight;
    return { x, y, date: t.date, score: t.score };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  let dotsAndLabels = "";
  points.forEach((p) => {
    dotsAndLabels += `
      <circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#0284C7" stroke="#FFFFFF" stroke-width="1.5" />
      <text x="${p.x}" y="${chartBottom + 14}" text-anchor="middle" font-size="8" fill="#475569" font-family="system-ui, sans-serif">${p.date}</text>
    `;
  });

  return `
    <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" style="display:block;">
      ${gridLines}
      <line x1="35" y1="${chartBottom}" x2="${w - 10}" y2="${chartBottom}" stroke="#CBD5E1" stroke-width="1" />
      <polyline fill="none" stroke="#0284C7" stroke-width="2" points="${polylinePoints}" />
      ${dotsAndLabels}
      <!-- Legend at bottom -->
      <g transform="translate(${w / 2 - 45}, ${h - 5})">
        <line x1="0" y1="0" x2="16" y2="0" stroke="#0284C7" stroke-width="2" />
        <circle cx="8" cy="0" r="3" fill="#0284C7" />
        <text x="22" y="3" font-size="8.5" font-weight="600" fill="#0284C7" font-family="system-ui, sans-serif">Health Score</text>
      </g>
    </svg>
  `;
}

/**
 * Generate SVG Donut Chart
 */
function renderDonutSvg(
  segments: Array<{ label: string; value: number; color: string; pct: number }>,
  total: number,
  centerTitle: string,
  centerSubtitle: string
): string {
  const r = 34;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  let circles = "";
  segments.forEach((s) => {
    if (s.value <= 0) return;
    const len = (s.value / Math.max(1, total)) * circ;
    circles += `
      <circle cx="48" cy="48" r="${r}" fill="none" stroke="${s.color}" stroke-width="12"
        stroke-dasharray="${len} ${circ - len}" stroke-dashoffset="${-offset}"
        transform="rotate(-90 48 48)" />
    `;
    offset += len;
  });

  return `
    <div style="display:flex;align-items:center;gap:16px;">
      <div style="position:relative;width:96px;height:96px;flex-shrink:0;">
        <svg width="96" height="96" viewBox="0 0 96 96" style="display:block;">
          <circle cx="48" cy="48" r="${r}" fill="none" stroke="#F1F5F9" stroke-width="12" />
          ${circles}
          <text x="48" y="45" text-anchor="middle" font-size="16" font-weight="700" fill="#0F172A" font-family="system-ui, sans-serif">${centerTitle}</text>
          <text x="48" y="58" text-anchor="middle" font-size="7.5" font-weight="500" fill="#64748B" font-family="system-ui, sans-serif">${centerSubtitle}</text>
        </svg>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;gap:5px;">
        ${segments
          .map(
            (s) => `
          <div style="display:flex;align-items:center;justify-content:space-between;font-size:9.5px;color:#334155;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background-color:${s.color};"></span>
              <span style="font-weight:500;">${s.label}</span>
            </div>
            <span style="font-weight:600;color:#0F172A;">${s.value} <span style="font-weight:400;color:#64748B;">(${s.pct}%)</span></span>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;
}

/**
 * Generate the complete HTML matching the reference image
 */
export function generateEquipmentHealthReportHtml(data: EquipmentHealthReportData): HTMLElement {
  const now = new Date();
  const dateStr = formatDate(now);
  const timeStr = formatTime(now);

  const container = document.createElement("div");
  container.className = "medixa-health-report-document";
  container.style.cssText = `
    width: 820px;
    background-color: #FFFFFF;
    color: #0F172A;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    box-sizing: border-box;
    padding: 24px 28px;
    margin: 0 auto;
    position: relative;
  `;

  // Default trend if not supplied
  const trendData = data.trend || [
    { date: "14 Sep", score: 70 },
    { date: "15 Sep", score: 72 },
    { date: "16 Sep", score: 74 },
    { date: "17 Sep", score: 76 },
    { date: "18 Sep", score: 78 },
    { date: "19 Sep", score: 79 },
    { date: "20 Sep", score: data.healthScore.score },
  ];

  // Donut data calculations
  const compTotal = data.complaints.total || 1;
  const compSegments = [
    {
      label: "Open",
      value: data.complaints.open,
      color: "#EF4444",
      pct: Math.round((data.complaints.open / compTotal) * 100),
    },
    {
      label: "Resolved",
      value: data.complaints.resolved,
      color: "#10B981",
      pct: Math.round((data.complaints.resolved / compTotal) * 100),
    },
    {
      label: "Critical",
      value: data.complaints.critical,
      color: "#F59E0B",
      pct: Math.round((data.complaints.critical / compTotal) * 100),
    },
  ];

  const maintTotal = data.maintenance.total || 1;
  const maintSegments = [
    {
      label: "Completed",
      value: data.maintenance.completed,
      color: "#10B981",
      pct: Math.round((data.maintenance.completed / maintTotal) * 100),
    },
    {
      label: "In Progress",
      value: data.maintenance.inProgress,
      color: "#0284C7",
      pct: Math.round((data.maintenance.inProgress / maintTotal) * 100),
    },
    {
      label: "Overdue",
      value: data.maintenance.overdue,
      color: "#F59E0B",
      pct: Math.round((data.maintenance.overdue / maintTotal) * 100),
    },
    {
      label: "Failed",
      value: data.maintenance.failed,
      color: "#EF4444",
      pct: Math.round((data.maintenance.failed / maintTotal) * 100),
    },
  ];

  const b = data.healthScore.breakdown;

  container.innerHTML = `
    <!-- 1. Header with Logo & Date/Time -->
    <div style="display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:12px;border-bottom:2px solid #0284C7;">
      <div style="display:flex;align-items:center;gap:10px;">
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
          <rect width="34" height="34" rx="8" fill="#0284C7" />
          <path d="M17 8V26M8 17H26" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round" />
        </svg>
        <div>
          <div style="font-size:20px;font-weight:800;color:#0284C7;letter-spacing:0.5px;line-height:1.1;">MEDIXA</div>
          <div style="font-size:9px;color:#64748B;font-weight:500;margin-top:1px;">Hospital Equipment Asset Lifecycle Management System</div>
        </div>
      </div>
      <div style="text-align:right;font-size:9.5px;color:#334155;line-height:1.5;">
        <div><span style="color:#64748B;">Generated Date:</span> <strong>${dateStr}</strong></div>
        <div><span style="color:#64748B;">Generated Time:</span> <strong>${timeStr}</strong></div>
      </div>
    </div>

    <!-- 2. Report Title & Metadata Banner -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:16px 0 14px 0;">
      <div>
        <h1 style="margin:0;font-size:22px;font-weight:800;color:#0F172A;letter-spacing:-0.3px;">Equipment Health Report</h1>
        <div style="font-size:15px;font-weight:700;color:#1E293B;margin-top:4px;">${data.equipment.name}</div>
        <div style="font-size:11.5px;font-weight:600;color:#475569;margin-top:3px;">Equipment ID: <span style="color:#0F172A;">${data.equipment.id}</span></div>
      </div>
      <div style="font-size:10px;line-height:1.7;color:#475569;min-width:200px;">
        <div style="display:flex;justify-content:space-between;"><span style="color:#64748B;">Department</span><span style="font-weight:600;color:#0F172A;">: ${data.equipment.department}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:#64748B;">Category</span><span style="font-weight:600;color:#0F172A;">: ${data.equipment.category}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:#64748B;">Criticality</span><span style="font-weight:700;color:#DC2626;">: ${data.equipment.criticality}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:#64748B;">Location</span><span style="font-weight:600;color:#0F172A;">: ${data.equipment.location}</span></div>
      </div>
    </div>

    <!-- 3. KPI Cards Row (4 cards) -->
    <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:10px;margin-bottom:14px;">
      <!-- Card 1: Health Score -->
      <div style="border:1px solid #E2E8F0;border-radius:10px;padding:10px 12px;background:#FFFFFF;">
        <div style="display:flex;align-items:center;gap:6px;font-size:10.5px;font-weight:700;color:#1E293B;margin-bottom:6px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          Health Score
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="width:72px;height:72px;">
            ${renderRingSvg(data.healthScore.score)}
          </div>
          <div style="text-align:right;">
            <div style="font-size:9px;color:#64748B;font-weight:500;margin-bottom:4px;">Health Status</div>
            <span style="display:inline-block;padding:3px 9px;border-radius:6px;font-size:10px;font-weight:700;background:#DCFCE7;color:#15803D;border:1px solid #BBF7D0;">
              ${data.healthScore.status}
            </span>
          </div>
        </div>
      </div>

      <!-- Card 2: Total Complaints -->
      <div style="border:1px solid #E2E8F0;border-radius:10px;padding:10px 12px;background:#FFFFFF;">
        <div style="display:flex;align-items:center;gap:6px;font-size:10.5px;font-weight:700;color:#1E293B;margin-bottom:6px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Total Complaints
        </div>
        <div style="font-size:24px;font-weight:800;color:#0F172A;line-height:1;margin-top:8px;">${data.complaints.total}</div>
        <div style="font-size:9.5px;color:#64748B;margin-top:6px;font-weight:500;">
          <strong style="color:#DC2626;">${data.complaints.open} Open</strong> | <span style="color:#16A34A;">${data.complaints.resolved} Resolved</span>
        </div>
      </div>

      <!-- Card 3: Maintenance Records -->
      <div style="border:1px solid #E2E8F0;border-radius:10px;padding:10px 12px;background:#FFFFFF;">
        <div style="display:flex;align-items:center;gap:6px;font-size:10.5px;font-weight:700;color:#1E293B;margin-bottom:6px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          Maintenance Records
        </div>
        <div style="font-size:24px;font-weight:800;color:#0F172A;line-height:1;margin-top:8px;">${data.maintenance.total}</div>
        <div style="font-size:9.5px;color:#64748B;margin-top:6px;font-weight:500;">
          <span style="color:#16A34A;">${data.maintenance.completed} Completed</span> | <span style="color:#0284C7;">${data.maintenance.inProgress} In Progress</span>
        </div>
      </div>

      <!-- Card 4: Last Maintenance -->
      <div style="border:1px solid #E2E8F0;border-radius:10px;padding:10px 12px;background:#FFFFFF;">
        <div style="display:flex;align-items:center;gap:6px;font-size:10.5px;font-weight:700;color:#1E293B;margin-bottom:6px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Last Maintenance
        </div>
        <div style="font-size:16px;font-weight:800;color:#0F172A;line-height:1.2;margin-top:8px;">${data.maintenance.lastDate}</div>
        <div style="font-size:9.5px;color:#16A34A;margin-top:6px;font-weight:600;">${data.maintenance.lastStatus}</div>
      </div>
    </div>

    <!-- 4. Charts Row (Breakdown & Trend side-by-side) -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
      <!-- Chart 1: Health Score Breakdown -->
      <div style="border:1px solid #E2E8F0;border-radius:10px;padding:12px;background:#FFFFFF;">
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:#1E293B;margin-bottom:8px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2.5"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
          Health Score Breakdown
        </div>
        <div style="height:175px;">
          ${renderBarChartSvg(b)}
        </div>
      </div>

      <!-- Chart 2: Health Score Trend -->
      <div style="border:1px solid #E2E8F0;border-radius:10px;padding:12px;background:#FFFFFF;">
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:#1E293B;margin-bottom:8px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Health Score Trend
        </div>
        <div style="height:175px;">
          ${renderTrendSvg(trendData)}
        </div>
      </div>
    </div>

    <!-- 5. Component Scores Table & Donut Summaries Row -->
    <div style="display:grid;grid-template-columns:1.05fr 0.95fr;gap:10px;margin-bottom:14px;">
      <!-- Component Scores Table -->
      <div style="border:1px solid #E2E8F0;border-radius:10px;padding:12px;background:#FFFFFF;">
        <div style="font-size:11px;font-weight:700;color:#1E293B;margin-bottom:8px;">Component Scores</div>
        <table style="width:100%;border-collapse:collapse;font-size:9.5px;text-align:left;">
          <thead>
            <tr style="background:#F8FAFC;border-bottom:1px solid #E2E8F0;">
              <th style="padding:6px 8px;font-weight:600;color:#475569;">Component</th>
              <th style="padding:6px 8px;font-weight:600;color:#475569;text-align:center;">Score</th>
              <th style="padding:6px 8px;font-weight:600;color:#475569;text-align:center;">Max</th>
              <th style="padding:6px 8px;font-weight:600;color:#475569;text-align:right;">Weight</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #F1F5F9;"><td style="padding:5px 8px;color:#334155;">Operational Status</td><td style="padding:5px 8px;text-align:center;font-weight:600;">${b.operational.score}</td><td style="padding:5px 8px;text-align:center;color:#64748B;">${b.operational.max}</td><td style="padding:5px 8px;text-align:right;color:#64748B;">20%</td></tr>
            <tr style="border-bottom:1px solid #F1F5F9;"><td style="padding:5px 8px;color:#334155;">Complaints / Breakdowns</td><td style="padding:5px 8px;text-align:center;font-weight:600;">${b.complaints.score}</td><td style="padding:5px 8px;text-align:center;color:#64748B;">${b.complaints.max}</td><td style="padding:5px 8px;text-align:right;color:#64748B;">20%</td></tr>
            <tr style="border-bottom:1px solid #F1F5F9;"><td style="padding:5px 8px;color:#334155;">Maintenance Performance</td><td style="padding:5px 8px;text-align:center;font-weight:600;">${b.maintenance.score}</td><td style="padding:5px 8px;text-align:center;color:#64748B;">${b.maintenance.max}</td><td style="padding:5px 8px;text-align:right;color:#64748B;">20%</td></tr>
            <tr style="border-bottom:1px solid #F1F5F9;"><td style="padding:5px 8px;color:#334155;">Preventive Maintenance</td><td style="padding:5px 8px;text-align:center;font-weight:600;">${b.preventiveMaintenance.score}</td><td style="padding:5px 8px;text-align:center;color:#64748B;">${b.preventiveMaintenance.max}</td><td style="padding:5px 8px;text-align:right;color:#64748B;">10%</td></tr>
            <tr style="border-bottom:1px solid #F1F5F9;"><td style="padding:5px 8px;color:#334155;">Calibration</td><td style="padding:5px 8px;text-align:center;font-weight:600;">${b.calibration.score}</td><td style="padding:5px 8px;text-align:center;color:#64748B;">${b.calibration.max}</td><td style="padding:5px 8px;text-align:right;color:#64748B;">10%</td></tr>
            <tr style="border-bottom:1px solid #F1F5F9;"><td style="padding:5px 8px;color:#334155;">Warranty / AMC</td><td style="padding:5px 8px;text-align:center;font-weight:600;">${b.warranty.score}</td><td style="padding:5px 8px;text-align:center;color:#64748B;">${b.warranty.max}</td><td style="padding:5px 8px;text-align:right;color:#64748B;">5%</td></tr>
            <tr style="border-bottom:1px solid #F1F5F9;"><td style="padding:5px 8px;color:#334155;">Safety / Checklist</td><td style="padding:5px 8px;text-align:center;font-weight:600;">${b.safety.score}</td><td style="padding:5px 8px;text-align:center;color:#64748B;">${b.safety.max}</td><td style="padding:5px 8px;text-align:right;color:#64748B;">15%</td></tr>
            <tr style="background:#F0F9FF;font-weight:700;"><td style="padding:6px 8px;color:#0284C7;">Total Health Score</td><td style="padding:6px 8px;text-align:center;color:#0284C7;">${data.healthScore.score.toFixed(1)}</td><td style="padding:6px 8px;text-align:center;color:#0284C7;">100</td><td style="padding:6px 8px;text-align:right;color:#0284C7;">100%</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Donut Summaries Stack -->
      <div style="display:flex;flex-direction:column;gap:10px;">
        <!-- Complaint Summary -->
        <div style="border:1px solid #E2E8F0;border-radius:10px;padding:10px 12px;background:#FFFFFF;flex:1;">
          <div style="font-size:11px;font-weight:700;color:#1E293B;margin-bottom:6px;">Complaint Summary</div>
          ${renderDonutSvg(compSegments, compTotal, String(data.complaints.total), "Total Complaints")}
        </div>

        <!-- Maintenance Summary -->
        <div style="border:1px solid #E2E8F0;border-radius:10px;padding:10px 12px;background:#FFFFFF;flex:1;">
          <div style="font-size:11px;font-weight:700;color:#1E293B;margin-bottom:6px;">Maintenance Summary</div>
          ${renderDonutSvg(maintSegments, maintTotal, String(data.maintenance.total), "Total Records")}
        </div>
      </div>
    </div>

    <!-- 6. Recent Records Tables Row (2 tables side-by-side) -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
      <!-- Recent Maintenance Records Table -->
      <div style="border:1px solid #E2E8F0;border-radius:10px;padding:12px;background:#FFFFFF;">
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:#1E293B;margin-bottom:8px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          Recent Maintenance Records
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:9px;text-align:left;">
          <thead>
            <tr style="background:#F8FAFC;border-bottom:1px solid #E2E8F0;">
              <th style="padding:5px 6px;color:#475569;font-weight:600;">Date</th>
              <th style="padding:5px 6px;color:#475569;font-weight:600;">Type</th>
              <th style="padding:5px 6px;color:#475569;font-weight:600;">Status</th>
              <th style="padding:5px 6px;color:#475569;font-weight:600;">Engineer</th>
              <th style="padding:5px 6px;color:#475569;font-weight:600;">Notes</th>
            </tr>
          </thead>
          <tbody>
            ${data.maintenance.recent
              .slice(0, 5)
              .map(
                (m) => `
              <tr style="border-bottom:1px solid #F1F5F9;">
                <td style="padding:4.5px 6px;color:#334155;white-space:nowrap;">${m.date}</td>
                <td style="padding:4.5px 6px;color:#334155;">${m.type}</td>
                <td style="padding:4.5px 6px;">
                  <span style="display:inline-block;padding:1.5px 6px;border-radius:4px;font-size:8px;font-weight:700;${
                    m.status.toUpperCase() === "COMPLETED"
                      ? "background:#DCFCE7;color:#15803D;"
                      : "background:#E0F2FE;color:#0369A1;"
                  }">${m.status.toUpperCase()}</span>
                </td>
                <td style="padding:4.5px 6px;color:#334155;white-space:nowrap;">${m.engineer}</td>
                <td style="padding:4.5px 6px;color:#64748B;">${m.notes}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <!-- Recent Complaints Table -->
      <div style="border:1px solid #E2E8F0;border-radius:10px;padding:12px;background:#FFFFFF;">
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:#1E293B;margin-bottom:8px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2.5"><path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
          Recent Complaints
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:9px;text-align:left;">
          <thead>
            <tr style="background:#F8FAFC;border-bottom:1px solid #E2E8F0;">
              <th style="padding:5px 6px;color:#475569;font-weight:600;">Date</th>
              <th style="padding:5px 6px;color:#475569;font-weight:600;">ID</th>
              <th style="padding:5px 6px;color:#475569;font-weight:600;">Priority</th>
              <th style="padding:5px 6px;color:#475569;font-weight:600;">Status</th>
              <th style="padding:5px 6px;color:#475569;font-weight:600;">Description</th>
            </tr>
          </thead>
          <tbody>
            ${data.complaints.recent
              .slice(0, 5)
              .map((c) => {
                const pColor =
                  c.priority.toLowerCase() === "high" || c.priority.toLowerCase() === "critical"
                    ? "background:#FEE2E2;color:#B91C1C;"
                    : c.priority.toLowerCase() === "medium"
                      ? "background:#FEF3C7;color:#B45309;"
                      : "background:#E0F2FE;color:#0369A1;";
                const sColor =
                  c.status.toLowerCase() === "open"
                    ? "background:#FEE2E2;color:#B91C1C;"
                    : "background:#DCFCE7;color:#15803D;";
                return `
                <tr style="border-bottom:1px solid #F1F5F9;">
                  <td style="padding:4.5px 6px;color:#334155;white-space:nowrap;">${c.date}</td>
                  <td style="padding:4.5px 6px;color:#0F172A;font-weight:600;">${c.id}</td>
                  <td style="padding:4.5px 6px;">
                    <span style="display:inline-block;padding:1.5px 6px;border-radius:4px;font-size:8px;font-weight:700;${pColor}">${c.priority}</span>
                  </td>
                  <td style="padding:4.5px 6px;">
                    <span style="display:inline-block;padding:1.5px 6px;border-radius:4px;font-size:8px;font-weight:700;${sColor}">${c.status.toUpperCase()}</span>
                  </td>
                  <td style="padding:4.5px 6px;color:#64748B;">${c.description}</td>
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    </div>

    <!-- 7. Key Metrics & Equipment Information Row -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
      <!-- Key Metrics Card -->
      <div style="border:1px solid #E2E8F0;border-radius:10px;padding:12px;background:#FFFFFF;">
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:#1E293B;margin-bottom:10px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          Key Metrics
        </div>
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px;text-align:center;">
          <div style="border:1px solid #F1F5F9;border-radius:8px;padding:8px 4px;background:#FAFAFA;">
            <div style="color:#0284C7;margin-bottom:2px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div style="font-size:7.5px;color:#64748B;">Avg. Resolution Time</div>
            <div style="font-size:11.5px;font-weight:700;color:#0F172A;margin-top:2px;">${data.metrics.avgResolutionTime}</div>
          </div>
          <div style="border:1px solid #F1F5F9;border-radius:8px;padding:8px 4px;background:#FAFAFA;">
            <div style="color:#0284C7;margin-bottom:2px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block;"><path d="M5 22h14M5 2h14m-2 0v5l-5 5 5 5v5m-10-20v5l5 5-5 5v5"/></svg>
            </div>
            <div style="font-size:7.5px;color:#64748B;">MTBF</div>
            <div style="font-size:11.5px;font-weight:700;color:#0F172A;margin-top:2px;">${data.metrics.mtbf}</div>
          </div>
          <div style="border:1px solid #F1F5F9;border-radius:8px;padding:8px 4px;background:#FAFAFA;">
            <div style="color:#16A34A;margin-bottom:2px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div style="font-size:7.5px;color:#64748B;">Checklist Pass Rate</div>
            <div style="font-size:11.5px;font-weight:700;color:#0F172A;margin-top:2px;">${data.metrics.checklistPassRate}</div>
          </div>
          <div style="border:1px solid #F1F5F9;border-radius:8px;padding:8px 4px;background:#FAFAFA;">
            <div style="color:#0284C7;margin-bottom:2px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div style="font-size:7.5px;color:#64748B;">Calibration Status</div>
            <div style="font-size:11.5px;font-weight:700;color:#0F172A;margin-top:2px;">${data.metrics.calibrationStatus}</div>
          </div>
        </div>
      </div>

      <!-- Equipment Information Card -->
      <div style="border:1px solid #E2E8F0;border-radius:10px;padding:12px;background:#FFFFFF;">
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:#1E293B;margin-bottom:10px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2.5"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></svg>
          Equipment Information
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:9.5px;line-height:1.6;">
          <div><span style="color:#64748B;">Model:</span> <strong>${data.equipment.model}</strong></div>
          <div><span style="color:#64748B;">Equipment Type:</span> <strong>${data.equipment.category}</strong></div>
          <div><span style="color:#64748B;">Serial Number:</span> <strong>${data.equipment.serialNumber}</strong></div>
          <div><span style="color:#64748B;">Location:</span> <strong>${data.equipment.location}</strong></div>
          <div><span style="color:#64748B;">Manufacture Date:</span> <strong>${data.equipment.manufactureDate}</strong></div>
          <div style="display:flex;align-items:center;gap:6px;"><span style="color:#64748B;">Status:</span> <span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:8px;font-weight:700;background:#DCFCE7;color:#15803D;">${data.equipment.status.toUpperCase()}</span></div>
          <div><span style="color:#64748B;">Warranty Expiry:</span> <strong>${data.equipment.warrantyExpiry}</strong></div>
          <div><span style="color:#64748B;">Assigned Engineer:</span> <strong>${data.equipment.assignedEngineer}</strong></div>
        </div>
      </div>
    </div>

    <!-- 8. Footer Dark Blue Banner -->
    <div style="background-color:#103B66;color:#FFFFFF;border-radius:8px;padding:9px 16px;display:flex;align-items:center;justify-content:space-between;font-size:9px;font-weight:500;">
      <div>Medixa Hospital Equipment Asset Lifecycle Management System</div>
      <div>Page 1 of 1 &nbsp;|&nbsp; Generated on ${dateStr}</div>
    </div>
  `;

  return container;
}

/**
 * Main export function for the reference layout Equipment Health Report
 */
export async function exportEquipmentHealthReportToPdf(
  data: EquipmentHealthReportData,
  filename?: string
): Promise<void> {
  const finalFilename =
    filename || generateReportFilename("Equipment-Health-Report", data.equipment.id);

  // 1. Create the report container
  const reportElement = generateEquipmentHealthReportHtml(data);

  // 2. Attach offscreen
  const container = document.createElement("div");
  container.className = "medixa-health-report-sandbox";
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.width = "820px";
  container.style.backgroundColor = "#FFFFFF";
  container.style.zIndex = "-1000";
  container.appendChild(reportElement);
  document.body.appendChild(container);

  try {
    // Wait for fonts and rendering to stabilize
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Capture using html2canvas-pro with fallback to toCanvas
    let canvas: HTMLCanvasElement;
    try {
      canvas = await html2canvas(reportElement, {
        scale: 2.2, // Crisp retina resolution
        useCORS: true,
        logging: false,
        backgroundColor: "#FFFFFF",
        windowWidth: 820,
      });
    } catch (err) {
      console.warn("html2canvas-pro failed, using toCanvas fallback:", err);
      canvas = await toCanvas(reportElement, {
        pixelRatio: 2.2,
        backgroundColor: "#FFFFFF",
      });
    }

    // 3. Create single-page A4 PDF matching the reference
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = 210;
    const pageHeight = 297;

    // Center image on A4 page
    const marginX = 8;
    const marginY = 8;
    const targetWidth = pageWidth - 2 * marginX;
    const targetHeight = (canvas.height * targetWidth) / canvas.width;

    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    doc.addImage(imgData, "JPEG", marginX, marginY, targetWidth, Math.min(pageHeight - 2 * marginY, targetHeight));

    // Save PDF
    doc.save(finalFilename);
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

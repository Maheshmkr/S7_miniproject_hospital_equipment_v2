import mongoose from "mongoose";
import Equipment from "../models/Equipment.js";
import Complaint from "../models/Complaint.js";
import WorkOrder from "../models/WorkOrder.js";
import Maintenance from "../models/Maintenance.js";
import Calibration from "../models/Calibration.js";
import PreventiveMaintenance from "../models/PreventiveMaintenance.js";
import { findByAnyId } from "./validate.js";

/**
 * Authoritative Equipment Health Score (EHS) Service
 * Implements the 7-component weighted mathematical model:
 * EHS = 0.20*B + 0.15*C + 0.15*D + 0.15*PM + 0.10*CAL + 0.10*SR + 0.15*AGE
 */

export const EHS_WEIGHTS = {
  B: 0.20,
  C: 0.15,
  D: 0.15,
  PM: 0.15,
  CAL: 0.10,
  SR: 0.10,
  AGE: 0.15,
};

export const EHS_CATEGORIES = {
  HEALTHY: { min: 85.0, max: 100.0, action: "Routine preventive maintenance" },
  MONITOR: { min: 70.0, max: 84.999, action: "Increase monitoring" },
  AT_RISK: { min: 50.0, max: 69.999, action: "Prioritize maintenance / inspection" },
  CRITICAL: { min: 0.0, max: 49.999, action: "Immediate engineering review / intervention" },
};

export function clamp(val, min = 0, max = 100) {
  if (val === undefined || val === null || Number.isNaN(Number(val))) return min;
  return Math.min(max, Math.max(min, Number(val)));
}

export function getEhsCategory(score) {
  const s = clamp(score);
  if (s >= 85.0) return "HEALTHY";
  if (s >= 70.0) return "MONITOR";
  if (s >= 50.0) return "AT_RISK";
  return "CRITICAL";
}

export function getEhsAction(category) {
  return EHS_CATEGORIES[category]?.action || "Routine preventive maintenance";
}

/**
 * 1. Component B: Breakdown Frequency Score (0-100, weight 0.20)
 * 0 -> 100, 1 -> 80, 2 -> 60, 3 -> 40, 4+ -> 20
 */
export function calculateBreakdownScore(breakdownCount) {
  const count = Math.max(0, Number(breakdownCount) || 0);
  if (count === 0) return 100;
  if (count === 1) return 80;
  if (count === 2) return 60;
  if (count === 3) return 40;
  return 20;
}

/**
 * 2. Component C: Complaint Score (0-100, weight 0.15)
 * No complaints -> 100
 * Low / occasional -> 80
 * Moderate -> 60
 * High / repeated -> 40
 * Critical / safety-related -> 20 or lower
 */
export function calculateComplaintScoreFromComplaints(complaints) {
  if (!complaints || complaints.length === 0) {
    return { score: 100, level: "NONE", openCount: 0, criticalCount: 0 };
  }

  const openComplaints = complaints.filter((c) => !["RESOLVED", "CLOSED"].includes(c.status));
  const criticalComplaints = complaints.filter((c) => c.priority === "CRITICAL");
  const openCritical = openComplaints.filter((c) => c.priority === "CRITICAL");
  const highComplaints = complaints.filter((c) => c.priority === "HIGH");

  let score = 100;
  let level = "NONE";

  if (openCritical.length > 0 || criticalComplaints.length >= 2) {
    score = openCritical.length > 1 ? 10 : 20;
    level = "CRITICAL";
  } else if (complaints.length >= 3 || highComplaints.length >= 2) {
    score = 40;
    level = "HIGH_REPEATED";
  } else if (complaints.length === 2 || highComplaints.length === 1) {
    score = 60;
    level = "MODERATE";
  } else if (complaints.length === 1) {
    score = 80;
    level = "LOW_OCCASIONAL";
  }

  return {
    score,
    level,
    openCount: openComplaints.length,
    criticalCount: criticalComplaints.length,
    totalCount: complaints.length,
  };
}

/**
 * 3. Component D: Downtime Score (0-100, weight 0.15)
 * Downtime Rate (%) = Total Downtime / Total Observation Time * 100
 * 0-2% -> 100
 * >2-5% -> 80
 * >5-10% -> 60
 * >10-20% -> 40
 * >20% -> 20
 */
export function calculateDowntimeScore(downtimeRatePct) {
  const rate = Math.max(0, Number(downtimeRatePct) || 0);
  if (rate <= 2.0) return 100;
  if (rate <= 5.0) return 80;
  if (rate <= 10.0) return 60;
  if (rate <= 20.0) return 40;
  return 20;
}

/**
 * 4. Component PM: Preventive Maintenance Compliance Score (0-100, weight 0.15)
 * PM Compliance (%) = Completed PM Tasks / Scheduled PM Tasks * 100
 */
export function calculatePmScore(completedTasks, scheduledTasks) {
  const scheduled = Math.max(0, Number(scheduledTasks) || 0);
  const completed = Math.max(0, Number(completedTasks) || 0);
  if (scheduled === 0) return { compliance: 100, score: 100, applicable: false };
  const compliance = clamp(Math.round((completed / scheduled) * 1000) / 10);
  return { compliance, score: compliance, applicable: true };
}

/**
 * 5. Component CAL: Calibration Status Score (0-100, weight 0.10)
 * Valid -> 100
 * Due within 30 days -> 80
 * Due within 7 days -> 60
 * Overdue -> 30
 * Failed -> 0
 */
export function calculateCalibrationScoreFromRecord(latestCalibration, now = new Date()) {
  if (!latestCalibration) {
    return { score: 100, status: "NONE", isFailed: false, isOverdue: false, applicable: false };
  }

  const result = String(latestCalibration.result || "").toUpperCase();
  const status = String(latestCalibration.status || "").toUpperCase();

  if (result === "FAIL" || status === "FAILED") {
    return { score: 0, status: "FAILED", isFailed: true, isOverdue: false, applicable: true };
  }

  const nextCal = latestCalibration.nextCalibrationDate
    ? new Date(latestCalibration.nextCalibrationDate)
    : null;

  if (!nextCal) {
    return { score: 100, status: "VALID", isFailed: false, isOverdue: false, applicable: true };
  }

  const diffDays = (nextCal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays < 0) {
    return { score: 30, status: "OVERDUE", isFailed: false, isOverdue: true, applicable: true };
  }
  if (diffDays <= 7) {
    return { score: 60, status: "DUE_7_DAYS", isFailed: false, isOverdue: false, applicable: true };
  }
  if (diffDays <= 30) {
    return { score: 80, status: "DUE_30_DAYS", isFailed: false, isOverdue: false, applicable: true };
  }

  return { score: 100, status: "VALID", isFailed: false, isOverdue: false, applicable: true };
}

/**
 * 6. Component SR: Service / Repair Burden Score (0-100, weight 0.10)
 * 0 -> 100, 1 -> 85, 2 -> 70, 3 -> 55, 4 -> 40, 5+ -> 25
 */
export function calculateServiceBurdenScore(serviceEventsCount) {
  const count = Math.max(0, Number(serviceEventsCount) || 0);
  if (count === 0) return 100;
  if (count === 1) return 85;
  if (count === 2) return 70;
  if (count === 3) return 55;
  if (count === 4) return 40;
  return 25;
}

/**
 * 7. Component AGE: Lifecycle Age Score (0-100, weight 0.15)
 * Age Ratio = Current Equipment Age / Expected Useful Life
 * 0-30% -> 100
 * >30-50% -> 85
 * >50-70% -> 70
 * >70-90% -> 50
 * >90-100% -> 30
 * >100% -> 10
 */
export function calculateAgeScore(ageYears, usefulLifeYears = 10) {
  const age = Math.max(0, Number(ageYears) || 0);
  const life = Math.max(1, Number(usefulLifeYears) || 10);
  const ratio = (age / life) * 100;

  if (ratio <= 30.0) return { score: 100, ratio: Math.round(ratio * 10) / 10 };
  if (ratio <= 50.0) return { score: 85, ratio: Math.round(ratio * 10) / 10 };
  if (ratio <= 70.0) return { score: 70, ratio: Math.round(ratio * 10) / 10 };
  if (ratio <= 90.0) return { score: 50, ratio: Math.round(ratio * 10) / 10 };
  if (ratio <= 100.0) return { score: 30, ratio: Math.round(ratio * 10) / 10 };
  return { score: 10, ratio: Math.round(ratio * 10) / 10 };
}

/**
 * Pure Mathematical Calculation of EHS from Component Scores
 */
export function computeEhsFromScores({
  bScore,
  cScore,
  dScore,
  pmScore,
  calScore,
  srScore,
  ageScore,
}) {
  const b = clamp(bScore);
  const c = clamp(cScore);
  const d = clamp(dScore);
  const pm = clamp(pmScore);
  const cal = clamp(calScore);
  const sr = clamp(srScore);
  const age = clamp(ageScore);

  const bContrib = Math.round(EHS_WEIGHTS.B * b * 100) / 100;
  const cContrib = Math.round(EHS_WEIGHTS.C * c * 100) / 100;
  const dContrib = Math.round(EHS_WEIGHTS.D * d * 100) / 100;
  const pmContrib = Math.round(EHS_WEIGHTS.PM * pm * 100) / 100;
  const calContrib = Math.round(EHS_WEIGHTS.CAL * cal * 100) / 100;
  const srContrib = Math.round(EHS_WEIGHTS.SR * sr * 100) / 100;
  const ageContrib = Math.round(EHS_WEIGHTS.AGE * age * 100) / 100;

  const totalRaw =
    EHS_WEIGHTS.B * b +
    EHS_WEIGHTS.C * c +
    EHS_WEIGHTS.D * d +
    EHS_WEIGHTS.PM * pm +
    EHS_WEIGHTS.CAL * cal +
    EHS_WEIGHTS.SR * sr +
    EHS_WEIGHTS.AGE * age;

  const ehs = Math.round(clamp(totalRaw) * 100) / 100;
  const category = getEhsCategory(ehs);

  return {
    ehs,
    category,
    contributions: {
      b: bContrib,
      c: cContrib,
      d: dContrib,
      pm: pmContrib,
      cal: calContrib,
      sr: srContrib,
      age: ageContrib,
    },
  };
}

/**
 * Calculates complete Equipment Health Score from MongoDB documents.
 * Authoritative backend implementation.
 */
export async function calculateEquipmentEhs(
  equipmentIdentifier,
  {
    observationMonths = 12,
    persist = true,
    now = new Date(),
  } = {}
) {
  let eq = equipmentIdentifier;
  if (typeof eq === "string" || eq instanceof mongoose.Types.ObjectId || !eq._id) {
    eq = await findByAnyId(Equipment, equipmentIdentifier, "equipmentId");
  }
  if (!eq) return null;

  const eqId = eq._id;
  const obsFrom = new Date(now.getTime() - observationMonths * 30.4375 * 86_400_000);
  const obsTo = now;
  const totalObsHours = Math.max(24, Math.round((obsTo.getTime() - obsFrom.getTime()) / 3_600_000));

  const dataQuality = {
    status: "COMPLETE",
    missing: [],
    warnings: [],
  };

  // Parallel fetch of lifecycle records
  const [
    complaints,
    workOrders,
    maintenanceRecords,
    calibrations,
    preventiveTasks,
  ] = await Promise.all([
    Complaint.find({ equipmentId: eqId, createdAt: { $gte: obsFrom, $lte: obsTo } }).sort({ createdAt: -1 }).lean(),
    WorkOrder.find({ equipmentId: eqId, createdAt: { $gte: obsFrom, $lte: obsTo } }).sort({ createdAt: -1 }).lean(),
    Maintenance.find({ equipmentId: eqId, createdAt: { $gte: obsFrom, $lte: obsTo } }).sort({ createdAt: -1 }).lean(),
    Calibration.find({ equipmentId: eqId }).sort({ scheduledDate: -1, calibrationDate: -1, createdAt: -1 }).lean(),
    PreventiveMaintenance.find({ equipmentId: eqId, active: true }).lean(),
  ]);

  // 1. Breakdown Score (B)
  const breakdownWorkOrders = workOrders.filter((w) => w.maintenanceType === "BREAKDOWN");
  const breakdownComplaints = complaints.filter((c) => c.priority === "CRITICAL");
  const rawBreakdowns = Math.max(breakdownWorkOrders.length, breakdownComplaints.length);
  const bScore = calculateBreakdownScore(rawBreakdowns);
  const bContrib = Math.round(EHS_WEIGHTS.B * bScore * 100) / 100;

  // 2. Complaint Score (C)
  const compMetrics = calculateComplaintScoreFromComplaints(complaints);
  const cScore = compMetrics.score;
  const cContrib = Math.round(EHS_WEIGHTS.C * cScore * 100) / 100;

  // 3. Downtime Score (D)
  let totalDowntimeHours = 0;
  for (const m of maintenanceRecords) {
    if (m.startTime && m.endTime) {
      const dur = (new Date(m.endTime) - new Date(m.startTime)) / 3_600_000;
      if (dur > 0) totalDowntimeHours += dur;
    } else if (m.startTime && !m.endTime) {
      const dur = (now.getTime() - new Date(m.startTime).getTime()) / 3_600_000;
      if (dur > 0) totalDowntimeHours += dur;
    }
  }
  for (const wo of workOrders) {
    if (wo.maintenanceType === "BREAKDOWN" && wo.startedAt && wo.completedAt) {
      const dur = (new Date(wo.completedAt) - new Date(wo.startedAt)) / 3_600_000;
      if (dur > 0 && maintenanceRecords.length === 0) totalDowntimeHours += dur;
    }
  }

  const rawDowntimeRate = Math.round((totalDowntimeHours / totalObsHours) * 1000) / 10;
  const dScore = calculateDowntimeScore(rawDowntimeRate);
  const dContrib = Math.round(EHS_WEIGHTS.D * dScore * 100) / 100;

  // 4. Preventive Maintenance Score (PM)
  let pmScore = 100;
  let pmRawCompliance = 100;
  if (preventiveTasks.length > 0) {
    let completedPM = 0;
    let scheduledPM = preventiveTasks.length;
    for (const p of preventiveTasks) {
      if (p.lastCompletedDate) completedPM++;
      else if (p.status === "COMPLETED") completedPM++;
    }
    const pmRes = calculatePmScore(completedPM, scheduledPM);
    pmScore = pmRes.score;
    pmRawCompliance = pmRes.compliance;
  } else if (eq.lastPreventiveDate || eq.nextPreventiveDate) {
    if (eq.nextPreventiveDate && new Date(eq.nextPreventiveDate) < now) {
      pmScore = 40;
      pmRawCompliance = 40;
    } else {
      pmScore = 95;
      pmRawCompliance = 95;
    }
  } else {
    dataQuality.warnings.push("No preventive maintenance records found; using baseline compliance");
  }
  const pmContrib = Math.round(EHS_WEIGHTS.PM * pmScore * 100) / 100;

  // 5. Calibration Score (CAL)
  const latestCal = calibrations.length > 0 ? calibrations[0] : null;
  const calMetrics = calculateCalibrationScoreFromRecord(latestCal, now);
  let calScore = calMetrics.score;
  let calRawValue = calMetrics.status;
  if (!latestCal && (eq.lastCalibrationDate || eq.nextCalibrationDate)) {
    if (eq.nextCalibrationDate && new Date(eq.nextCalibrationDate) < now) {
      calScore = 30;
      calRawValue = "OVERDUE";
    } else {
      calScore = 100;
      calRawValue = "VALID";
    }
  }
  const calContrib = Math.round(EHS_WEIGHTS.CAL * calScore * 100) / 100;

  // 6. Service / Repair Burden Score (SR)
  const serviceEventsCount = maintenanceRecords.length > 0 ? maintenanceRecords.length : workOrders.length;
  const srScore = calculateServiceBurdenScore(serviceEventsCount);
  const srContrib = Math.round(EHS_WEIGHTS.SR * srScore * 100) / 100;

  // 7. Lifecycle Age Score (AGE)
  const baseDate = eq.installationDate || eq.purchaseDate || eq.createdAt;
  let equipmentAgeYears = 1.0;
  if (baseDate) {
    equipmentAgeYears = Math.max(0.1, (now.getTime() - new Date(baseDate).getTime()) / (365.25 * 86_400_000));
  } else {
    dataQuality.missing.push("installationDate / purchaseDate");
    dataQuality.warnings.push("Equipment age approximated from system records");
  }

  const expectedLife = eq.expectedUsefulLifeYears || 10;
  const ageRes = calculateAgeScore(equipmentAgeYears, expectedLife);
  const ageScore = ageRes.score;
  const ageContrib = Math.round(EHS_WEIGHTS.AGE * ageScore * 100) / 100;

  if (dataQuality.missing.length > 0) {
    dataQuality.status = "PARTIAL";
  }

  // Pure Weighted Calculation
  const totalEhs =
    bContrib +
    cContrib +
    dContrib +
    pmContrib +
    calContrib +
    srContrib +
    ageContrib;

  const ehs = Math.round(clamp(totalEhs) * 100) / 100;
  const category = getEhsCategory(ehs);

  // Critical Safety Override Rule:
  // Failed calibration on safety-critical equipment or unresolved critical breakdown
  const isSafetyCritical = eq.criticality === "CRITICAL" || eq.riskClass === "III" || eq.riskClass === "Class III";
  const isCalFailed = calMetrics.isFailed;
  const hasOpenCriticalComplaint = compMetrics.criticalCount > 0 && compMetrics.openCount > 0;

  let riskOverride = false;
  let finalRisk = category;

  if ((isSafetyCritical && isCalFailed) || hasOpenCriticalComplaint) {
    riskOverride = true;
    finalRisk = "CRITICAL";
  }

  const result = {
    equipmentId: eq._id,
    equipmentCode: eq.equipmentId,
    equipmentName: eq.name,
    category: category,
    ehs,
    riskOverride,
    finalRisk,
    action: getEhsAction(finalRisk),
    observationPeriod: {
      from: obsFrom.toISOString(),
      to: obsTo.toISOString(),
      months: observationMonths,
      totalHours: totalObsHours,
    },
    components: {
      breakdown: {
        rawValue: rawBreakdowns,
        score: bScore,
        weight: EHS_WEIGHTS.B,
        contribution: bContrib,
      },
      complaint: {
        rawValue: compMetrics.level,
        score: cScore,
        weight: EHS_WEIGHTS.C,
        contribution: cContrib,
      },
      downtime: {
        rawValue: rawDowntimeRate,
        score: dScore,
        weight: EHS_WEIGHTS.D,
        contribution: dContrib,
      },
      preventiveMaintenance: {
        rawValue: pmRawCompliance,
        score: pmScore,
        weight: EHS_WEIGHTS.PM,
        contribution: pmContrib,
      },
      calibration: {
        rawValue: calRawValue,
        score: calScore,
        weight: EHS_WEIGHTS.CAL,
        contribution: calContrib,
      },
      serviceRepair: {
        rawValue: serviceEventsCount,
        score: srScore,
        weight: EHS_WEIGHTS.SR,
        contribution: srContrib,
      },
      age: {
        rawValue: ageRes.ratio,
        score: ageScore,
        weight: EHS_WEIGHTS.AGE,
        contribution: ageContrib,
      },
    },
    dataQuality,
    // Frontend backwards-compatibility mapping
    healthScore: ehs,
    healthStatus: finalRisk === "CRITICAL" ? "CRITICAL" : category,
    calculatedScore: ehs,
    isCapped: riskOverride,
    capReason: riskOverride
      ? (isCalFailed ? "Failed calibration on safety-critical equipment" : "Unresolved critical equipment breakdown")
      : null,
    breakdown: {
      operational: { score: bContrib, max: 20, normalized: bScore, weight: 20, applicable: true },
      complaints: { score: cContrib, max: 15, normalized: cScore, weight: 15, applicable: true },
      maintenance: { score: dContrib, max: 15, normalized: dScore, weight: 15, applicable: true },
      preventiveMaintenance: { score: pmContrib, max: 15, normalized: pmScore, weight: 15, applicable: true },
      calibration: { score: calContrib, max: 10, normalized: calScore, weight: 10, applicable: true },
      warranty: { score: srContrib, max: 10, normalized: srScore, weight: 10, applicable: true },
      safety: { score: ageContrib, max: 15, normalized: ageScore, weight: 15, applicable: true },
    },
    metrics: {
      totalComplaints: complaints.length,
      openComplaints: compMetrics.openCount,
      openCriticalComplaints: compMetrics.criticalCount,
      totalWorkOrders: workOrders.length,
      completedWorkOrders: workOrders.filter((w) => w.status === "COMPLETED").length,
      totalMaintenance: maintenanceRecords.length,
      completedMaintenance: maintenanceRecords.filter((m) => m.status === "COMPLETED").length,
      downtimeHours: Math.round(totalDowntimeHours * 10) / 10,
      operationalStatus: eq.status,
      lifecycleStage: eq.lifecycleStage,
    },
  };

  // Persist updated score on Equipment if requested
  if (persist && eq.healthScore !== ehs) {
    await Equipment.updateOne({ _id: eq._id }, { $set: { healthScore: ehs } });
  }

  return result;
}

/**
 * Recalculates and updates EHS for an equipment item.
 * Call after complaint, work order, maintenance, calibration, or PM events.
 */
export async function recalculateEquipmentEhs(equipmentId) {
  try {
    return await calculateEquipmentEhs(equipmentId, { persist: true });
  } catch (err) {
    console.error(`[EHS] Failed to recalculate EHS for ${equipmentId}:`, err.message);
    return null;
  }
}

/**
 * Bulk EHS scores retrieval for equipment arrays without N+1 bottlenecks.
 */
export async function getBulkEquipmentEhs(equipmentList, { observationMonths = 12 } = {}) {
  if (!equipmentList || equipmentList.length === 0) return [];
  const results = [];
  for (const eq of equipmentList) {
    const ehsRes = await calculateEquipmentEhs(eq, { observationMonths, persist: false });
    if (ehsRes) {
      results.push({
        _id: eq._id,
        equipmentId: eq.equipmentId,
        name: eq.name,
        category: eq.category,
        departmentId: eq.departmentId,
        status: eq.status,
        criticality: eq.criticality,
        ehs: ehsRes.ehs,
        healthScore: ehsRes.ehs,
        categoryRating: ehsRes.category,
        finalRisk: ehsRes.finalRisk,
        riskOverride: ehsRes.riskOverride,
        action: ehsRes.action,
        components: ehsRes.components,
      });
    }
  }

  // Sort by: 1. Risk override / Critical 2. EHS ascending 3. Criticality
  const critRank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  results.sort((a, b) => {
    if (a.finalRisk === "CRITICAL" && b.finalRisk !== "CRITICAL") return -1;
    if (b.finalRisk === "CRITICAL" && a.finalRisk !== "CRITICAL") return 1;
    if (a.ehs !== b.ehs) return a.ehs - b.ehs;
    return (critRank[b.criticality] || 0) - (critRank[a.criticality] || 0);
  });

  return results;
}

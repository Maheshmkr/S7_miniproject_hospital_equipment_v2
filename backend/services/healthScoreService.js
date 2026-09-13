import mongoose from "mongoose";
import Equipment from "../models/Equipment.js";
import Complaint from "../models/Complaint.js";
import WorkOrder from "../models/WorkOrder.js";
import Maintenance from "../models/Maintenance.js";
import ChecklistResponse from "../models/ChecklistResponse.js";
import ChecklistQuestion from "../models/ChecklistQuestion.js";
import Calibration from "../models/Calibration.js";
import PreventiveMaintenance from "../models/PreventiveMaintenance.js";
import Warranty from "../models/Warranty.js";
import EquipmentHealthSnapshot from "../models/EquipmentHealthSnapshot.js";
import { findByAnyId } from "./validate.js";

/**
 * Health status category mapping.
 */
export function getHealthStatus(score) {
  if (score >= 90) return "EXCELLENT";
  if (score >= 75) return "GOOD";
  if (score >= 60) return "FAIR";
  if (score >= 40) return "POOR";
  return "CRITICAL";
}

/**
 * Clamps a numeric value between min and max and guards against NaN.
 */
function clamp(val, min = 0, max = 100) {
  if (val === undefined || val === null || Number.isNaN(Number(val))) return min;
  return Math.min(max, Math.max(min, Number(val)));
}

/**
 * Calculate the Operational Status component (0-100 score, 20% weight).
 */
function calculateOperationalScore(status) {
  switch (status) {
    case "OPERATIONAL":
    case "ACTIVE":
      return 100;
    case "UNDER_VERIFICATION":
    case "MAINTENANCE_COMPLETED":
      return 80;
    case "UNDER_MAINTENANCE":
      return 60;
    case "AWAITING_PARTS":
      return 50;
    case "UNDER_BREAKDOWN":
    case "UNDER_REPAIR":
      return 40;
    case "OUT_OF_SERVICE":
      return 15;
    case "RETIRED":
      return 0;
    default:
      return 70;
  }
}

/**
 * Calculate time-decay multiplier for events based on age in days.
 */
function getRecencyWeight(eventDate, now = new Date()) {
  if (!eventDate) return 0.5;
  const ageDays = (now.getTime() - new Date(eventDate).getTime()) / 86_400_000;
  if (ageDays <= 30) return 1.0;
  if (ageDays <= 90) return 0.8;
  if (ageDays <= 180) return 0.5;
  if (ageDays <= 365) return 0.25;
  return 0.1;
}

/**
 * Calculate Complaint / Breakdown component (0-100 score, 20% weight).
 */
function calculateComplaintScore(complaints, now = new Date()) {
  let penalty = 0;
  let recent90Count = 0;
  let openCount = 0;
  let openCriticalCount = 0;

  for (const c of complaints) {
    const ageDays = (now.getTime() - new Date(c.createdAt).getTime()) / 86_400_000;
    if (ageDays <= 90) recent90Count++;

    const recency = getRecencyWeight(c.createdAt, now);
    const isOpen = !["RESOLVED", "CLOSED"].includes(c.status);

    if (isOpen) {
      openCount++;
      if (c.priority === "CRITICAL") {
        openCriticalCount++;
        penalty += 45 * recency;
      } else if (c.priority === "HIGH") {
        penalty += 25 * recency;
      } else if (c.priority === "MEDIUM") {
        penalty += 15 * recency;
      } else {
        penalty += 8 * recency;
      }
    } else {
      // Historical wear penalty
      if (c.priority === "CRITICAL") {
        penalty += 12 * recency;
      } else if (c.priority === "HIGH") {
        penalty += 6 * recency;
      } else if (c.priority === "MEDIUM") {
        penalty += 3 * recency;
      } else {
        penalty += 1 * recency;
      }
    }
  }

  // Frequent breakdown penalty (>=3 complaints in 90 days)
  if (recent90Count >= 3) {
    penalty += 15;
  }

  const normalized = clamp(100 - penalty);
  return {
    normalized,
    metrics: {
      totalComplaints: complaints.length,
      openComplaints: openCount,
      openCriticalComplaints: openCriticalCount,
      recent90DayComplaints: recent90Count,
    },
  };
}

/**
 * Calculate Maintenance Performance component (0-100 score, 20% weight).
 */
function calculateMaintenanceScore(workOrders, maintenanceList, complaintsCount, now = new Date()) {
  if (workOrders.length === 0 && maintenanceList.length === 0) {
    return {
      normalized: complaintsCount === 0 ? 100 : 75,
      metrics: {
        totalWorkOrders: 0,
        completedWorkOrders: 0,
        totalMaintenance: 0,
        completedMaintenance: 0,
        overdueMaintenance: 0,
      },
    };
  }

  const totalWO = workOrders.length;
  const completedWO = workOrders.filter((w) => w.status === "COMPLETED").length;
  const totalMnt = maintenanceList.length;
  const completedMnt = maintenanceList.filter((m) => m.status === "COMPLETED").length;

  let overdueCount = 0;
  for (const wo of workOrders) {
    if (wo.status !== "COMPLETED" && wo.status !== "CANCELLED" && wo.scheduledDate && new Date(wo.scheduledDate) < now) {
      overdueCount++;
    }
  }

  const woRate = totalWO > 0 ? (completedWO / totalWO) * 100 : 100;
  const mntRate = totalMnt > 0 ? (completedMnt / totalMnt) * 100 : 100;
  let baseScore = (woRate * 0.5) + (mntRate * 0.5);

  baseScore -= overdueCount * 25;

  // Penalty for stuck maintenance
  const stuck = maintenanceList.filter((m) => ["AWAITING_PARTS", "INVESTIGATION"].includes(m.status)).length;
  baseScore -= stuck * 10;

  return {
    normalized: clamp(baseScore),
    metrics: {
      totalWorkOrders: totalWO,
      completedWorkOrders: completedWO,
      totalMaintenance: totalMnt,
      completedMaintenance: completedMnt,
      overdueMaintenance: overdueCount,
    },
  };
}

/**
 * Calculate Preventive Maintenance compliance (0-100 score, 10% weight).
 */
function calculatePreventiveScore(pmRecords, eq, now = new Date()) {
  if (pmRecords.length === 0 && !eq.nextPreventiveDate && !eq.lastPreventiveDate) {
    return { applicable: false, normalized: 100, metrics: { totalPM: 0, completedPM: 0, overduePM: 0 } };
  }

  if (pmRecords.length > 0) {
    const total = pmRecords.length;
    const completed = pmRecords.filter((p) => p.lastCompletedDate || p.status === "COMPLETED").length;
    const overdue = pmRecords.filter((p) => p.active && p.nextDueDate && new Date(p.nextDueDate) < now).length;
    let score = (completed / total) * 100;
    if (overdue > 0) score -= overdue * 30;
    return {
      applicable: true,
      normalized: clamp(score),
      metrics: { totalPM: total, completedPM: completed, overduePM: overdue },
    };
  }

  // Fallback to equipment dates
  let score = 100;
  let overdue = 0;
  if (eq.nextPreventiveDate) {
    if (new Date(eq.nextPreventiveDate) < now) {
      score = 40;
      overdue = 1;
    } else {
      score = 95;
    }
  }
  return {
    applicable: true,
    normalized: clamp(score),
    metrics: { totalPM: 1, completedPM: eq.lastPreventiveDate ? 1 : 0, overduePM: overdue },
  };
}

/**
 * Calculate Calibration health (0-100 score, 10% weight).
 */
function calculateCalibrationScore(calibrations, eq, now = new Date()) {
  if (calibrations.length === 0 && !eq.nextCalibrationDate && !eq.lastCalibrationDate) {
    return {
      applicable: false,
      normalized: 100,
      metrics: { totalCalibrations: 0, lastResult: "NONE", isOverdue: false },
    };
  }

  if (calibrations.length > 0) {
    const sorted = [...calibrations].sort(
      (a, b) => new Date(b.scheduledDate || b.calibrationDate || b.createdAt) - new Date(a.scheduledDate || a.calibrationDate || a.createdAt),
    );
    const latest = sorted[0];
    let score = 100;
    let isOverdue = false;

    if (latest.result === "PASS") {
      if (latest.nextCalibrationDate && new Date(latest.nextCalibrationDate) < now) {
        score = 45;
        isOverdue = true;
      } else {
        score = 100;
      }
    } else if (latest.result === "CONDITIONAL") {
      score = 65;
    } else if (latest.result === "FAIL" || latest.status === "FAILED") {
      score = 10;
    } else if (latest.status === "OVERDUE") {
      score = 25;
      isOverdue = true;
    } else if (latest.status === "SCHEDULED") {
      score = 90;
    }

    return {
      applicable: true,
      normalized: clamp(score),
      metrics: {
        totalCalibrations: calibrations.length,
        lastResult: latest.result || latest.status,
        isOverdue,
      },
    };
  }

  let score = 100;
  let isOverdue = false;
  if (eq.nextCalibrationDate) {
    if (new Date(eq.nextCalibrationDate) < now) {
      score = 40;
      isOverdue = true;
    }
  }
  return {
    applicable: true,
    normalized: clamp(score),
    metrics: { totalCalibrations: 1, lastResult: eq.lastCalibrationDate ? "PASS" : "UNKNOWN", isOverdue },
  };
}

/**
 * Calculate Warranty / AMC score (0-100 score, 5% weight).
 */
function calculateWarrantyScore(warranties, eq, now = new Date()) {
  const activeWarranties = warranties.filter((w) => w.status !== "CANCELLED");
  const expiryDate = activeWarranties.length > 0 ? activeWarranties[0].endDate : eq.warrantyExpiry;

  if (!expiryDate && activeWarranties.length === 0) {
    return {
      applicable: true,
      normalized: 50,
      metrics: { hasActiveWarranty: false, daysRemaining: null },
    };
  }

  const days = expiryDate ? Math.ceil((new Date(expiryDate).getTime() - now.getTime()) / 86_400_000) : -1;
  let score = 50;

  if (days > 60) {
    score = 100;
  } else if (days > 0) {
    score = 75;
  } else {
    score = 30;
  }

  return {
    applicable: true,
    normalized: clamp(score),
    metrics: {
      hasActiveWarranty: days > 0,
      daysRemaining: days,
      coverageType: activeWarranties[0]?.kind || "WARRANTY",
    },
  };
}

/**
 * Calculate Checklist & Safety score (0-100 score, 15% weight).
 */
function calculateSafetyScore(responses, criticalQuestions, maintenanceList) {
  if (responses.length === 0) {
    const verifiedCount = maintenanceList.filter((m) => m.verification?.safetyVerified).length;
    return {
      applicable: true,
      normalized: 100,
      hasCriticalFailure: false,
      metrics: { totalResponses: 0, passedResponses: 0, failedResponses: 0, criticalFailures: 0, safetyVerifiedCount: verifiedCount },
    };
  }

  const total = responses.length;
  const passed = responses.filter((r) => r.outcome === "PASS" || r.outcome === "ANSWERED").length;
  const failed = responses.filter((r) => r.outcome === "FAIL").length;

  const criticalQIds = new Set(criticalQuestions.map((q) => String(q._id)));
  const criticalFailures = responses.filter((r) => r.outcome === "FAIL" && criticalQIds.has(String(r.questionId))).length;

  let passRate = (passed / (total || 1)) * 100;
  if (criticalFailures > 0) {
    passRate = Math.min(passRate, 20);
  }

  return {
    applicable: true,
    normalized: clamp(passRate),
    hasCriticalFailure: criticalFailures > 0,
    metrics: {
      totalResponses: total,
      passedResponses: passed,
      failedResponses: failed,
      criticalFailures,
      passRate: Math.round(passRate * 10) / 10,
    },
  };
}

/**
 * Calculates the comprehensive dynamic Health Score for an equipment from its live MongoDB lifecycle.
 *
 * @param {string|mongoose.Types.ObjectId|Object} equipmentIdentifier
 * @param {Object} options
 * @param {boolean} [options.persist=true] Whether to update Equipment.healthScore in DB
 * @param {boolean} [options.createSnapshot=false] Whether to record an EquipmentHealthSnapshot
 * @param {string} [options.triggerEvent=""] Event description if snapshot is recorded
 */
export async function calculateEquipmentHealth(equipmentIdentifier, { persist = true, createSnapshot = false, triggerEvent = "" } = {}) {
  let eq = equipmentIdentifier;
  if (typeof eq === "string" || eq instanceof mongoose.Types.ObjectId || !eq._id) {
    eq = await findByAnyId(Equipment, equipmentIdentifier, "equipmentId");
  }
  if (!eq) return null;

  const now = new Date();
  const eqId = eq._id;

  // Parallel fetch of all related lifecycle records
  const [
    complaints,
    workOrders,
    maintenanceList,
    preventiveList,
    calibrations,
    warranties,
    checklistResponses,
    criticalQuestions,
  ] = await Promise.all([
    Complaint.find({ equipmentId: eqId }).sort({ createdAt: -1 }).lean(),
    WorkOrder.find({ equipmentId: eqId }).sort({ createdAt: -1 }).lean(),
    Maintenance.find({ equipmentId: eqId }).sort({ createdAt: -1 }).lean(),
    PreventiveMaintenance.find({ equipmentId: eqId }).sort({ nextDueDate: 1 }).lean(),
    Calibration.find({ equipmentId: eqId }).sort({ scheduledDate: -1 }).lean(),
    Warranty.find({ equipmentId: eqId }).sort({ endDate: -1 }).lean(),
    ChecklistResponse.find({ equipmentId: eqId }).lean(),
    ChecklistQuestion.find({ priority: "CRITICAL" }).select("_id").lean(),
  ]);

  // 1. Operational Status (20%)
  const opNorm = calculateOperationalScore(eq.status);

  // 2. Complaint / Breakdown Health (20%)
  const compResult = calculateComplaintScore(complaints, now);

  // 3. Maintenance Performance (20%)
  const maintResult = calculateMaintenanceScore(workOrders, maintenanceList, complaints.length, now);

  // 4. Preventive Maintenance (10%)
  const pmResult = calculatePreventiveScore(preventiveList, eq, now);

  // 5. Calibration Health (10%)
  const calResult = calculateCalibrationScore(calibrations, eq, now);

  // 6. Warranty / AMC (5%)
  const warResult = calculateWarrantyScore(warranties, eq, now);

  // 7. Checklist / Safety (15%)
  const safetyResult = calculateSafetyScore(checklistResponses, criticalQuestions, maintenanceList);

  // Standard component definitions
  const components = {
    operational: { normalized: opNorm, weight: 20, applicable: true },
    complaints: { normalized: compResult.normalized, weight: 20, applicable: true },
    maintenance: { normalized: maintResult.normalized, weight: 20, applicable: true },
    preventiveMaintenance: { normalized: pmResult.normalized, weight: 10, applicable: pmResult.applicable },
    calibration: { normalized: calResult.normalized, weight: 10, applicable: calResult.applicable },
    warranty: { normalized: warResult.normalized, weight: 5, applicable: warResult.applicable },
    safety: { normalized: safetyResult.normalized, weight: 15, applicable: safetyResult.applicable },
  };

  // Missing-data renormalization: compute sum of applicable weights and weighted sum
  let applicableWeightSum = 0;
  let weightedScoreSum = 0;

  for (const [key, comp] of Object.entries(components)) {
    if (comp.applicable) {
      applicableWeightSum += comp.weight;
      weightedScoreSum += comp.normalized * (comp.weight / 100);
    }
  }

  const rawCalculatedScore = applicableWeightSum > 0 ? (weightedScoreSum / (applicableWeightSum / 100)) : 100;
  const calculatedScore = Math.round(clamp(rawCalculatedScore) * 10) / 10;

  // Critical Failure Safety Override Rule:
  // If an equipment has an unresolved critical complaint OR unresolved critical checklist failure, cap final score at 59.0
  const hasUnresolvedCriticalComplaint = compResult.metrics.openCriticalComplaints > 0;
  const hasCriticalChecklistFailure = safetyResult.hasCriticalFailure;

  let finalScore = calculatedScore;
  let isCapped = false;
  let capReason = null;

  if (hasUnresolvedCriticalComplaint || hasCriticalChecklistFailure) {
    if (finalScore > 59.0) {
      finalScore = 59.0;
      isCapped = true;
      capReason = hasUnresolvedCriticalComplaint
        ? "Unresolved critical equipment breakdown complaint"
        : "Unresolved critical safety checklist failure";
    }
  }

  finalScore = Math.round(clamp(finalScore) * 10) / 10;
  const healthStatus = getHealthStatus(finalScore);

  // Formulate detailed breakdown response
  const breakdown = {};
  for (const [key, comp] of Object.entries(components)) {
    const componentMaxPoints = comp.weight;
    const componentScore = comp.applicable ? Math.round(((comp.normalized / 100) * componentMaxPoints) * 10) / 10 : 0;
    breakdown[key] = {
      score: componentScore,
      max: componentMaxPoints,
      normalized: Math.round(comp.normalized * 10) / 10,
      weight: comp.weight,
      applicable: comp.applicable,
    };
  }

  const combinedMetrics = {
    ...compResult.metrics,
    ...maintResult.metrics,
    ...pmResult.metrics,
    ...calResult.metrics,
    ...warResult.metrics,
    ...safetyResult.metrics,
    operationalStatus: eq.status,
    lifecycleStage: eq.lifecycleStage,
  };

  const result = {
    equipmentId: eq._id,
    equipmentCode: eq.equipmentId,
    name: eq.name,
    category: eq.category,
    healthScore: finalScore,
    healthStatus,
    calculatedScore,
    isCapped,
    capReason,
    breakdown,
    metrics: combinedMetrics,
  };

  // Persist updated score on Equipment model if requested
  if (persist && eq.healthScore !== finalScore) {
    await Equipment.updateOne({ _id: eq._id }, { $set: { healthScore: finalScore } });
  }

  // Record historical snapshot if requested or on score changes
  if (createSnapshot || (persist && eq.healthScore !== finalScore)) {
    try {
      await EquipmentHealthSnapshot.create({
        equipmentId: eq._id,
        equipmentCode: eq.equipmentId,
        healthScore: finalScore,
        healthStatus,
        calculatedScore,
        isCapped,
        capReason,
        breakdown,
        metrics: combinedMetrics,
        triggerEvent: triggerEvent || "LIFECYCLE_UPDATE",
        recordedAt: now,
      });
    } catch (err) {
      // Snapshot recording error should not break the main calculation
      console.error("[HealthScoreSnapshot] Failed to record snapshot:", err.message);
    }
  }

  return result;
}

/**
 * Efficient bulk health score calculation for equipment arrays (avoiding N+1 queries).
 */
export async function calculateBulkHealthScores(equipmentList) {
  if (!equipmentList || equipmentList.length === 0) return [];
  const ids = equipmentList.map((e) => e._id);
  const now = new Date();

  // Aggregate complaints by equipment
  const complaintsByEq = await Complaint.aggregate([
    { $match: { equipmentId: { $in: ids } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$equipmentId",
        complaints: {
          $push: {
            priority: "$priority",
            status: "$status",
            createdAt: "$createdAt",
          },
        },
      },
    },
  ]);
  const complaintMap = new Map(complaintsByEq.map((c) => [String(c._id), c.complaints]));

  // Aggregate work orders by equipment
  const woByEq = await WorkOrder.aggregate([
    { $match: { equipmentId: { $in: ids } } },
    {
      $group: {
        _id: "$equipmentId",
        workOrders: {
          $push: {
            status: "$status",
            scheduledDate: "$scheduledDate",
          },
        },
      },
    },
  ]);
  const woMap = new Map(woByEq.map((w) => [String(w._id), w.workOrders]));

  // Aggregate maintenance by equipment
  const mntByEq = await Maintenance.aggregate([
    { $match: { equipmentId: { $in: ids } } },
    {
      $group: {
        _id: "$equipmentId",
        maintenance: {
          $push: {
            status: "$status",
            verification: "$verification",
          },
        },
      },
    },
  ]);
  const mntMap = new Map(mntByEq.map((m) => [String(m._id), m.maintenance]));

  // Compute for each equipment item efficiently
  return equipmentList.map((eq) => {
    const idStr = String(eq._id);
    const complaints = complaintMap.get(idStr) || [];
    const workOrders = woMap.get(idStr) || [];
    const maintenance = mntMap.get(idStr) || [];

    const opNorm = calculateOperationalScore(eq.status);
    const compResult = calculateComplaintScore(complaints, now);
    const maintResult = calculateMaintenanceScore(workOrders, maintenance, complaints.length, now);

    // Approximate remaining components for bulk list
    const calScore = eq.nextCalibrationDate && new Date(eq.nextCalibrationDate) < now ? 40 : 100;
    const pmScore = eq.nextPreventiveDate && new Date(eq.nextPreventiveDate) < now ? 40 : 100;
    const warDays = eq.warrantyExpiry ? (new Date(eq.warrantyExpiry).getTime() - now.getTime()) / 86_400_000 : -1;
    const warScore = warDays > 60 ? 100 : warDays > 0 ? 75 : 40;
    const safetyScore = 100;

    const weighted =
      opNorm * 0.2 +
      compResult.normalized * 0.2 +
      maintResult.normalized * 0.2 +
      pmScore * 0.1 +
      calScore * 0.1 +
      warScore * 0.05 +
      safetyScore * 0.15;

    let finalScore = Math.round(clamp(weighted) * 10) / 10;
    if (compResult.metrics.openCriticalComplaints > 0) {
      finalScore = Math.min(finalScore, 59.0);
    }

    return {
      _id: eq._id,
      equipmentId: eq.equipmentId,
      name: eq.name,
      category: eq.category,
      departmentId: eq.departmentId,
      status: eq.status,
      healthScore: finalScore,
      healthStatus: getHealthStatus(finalScore),
    };
  });
}

/**
 * Returns historical health score snapshots for an equipment.
 */
export async function getHealthScoreHistory(equipmentIdentifier, limit = 20) {
  let eq = equipmentIdentifier;
  if (typeof eq === "string" || eq instanceof mongoose.Types.ObjectId || !eq._id) {
    eq = await findByAnyId(Equipment, equipmentIdentifier, "equipmentId");
  }
  if (!eq) return [];

  const snapshots = await EquipmentHealthSnapshot.find({ equipmentId: eq._id })
    .sort({ recordedAt: -1 })
    .limit(limit)
    .lean();

  if (snapshots.length === 0) {
    // If no snapshots yet, generate an initial baseline snapshot
    const current = await calculateEquipmentHealth(eq, { persist: true, createSnapshot: true, triggerEvent: "INITIAL_BASELINE" });
    return [
      {
        healthScore: current.healthScore,
        healthStatus: current.healthStatus,
        recordedAt: new Date(),
        breakdown: current.breakdown,
        metrics: current.metrics,
      },
    ];
  }

  return snapshots;
}

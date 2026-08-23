import { ApiError } from "./apiError.js";
import {
  CALIBRATION_FREQUENCIES,
  CALIBRATION_TRANSITIONS,
} from "../models/Calibration.js";
import { startOfDay } from "./preventiveService.js";

const FREQUENCY_STEP = {
  MONTHLY: { months: 1 },
  QUARTERLY: { months: 3 },
  HALF_YEARLY: { months: 6 },
  YEARLY: { months: 12 },
};

export { startOfDay };

/** Next calibration due date from an anchor date and the configured interval. */
export function computeNextCalibrationDate(from, frequency, frequencyDays) {
  if (!CALIBRATION_FREQUENCIES.includes(frequency)) {
    throw new ApiError(400, `Invalid frequency. Allowed: ${CALIBRATION_FREQUENCIES.join(", ")}`);
  }
  const next = new Date(from);
  if (frequency === "CUSTOM") {
    const days = Number(frequencyDays);
    if (!days || days < 1) throw new ApiError(400, "CUSTOM frequency requires frequencyDays >= 1");
    next.setDate(next.getDate() + days);
    return next;
  }
  next.setMonth(next.getMonth() + FREQUENCY_STEP[frequency].months);
  return next;
}

/** The date a record is measured against: next due once done, scheduled while open. */
export function dueDateOf(record) {
  if (record.status === "PASSED" || record.status === "FAILED") {
    return record.nextCalibrationDate || record.calibrationDate || record.scheduledDate;
  }
  return record.scheduledDate;
}

/** Derived schedule state — recalculated, never stored. */
export function calibrationScheduleState(record, now = new Date()) {
  if (record.status === "CANCELLED" || record.active === false) return "INACTIVE";
  if (record.status === "PASSED") return "COMPLETED";
  const due = dueDateOf(record);
  if (!due) return "UPCOMING";
  const dueTime = startOfDay(due).getTime();
  const today = startOfDay(now).getTime();
  if (dueTime < today) return "OVERDUE";
  if (dueTime === today) return "DUE_TODAY";
  return "UPCOMING";
}

export function daysUntilCalibration(record, now = new Date()) {
  const due = dueDateOf(record);
  if (!due) return null;
  return Math.round((startOfDay(due).getTime() - startOfDay(now).getTime()) / 86_400_000);
}

export function assertCalibrationTransition(from, to) {
  if (from === to) return;
  const allowed = CALIBRATION_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new ApiError(422, `Calibration cannot move ${from} → ${to}. Allowed: ${allowed.join(", ") || "none"}`);
  }
}

/** Serialise a calibration record with its derived schedule fields. */
export function withCalibrationSchedule(record, now = new Date()) {
  const raw = typeof record?.toObject === "function" ? record.toObject() : record;
  if (!raw) return raw;
  return {
    ...raw,
    scheduleState: calibrationScheduleState(raw, now),
    daysUntilDue: daysUntilCalibration(raw, now),
  };
}

import { ApiError } from "./apiError.js";
import { PM_FREQUENCIES } from "../models/PreventiveMaintenance.js";

/** Months / days added per frequency unit. */
const FREQUENCY_STEP = {
  DAILY: { days: 1 },
  WEEKLY: { days: 7 },
  MONTHLY: { months: 1 },
  QUARTERLY: { months: 3 },
  HALF_YEARLY: { months: 6 },
  YEARLY: { months: 12 },
};

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Next due date for a plan: `from` advanced by frequency × frequencyValue.
 * Nothing is hard-coded — the caller supplies the anchor date (start date on
 * creation, completion date afterwards).
 */
export function computeNextDueDate(from, frequency, frequencyValue = 1) {
  if (!PM_FREQUENCIES.includes(frequency)) {
    throw new ApiError(400, `Invalid frequency. Allowed: ${PM_FREQUENCIES.join(", ")}`);
  }
  const times = Math.max(1, Number(frequencyValue) || 1);
  const step = FREQUENCY_STEP[frequency];
  const next = new Date(from);
  if (step.days) next.setDate(next.getDate() + step.days * times);
  else next.setMonth(next.getMonth() + step.months * times);
  return next;
}

/**
 * Derived schedule state. Nothing is persisted: OVERDUE / DUE_TODAY / UPCOMING
 * are always recalculated from `nextDueDate` against "now".
 */
export function scheduleState(plan, now = new Date()) {
  if (!plan.active) return "INACTIVE";
  if (!plan.nextDueDate) return "UPCOMING";
  const due = startOfDay(plan.nextDueDate).getTime();
  const today = startOfDay(now).getTime();
  if (due < today) return "OVERDUE";
  if (due === today) return "DUE_TODAY";
  return "UPCOMING";
}

export function daysUntilDue(plan, now = new Date()) {
  if (!plan.nextDueDate) return null;
  const ms = startOfDay(plan.nextDueDate).getTime() - startOfDay(now).getTime();
  return Math.round(ms / 86_400_000);
}

/** Serialise a plan with its derived schedule fields for API responses. */
export function withSchedule(plan, now = new Date()) {
  const raw = typeof plan.toObject === "function" ? plan.toObject() : plan;
  return { ...raw, scheduleState: scheduleState(raw, now), daysUntilDue: daysUntilDue(raw, now) };
}

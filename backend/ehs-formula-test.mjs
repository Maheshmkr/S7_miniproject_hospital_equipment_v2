import { strict as assert } from "node:assert";
import {
  calculateBreakdownScore,
  calculateComplaintScoreFromComplaints,
  calculateDowntimeScore,
  calculatePmScore,
  calculateCalibrationScoreFromRecord,
  calculateServiceBurdenScore,
  calculateAgeScore,
  computeEhsFromScores,
  getEhsCategory,
  clamp,
} from "./services/ehsService.js";

console.log("=========================================================================");
console.log(" MEDIXA — EQUIPMENT HEALTH SCORE (EHS) MATHEMATICAL UNIT TESTS");
console.log(" Formula: EHS = 0.20B + 0.15C + 0.15D + 0.15PM + 0.10CAL + 0.10SR + 0.15AGE");
console.log("=========================================================================\n");

// 1. Component B: Breakdown Score
console.log("[1/8] Testing Breakdown Score Component (B)...");
assert.equal(calculateBreakdownScore(0), 100);
assert.equal(calculateBreakdownScore(1), 80);
assert.equal(calculateBreakdownScore(2), 60);
assert.equal(calculateBreakdownScore(3), 40);
assert.equal(calculateBreakdownScore(4), 20);
assert.equal(calculateBreakdownScore(10), 20);
console.log("✔ Breakdown scores verified (0->100, 1->80, 2->60, 3->40, 4+->20)");

// 2. Component D: Downtime Score
console.log("[2/8] Testing Downtime Score Component (D)...");
assert.equal(calculateDowntimeScore(0), 100);
assert.equal(calculateDowntimeScore(2.0), 100);
assert.equal(calculateDowntimeScore(2.1), 80);
assert.equal(calculateDowntimeScore(5.0), 80);
assert.equal(calculateDowntimeScore(5.1), 60);
assert.equal(calculateDowntimeScore(10.0), 60);
assert.equal(calculateDowntimeScore(12.0), 40);
assert.equal(calculateDowntimeScore(20.0), 40);
assert.equal(calculateDowntimeScore(25.0), 20);
console.log("✔ Downtime scores verified (0-2%->100, >2-5%->80, >5-10%->60, >10-20%->40, >20%->20)");

// 3. Component SR: Service/Repair Burden
console.log("[3/8] Testing Service Burden Component (SR)...");
assert.equal(calculateServiceBurdenScore(0), 100);
assert.equal(calculateServiceBurdenScore(1), 85);
assert.equal(calculateServiceBurdenScore(2), 70);
assert.equal(calculateServiceBurdenScore(3), 55);
assert.equal(calculateServiceBurdenScore(4), 40);
assert.equal(calculateServiceBurdenScore(5), 25);
assert.equal(calculateServiceBurdenScore(8), 25);
console.log("✔ Service burden scores verified (0->100, 1->85, 2->70, 3->55, 4->40, 5+->25)");

// 4. Component AGE: Lifecycle Age Score
console.log("[4/8] Testing Lifecycle Age Component (AGE)...");
// Useful life 10 years:
assert.equal(calculateAgeScore(2, 10).score, 100); // 20%
assert.equal(calculateAgeScore(3, 10).score, 100); // 30%
assert.equal(calculateAgeScore(4, 10).score, 85);  // 40%
assert.equal(calculateAgeScore(5, 10).score, 85);  // 50%
assert.equal(calculateAgeScore(6, 10).score, 70);  // 60%
assert.equal(calculateAgeScore(7, 10).score, 70);  // 70%
assert.equal(calculateAgeScore(7.5, 10).score, 50); // 75%
assert.equal(calculateAgeScore(9, 10).score, 50);  // 90%
assert.equal(calculateAgeScore(9.5, 10).score, 30); // 95%
assert.equal(calculateAgeScore(10, 10).score, 30); // 100%
assert.equal(calculateAgeScore(12, 10).score, 10); // 120%
console.log("✔ Age scores verified (0-30%->100, >30-50%->85, >50-70%->70, >70-90%->50, >90-100%->30, >100%->10)");

// 5. Component CAL: Calibration Status
console.log("[5/8] Testing Calibration Component (CAL)...");
const now = new Date("2026-06-01T00:00:00Z");
assert.equal(calculateCalibrationScoreFromRecord({ result: "FAIL" }, now).score, 0);
assert.equal(calculateCalibrationScoreFromRecord({ nextCalibrationDate: "2026-05-01T00:00:00Z" }, now).score, 30); // Overdue
assert.equal(calculateCalibrationScoreFromRecord({ nextCalibrationDate: "2026-06-05T00:00:00Z" }, now).score, 60); // 4 days <= 7
assert.equal(calculateCalibrationScoreFromRecord({ nextCalibrationDate: "2026-06-20T00:00:00Z" }, now).score, 80); // 19 days <= 30
assert.equal(calculateCalibrationScoreFromRecord({ nextCalibrationDate: "2026-12-01T00:00:00Z" }, now).score, 100); // Valid
console.log("✔ Calibration scores verified (Valid->100, <=30d->80, <=7d->60, Overdue->30, Failed->0)");

// 6. Category Boundaries
console.log("[6/8] Testing EHS Category Boundaries...");
assert.equal(getEhsCategory(100), "HEALTHY");
assert.equal(getEhsCategory(85.0), "HEALTHY");
assert.equal(getEhsCategory(84.99), "MONITOR");
assert.equal(getEhsCategory(70.0), "MONITOR");
assert.equal(getEhsCategory(69.99), "AT_RISK");
assert.equal(getEhsCategory(50.0), "AT_RISK");
assert.equal(getEhsCategory(49.99), "CRITICAL");
assert.equal(getEhsCategory(0), "CRITICAL");
console.log("✔ Category boundaries verified (HEALTHY: 85-100, MONITOR: 70-84.99, AT_RISK: 50-69.99, CRITICAL: 0-49.99)");

// 7. Clamping & Safety Against NaN / Infinity
console.log("[7/8] Testing NaN / Infinity / Out-of-bounds Clamping...");
assert.equal(clamp(-10), 0);
assert.equal(clamp(150), 100);
assert.equal(clamp(NaN), 0);
assert.equal(clamp(null), 0);
assert.equal(clamp(undefined), 0);
console.log("✔ Clamping and numerical safety guards verified");

// 8. WORKED EXAMPLE FROM PROMPT (SECTION 50)
console.log("[8/8] Testing Exact Worked Example from Specification...");
// Breakdowns = 3 -> B = 40 (contrib: 8)
// Complaints = High/Repeated -> C = 40 (contrib: 6)
// Downtime = 12% -> D = 40 (contrib: 6)
// PM compliance = 75% -> PM = 75 (contrib: 11.25)
// Calibration = Valid -> CAL = 100 (contrib: 10)
// Service events = 3 -> SR = 55 (contrib: 5.5)
// Lifecycle age = 75% -> AGE = 50 (contrib: 7.5)
const worked = computeEhsFromScores({
  bScore: 40,
  cScore: 40,
  dScore: 40,
  pmScore: 75,
  calScore: 100,
  srScore: 55,
  ageScore: 50,
});

console.log("   Contributions:", worked.contributions);
console.log("   Total EHS:", worked.ehs);
console.log("   Category:", worked.category);

assert.equal(worked.contributions.b, 8.0, "B contribution must be 8.0");
assert.equal(worked.contributions.c, 6.0, "C contribution must be 6.0");
assert.equal(worked.contributions.d, 6.0, "D contribution must be 6.0");
assert.equal(worked.contributions.pm, 11.25, "PM contribution must be 11.25");
assert.equal(worked.contributions.cal, 10.0, "CAL contribution must be 10.0");
assert.equal(worked.contributions.sr, 5.5, "SR contribution must be 5.5");
assert.equal(worked.contributions.age, 7.5, "AGE contribution must be 7.5");
assert.equal(worked.ehs, 54.25, "Total EHS must be exactly 54.25");
assert.equal(worked.category, "AT_RISK", "Category must be AT_RISK");

console.log("✔ WORKED EXAMPLE PASSED: EHS = 54.25, Category = AT_RISK\n");

console.log("=========================================================================");
console.log(" ALL EHS UNIT TESTS PASSED WITH 100% MATHEMATICAL PRECISION! ✔");
console.log("=========================================================================");

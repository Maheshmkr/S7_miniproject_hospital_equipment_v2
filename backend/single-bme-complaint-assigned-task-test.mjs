import mongoose from "mongoose";
import User from "./models/User.js";
import WorkOrder from "./models/WorkOrder.js";
import Calibration from "./models/Calibration.js";
import Maintenance from "./models/Maintenance.js";
import Equipment from "./models/Equipment.js";
import Complaint from "./models/Complaint.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/hospital_equipment";
const API_URL = "http://localhost:5000/api";

async function postJson(url, data, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`POST ${url} returned ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function getJson(url, token) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`GET ${url} returned ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function main() {
  console.log("=========================================================================");
  console.log(" TEST: SINGLE BIOMEDICAL ENGINEER & COMPLAINT-TO-ASSIGNED-TASKS VERIFICATION");
  console.log("=========================================================================");

  await mongoose.connect(MONGO_URI);
  console.log("[DB] Connected to MongoDB");

  // 1. Verify single Biomedical Engineer
  const bmes = await User.find({ role: "BIOMEDICAL_ENGINEER" });
  console.log(`[DB] Biomedical Engineer count: ${bmes.length}`);
  if (bmes.length !== 1) {
    throw new Error(`Expected exactly 1 Biomedical Engineer, found ${bmes.length}`);
  }
  const singleBme = bmes[0];
  console.log(`✔ Single Biomedical Engineer verified: ${singleBme.name} (${singleBme.email}, ID: ${singleBme._id})`);

  // 2. Verify all tasks in DB are assigned to singleBme
  const woCount = await WorkOrder.countDocuments();
  const unassignedWos = await WorkOrder.countDocuments({ engineerId: { $ne: singleBme._id } });
  console.log(`[DB] Total Work Orders: ${woCount}, Assigned to other engineers: ${unassignedWos}`);
  if (unassignedWos > 0) {
    throw new Error(`Found ${unassignedWos} work orders not assigned to Daniel Okafor!`);
  }
  console.log("✔ 100% of Work Orders are assigned to Daniel Okafor");

  const calCount = await Calibration.countDocuments();
  const unassignedCals = await Calibration.countDocuments({ assignedEngineerId: { $ne: singleBme._id } });
  console.log(`[DB] Total Calibrations: ${calCount}, Performed by others: ${unassignedCals}`);
  if (unassignedCals > 0) {
    throw new Error(`Found ${unassignedCals} calibrations not assigned to Daniel Okafor!`);
  }
  console.log("✔ 100% of Calibrations are assigned to Daniel Okafor");

  const mntCount = await Maintenance.countDocuments();
  const unassignedMnts = await Maintenance.countDocuments({ engineerId: { $ne: singleBme._id } });
  console.log(`[DB] Total Maintenance records: ${mntCount}, Assigned to others: ${unassignedMnts}`);
  if (unassignedMnts > 0) {
    throw new Error(`Found ${unassignedMnts} maintenance records not assigned to Daniel Okafor!`);
  }
  console.log("✔ 100% of Maintenance records are assigned to Daniel Okafor");

  // 3. Staff logs in and raises a brand new complaint
  console.log("\n[TEST] Staff logs in to raise a complaint...");
  const staffAuth = await postJson(`${API_URL}/auth/login`, {
    email: "clara.whitfield@medixa.health",
    password: "Medixa#2026",
  });
  const staffToken = staffAuth.data.token;

  const testEquip = await Equipment.findOne({ equipmentId: "EQ-1001" });
  if (!testEquip) throw new Error("Equipment EQ-1001 not found");

  const complaintPayload = {
    equipmentId: testEquip._id,
    title: "Critical Ventilator Turbine Pressure Drop",
    description: "Turbine pressure drop alarm triggered during patient assist control ventilation mode.",
    priority: "CRITICAL",
  };

  console.log("[TEST] Submitting complaint via POST /api/complaints...");
  const complaintRes = await postJson(`${API_URL}/complaints`, complaintPayload, staffToken);
  const createdComplaint = complaintRes.data;
  console.log(`✔ Complaint created: ${createdComplaint.complaintId} (ID: ${createdComplaint._id})`);
  console.log(`  Assigned Engineer: ${createdComplaint.assignedEngineerId?.name || singleBme.name}`);
  console.log(`  Work Order Link: ${createdComplaint.workOrderId?._id || createdComplaint.workOrderId}`);

  if (!createdComplaint.workOrderId) {
    throw new Error("Complaint did not automatically generate a Work Order!");
  }

  // 4. Biomedical Engineer logs in
  console.log("\n[TEST] Daniel Okafor logs in...");
  const bmeAuth = await postJson(`${API_URL}/auth/login`, {
    email: "daniel.okafor@medixa.health",
    password: "Medixa#2026",
  });
  const bmeToken = bmeAuth.data.token;

  // 5. Engineer accesses "Assigned tasks" page (frontend hits GET /api/work-orders)
  console.log("[TEST] Daniel Okafor views Assigned Tasks page (GET /api/work-orders)...");
  const assignedTasksRes = await getJson(`${API_URL}/work-orders`, bmeToken);
  const tasks = assignedTasksRes.data.items;
  console.log(`✔ Daniel Okafor retrieved ${tasks.length} assigned work orders`);

  const matchingTask = tasks.find(
    (t) =>
      String(t.complaintId?._id || t.complaintId) === String(createdComplaint._id) ||
      String(t._id) === String(createdComplaint.workOrderId?._id || createdComplaint.workOrderId)
  );

  if (!matchingTask) {
    throw new Error(`The newly created complaint ${createdComplaint.complaintId} was NOT found in Daniel Okafor's assigned tasks page!`);
  }

  console.log(`✔ SUCCESS! Complaint ${createdComplaint.complaintId} immediately appeared on Daniel Okafor's Assigned Tasks page!`);
  console.log(`  Work Order ID: ${matchingTask.workOrderId}`);
  console.log(`  Title: ${matchingTask.title}`);
  console.log(`  Priority: ${matchingTask.priority}`);
  console.log(`  Status: ${matchingTask.status}`);
  console.log(`  Engineer ID: ${matchingTask.engineerId?._id || matchingTask.engineerId}`);

  // 6. Engineer also checks /api/engineers/me/work-orders
  const meWorkOrdersRes = await getJson(`${API_URL}/engineers/me/work-orders`, bmeToken);
  const meTasks = meWorkOrdersRes.data.items;
  const matchInMe = meTasks.find(
    (t) =>
      String(t.complaintId?._id || t.complaintId) === String(createdComplaint._id) ||
      String(t._id) === String(createdComplaint.workOrderId?._id || createdComplaint.workOrderId)
  );
  if (!matchInMe) {
    throw new Error("Complaint work order not found in /api/engineers/me/work-orders!");
  }
  console.log("✔ Also verified in /api/engineers/me/work-orders queue");

  // 7. Engineer can start the work order
  console.log("\n[TEST] Daniel Okafor starts work on the task...");
  const startRes = await postJson(`${API_URL}/work-orders/${matchingTask._id}/start`, {}, bmeToken);
  console.log(`✔ Work order started. Status: ${startRes.data.workOrder.status}`);

  // 8. Verify complaint status cascaded
  const updatedComplaint = await Complaint.findById(createdComplaint._id);
  console.log(`✔ Complaint status cascaded to: ${updatedComplaint.status}`);
  if (updatedComplaint.status !== "MAINTENANCE_IN_PROGRESS") {
    throw new Error(`Expected complaint status MAINTENANCE_IN_PROGRESS, got ${updatedComplaint.status}`);
  }

  console.log("\n=========================================================================");
  console.log(" ALL SINGLE BME & COMPLAINT-TO-ASSIGNED-TASKS CHECKS PASSED WITH 100%! ✔");
  console.log("=========================================================================");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ TEST FAILED:", err.message);
  process.exit(1);
});

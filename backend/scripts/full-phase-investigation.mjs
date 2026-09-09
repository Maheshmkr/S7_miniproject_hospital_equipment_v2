import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hospital_equipment";
const JWT_SECRET = process.env.JWT_SECRET || "medixa_super_secret_jwt_key_2026";
const BASE_URL = "http://localhost:5000/api";

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, JWT_SECRET, {
    expiresIn: "1h",
  });
}

async function runInvestigation() {
  console.log("==================================================================");
  console.log("PHASE 1-16: REAL CODE AND MONGODB BACKEND INVESTIGATION");
  console.log("==================================================================");

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  console.log(`✓ Connected to MongoDB Database: "${db.databaseName}"`);

  const usersColl = db.collection("users");
  const equipmentColl = db.collection("equipment");
  const complaintsColl = db.collection("complaints");
  const workOrdersColl = db.collection("workorders");

  // PHASE 5: Fetch Users
  const admin = await usersColl.findOne({ role: "ADMINISTRATOR" });
  const staff = await usersColl.findOne({ role: "DEPARTMENT_STAFF" });
  const engineerA = await usersColl.findOne({ email: "daniel.okafor@medixa.health" });
  const engineerB = await usersColl.findOne({ email: "marcus.vance@medixa.health" });

  console.log("\n--- REAL USER DOCUMENTS ---");
  console.log("Admin:", admin.name, admin.email, "_id:", admin._id.toString());
  console.log("Staff:", staff.name, staff.email, "_id:", staff._id.toString());
  console.log("Engineer A:", engineerA.name, engineerA.email, "_id:", engineerA._id.toString());
  console.log("Engineer B:", engineerB?.name, engineerB?.email, "_id:", engineerB?._id.toString());

  const adminToken = signToken(admin);
  const staffToken = signToken(staff);
  const engAToken = signToken(engineerA);

  // PHASE 15 - TEST A: EQUIPMENT
  console.log("\n--- TEST A: EQUIPMENT ---");
  const equipPayload = {
    name: "Investigation Test Ventilator " + Date.now(),
    category: "Life Support",
    departmentId: admin.departmentId ? admin.departmentId.toString() : undefined,
    modelNumber: "INV-VENT-9000",
    serialNumber: "SN-" + Date.now(),
    manufacturer: "Medixa LifeCare",
    location: "ICU Room 402",
    status: "OPERATIONAL",
    criticality: "HIGH"
  };

  const createEquipRes = await fetch(`${BASE_URL}/equipment`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(equipPayload)
  });
  const equipData = await createEquipRes.json();
  const createdEquipment = equipData.data;
  console.log("Equipment API Status:", createEquipRes.status, "Equipment ID:", createdEquipment?.equipmentId, "_id:", createdEquipment?._id);

  // Verify in MongoDB
  const equipInDb = await equipmentColl.findOne({ _id: new mongoose.Types.ObjectId(createdEquipment._id) });
  console.log("Equipment Exists in MongoDB:", Boolean(equipInDb), "DB _id:", equipInDb?._id.toString());

  // PHASE 15 - TEST B: COMPLAINT CREATION
  console.log("\n--- TEST B: COMPLAINT CREATION ---");
  const compPayload = {
    title: "Phase Investigation Complaint - " + Date.now(),
    description: "Flow investigation: Pressure sensor alarm triggered during calibration check.",
    equipmentId: createdEquipment._id.toString(),
    priority: "HIGH"
  };

  const createCompRes = await fetch(`${BASE_URL}/complaints`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify(compPayload)
  });
  const compData = await createCompRes.json();
  const createdComplaint = compData.data;
  console.log("Complaint API Status:", createCompRes.status, "Complaint Code:", createdComplaint?.complaintId, "_id:", createdComplaint?._id);
  console.log("Initial Status:", createdComplaint?.status);

  // Verify in MongoDB
  const compInDb = await complaintsColl.findOne({ _id: new mongoose.Types.ObjectId(createdComplaint._id) });
  console.log("Complaint Exists in MongoDB:", Boolean(compInDb));
  console.log("DB Complaint equipmentId:", compInDb?.equipmentId.toString());
  console.log("DB Complaint reportedBy:", compInDb?.reportedBy.toString());
  console.log("DB Complaint status:", compInDb?.status);
  console.log("DB Complaint assignedEngineerId (initial):", compInDb?.assignedEngineerId);

  // PHASE 15 - TEST C: ASSIGN ENGINEER
  console.log("\n--- TEST C: ASSIGN ENGINEER ---");
  const assignRes = await fetch(`${BASE_URL}/complaints/${createdComplaint._id}/assign`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ engineerId: engineerA._id.toString() })
  });
  const assignData = await assignRes.json();
  console.log("Assign API Status:", assignRes.status, "Updated Status:", assignData.data?.status);

  // Re-inspect Complaint Document in MongoDB
  const updatedCompDb = await complaintsColl.findOne({ _id: new mongoose.Types.ObjectId(createdComplaint._id) });
  console.log("MongoDB Complaint Document After Assignment:");
  console.log("  - Complaint _id:", updatedCompDb._id.toString());
  console.log("  - Complaint Code:", updatedCompDb.complaintId);
  console.log("  - Assigned Engineer Field Name: assignedEngineerId");
  console.log("  - Assigned Engineer Value:", updatedCompDb.assignedEngineerId?.toString());
  console.log("  - Linked workOrderId Field Value:", updatedCompDb.workOrderId?.toString());
  console.log("  - Engineer A User _id:", engineerA._id.toString());
  console.log("  - MATCH (Complaint.assignedEngineerId === EngineerA._id):", updatedCompDb.assignedEngineerId?.toString() === engineerA._id.toString());

  // Inspect WorkOrder Document in MongoDB
  const linkedWorkOrder = await workOrdersColl.findOne({ _id: updatedCompDb.workOrderId });
  console.log("\nMongoDB Linked WorkOrder Document:");
  console.log("  - WorkOrder _id:", linkedWorkOrder?._id.toString());
  console.log("  - WorkOrder Code:", linkedWorkOrder?.workOrderId);
  console.log("  - Title:", linkedWorkOrder?.title);
  console.log("  - Engineer Field Name: engineerId");
  console.log("  - Engineer Value:", linkedWorkOrder?.engineerId?.toString());
  console.log("  - Status:", linkedWorkOrder?.status);
  console.log("  - MATCH (WorkOrder.engineerId === EngineerA._id):", linkedWorkOrder?.engineerId?.toString() === engineerA._id.toString());

  // PHASE 15 - TEST D: ENGINEER TASK API
  console.log("\n--- TEST D: CALL ENGINEER TASKS API (/api/work-orders) ---");
  const engTaskRes = await fetch(`${BASE_URL}/work-orders`, {
    headers: { Authorization: `Bearer ${engAToken}` }
  });
  const engTaskData = await engTaskRes.json();
  console.log("Engineer Tasks API Status:", engTaskRes.status);
  console.log("Total Tasks Returned for Daniel Okafor:", engTaskData.data?.total);
  
  const foundTask = engTaskData.data?.items?.find(
    (item) => item._id.toString() === linkedWorkOrder._id.toString() || item.workOrderId === linkedWorkOrder.workOrderId
  );
  console.log("Assigned Complaint Found in Daniel Okafor API Response:", Boolean(foundTask));
  if (foundTask) {
    console.log("  - Found Task ID:", foundTask._id);
    console.log("  - Found Task Code:", foundTask.workOrderId);
    console.log("  - Found Task Title:", foundTask.title);
    console.log("  - Found Task Priority:", foundTask.priority);
    console.log("  - Found Task Status:", foundTask.status);
    console.log("  - Found Equipment Name:", foundTask.equipmentId?.name);
    console.log("  - Found Department Name:", foundTask.departmentId?.name);
    console.log("  - Found Engineer Name:", foundTask.engineerId?.name);
  }

  console.log("\n==================================================================");
  console.log("PHASE 16: EXACT RUNTIME DEBUG VALUES");
  console.log("==================================================================");
  console.log("DATABASE NAME:", db.databaseName);
  console.log("COMPLAINT ID:", updatedCompDb.complaintId, `(${updatedCompDb._id})`);
  console.log("COMPLAINT ASSIGNED ENGINEER FIELD: assignedEngineerId");
  console.log("COMPLAINT ASSIGNED ENGINEER VALUE:", updatedCompDb.assignedEngineerId?.toString());
  console.log("LOGGED-IN ENGINEER USER ID:", engineerA._id.toString());
  console.log("JWT USER ID (sub):", engineerA._id.toString());
  console.log("ENGINEER TASK API ENDPOINT: GET /api/work-orders");
  console.log("MODEL USED BY QUERY: WorkOrder");
  console.log("QUERY FIELD: engineerId");
  console.log("MONGODB QUERY RESULT COUNT:", engTaskData.data?.items?.length);
  console.log("API RESPONSE COUNT:", engTaskData.data?.total);
  console.log("FRONTEND RENDERED ROW COUNT:", engTaskData.data?.items?.length);
  console.log("==================================================================\n");

  await mongoose.disconnect();
}

runInvestigation().catch((err) => {
  console.error("Investigation script error:", err);
  process.exit(1);
});

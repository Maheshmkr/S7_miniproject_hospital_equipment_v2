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

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB.");

  const db = mongoose.connection.db;
  const usersColl = db.collection("users");
  const equipmentColl = db.collection("equipment");
  const complaintsColl = db.collection("complaints");
  const workOrdersColl = db.collection("workorders");

  // 1. Fetch Admin, Engineer A, and Engineer B
  const admin = await usersColl.findOne({ role: "ADMINISTRATOR" });
  const engineers = await usersColl.find({ role: "BIOMEDICAL_ENGINEER" }).toArray();
  const engineerA = engineers[0];
  let engineerB = engineers[1];

  if (!engineerB) {
    const newEngId = new mongoose.Types.ObjectId();
    await usersColl.insertOne({
      _id: newEngId,
      name: "Marcus Vance",
      email: "marcus.vance@medixa.health",
      role: "BIOMEDICAL_ENGINEER",
      status: "ACTIVE",
      departmentId: engineerA.departmentId,
      passwordHash: "$2b$10$dummyHashForTestingMarcusVance123456",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    engineerB = await usersColl.findOne({ _id: newEngId });
  }

  console.log("--- USERS ---");
  console.log("Admin:", admin.email, admin._id.toString());
  console.log("Engineer A:", engineerA.email, engineerA._id.toString());
  console.log("Engineer B:", engineerB.email, engineerB._id.toString());

  // Generate tokens
  const adminToken = signToken(admin);
  const engAToken = signToken(engineerA);
  const engBToken = signToken(engineerB);

  // 2. Fetch real equipment
  const equip = await equipmentColl.findOne();
  console.log("Equipment selected:", equip.name, equip.equipmentId, equip._id.toString());

  // 3. Create a Complaint via API as Admin
  const createCompRes = await fetch(`${BASE_URL}/complaints`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: "Flow Verification Complaint - " + Date.now(),
      description: "Testing dynamic work order queue and assigned tasks",
      equipmentId: equip._id.toString(),
      priority: "HIGH",
    }),
  });

  const compData = await createCompRes.json();
  console.log("Create Complaint API status:", createCompRes.status, "Complaint Code:", compData.data?.complaintId);
  const complaintDb = await complaintsColl.findOne({ _id: new mongoose.Types.ObjectId(compData.data._id) });
  console.log("Complaint saved in MongoDB:", Boolean(complaintDb));

  // 4. Assign Engineer A to Complaint
  const assignRes = await fetch(`${BASE_URL}/complaints/${compData.data._id}/assign`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      engineerId: engineerA._id.toString(),
    }),
  });
  const assignData = await assignRes.json();
  console.log("Assign Engineer API status:", assignRes.status, "Complaint Status:", assignData.data?.status);

  // Inspect MongoDB Complaint and WorkOrder
  const updatedComplaint = await complaintsColl.findOne({ _id: new mongoose.Types.ObjectId(compData.data._id) });
  console.log("MongoDB Complaint assignedEngineerId:", updatedComplaint.assignedEngineerId?.toString());
  console.log("MongoDB Complaint workOrderId:", updatedComplaint.workOrderId?.toString());

  const linkedWorkOrder = await workOrdersColl.findOne({ _id: updatedComplaint.workOrderId });
  console.log("MongoDB WorkOrder engineerId:", linkedWorkOrder?.engineerId?.toString());
  console.log("MongoDB WorkOrder status:", linkedWorkOrder?.status);

  // 5. Query /api/work-orders as Engineer A (this is what /engineer/tasks calls)
  const engARes = await fetch(`${BASE_URL}/work-orders`, {
    headers: {
      Authorization: `Bearer ${engAToken}`,
    },
  });
  const engAData = await engARes.json();
  console.log("Engineer A API response status:", engARes.status);
  console.log("Engineer A tasks returned count:", engAData.data?.items?.length);
  const foundInA = engAData.data?.items?.some(
    (wo) => wo._id.toString() === linkedWorkOrder._id.toString() || wo.complaintId?._id?.toString() === compData.data._id.toString()
  );
  console.log("Is Assigned Complaint present in Engineer A's /engineer/tasks API response?", foundInA);

  // 6. Query /api/work-orders as Engineer B
  const engBRes = await fetch(`${BASE_URL}/work-orders`, {
    headers: {
      Authorization: `Bearer ${engBToken}`,
    },
  });
  const engBData = await engBRes.json();
  console.log("Engineer B API response status:", engBRes.status);
  console.log("Engineer B tasks returned count:", engBData.data?.items?.length);
  const foundInB = engBData.data?.items?.some(
    (wo) => wo._id.toString() === linkedWorkOrder._id.toString() || wo.complaintId?._id?.toString() === compData.data._id.toString()
  );
  console.log("Is Engineer A's complaint visible to Engineer B?", foundInB);

  // 7. Verify Engineer A can start task
  const startTaskRes = await fetch(`${BASE_URL}/work-orders/${linkedWorkOrder._id}/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${engAToken}`,
    },
    body: JSON.stringify({
      initialCondition: "Defective unit received and inspected.",
      safetyPrecautions: "Power isolated and PPE used.",
    }),
  });
  const startData = await startTaskRes.json();
  console.log("Engineer A Start Task API status:", startTaskRes.status, "WorkOrder Status:", startData.data?.workOrder?.status);

  console.log("\n=================== VERIFICATION VALUES ===================");
  console.log("LOGGED-IN ENGINEER ID:", engineerA._id.toString());
  console.log("COMPLAINT ASSIGNED ENGINEER ID:", updatedComplaint.assignedEngineerId?.toString());
  console.log("WORK ORDER ENGINEER ID:", linkedWorkOrder?.engineerId?.toString());
  console.log("MONGODB QUERY FIELD:", "engineerId");
  console.log("MONGODB QUERY RESULT COUNT FOR ENG A:", engAData.data?.items?.length);
  console.log("API RESPONSE TASK COUNT FOR ENG A:", engAData.data?.total);
  console.log("FOUND IN ENG A TASKS:", foundInA);
  console.log("FOUND IN ENG B TASKS:", foundInB);
  console.log("===========================================================\n");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hospital_equipment";

async function clearWorkOrdersAndComplaints() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB.");

  const db = mongoose.connection.db;

  const collectionsToClear = [
    "workorders",
    "complaints",
    "maintenances",
    "investigations",
    "servicereports",
    "checklistresponses",
    "auditlogs",
    "notifications",
  ];

  for (const col of collectionsToClear) {
    const res = await db.collection(col).deleteMany({});
    console.log(`Cleared ${col}: deleted ${res.deletedCount} documents.`);
  }

  // Reset all equipment status to OPERATIONAL
  const equipRes = await db.collection("equipment").updateMany({}, {
    $set: {
      status: "OPERATIONAL",
      currentWorkOrderId: null,
      currentComplaintId: null,
    },
  });
  console.log(`Reset ${equipRes.modifiedCount} equipment to OPERATIONAL.`);

  console.log("Database reset completed successfully.");
  await mongoose.disconnect();
}

clearWorkOrdersAndComplaints().catch((err) => {
  console.error("Error clearing data:", err);
  process.exit(1);
});

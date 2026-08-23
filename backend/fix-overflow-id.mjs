import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hospital_equipment";
await mongoose.connect(MONGO_URI);
const db = mongoose.connection.db;

// The CMP-2026-0000 is a test/overflow artifact - renumber it to 0049
const badOne = await db.collection("complaints").findOne({ complaintId: "CMP-2026-0000" });
if (badOne) {
  console.log("Found CMP-2026-0000, renumbering to CMP-2026-0049");
  await db.collection("complaints").updateOne(
    { _id: badOne._id },
    { $set: { complaintId: "CMP-2026-0049" } }
  );
  await db.collection("auditlogs").updateMany(
    { recordId: "CMP-2026-0000" },
    { $set: { recordId: "CMP-2026-0049" } }
  );
  console.log("Done - CMP-2026-0049 is now clean");
} else {
  console.log("No CMP-2026-0000 found, already clean");
}
await mongoose.disconnect();

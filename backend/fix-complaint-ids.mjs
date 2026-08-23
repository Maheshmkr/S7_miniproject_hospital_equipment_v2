import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hospital_equipment";
console.log("Connecting to:", MONGO_URI);

await mongoose.connect(MONGO_URI);
const db = mongoose.connection.db;

const complaints = await db.collection("complaints")
  .find({})
  .sort({ _id: 1 })
  .toArray();

console.log(`Found ${complaints.length} complaints`);

const year = new Date().getFullYear();
const prefix = `CMP-${year}-`;

// Keep the first two valid ones (CMP-2026-0044, CMP-2026-0045)
// and fix the rest
for (const doc of complaints) {
  const oldId = doc.complaintId;
  const suffix = oldId.startsWith(prefix) ? oldId.slice(prefix.length) : oldId;

  // Check if suffix is a valid 4-char padded number
  if (/^\d{4}$/.test(suffix)) {
    console.log(`  OK: ${oldId}`);
    continue;
  }

  // Extract the LAST 4 digits which are the actual sequence number
  const match = suffix.match(/(\d{4})$/);
  const seqNum = match ? match[1] : suffix.replace(/\D/g, "").slice(-4);
  const newId = `${prefix}${seqNum.padStart(4, "0")}`;

  console.log(`  FIX: "${oldId}" → "${newId}"`);
  await db.collection("complaints").updateOne(
    { _id: doc._id },
    { $set: { complaintId: newId } }
  );
}

// Also fix audit logs that reference the old IDs
const auditDocs = await db.collection("auditlogs")
  .find({ recordId: { $regex: `^CMP-${year}-\\d{5,}` } })
  .toArray();

if (auditDocs.length > 0) {
  console.log(`\nFixing ${auditDocs.length} audit log entries...`);
  for (const audit of auditDocs) {
    const oldId = audit.recordId;
    const suffix = oldId.startsWith(prefix) ? oldId.slice(prefix.length) : oldId;
    const match = suffix.match(/(\d{4})$/);
    const seqNum = match ? match[1] : suffix.replace(/\D/g, "").slice(-4);
    const newId = `${prefix}${seqNum.padStart(4, "0")}`;
    await db.collection("auditlogs").updateOne(
      { _id: audit._id },
      { $set: { recordId: newId } }
    );
    console.log(`  AUDIT: "${oldId}" → "${newId}"`);
  }
}

console.log("\nDone! All complaint IDs corrected.");
await mongoose.disconnect();

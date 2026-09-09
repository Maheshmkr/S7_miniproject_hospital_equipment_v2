import mongoose from "mongoose";

export async function setupTestDb(dbName = "hospital_equipment_test") {
  const localUri = process.env.TEST_MONGODB_URI || `mongodb://127.0.0.1:27017/${dbName}`;
  process.env.MONGODB_URI = localUri;
  return localUri;
}

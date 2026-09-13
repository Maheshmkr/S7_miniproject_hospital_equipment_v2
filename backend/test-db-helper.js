import mongoose from "mongoose";

export async function setupTestDb(dbName = "hospital_equipment_test") {
  const localUri = process.env.TEST_MONGODB_URI || `mongodb://127.0.0.1:27017/${dbName}`;
  process.env.MONGODB_URI = localUri;

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(localUri, { serverSelectionTimeoutMS: 4000 });

  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }

  return localUri;
}

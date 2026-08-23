import mongoose from "mongoose";

let connection = null;

/** Reusable MongoDB connection. Fails loudly — never silently falls back to mock data. */
export async function connectDB() {
  if (connection) return connection;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env and configure it.");
  }

  mongoose.set("strictQuery", true);
  connection = await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });

  mongoose.connection.on("error", (err) => {
    console.error("[mongo] connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("[mongo] disconnected");
  });

  console.log(`[mongo] connected → ${mongoose.connection.name}`);
  return connection;
}

export function dbStatus() {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  return states[mongoose.connection.readyState] ?? "unknown";
}

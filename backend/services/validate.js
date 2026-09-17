import mongoose from "mongoose";
import { ApiError } from "./apiError.js";

export function assertObjectId(value, label = "id") {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
  return value;
}

export function requireFields(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === "");
  if (missing.length) throw new ApiError(400, `Missing required field(s): ${missing.join(", ")}`);
}

export function assertEnum(value, allowed, label) {
  if (value === undefined) return;
  if (!allowed.includes(value)) {
    throw new ApiError(400, `Invalid ${label}. Allowed: ${allowed.join(", ")}`);
  }
}

export function assertEmail(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""))) {
    throw new ApiError(400, "Invalid email address");
  }
}

export function assertDate(value, label) {
  if (value === undefined || value === null || value === "") return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, `Invalid ${label}`);
  return d;
}

export function paginate(query) {
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const limit = Math.min(200, Math.max(1, Number.parseInt(query.limit ?? "50", 10) || 50));
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Resolve either a Mongo ObjectId or a human business code (EQ-1042, WO-4472, CMP-…)
 * so frontend deep links keep working unchanged.
 */
export async function findByAnyId(Model, id, codeField) {
  if (!id) return null;
  let doc = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    doc = await Model.findById(id);
  }
  if (!doc && codeField) {
    doc = await Model.findOne({ [codeField]: id });
    if (!doc) {
      doc = await Model.findOne({ [codeField]: new RegExp(`^${id}$`, "i") });
    }
  }
  if (!doc) {
    doc = await Model.findOne({
      $or: [
        { code: new RegExp(`^${id}$`, "i") },
        { name: new RegExp(`^${id}`, "i") },
      ],
    });
  }
  return doc;
}

import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    building: { type: String, trim: true },
    floor: { type: String, trim: true },
    headName: { type: String, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
    description: { type: String, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model("Department", departmentSchema);

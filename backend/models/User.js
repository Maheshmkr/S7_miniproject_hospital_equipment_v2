import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export const ROLES = ["ADMINISTRATOR", "BIOMEDICAL_ENGINEER", "TECHNICIAN", "DEPARTMENT_STAFF"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, index: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", index: true },
    employeeId: { type: String, trim: true },
    title: { type: String, trim: true },
    initials: { type: String, trim: true },
    phone: { type: String, trim: true },
    status: { type: String, enum: ["ACTIVE", "INACTIVE", "SUSPENDED"], default: "ACTIVE" },
  },
  { timestamps: true },
);

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.hashPassword = function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
};

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

export default mongoose.model("User", userSchema);

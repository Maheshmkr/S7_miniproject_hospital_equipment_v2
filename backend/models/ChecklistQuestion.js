import mongoose from "mongoose";

export const RESPONSE_TYPES = [
  "YES_NO",
  "PASS_FAIL",
  "TEXT",
  "NUMBER",
  "DROPDOWN",
  "DATE",
  "EVIDENCE",
];

export const QUESTION_PRIORITIES = ["STANDARD", "IMPORTANT", "CRITICAL"];

const checklistQuestionSchema = new mongoose.Schema(
  {
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChecklistTemplate",
      required: true,
      index: true,
    },
    question: { type: String, required: true, trim: true },
    responseType: { type: String, enum: RESPONSE_TYPES, required: true },
    options: [{ type: String }],
    required: { type: Boolean, default: true },
    priority: { type: String, enum: QUESTION_PRIORITIES, default: "STANDARD" },
    order: { type: Number, default: 0 },
    helpText: { type: String, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model("ChecklistQuestion", checklistQuestionSchema);

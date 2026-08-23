import fs from "fs";
import path from "path";
import multer from "multer";

/**
 * File-upload abstraction. Development uses local disk under UPLOAD_DIR and
 * only the metadata + URL is persisted in MongoDB. Swap this storage engine for
 * S3/GCS later without touching controllers.
 */
export const uploadDir = path.resolve(process.env.UPLOAD_DIR || "uploads");

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

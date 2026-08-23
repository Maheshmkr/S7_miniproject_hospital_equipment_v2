export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Wrap async controllers so rejections reach the error middleware. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const ok = (res, data, message) => res.json({ success: true, data, ...(message ? { message } : {}) });
export const created = (res, data, message) =>
  res.status(201).json({ success: true, data, ...(message ? { message } : {}) });

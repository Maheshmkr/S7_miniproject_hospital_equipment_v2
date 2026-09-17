import { ApiError } from "../services/apiError.js";

export function notFound(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  const isApiError = err instanceof ApiError;
  let status = isApiError ? err.status : 500;
  let message = err.message || "Something went wrong";

  if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }
  if (err.name === "CastError") {
    status = 400;
    message = "Invalid identifier";
  }
  if (err.code === 11000) {
    status = 409;
    message = `Duplicate value for ${Object.keys(err.keyPattern || {}).join(", ")}`;
  }

  if (status >= 500) console.error("[error]", err);

  res.status(status).json({
    success: false,
    message,
    ...(isApiError && err.details ? { details: err.details } : {}),
  });
}

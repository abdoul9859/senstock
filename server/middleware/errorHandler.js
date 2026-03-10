const logger = require("../lib/logger");

/**
 * Central error handling middleware.
 * Catches unhandled errors and returns safe responses.
 */
function errorHandler(err, req, res, _next) {
  // Log full error details server-side
  logger.error("Unhandled error", {
    method: req.method,
    url: req.originalUrl,
    userId: req.userId,
    tenantId: req.tenantId,
    error: err.message,
    stack: err.stack,
  });

  // Prisma known errors
  if (err.code === "P2002") {
    return res.status(409).json({ error: "Un enregistrement avec ces donnees existe deja" });
  }
  if (err.code === "P2025") {
    return res.status(404).json({ error: "Enregistrement introuvable" });
  }

  // Zod validation errors
  if (err.name === "ZodError") {
    return res.status(400).json({
      error: "Donnees invalides",
      details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Token invalide ou expire" });
  }

  // Default: hide internal details in production
  const isDev = process.env.NODE_ENV !== "production";
  res.status(err.status || 500).json({
    error: isDev ? err.message : "Erreur serveur interne",
  });
}

/**
 * Async route wrapper — catches promise rejections and forwards to errorHandler
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { errorHandler, asyncHandler };

const rateLimit = require("express-rate-limit");

const isDev = process.env.NODE_ENV !== "production";

// In dev: no rate limiting. In production: apply limits.
const noLimit = (_req, _res, next) => next();

const apiLimiter = isDev ? noLimit : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de requetes, veuillez reessayer plus tard" },
});

const authLimiter = isDev ? noLimit : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives de connexion, veuillez reessayer dans 15 minutes" },
});

const uploadLimiter = isDev ? noLimit : rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Trop d'uploads, veuillez reessayer" },
});

module.exports = { apiLimiter, authLimiter, uploadLimiter };

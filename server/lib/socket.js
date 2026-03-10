const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const logger = require("./logger");

let io = null;

/**
 * Initialize Socket.IO with the HTTP server
 */
function initSocket(httpServer) {
  const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:8080,http://localhost:5173")
    .split(",")
    .map((o) => o.trim());

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    path: "/ws",
  });

  // Auth middleware for WebSocket
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Token manquant"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.tenantId = decoded.tenantId;
      next();
    } catch {
      next(new Error("Token invalide"));
    }
  });

  io.on("connection", (socket) => {
    // Join tenant room for broadcast
    if (socket.tenantId) {
      socket.join(`tenant:${socket.tenantId}`);
    }
    // Join personal room
    socket.join(`user:${socket.userId}`);

    logger.info("WebSocket connected", { userId: socket.userId, tenantId: socket.tenantId });

    socket.on("disconnect", () => {
      logger.debug("WebSocket disconnected", { userId: socket.userId });
    });
  });

  return io;
}

/**
 * Get the Socket.IO instance
 */
function getIO() {
  return io;
}

/**
 * Send a notification to all users of a tenant
 */
function notifyTenant(tenantId, event, data) {
  if (io) {
    io.to(`tenant:${tenantId}`).emit(event, data);
  }
}

/**
 * Send a notification to a specific user
 */
function notifyUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

module.exports = { initSocket, getIO, notifyTenant, notifyUser };

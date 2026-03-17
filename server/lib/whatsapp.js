/**
 * WhatsApp integration via Baileys — per-tenant instances.
 * Each tenant gets their own WhatsApp connection with QR code.
 */
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");
const prisma = require("../db");

// Minimal pino-compatible silent logger for baileys
const silentLogger = {
  level: "silent",
  trace: () => {}, debug: () => {}, info: () => {}, warn: () => {}, error: () => {}, fatal: () => {},
  child: () => silentLogger,
};

// In-memory store: tenantId -> { socket, qr, status, phone, name }
const connections = new Map();

const AUTH_DIR = path.join(__dirname, "..", "whatsapp_sessions");
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

/**
 * Get connection info for a tenant (no socket exposed)
 */
function getStatus(tenantId) {
  const conn = connections.get(tenantId);
  if (!conn) return { status: "disconnected", qr: null, phone: null, name: null };
  return { status: conn.status, qr: conn.qr, phone: conn.phone || null, name: conn.name || null };
}

/**
 * Connect a tenant's WhatsApp — generates QR code
 */
async function connect(tenantId) {
  const existing = connections.get(tenantId);
  if (existing?.status === "connected" && existing?.socket) {
    return { status: "connected" };
  }

  // Close existing socket
  if (existing?.socket) {
    try { existing.socket.end(); } catch {}
  }

  const sessionDir = path.join(AUTH_DIR, tenantId);
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  connections.set(tenantId, { status: "connecting", qr: null, socket: null, retries: 0, phone: null, name: null });

  const { version } = await fetchLatestBaileysVersion();

  const socket = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: silentLogger,
    browser: ["SenStock", "Chrome", "1.0.0"],
    connectTimeoutMs: 30000,
  });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const qrDataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
        const conn = connections.get(tenantId) || {};
        connections.set(tenantId, { ...conn, qr: qrDataUrl, status: "waiting_qr", socket });
        console.log(`[WhatsApp] QR generated for tenant ${tenantId}`);
      } catch (err) {
        console.error(`[WhatsApp] QR error: ${err.message}`);
      }
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const conn = connections.get(tenantId) || {};

      if (statusCode === DisconnectReason.loggedOut) {
        connections.set(tenantId, { status: "disconnected", qr: null, socket: null, retries: 0 });
        try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch {}
        // Update DB
        await prisma.companySettings.updateMany({ where: { tenantId }, data: { whatsappConnected: false } }).catch(() => {});
        console.log(`[WhatsApp] Logged out: ${tenantId}`);
      } else if ((conn.retries || 0) < 3) {
        connections.set(tenantId, { ...conn, status: "reconnecting", retries: (conn.retries || 0) + 1, socket: null });
        setTimeout(() => connect(tenantId), 5000);
      } else {
        connections.set(tenantId, { status: "disconnected", qr: null, socket: null, retries: 0 });
      }
    }

    if (connection === "open") {
      const me = socket.user;
      const phone = me?.id?.split(":")[0] || me?.id?.split("@")[0] || "";
      const name = me?.name || "";
      connections.set(tenantId, { status: "connected", qr: null, socket, retries: 0, phone, name });
      // Update DB
      await prisma.companySettings.updateMany({ where: { tenantId }, data: { whatsappConnected: true } }).catch(() => {});
      console.log(`[WhatsApp] Connected: ${tenantId} (${phone} - ${name})`);
    }
  });

  const conn = connections.get(tenantId) || {};
  connections.set(tenantId, { ...conn, socket });

  return { status: "connecting" };
}

/**
 * Disconnect and clear session
 */
async function disconnect(tenantId) {
  const conn = connections.get(tenantId);
  if (conn?.socket) {
    try { await conn.socket.logout(); } catch {}
    try { conn.socket.end(); } catch {}
  }
  connections.delete(tenantId);
  const sessionDir = path.join(AUTH_DIR, tenantId);
  try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch {}
  await prisma.companySettings.updateMany({ where: { tenantId }, data: { whatsappConnected: false } }).catch(() => {});
  return { status: "disconnected" };
}

/**
 * Normalize phone number (Senegal default)
 */
function normalizePhone(phone) {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00221")) digits = digits.slice(2);
  if (!digits.startsWith("221") && digits.length >= 9) digits = "221" + digits;
  return digits;
}

/**
 * Send text message
 */
async function sendText(tenantId, phone, message) {
  const conn = connections.get(tenantId);
  if (!conn?.socket || conn.status !== "connected") throw new Error("WhatsApp non connecte");
  const jid = normalizePhone(phone) + "@s.whatsapp.net";
  await conn.socket.sendMessage(jid, { text: message });
  return { success: true, to: jid };
}

/**
 * Send PDF document
 */
async function sendDocument(tenantId, phone, pdfBuffer, filename, caption) {
  const conn = connections.get(tenantId);
  if (!conn?.socket || conn.status !== "connected") throw new Error("WhatsApp non connecte");
  const jid = normalizePhone(phone) + "@s.whatsapp.net";
  await conn.socket.sendMessage(jid, {
    document: pdfBuffer,
    mimetype: "application/pdf",
    fileName: filename,
    caption: caption || "",
  });
  return { success: true, to: jid };
}

/**
 * Log message to DB
 */
async function logMessage({ tenantId, recipientPhone, recipientName, type, documentType, documentId, documentNumber, message, status, errorMessage, sentBy }) {
  try {
    return await prisma.whatsAppMessage.create({
      data: {
        tenantId,
        recipientPhone: normalizePhone(recipientPhone),
        recipientName: recipientName || "",
        type: type || "text",
        documentType: documentType || null,
        documentId: documentId || null,
        documentNumber: documentNumber || null,
        message: message || "",
        status: status || "sent",
        errorMessage: errorMessage || "",
        sentBy: sentBy || "",
      },
    });
  } catch (err) {
    console.error("Failed to log WhatsApp message:", err.message);
    return null;
  }
}

module.exports = { getStatus, connect, disconnect, normalizePhone, sendText, sendDocument, logMessage };

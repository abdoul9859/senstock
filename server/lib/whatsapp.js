/**
 * Evolution API client for WhatsApp integration.
 * Handles sending text/document messages and instance management.
 */
const prisma = require("../db");
const logger = require("./logger");

/**
 * Get WhatsApp config from CompanySettings for a given tenant.
 * Falls back to environment variables if no tenant-level config.
 */
async function getWhatsAppConfig(tenantId) {
  const settings = await prisma.companySettings.findUnique({
    where: { tenantId },
  });

  if (settings && settings.whatsappEnabled) {
    return {
      apiUrl: settings.whatsappApiUrl || process.env.EVOLUTION_API_URL,
      apiKey: settings.whatsappApiKey || process.env.EVOLUTION_API_KEY,
      instanceName: settings.whatsappInstanceName || process.env.EVOLUTION_INSTANCE_NAME || "stockflow",
      connected: settings.whatsappConnected,
    };
  }

  // Fallback to env vars if whatsapp is enabled via env
  if (process.env.EVOLUTION_API_URL) {
    return {
      apiUrl: process.env.EVOLUTION_API_URL,
      apiKey: process.env.EVOLUTION_API_KEY,
      instanceName: process.env.EVOLUTION_INSTANCE_NAME || "stockflow",
      connected: false,
    };
  }

  return null;
}

/**
 * Normalize a Senegalese phone number to international format.
 * 77 123 45 67 → 221771234567
 */
function normalizePhone(phone) {
  if (!phone) return "";
  // Strip all non-digit characters
  let digits = phone.replace(/\D/g, "");
  // If starts with 00221, remove the leading 00
  if (digits.startsWith("00221")) digits = digits.slice(2);
  // If doesn't start with country code, add Senegal (+221)
  if (!digits.startsWith("221") && digits.length >= 9) {
    digits = "221" + digits;
  }
  return digits;
}

/**
 * Send a text message via Evolution API.
 */
async function sendText(config, phone, message) {
  const url = `${config.apiUrl}/message/sendText/${config.instanceName}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.apiKey,
    },
    body: JSON.stringify({
      number: normalizePhone(phone),
      text: message,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Evolution API error: ${res.status} — ${err}`);
  }

  return res.json();
}

/**
 * Send a document (PDF) via Evolution API.
 */
async function sendDocument(config, phone, pdfBuffer, filename, caption) {
  const url = `${config.apiUrl}/message/sendMedia/${config.instanceName}`;
  const base64 = pdfBuffer.toString("base64");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.apiKey,
    },
    body: JSON.stringify({
      number: normalizePhone(phone),
      mediatype: "document",
      mimetype: "application/pdf",
      media: base64,
      fileName: filename,
      caption: caption || "",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Evolution API error: ${res.status} — ${err}`);
  }

  return res.json();
}

/**
 * Get the connection status of the WhatsApp instance.
 */
async function getConnectionStatus(config) {
  const url = `${config.apiUrl}/instance/connectionState/${config.instanceName}`;
  const res = await fetch(url, {
    headers: { apikey: config.apiKey },
  });

  if (!res.ok) {
    return { connected: false, state: "disconnected" };
  }

  const data = await res.json();
  return {
    connected: data.instance?.state === "open",
    state: data.instance?.state || "disconnected",
  };
}

/**
 * Create and connect an instance. Returns QR code data.
 */
async function connectInstance(config) {
  // 1. Create instance (ignore if already exists)
  const createUrl = `${config.apiUrl}/instance/create`;
  try {
    await fetch(createUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.apiKey,
      },
      body: JSON.stringify({
        instanceName: config.instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
    });
  } catch {
    // Instance may already exist — continue to connect
  }

  // 2. Get QR code
  const connectUrl = `${config.apiUrl}/instance/connect/${config.instanceName}`;
  const res = await fetch(connectUrl, {
    headers: { apikey: config.apiKey },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Connect error: ${res.status} — ${err}`);
  }

  return res.json();
}

/**
 * Disconnect the WhatsApp instance.
 */
async function disconnectInstance(config) {
  const url = `${config.apiUrl}/instance/logout/${config.instanceName}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { apikey: config.apiKey },
  });
  return res.ok;
}

/**
 * Log a WhatsApp message to the database.
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
    logger.error("Failed to log WhatsApp message:", err);
    return null;
  }
}

module.exports = {
  getWhatsAppConfig,
  normalizePhone,
  sendText,
  sendDocument,
  getConnectionStatus,
  connectInstance,
  disconnectInstance,
  logMessage,
};

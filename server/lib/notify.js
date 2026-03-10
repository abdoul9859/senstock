const prisma = require("../db");
const { notifyTenant, notifyUser } = require("./socket");
const logger = require("./logger");

/**
 * Create a notification and emit via WebSocket.
 * @param {object} params
 * @param {string} params.tenantId
 * @param {string} [params.userId] - Target user (null = all tenant users)
 * @param {string} params.type - Notification type (stock_low, new_order, payment_received, etc.)
 * @param {string} params.title
 * @param {string} [params.message]
 * @param {string} [params.link] - Link to navigate to
 */
async function createNotification({ tenantId, userId, type, title, message, link }) {
  try {
    const notif = await prisma.notification.create({
      data: {
        tenantId,
        userId: userId || null,
        type,
        title,
        message: message || "",
        link: link || "",
      },
    });

    const payload = { ...notif, _id: notif.id };

    if (userId) {
      notifyUser(userId, "notification", payload);
    } else {
      notifyTenant(tenantId, "notification", payload);
    }

    return notif;
  } catch (err) {
    logger.error("Failed to create notification", { error: err.message, type, title });
  }
}

module.exports = { createNotification };

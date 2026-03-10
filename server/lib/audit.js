const prisma = require("../db");
const logger = require("./logger");

/**
 * Log an audit trail entry.
 * @param {object} params
 * @param {string} params.tenantId
 * @param {string} params.entity - "product", "invoice", "client", etc.
 * @param {string} params.entityId
 * @param {string} params.action - "create", "update", "delete"
 * @param {object} params.changes - JSON diff of old vs new values
 * @param {string} [params.userId]
 * @param {string} [params.userName]
 */
async function logAudit({ tenantId, entity, entityId, action, changes, userId, userName }) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId,
        entity,
        entityId,
        action,
        changes: changes || {},
        userId: userId || null,
        userName: userName || "",
      },
    });
  } catch (err) {
    logger.error("Failed to create audit log", { error: err.message, entity, entityId, action });
  }
}

/**
 * Compute changed fields between old and new objects.
 * Returns an object with { field: { old, new } } for each changed field.
 */
function computeChanges(oldObj, newObj, fields) {
  const changes = {};
  for (const field of fields) {
    const oldVal = oldObj[field];
    const newVal = newObj[field];
    if (newVal !== undefined && oldVal !== newVal) {
      changes[field] = { old: oldVal, new: newVal };
    }
  }
  return changes;
}

module.exports = { logAudit, computeChanges };

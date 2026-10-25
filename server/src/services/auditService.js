const AuditLog = require('../models/AuditLog');

/**
 * Log an administrative or critical security action
 */
const logAction = async ({ actorId, action, recordModel = 'System', recordId = null, details = {}, req = null }) => {
  try {
    let ipAddress = '';
    if (req) {
      ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    }

    await AuditLog.create({
      actor: actorId,
      action,
      recordModel,
      recordId,
      details,
      ipAddress,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[Audit Log Error]', error.message);
  }
};

module.exports = {
  logAction,
};

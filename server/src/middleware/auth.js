const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.',
      });
    }

    const secret = process.env.JWT_SECRET || 'emergency_blood_secret_key_change_in_production_2026';
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists.',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated or suspended. Please contact administrator.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

/**
 * Authorize specified roles.
 * Includes support for platform_admin wherever admin is authorized.
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Role mapping / aliases for platform admin
    const effectiveRoles = [...roles];
    if (roles.includes('admin') && !effectiveRoles.includes('platform_admin')) {
      effectiveRoles.push('platform_admin');
    }

    if (!effectiveRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: role '${req.user.role}' is not authorized to access this resource`,
      });
    }

    next();
  };
};

/**
 * Enforce tenant isolation: User can only access their own organization's records
 * unless they are a platform administrator (admin or platform_admin).
 */
const requireOrganizationAccess = (getOrgIdFn) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Platform admins have platform-wide access
    if (req.user.role === 'admin' || req.user.role === 'platform_admin') {
      return next();
    }

    let targetOrgId;
    if (typeof getOrgIdFn === 'function') {
      targetOrgId = getOrgIdFn(req);
    } else if (typeof getOrgIdFn === 'string') {
      targetOrgId = req.params[getOrgIdFn] || req.body[getOrgIdFn] || req.query[getOrgIdFn];
    } else {
      targetOrgId = req.params.organizationId || req.body.organizationId || req.query.organizationId;
    }

    if (!targetOrgId) {
      // If no specific organization targeted, ensure user belongs to an organization
      if (!req.user.organizationId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: User is not affiliated with any organization',
        });
      }
      return next();
    }

    if (!req.user.organizationId || req.user.organizationId.toString() !== targetOrgId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to access records for another hospital/organization',
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  requireOrganizationAccess,
};

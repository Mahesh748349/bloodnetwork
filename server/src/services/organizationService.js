const Organization = require('../models/Organization');
const User = require('../models/User');

/**
 * Check if a user is a platform-wide administrator
 */
const isPlatformAdmin = (user) => {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'platform_admin';
};

/**
 * Check if a user belongs to a specific organization or is platform admin
 */
const canAccessOrganization = (user, organizationId) => {
  if (!user) return false;
  if (isPlatformAdmin(user)) return true;

  if (!user.organizationId || !organizationId) return false;
  return user.organizationId.toString() === organizationId.toString();
};

/**
 * Assert organization access or throw 403 error
 */
const assertOrganizationAccess = (user, organizationId, action = 'access this resource') => {
  if (!canAccessOrganization(user, organizationId)) {
    const error = new Error(`Forbidden: You do not have permission to ${action} for this hospital/organization.`);
    error.statusCode = 403;
    throw error;
  }
};

/**
 * Ensure active organization status
 */
const assertOrganizationActive = async (organizationId) => {
  if (!organizationId) {
    const error = new Error('Organization ID is required');
    error.statusCode = 400;
    throw error;
  }

  const org = await Organization.findById(organizationId);
  if (!org) {
    const error = new Error('Organization not found');
    error.statusCode = 404;
    throw error;
  }

  if (org.status !== 'active') {
    const error = new Error(`Organization is currently ${org.status}. Action not permitted.`);
    error.statusCode = 403;
    throw error;
  }

  return org;
};

module.exports = {
  isPlatformAdmin,
  canAccessOrganization,
  assertOrganizationAccess,
  assertOrganizationActive,
};


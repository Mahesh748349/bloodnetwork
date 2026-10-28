const Organization = require('../models/Organization');
const User = require('../models/User');
const { logAction } = require('../services/auditService');

/**
 * @route   POST /api/organizations
 * @desc    Register a new hospital or blood bank organization
 * @access  Private (requester, admin, platform_admin, hospital_admin) or Public registration with pending status
 */
const createOrganization = async (req, res, next) => {
  try {
    const {
      name,
      organizationType,
      registrationIdentifier,
      address,
      contactInformation,
      coordinates,
    } = req.body;

    if (!name || !organizationType) {
      return res.status(400).json({
        success: false,
        message: 'Organization name and organizationType are required',
      });
    }

    const existingOrg = await Organization.findOne({ name });
    if (existingOrg) {
      return res.status(400).json({
        success: false,
        message: `An organization with the name '${name}' already exists`,
      });
    }

    const defaultCoords =
      Array.isArray(coordinates) && coordinates.length === 2
        ? [Number(coordinates[0]), Number(coordinates[1])]
        : [77.5946, 12.9716];

    // Determine initial status: platform admins can immediately create active orgs; others are pending
    const isPlatformAdmin = req.user?.role === 'admin' || req.user?.role === 'platform_admin';
    const status = isPlatformAdmin ? 'active' : 'pending_approval';

    const organization = await Organization.create({
      name,
      organizationType,
      registrationIdentifier: registrationIdentifier || '',
      address: address || {},
      contactInformation: contactInformation || {},
      location: {
        type: 'Point',
        coordinates: defaultCoords,
      },
      status,
      approvedBy: isPlatformAdmin ? req.user?._id : null,
      approvedAt: isPlatformAdmin ? new Date() : null,
    });

    // If user is logged in and not yet associated with an org, link them as hospital_admin
    if (req.user && !req.user.organizationId && !isPlatformAdmin) {
      await User.findByIdAndUpdate(req.user._id, {
        organizationId: organization._id,
        role: 'hospital_admin',
      });
    }

    if (req.user) {
      await logAction({
        actorId: req.user._id,
        action: 'CREATE_ORGANIZATION',
        recordModel: 'Organization',
        recordId: organization._id,
        details: { name, organizationType, status },
        req,
      });
    }

    return res.status(201).json({
      success: true,
      message:
        status === 'active'
          ? 'Organization created successfully'
          : 'Organization registered and submitted for platform administrator approval',
      organization,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/organizations/me
 * @desc    Get current user's affiliated organization
 * @access  Private
 */
const getMyOrganization = async (req, res, next) => {
  try {
    if (!req.user.organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Current user is not associated with any organization',
      });
    }

    const organization = await Organization.findById(req.user.organizationId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }

    return res.status(200).json({
      success: true,
      organization,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/organizations/me
 * @desc    Update current user's organization profile
 * @access  Private (hospital_admin, admin, platform_admin)
 */
const updateMyOrganization = async (req, res, next) => {
  try {
    if (!req.user.organizationId && req.user.role !== 'admin' && req.user.role !== 'platform_admin') {
      return res.status(404).json({
        success: false,
        message: 'User is not affiliated with any organization',
      });
    }

    const orgId = req.user.organizationId || req.body.organizationId;
    const organization = await Organization.findById(orgId);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }

    const {
      name,
      registrationIdentifier,
      address,
      contactInformation,
      coordinates,
    } = req.body;

    if (name) organization.name = name;
    if (registrationIdentifier !== undefined) organization.registrationIdentifier = registrationIdentifier;
    if (address) organization.address = { ...organization.address.toObject(), ...address };
    if (contactInformation) {
      organization.contactInformation = {
        ...organization.contactInformation.toObject(),
        ...contactInformation,
      };
    }
    if (Array.isArray(coordinates) && coordinates.length === 2) {
      organization.location = {
        type: 'Point',
        coordinates: [Number(coordinates[0]), Number(coordinates[1])],
      };
    }

    await organization.save();

    await logAction({
      actorId: req.user._id,
      action: 'UPDATE_ORGANIZATION',
      recordModel: 'Organization',
      recordId: organization._id,
      details: { name: organization.name },
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Organization updated successfully',
      organization,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/organizations/:id
 * @desc    Get organization by ID
 * @access  Private
 */
const getOrganizationById = async (req, res, next) => {
  try {
    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }

    return res.status(200).json({
      success: true,
      organization,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/admin/organizations
 * @desc    Get all organizations (platform admin)
 * @access  Private (admin, platform_admin)
 */
const getAllOrganizations = async (req, res, next) => {
  try {
    const { status, organizationType, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (organizationType) query.organizationType = organizationType;
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const organizations = await Organization.find(query)
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: organizations.length,
      organizations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/admin/organizations/:id/status
 * @desc    Approve or update status of organization (platform admin)
 * @access  Private (admin, platform_admin)
 */
const updateOrganizationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending_approval', 'active', 'suspended', 'deactivated'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }

    organization.status = status;
    if (status === 'active' && !organization.approvedAt) {
      organization.approvedBy = req.user._id;
      organization.approvedAt = new Date();
    }

    await organization.save();

    await logAction({
      actorId: req.user._id,
      action: 'UPDATE_ORGANIZATION_STATUS',
      recordModel: 'Organization',
      recordId: organization._id,
      details: { newStatus: status, orgName: organization.name },
      req,
    });

    return res.status(200).json({
      success: true,
      message: `Organization status updated to ${status}`,
      organization,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrganization,
  getMyOrganization,
  updateMyOrganization,
  getOrganizationById,
  getAllOrganizations,
  updateOrganizationStatus,
};


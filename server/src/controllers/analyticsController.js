const Organization = require('../models/Organization');
const DonorProfile = require('../models/DonorProfile');
const DonationEvent = require('../models/DonationEvent');
const BloodRequest = require('../models/BloodRequest');
const BloodInventory = require('../models/BloodInventory');

/**
 * @route   GET /api/analytics/network
 * @desc    Comprehensive platform-wide real-time analytics
 * @access  Private (Hospital Admin, Admin, Platform Admin)
 */
const getNetworkStats = async (req, res, next) => {
  try {
    const totalOrganizations = await Organization.countDocuments({ status: 'active' });
    const totalDonors = await DonorProfile.countDocuments({ availabilityStatus: true });
    const deferredDonors = await DonorProfile.countDocuments({
      currentDeferralStatus: 'temporarily_deferred',
    });
    const activeRequests = await BloodRequest.countDocuments({
      status: { $in: ['open', 'donors_contacted', 'awaiting_responses', 'coordination_in_progress'] },
    });

    // Time-based donation metrics
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const donationsToday = await DonationEvent.countDocuments({
      status: 'verified',
      donationDate: { $gte: startOfToday },
    });

    const donationsThisWeek = await DonationEvent.countDocuments({
      status: 'verified',
      donationDate: { $gte: sevenDaysAgo },
    });

    const donationsThisMonth = await DonationEvent.countDocuments({
      status: 'verified',
      donationDate: { $gte: thirtyDaysAgo },
    });

    // Blood group availability breakdown
    const ALL_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const donorsByBloodGroup = await DonorProfile.aggregate([
      {
        $match: {
          availabilityStatus: true,
          currentDeferralStatus: 'available',
        },
      },
      {
        $group: {
          _id: '$bloodGroup',
          count: { $sum: 1 },
        },
      },
    ]);

    const bloodGroupStats = {};
    ALL_GROUPS.forEach((bg) => {
      bloodGroupStats[bg] = 0;
    });
    donorsByBloodGroup.forEach((item) => {
      bloodGroupStats[item._id] = item.count;
    });

    // Network blood inventory units by blood group
    const inventoryUnits = await BloodInventory.aggregate([
      {
        $match: {
          status: 'available',
          expiryDate: { $gt: now },
        },
      },
      {
        $group: {
          _id: '$bloodGroup',
          totalUnits: { $sum: '$unitsAvailable' },
        },
      },
    ]);

    const inventoryStats = {};
    ALL_GROUPS.forEach((bg) => {
      inventoryStats[bg] = 0;
    });
    inventoryUnits.forEach((item) => {
      inventoryStats[item._id] = item.totalUnits;
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalOrganizations,
        totalDonors,
        deferredDonors,
        activeRequests,
        donationsToday,
        donationsThisWeek,
        donationsThisMonth,
        bloodGroupStats,
        inventoryStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/analytics/shortage-alerts
 * @desc    Critical network-wide blood group shortage warning
 * @access  Private (Staff, Admin)
 */
const getBloodGroupShortageAlerts = async (req, res, next) => {
  try {
    const threshold = Number(req.query.threshold) || 10;
    const ALL_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    const counts = await DonorProfile.aggregate([
      {
        $match: {
          availabilityStatus: true,
          currentDeferralStatus: 'available',
        },
      },
      {
        $group: {
          _id: '$bloodGroup',
          eligibleDonors: { $sum: 1 },
        },
      },
    ]);

    const countMap = {};
    ALL_GROUPS.forEach((bg) => {
      countMap[bg] = 0;
    });
    counts.forEach((c) => {
      countMap[c._id] = c.eligibleDonors;
    });

    const shortageAlerts = [];
    ALL_GROUPS.forEach((bg) => {
      const eligible = countMap[bg];
      if (eligible < threshold) {
        shortageAlerts.push({
          bloodGroup: bg,
          eligibleDonors: eligible,
          threshold,
          severity: eligible === 0 ? 'critical' : eligible < 5 ? 'high' : 'moderate',
        });
      }
    });

    return res.status(200).json({
      success: true,
      count: shortageAlerts.length,
      alerts: shortageAlerts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/analytics/org/:orgId
 * @desc    Get hospital-specific performance statistics
 * @access  Private (Hospital Admin, Platform Admin)
 */
const getOrganizationStats = async (req, res, next) => {
  try {
    const orgId = req.params.orgId;
    const organization = await Organization.findById(orgId);
    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const verifiedDonationsCount = await DonationEvent.countDocuments({
      organizationId: orgId,
      status: 'verified',
    });

    const totalRequestsHandled = await BloodRequest.countDocuments({
      organizationId: orgId,
    });

    const fulfilledRequests = await BloodRequest.countDocuments({
      organizationId: orgId,
      status: 'fulfilled',
    });

    const inventoryUnits = await BloodInventory.aggregate([
      {
        $match: {
          organizationId: organization._id,
          status: 'available',
          expiryDate: { $gt: new Date() },
        },
      },
      {
        $group: {
          _id: '$bloodGroup',
          totalUnits: { $sum: '$unitsAvailable' },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        organizationName: organization.name,
        verifiedDonationsCount,
        totalRequestsHandled,
        fulfilledRequests,
        fulfillmentRate:
          totalRequestsHandled > 0
            ? Math.round((fulfilledRequests / totalRequestsHandled) * 100)
            : 0,
        inventoryUnits,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNetworkStats,
  getBloodGroupShortageAlerts,
  getOrganizationStats,
};


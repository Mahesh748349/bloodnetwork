const DonationEvent = require('../models/DonationEvent');
const DonorProfile = require('../models/DonorProfile');
const User = require('../models/User');
const Organization = require('../models/Organization');
const { createDonationDeferral, evaluateDonorEligibility } = require('../services/deferralService');
const { assertOrganizationAccess } = require('../services/organizationService');
const { logAction } = require('../services/auditService');
const { evaluateAndAwardBadges } = require('../services/badgeService');

/**
 * @route   POST /api/donations
 * @desc    Record or schedule a donation event
 *          Can be scheduled or directly verified if authorized staff
 * @access  Private (requester, hospital_staff, hospital_admin, admin, platform_admin)
 */
const recordDonation = async (req, res, next) => {
  try {
    const {
      donorId,
      organizationId,
      donationDate = new Date(),
      donationType = 'whole_blood',
      status = 'scheduled', // 'scheduled' | 'completed' | 'verified'
      unitsCollected = 1,
      notes = '',
      bloodRequestId = null,
      customDeferralDays = null,
      customDeferralUntil = null,
    } = req.body;

    if (!donorId) {
      return res.status(400).json({
        success: false,
        message: 'donorId is required',
      });
    }

    const orgId = organizationId || req.user.organizationId;
    if (!orgId) {
      return res.status(400).json({
        success: false,
        message: 'organizationId is required or user must be affiliated with an organization',
      });
    }

    // Verify tenant access permissions: Hospital A cannot record for Hospital B
    assertOrganizationAccess(req.user, orgId, 'record donations');

    // 1. Verify donor existence and profile
    const donorUser = await User.findById(donorId);
    if (!donorUser) {
      return res.status(404).json({
        success: false,
        message: 'Donor user not found',
      });
    }

    const donorProfile = await DonorProfile.findOne({ user: donorId });
    if (!donorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Donor profile not found',
      });
    }

    // 2. CRITICAL PRE-CHECK: Check active deferral status across network!
    // A donor cannot be scheduled or accept while actively deferred.
    const eligibility = await evaluateDonorEligibility(donorId);
    if (!eligibility.eligible && status !== 'donor_deferred') {
      return res.status(400).json({
        success: false,
        message: `Donor is not currently eligible for donation. Deferral status: ${eligibility.status}. Return date: ${eligibility.deferralUntil ? new Date(eligibility.deferralUntil).toLocaleDateString() : 'Pending review'}.`,
        eligibility,
      });
    }

    // 3. Create donation event
    const isDirectVerification = status === 'verified';
    const donationEvent = await DonationEvent.create({
      donorId,
      donorProfileId: donorProfile._id,
      organizationId: orgId,
      bloodRequestId: bloodRequestId || undefined,
      donationDate: new Date(donationDate),
      donationType,
      status: isDirectVerification ? 'verified' : status,
      unitsCollected: Number(unitsCollected) || 1,
      notes,
      recordedBy: req.user._id,
      verifiedBy: isDirectVerification ? req.user._id : undefined,
      verifiedAt: isDirectVerification ? new Date() : undefined,
    });

    let deferralRecord = null;

    // 4. If status is verified, trigger deferral workflow!
    // ONLY verified donations trigger deferral!
    if (isDirectVerification) {
      deferralRecord = await createDonationDeferral({
        donationEvent,
        donorProfile,
        authorizedBy: req.user._id,
        customDays: customDeferralDays,
        customEndDate: customDeferralUntil,
        req,
      });

      // Award gamification badges for donor milestones
      try {
        await evaluateAndAwardBadges(donorId, req);
      } catch (badgeErr) {
        console.warn('[Badge Evaluation Notice]', badgeErr.message);
      }
    }

    await logAction({
      actorId: req.user._id,
      action: isDirectVerification ? 'VERIFY_DONATION_EVENT' : 'RECORD_DONATION_EVENT',
      recordModel: 'DonationEvent',
      recordId: donationEvent._id,
      details: {
        donorId,
        organizationId: orgId,
        donationType,
        status: donationEvent.status,
        deferralCreated: !!deferralRecord,
      },
      req,
    });

    return res.status(201).json({
      success: true,
      message: isDirectVerification
        ? 'Donation verified successfully and cross-network deferral applied'
        : 'Donation event recorded successfully',
      donationEvent,
      deferralRecord,
    });
  } catch (error) {
    // Handle duplicate donation event gracefully
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A verified donation for this donor on this date has already been recorded at this organization.',
      });
    }
    next(error);
  }
};

/**
 * @route   PATCH /api/donations/:id/verify
 * @desc    Authorized hospital staff verifies a completed donation
 *          This triggers post-donation deferral calculation and profile locking
 * @access  Private (requester, hospital_staff, hospital_admin, admin, platform_admin)
 */
const verifyDonation = async (req, res, next) => {
  try {
    const { customDeferralDays, customDeferralUntil, verificationNotes } = req.body;

    const donationEvent = await DonationEvent.findById(req.params.id);
    if (!donationEvent) {
      return res.status(404).json({
        success: false,
        message: 'Donation event not found',
      });
    }

    // Verify organization ownership: Hospital A staff cannot verify Hospital B's donation
    assertOrganizationAccess(req.user, donationEvent.organizationId, 'verify this donation event');

    if (donationEvent.status === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'This donation event has already been verified and deferral applied.',
      });
    }

    const donorProfile = await DonorProfile.findOne({ user: donationEvent.donorId });

    // Mark as verified
    donationEvent.status = 'verified';
    donationEvent.verifiedBy = req.user._id;
    donationEvent.verifiedAt = new Date();
    if (verificationNotes) {
      donationEvent.verificationNotes = verificationNotes;
    }
    await donationEvent.save();

    // Trigger deferral calculation and apply centralized cross-network deferral
    const deferral = await createDonationDeferral({
      donationEvent,
      donorProfile,
      authorizedBy: req.user._id,
      customDays: customDeferralDays,
      customEndDate: customDeferralUntil,
      req,
    });

    // Award gamification badges for donor milestones
    try {
      await evaluateAndAwardBadges(donationEvent.donorId, req);
    } catch (badgeErr) {
      console.warn('[Badge Evaluation Notice]', badgeErr.message);
    }

    await logAction({
      actorId: req.user._id,
      action: 'VERIFY_DONATION_EVENT',
      recordModel: 'DonationEvent',
      recordId: donationEvent._id,
      details: {
        donorId: donationEvent.donorId,
        organizationId: donationEvent.organizationId,
        deferralId: deferral._id,
        endDate: deferral.endDate,
      },
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Donation successfully verified. Centralized donor deferral has been enforced across all hospitals.',
      donationEvent,
      deferral,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/donations/:id
 * @desc    Get donation event details
 * @access  Private
 */
const getDonationById = async (req, res, next) => {
  try {
    const donationEvent = await DonationEvent.findById(req.params.id)
      .populate('donorId', 'name email phone')
      .populate('organizationId', 'name organizationType contactInformation address')
      .populate('recordedBy', 'name email')
      .populate('verifiedBy', 'name email');

    if (!donationEvent) {
      return res.status(404).json({
        success: false,
        message: 'Donation event not found',
      });
    }

    // Access check: donor can view their own; staff of that org can view; platform admin can view
    const isDonorOwner = req.user._id.toString() === donationEvent.donorId._id.toString();
    const isOrgStaff =
      req.user.organizationId &&
      req.user.organizationId.toString() === donationEvent.organizationId._id.toString();
    const isPlatformAdmin = req.user.role === 'admin' || req.user.role === 'platform_admin';

    if (!isDonorOwner && !isOrgStaff && !isPlatformAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view this donation event record',
      });
    }

    return res.status(200).json({
      success: true,
      donationEvent,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/donations
 * @desc    List donation events for the current organization
 * @access  Private (requester, hospital_staff, hospital_admin, admin, platform_admin)
 */
const getOrganizationDonations = async (req, res, next) => {
  try {
    const { status, donorId, organizationId } = req.query;
    const query = {};

    if (req.user.role === 'admin' || req.user.role === 'platform_admin') {
      if (organizationId) query.organizationId = organizationId;
    } else {
      if (!req.user.organizationId) {
        return res.status(403).json({
          success: false,
          message: 'User is not affiliated with any organization',
        });
      }
      query.organizationId = req.user.organizationId;
    }

    if (status) query.status = status;
    if (donorId) query.donorId = donorId;

    const donations = await DonationEvent.find(query)
      .populate('donorId', 'name email phone')
      .populate('organizationId', 'name')
      .populate('recordedBy', 'name email')
      .populate('verifiedBy', 'name email')
      .sort({ donationDate: -1 });

    return res.status(200).json({
      success: true,
      count: donations.length,
      donations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/donors/me/donations
 * @desc    Get authenticated donor's own verified and past donation events
 * @access  Private (donor)
 */
const getMyDonations = async (req, res, next) => {
  try {
    const donations = await DonationEvent.find({ donorId: req.user._id })
      .populate('organizationId', 'name organizationType address')
      .sort({ donationDate: -1 });

    return res.status(200).json({
      success: true,
      count: donations.length,
      donations,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  recordDonation,
  verifyDonation,
  getDonationById,
  getOrganizationDonations,
  getMyDonations,
};


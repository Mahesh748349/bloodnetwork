const DonorDeferral = require('../models/DonorDeferral');
const DonorProfile = require('../models/DonorProfile');
const DeferralRule = require('../models/DeferralRule');
const BloodRequest = require('../models/BloodRequest');
const User = require('../models/User');
const {
  evaluateDonorEligibility,
  completeMedicalReview,
  calculateDeferralEndDate,
  getApplicableRule,
} = require('../services/deferralService');
const { findMatchingDonors } = require('../services/matchingService');
const { logAction } = require('../services/auditService');

/**
 * @route   GET /api/donors/me/deferral
 * @desc    Donor views their own current deferral status and history
 * @access  Private (donor)
 */
const getMyDeferralStatus = async (req, res, next) => {
  try {
    const eligibility = await evaluateDonorEligibility(req.user._id);
    const profile = await DonorProfile.findOne({ user: req.user._id });

    // Fetch active and past deferral records for this donor
    const deferrals = await DonorDeferral.find({ donorId: req.user._id })
      .populate('organizationId', 'name')
      .sort({ createdAt: -1 });

    const activeDeferral = deferrals.find((d) => d.status === 'active');

    let explanation = 'You are currently eligible to donate blood.';
    if (eligibility.status === 'temporarily_deferred') {
      const formattedDate = activeDeferral?.endDate
        ? new Date(activeDeferral.endDate).toLocaleDateString()
        : 'the required interval';
      explanation = `Your donor status is temporarily deferred following a verified donation. You cannot be selected for another donation through this platform until the applicable deferral period has ended (${formattedDate}) and any required review is complete.`;
    } else if (eligibility.status === 'requires_medical_review') {
      explanation =
        'Your deferral interval has passed, but an authorized clinical review by medical staff is required before your eligibility can be reinstated.';
    } else if (eligibility.status === 'suspended') {
      explanation =
        'Your donor account is currently suspended for donation. Please consult with blood bank medical personnel for assistance.';
    } else if (!profile?.availabilityStatus) {
      explanation =
        'You have marked your availability as inactive. You can toggle your availability anytime in your dashboard.';
    }

    return res.status(200).json({
      success: true,
      eligibility,
      currentDeferralStatus: profile?.currentDeferralStatus || 'available',
      currentDeferralUntil: profile?.currentDeferralUntil || activeDeferral?.endDate || null,
      explanation,
      activeDeferral: activeDeferral
        ? {
            id: activeDeferral._id,
            startDate: activeDeferral.startDate,
            endDate: activeDeferral.endDate,
            reasonCode: activeDeferral.reasonCode,
            ruleVersion: activeDeferral.ruleVersion,
            status: activeDeferral.status,
          }
        : null,
      history: deferrals.map((d) => ({
        id: d._id,
        startDate: d.startDate,
        endDate: d.endDate,
        status: d.status,
        reasonCode: d.reasonCode,
        hospitalName: d.organizationId?.name || 'Network Hospital',
        createdAt: d.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/admin/donors/:id/deferral-status
 * @desc    Authorized hospital staff / admin views donor's deferral status
 *          Enforces privacy rules: routine queries get minimal outcome (not currently eligible)
 * @access  Private (requester, hospital_staff, hospital_admin, admin, platform_admin)
 */
const getDonorDeferralStatusForStaff = async (req, res, next) => {
  try {
    const donorId = req.params.id;
    const eligibility = await evaluateDonorEligibility(donorId);
    const profile = await DonorProfile.findOne({ user: donorId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Donor profile not found',
      });
    }

    // Role-based privacy protection:
    // Only platform admin or clinicians authorized to view clinical details get reasonCode
    const canViewClinicalDetails =
      req.user.role === 'admin' ||
      req.user.role === 'platform_admin' ||
      req.user.role === 'hospital_admin';

    const activeDeferral = await DonorDeferral.findOne({
      donorId,
      status: 'active',
    }).sort({ endDate: -1 });

    const payload = {
      donorId,
      bloodGroup: profile.bloodGroup,
      eligible: eligibility.eligible,
      status: eligibility.status,
      deferralUntil: eligibility.deferralUntil || profile.currentDeferralUntil,
    };

    if (canViewClinicalDetails && activeDeferral) {
      payload.reasonCode = activeDeferral.reasonCode;
      payload.reasonDescription = activeDeferral.reasonDescription;
      payload.ruleVersion = activeDeferral.ruleVersion;
      payload.deferralId = activeDeferral._id;
    } else {
      payload.summary = eligibility.eligible
        ? 'Currently eligible'
        : 'Not currently eligible due to active deferral or review requirement';
    }

    return res.status(200).json({
      success: true,
      deferralStatus: payload,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/admin/donors/:id/deferrals
 * @desc    Authorized clinician/admin creates a manual deferral or individualized period
 * @access  Private (hospital_admin, admin, platform_admin)
 */
const createManualDeferral = async (req, res, next) => {
  try {
    const donorId = req.params.id;
    const {
      startDate = new Date(),
      endDate,
      deferralDays,
      reasonCode = 'clinical_override',
      reasonDescription = '',
      organizationId,
    } = req.body;

    const donorUser = await User.findById(donorId);
    if (!donorUser) {
      return res.status(404).json({ success: false, message: 'Donor not found' });
    }

    const donorProfile = await DonorProfile.findOne({ user: donorId });
    if (!donorProfile) {
      return res.status(404).json({ success: false, message: 'Donor profile not found' });
    }

    let calculatedEndDate;
    if (endDate) {
      calculatedEndDate = new Date(endDate);
    } else if (deferralDays) {
      calculatedEndDate = calculateDeferralEndDate({
        donationDate: startDate,
        deferralDays: Number(deferralDays),
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either endDate or deferralDays must be specified for manual deferral',
      });
    }

    const orgId = organizationId || req.user.organizationId;

    const deferral = await DonorDeferral.create({
      donorId,
      donorProfileId: donorProfile._id,
      organizationId: orgId || undefined,
      status: 'active',
      startDate: new Date(startDate),
      endDate: calculatedEndDate,
      reasonCode,
      reasonDescription: reasonDescription || 'Individualized deferral specified by authorized clinician',
      ruleVersion: 'clinical_override',
      authorizedBy: req.user._id,
    });

    // Update profile
    donorProfile.currentDeferralStatus = 'temporarily_deferred';
    donorProfile.currentDeferralUntil = calculatedEndDate;
    donorProfile.availabilityStatus = false;
    await donorProfile.save();

    await logAction({
      actorId: req.user._id,
      action: 'CREATE_MANUAL_DEFERRAL',
      recordModel: 'DonorDeferral',
      recordId: deferral._id,
      details: {
        donorId,
        reasonCode,
        startDate,
        endDate: calculatedEndDate,
        reasonDescription,
      },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Individualized deferral record created and enforced',
      deferral,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/admin/deferrals/:id/review
 * @desc    Authorized medical review of a deferral record (approve eligible, extend, reject)
 * @access  Private (hospital_admin, admin, platform_admin)
 */
const reviewDeferral = async (req, res, next) => {
  try {
    const { decision, reviewNotes, extendedEndDate } = req.body;

    const validDecisions = ['approve_eligible', 'extend_deferral', 'reject_ineligible'];
    if (!validDecisions.includes(decision)) {
      return res.status(400).json({
        success: false,
        message: `Decision must be one of: ${validDecisions.join(', ')}`,
      });
    }

    const updatedDeferral = await completeMedicalReview({
      deferralId: req.params.id,
      decision,
      reviewedBy: req.user._id,
      extendedEndDate,
      reviewNotes,
      req,
    });

    return res.status(200).json({
      success: true,
      message: `Medical review recorded with decision '${decision}'`,
      deferral: updatedDeferral,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/deferral-rules
 * @desc    Get list of active versioned deferral rules
 * @access  Private
 */
const getDeferralRules = async (req, res, next) => {
  try {
    const rules = await DeferralRule.find({ isActive: true })
      .populate('approvedBy', 'name email')
      .sort({ donationType: 1 });

    return res.status(200).json({
      success: true,
      count: rules.length,
      rules,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/admin/deferral-rules
 * @desc    Add or update a deferral rule version (designated medical authority / platform admin)
 * @access  Private (admin, platform_admin)
 */
const createOrUpdateRule = async (req, res, next) => {
  try {
    const {
      donationType,
      deferralDays,
      description,
      jurisdiction = 'default',
      requiresMedicalReviewOnExpiry = false,
      version,
      notes = '',
    } = req.body;

    if (!donationType || deferralDays === undefined || !version) {
      return res.status(400).json({
        success: false,
        message: 'donationType, deferralDays, and version are required',
      });
    }

    const newRule = await DeferralRule.create({
      donationType,
      deferralDays: Number(deferralDays),
      description,
      jurisdiction,
      requiresMedicalReviewOnExpiry: Boolean(requiresMedicalReviewOnExpiry),
      version,
      isActive: true,
      approvedBy: req.user._id,
      approvedAt: new Date(),
      notes,
    });

    await logAction({
      actorId: req.user._id,
      action: 'CREATE_DEFERRAL_RULE',
      recordModel: 'DeferralRule',
      recordId: newRule._id,
      details: { donationType, deferralDays, version, jurisdiction },
      req,
    });

    return res.status(201).json({
      success: true,
      message: `Deferral rule version ${version} approved and activated`,
      rule: newRule,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/requests/:id/revalidate-matches
 * @desc    Revalidate matches for a request before contacting or scheduling
 * @access  Private (requester, hospital_staff, hospital_admin, admin, platform_admin)
 */
const revalidateMatches = async (req, res, next) => {
  try {
    const bloodRequest = await BloodRequest.findById(req.params.id);
    if (!bloodRequest) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found',
      });
    }

    const { radiusKm = 50, includeCompatible = 'false' } = req.query;

    const matches = await findMatchingDonors({
      bloodGroup: bloodRequest.bloodGroup,
      coordinates: bloodRequest.hospital.location.coordinates,
      radiusKm: Number(radiusKm),
      bloodRequestId: bloodRequest._id,
      includeCompatible: includeCompatible === 'true',
    });

    // Update request count
    bloodRequest.matchedDonorsCount = matches.length;
    await bloodRequest.save();

    return res.status(200).json({
      success: true,
      message: 'Matches revalidated against centralized deferral registry',
      count: matches.length,
      donors: matches,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyDeferralStatus,
  getDonorDeferralStatusForStaff,
  createManualDeferral,
  reviewDeferral,
  getDeferralRules,
  createOrUpdateRule,
  revalidateMatches,
};


const mongoose = require('mongoose');
const DeferralRule = require('../models/DeferralRule');
const DonorDeferral = require('../models/DonorDeferral');
const DonorProfile = require('../models/DonorProfile');
const DonationEvent = require('../models/DonationEvent');
const { logAction } = require('./auditService');

// Default standard deferral periods approved by medical governance
const DEFAULT_RULES = [
  {
    donationType: 'whole_blood',
    deferralDays: 56, // 8 weeks standard
    description: 'Standard 56-day post whole-blood red cell regeneration deferral',
    jurisdiction: 'default',
    requiresMedicalReviewOnExpiry: false,
    version: '1.0.0',
    isActive: true,
  },
  {
    donationType: 'platelets',
    deferralDays: 7, // 7 days standard for apheresis platelets
    description: 'Standard 7-day plateletpheresis recovery deferral',
    jurisdiction: 'default',
    requiresMedicalReviewOnExpiry: false,
    version: '1.0.0',
    isActive: true,
  },
  {
    donationType: 'plasma',
    deferralDays: 28, // 4 weeks for plasmapheresis
    description: 'Standard 28-day plasmapheresis protein recovery deferral',
    jurisdiction: 'default',
    requiresMedicalReviewOnExpiry: false,
    version: '1.0.0',
    isActive: true,
  },
  {
    donationType: 'double_red_cells',
    deferralDays: 112, // 16 weeks for 2 units RBC
    description: 'Standard 112-day 2RBC apheresis recovery deferral',
    jurisdiction: 'default',
    requiresMedicalReviewOnExpiry: false,
    version: '1.0.0',
    isActive: true,
  },
  {
    donationType: 'other',
    deferralDays: 30,
    description: 'General clinical deferral period',
    jurisdiction: 'default',
    requiresMedicalReviewOnExpiry: true,
    version: '1.0.0',
    isActive: true,
  },
];

/**
 * Ensure default deferral rules exist in DB
 */
const ensureDefaultRules = async () => {
  try {
    for (const rule of DEFAULT_RULES) {
      const exists = await DeferralRule.findOne({
        donationType: rule.donationType,
        jurisdiction: rule.jurisdiction,
        version: rule.version,
      });
      if (!exists) {
        await DeferralRule.create(rule);
      }
    }
  } catch (err) {
    console.warn('[DeferralService] Rule sync warning:', err.message);
  }
};

/**
 * Fetch applicable active deferral rule for donation type & jurisdiction
 */
const getApplicableRule = async ({ donationType = 'whole_blood', jurisdiction = 'default' }) => {
  await ensureDefaultRules();

  let rule = await DeferralRule.findOne({
    donationType,
    jurisdiction,
    isActive: true,
  }).sort({ effectiveFrom: -1, createdAt: -1 });

  if (!rule && jurisdiction !== 'default') {
    rule = await DeferralRule.findOne({
      donationType,
      jurisdiction: 'default',
      isActive: true,
    }).sort({ effectiveFrom: -1, createdAt: -1 });
  }

  if (!rule) {
    const fallback = DEFAULT_RULES.find((r) => r.donationType === donationType) || DEFAULT_RULES[0];
    return fallback;
  }

  return rule;
};

/**
 * Calculate deferral end date
 */
const calculateDeferralEndDate = ({ donationDate, deferralDays }) => {
  const date = new Date(donationDate || Date.now());
  const endDate = new Date(date.getTime() + deferralDays * 24 * 60 * 60 * 1000);
  return endDate;
};

/**
 * Create and apply deferral following a verified donation event
 * Idempotent: checks for existing active deferral for this donation event
 */
const createDonationDeferral = async ({
  donationEvent,
  donorProfile,
  authorizedBy,
  customDays = null,
  customEndDate = null,
  customReasonCode = null,
  req = null,
}) => {
  // Fail closed if donor or event is missing
  if (!donationEvent || !donationEvent.donorId) {
    throw new Error('Invalid donation event for deferral creation');
  }

  // Idempotency check: see if a deferral already exists for this event
  const existingDeferral = await DonorDeferral.findOne({
    donorId: donationEvent.donorId,
    sourceDonationEventId: donationEvent._id,
  });

  if (existingDeferral) {
    return existingDeferral;
  }

  // Find applicable rule
  const rule = await getApplicableRule({
    donationType: donationEvent.donationType,
  });

  let startDate = new Date(donationEvent.donationDate || Date.now());
  let endDate;

  if (customEndDate) {
    endDate = new Date(customEndDate);
  } else if (customDays !== null && !isNaN(customDays)) {
    endDate = calculateDeferralEndDate({ donationDate: startDate, deferralDays: Number(customDays) });
  } else {
    endDate = calculateDeferralEndDate({ donationDate: startDate, deferralDays: rule.deferralDays });
  }

  const reasonCode =
    customReasonCode ||
    (donationEvent.donationType === 'whole_blood'
      ? 'post_whole_blood'
      : donationEvent.donationType === 'platelets'
      ? 'post_platelets'
      : donationEvent.donationType === 'plasma'
      ? 'post_plasma'
      : donationEvent.donationType === 'double_red_cells'
      ? 'post_double_red_cells'
      : 'clinical_override');

  // Create deferral record
  const deferral = await DonorDeferral.create({
    donorId: donationEvent.donorId,
    donorProfileId: donorProfile?._id || donationEvent.donorProfileId,
    sourceDonationEventId: donationEvent._id,
    organizationId: donationEvent.organizationId,
    status: 'active',
    startDate,
    endDate,
    reasonCode,
    reasonDescription: rule.description || `Deferral following ${donationEvent.donationType} donation`,
    ruleVersion: rule.version || '1.0.0',
    authorizedBy,
  });

  // Update donor profile status to temporarily_deferred
  await DonorProfile.findOneAndUpdate(
    { user: donationEvent.donorId },
    {
      currentDeferralStatus: 'temporarily_deferred',
      currentDeferralUntil: endDate,
      availabilityStatus: false,
      lastAvailabilityUpdate: new Date(),
      lastDonationDate: startDate,
      $inc: { totalDonationsCompleted: 1 },
    }
  );

  // Update donation event with deferral metadata
  donationEvent.deferralRuleVersion = rule.version || '1.0.0';
  donationEvent.deferralUntil = endDate;
  await donationEvent.save();

  // Audit log
  await logAction({
    actorId: authorizedBy,
    action: 'CREATE_DONOR_DEFERRAL',
    recordModel: 'DonorDeferral',
    recordId: deferral._id,
    details: {
      donorId: donationEvent.donorId,
      eventId: donationEvent.eventId,
      organizationId: donationEvent.organizationId,
      donationType: donationEvent.donationType,
      startDate,
      endDate,
      ruleVersion: rule.version,
      reasonCode,
    },
    req,
  });

  return deferral;
};

/**
 * Re-evaluate donor eligibility based on current time & active deferrals
 * Handles expired deferrals dynamically without solely relying on background jobs.
 * Enforces rule requiring medical review before return to eligibility when configured.
 */
const evaluateDonorEligibility = async (donorUserId) => {
  try {
    const profile = await DonorProfile.findOne({ user: donorUserId });
    if (!profile) {
      return { eligible: false, status: 'inactive', reason: 'Donor profile not found' };
    }

    const now = new Date();

    // Check for active deferrals
    const activeDeferrals = await DonorDeferral.find({
      donorId: donorUserId,
      status: 'active',
    }).sort({ endDate: -1 });

    if (activeDeferrals.length > 0) {
      // Find the deferral with the furthest end date
      const latestDeferral = activeDeferrals[0];

      if (latestDeferral.endDate > now) {
        // Deferral is still active!
        if (profile.currentDeferralStatus !== 'temporarily_deferred') {
          profile.currentDeferralStatus = 'temporarily_deferred';
          profile.currentDeferralUntil = latestDeferral.endDate;
          await profile.save();
        }
        return {
          eligible: false,
          status: 'temporarily_deferred',
          deferralUntil: latestDeferral.endDate,
          reasonCode: latestDeferral.reasonCode,
          ruleVersion: latestDeferral.ruleVersion,
        };
      } else {
        // Date has expired! Now evaluate whether medical review is required
        // Check rule associated with this deferral
        const rule = await DeferralRule.findOne({
          version: latestDeferral.ruleVersion,
        });

        const requiresReview = rule ? rule.requiresMedicalReviewOnExpiry : false;

        if (requiresReview) {
          latestDeferral.status = 'requires_medical_review';
          await latestDeferral.save();

          profile.currentDeferralStatus = 'requires_medical_review';
          profile.currentDeferralUntil = null;
          await profile.save();

          return {
            eligible: false,
            status: 'requires_medical_review',
            reason: 'Deferral period passed but medical review is required prior to reinstatement',
          };
        } else {
          // Rule allows automatic restoration
          latestDeferral.status = 'expired';
          await latestDeferral.save();

          // Also expire any other past deferrals for this donor
          for (let i = 1; i < activeDeferrals.length; i++) {
            if (activeDeferrals[i].endDate <= now) {
              activeDeferrals[i].status = 'expired';
              await activeDeferrals[i].save();
            }
          }

          // Check if any other deferrals are still active
          const remainingActive = await DonorDeferral.findOne({
            donorId: donorUserId,
            status: 'active',
            endDate: { $gt: now },
          });

          if (remainingActive) {
            profile.currentDeferralStatus = 'temporarily_deferred';
            profile.currentDeferralUntil = remainingActive.endDate;
            await profile.save();
            return {
              eligible: false,
              status: 'temporarily_deferred',
              deferralUntil: remainingActive.endDate,
            };
          }

          // Restore to available
          profile.currentDeferralStatus = 'available';
          profile.currentDeferralUntil = null;
          profile.availabilityStatus = true;
          profile.lastEligibilityReviewAt = now;
          await profile.save();

          return {
            eligible: true,
            status: 'available',
          };
        }
      }
    }

    // Check if status is requires_medical_review or suspended
    if (['requires_medical_review', 'suspended', 'inactive'].includes(profile.currentDeferralStatus)) {
      return {
        eligible: false,
        status: profile.currentDeferralStatus,
        reason: `Status requires intervention: ${profile.currentDeferralStatus}`,
      };
    }

    // No active deferrals, status is available or unavailable
    return {
      eligible: profile.availabilityStatus && profile.currentDeferralStatus === 'available',
      status: profile.currentDeferralStatus,
    };
  } catch (error) {
    console.error('[DeferralService Evaluate Error]', error);
    // FAIL CLOSED on error: conservative safety principle
    return {
      eligible: false,
      status: 'error_fail_closed',
      reason: 'Central deferral verification unavailable. Fails closed for safety.',
    };
  }
};

/**
 * Authorize clinical override / medical review for a deferral
 */
const completeMedicalReview = async ({
  deferralId,
  decision, // 'approve_eligible', 'extend_deferral', 'reject_ineligible'
  reviewedBy,
  extendedEndDate = null,
  reviewNotes = '',
  req = null,
}) => {
  const deferral = await DonorDeferral.findById(deferralId);
  if (!deferral) {
    throw new Error('Deferral record not found');
  }

  const profile = await DonorProfile.findOne({ user: deferral.donorId });

  deferral.reviewedBy = reviewedBy;
  deferral.reviewedAt = new Date();
  deferral.reviewNotes = reviewNotes;

  if (decision === 'approve_eligible') {
    deferral.status = 'released_early';
    await deferral.save();

    if (profile) {
      profile.currentDeferralStatus = 'available';
      profile.currentDeferralUntil = null;
      profile.availabilityStatus = true;
      profile.lastEligibilityReviewAt = new Date();
      await profile.save();
    }
  } else if (decision === 'extend_deferral') {
    if (!extendedEndDate) {
      throw new Error('extendedEndDate is required when extending a deferral');
    }
    deferral.status = 'active';
    deferral.endDate = new Date(extendedEndDate);
    await deferral.save();

    if (profile) {
      profile.currentDeferralStatus = 'temporarily_deferred';
      profile.currentDeferralUntil = new Date(extendedEndDate);
      await profile.save();
    }
  } else if (decision === 'reject_ineligible') {
    deferral.status = 'overridden';
    await deferral.save();

    if (profile) {
      profile.currentDeferralStatus = 'suspended';
      profile.availabilityStatus = false;
      await profile.save();
    }
  }

  await logAction({
    actorId: reviewedBy,
    action: 'REVIEW_DONOR_DEFERRAL',
    recordModel: 'DonorDeferral',
    recordId: deferral._id,
    details: {
      decision,
      reviewNotes,
      donorId: deferral.donorId,
      newDeferralStatus: deferral.status,
    },
    req,
  });

  return deferral;
};

module.exports = {
  DEFAULT_RULES,
  ensureDefaultRules,
  getApplicableRule,
  calculateDeferralEndDate,
  createDonationDeferral,
  evaluateDonorEligibility,
  completeMedicalReview,
};

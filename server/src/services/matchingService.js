const DonorProfile = require('../models/DonorProfile');
const DonorResponse = require('../models/DonorResponse');
const DonorDeferral = require('../models/DonorDeferral');
const { evaluateDonorEligibility } = require('./deferralService');

// Blood compatibility table for reference
// Key: recipient group -> array of compatible donor blood groups
const COMPATIBILITY_MATRIX = {
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'A-': ['A-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // Universal recipient
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+': ['O+', 'O-'],
  'O-': ['O-'], // Universal donor
};

/**
 * Match available donors based on blood group, availability, deferral status, and geographic proximity
 * Excludes deferred or clinically non-eligible donors across all participating hospitals.
 */
const findMatchingDonors = async ({
  bloodGroup,
  coordinates,
  radiusKm = 50,
  bloodRequestId = null,
  includeCompatible = false,
  failClosedOnError = true,
}) => {
  if (!coordinates || coordinates.length !== 2) {
    throw new Error('Valid [longitude, latitude] coordinates are required for geospatial matching.');
  }

  const [lng, lat] = coordinates;
  const radiusInMeters = Math.max(1, Math.min(500, Number(radiusKm))) * 1000;
  const now = new Date();

  try {
    // 1. Identify donors with active deferrals across the entire network
    const activeDeferrals = await DonorDeferral.find({
      status: 'active',
      endDate: { $gt: now },
    }).distinct('donorId');

    // 2. Identify donors whose deferrals require medical review
    const reviewRequiredDeferrals = await DonorDeferral.find({
      status: 'requires_medical_review',
    }).distinct('donorId');

    const deferredDonorUserIds = [...activeDeferrals, ...reviewRequiredDeferrals];

    // Determine target blood groups
    let targetGroups = [bloodGroup];
    if (includeCompatible && COMPATIBILITY_MATRIX[bloodGroup]) {
      targetGroups = COMPATIBILITY_MATRIX[bloodGroup];
    }

    // Find donors who have already declined this request (to exclude)
    let excludedUserIds = [...deferredDonorUserIds];
    let existingResponsesMap = {};

    if (bloodRequestId) {
      const responses = await DonorResponse.find({ bloodRequest: bloodRequestId }).lean();
      responses.forEach((r) => {
        existingResponsesMap[r.donor.toString()] = r.responseStatus;
        if (r.responseStatus === 'declined' || r.responseStatus === 'unavailable') {
          excludedUserIds.push(r.donor);
        }
      });
    }

    // Exclude users based on match criteria
    const matchCriteria = {
      bloodGroup: { $in: targetGroups },
      availabilityStatus: true,
      currentDeferralStatus: {
        $nin: ['temporarily_deferred', 'requires_medical_review', 'suspended', 'inactive'],
      },
    };

    if (excludedUserIds.length > 0) {
      matchCriteria.user = { $nin: excludedUserIds };
    }

    const aggregatePipeline = [
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          distanceField: 'distanceMeters',
          maxDistance: radiusInMeters,
          spherical: true,
          query: matchCriteria,
        },
      },
      // Populate user info
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDoc',
        },
      },
      { $unwind: '$userDoc' },
      // Filter active users only
      {
        $match: {
          'userDoc.status': 'active',
        },
      },
      // Project privacy-preserving fields (minimal information necessary)
      {
        $project: {
          _id: 1,
          bloodGroup: 1,
          availabilityStatus: 1,
          currentDeferralStatus: 1,
          currentDeferralUntil: 1,
          lastAvailabilityUpdate: 1,
          verificationStatus: 1,
          totalDonationsCompleted: 1,
          lastDonationDate: 1,
          distanceKm: {
            $round: [{ $divide: ['$distanceMeters', 1000] }, 1],
          },
          city: '$address.city',
          state: '$address.state',
          user: {
            _id: '$userDoc._id',
            name: '$userDoc.name',
            role: '$userDoc.role',
          },
        },
      },
      {
        $sort: { distanceKm: 1 },
      },
    ];

    const matchedDonors = await DonorProfile.aggregate(aggregatePipeline);

    // Dynamic secondary re-verification: verify each matched donor against deferral service
    // Ensures real-time consistency even if a deferral was recorded seconds ago
    const verifiedMatches = [];
    for (const donor of matchedDonors) {
      const eligibility = await evaluateDonorEligibility(donor.user._id);
      if (eligibility.eligible) {
        const userIdStr = donor.user._id.toString();
        const currentResponse = existingResponsesMap[userIdStr] || 'not_contacted';

        verifiedMatches.push({
          ...donor,
          eligibilityStatus: 'eligible',
          responseStatus: currentResponse,
          isExactMatch: donor.bloodGroup === bloodGroup,
        });
      }
    }

    return verifiedMatches;
  } catch (error) {
    console.error('[MatchingService Error]', error.message);
    if (failClosedOnError) {
      // Fail closed: return empty matches rather than falsely presenting potentially deferred donors
      return [];
    }
    throw error;
  }
};

/**
 * Revalidate eligibility for a specific donor before invitation or scheduling
 */
const revalidateDonorEligibility = async (donorUserId) => {
  return await evaluateDonorEligibility(donorUserId);
};

module.exports = {
  findMatchingDonors,
  revalidateDonorEligibility,
  COMPATIBILITY_MATRIX,
};

const DonorProfile = require('../models/DonorProfile');
const DonorResponse = require('../models/DonorResponse');

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
 * Match available donors based on blood group, availability, and geographic proximity
 * @param {Object} options
 * @param {string} options.bloodGroup - Requested blood group
 * @param {Array<number>} options.coordinates - [longitude, latitude] of hospital or collection point
 * @param {number} options.radiusKm - Configurable search radius in kilometers (default 50)
 * @param {string} options.bloodRequestId - Optional request ID to filter already declined donors
 * @param {boolean} options.includeCompatible - Whether to include strictly compatible groups or exact match only
 */
const findMatchingDonors = async ({
  bloodGroup,
  coordinates,
  radiusKm = 50,
  bloodRequestId = null,
  includeCompatible = false,
}) => {
  if (!coordinates || coordinates.length !== 2) {
    throw new Error('Valid [longitude, latitude] coordinates are required for geospatial matching.');
  }

  const [lng, lat] = coordinates;
  const radiusInMeters = Math.max(1, Math.min(500, Number(radiusKm))) * 1000;

  // Determine target blood groups
  let targetGroups = [bloodGroup];
  if (includeCompatible && COMPATIBILITY_MATRIX[bloodGroup]) {
    targetGroups = COMPATIBILITY_MATRIX[bloodGroup];
  }

  // Find donors who have already declined this request (to deprioritize or exclude)
  let excludedUserIds = [];
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

  // MongoDB $geoNear aggregation with 2dsphere index
  const matchCriteria = {
    bloodGroup: { $in: targetGroups },
    availabilityStatus: true,
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
    // Project privacy-preserving fields
    {
      $project: {
        _id: 1,
        bloodGroup: 1,
        availabilityStatus: 1,
        lastAvailabilityUpdate: 1,
        verificationStatus: 1,
        totalDonationsCompleted: 1,
        lastDonationDate: 1,
        distanceKm: {
          $round: [{ $divide: ['$distanceMeters', 1000] }, 1],
        },
        // Approximate city/state for location context without revealing exact residence
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

  // Attach response status if already contacted
  const results = matchedDonors.map((donor) => {
    const userIdStr = donor.user._id.toString();
    const currentResponse = existingResponsesMap[userIdStr] || 'not_contacted';
    return {
      ...donor,
      responseStatus: currentResponse,
      isExactMatch: donor.bloodGroup === bloodGroup,
    };
  });

  return results;
};

module.exports = {
  findMatchingDonors,
  COMPATIBILITY_MATRIX,
};

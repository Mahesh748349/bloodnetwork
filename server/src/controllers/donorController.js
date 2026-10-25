const DonorProfile = require('../models/DonorProfile');
const BloodRequest = require('../models/BloodRequest');
const DonorResponse = require('../models/DonorResponse');
const { findMatchingDonors } = require('../services/matchingService');

/**
 * @route   GET /api/donors/me
 * @desc    Get logged in donor's profile
 * @access  Private (Donor)
 */
const getMyProfile = async (req, res, next) => {
  try {
    const profile = await DonorProfile.findOne({ user: req.user.id }).populate(
      'user',
      'name email phone role status'
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Donor profile not found',
      });
    }

    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/donors/me
 * @desc    Update donor profile details (blood group, address, location, preferences)
 * @access  Private (Donor)
 */
const updateMyProfile = async (req, res, next) => {
  try {
    const { bloodGroup, coordinates, address, contactPreferences, consentGiven } = req.body;

    let profile = await DonorProfile.findOne({ user: req.user.id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Donor profile not found',
      });
    }

    if (bloodGroup) {
      const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      if (!validBloodGroups.includes(bloodGroup)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid blood group specified',
        });
      }
      profile.bloodGroup = bloodGroup;
    }

    if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
      const lng = Number(coordinates[0]);
      const lat = Number(coordinates[1]);
      if (lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
        profile.location = {
          type: 'Point',
          coordinates: [lng, lat],
        };
      }
    }

    if (address) {
      profile.address = {
        ...profile.address.toObject(),
        ...address,
      };
    }

    if (contactPreferences) {
      profile.contactPreferences = {
        ...profile.contactPreferences.toObject(),
        ...contactPreferences,
      };
    }

    if (typeof consentGiven === 'boolean') {
      profile.consentGiven = consentGiven;
    }

    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/donors/availability
 * @desc    Quick toggle donor availability status
 * @access  Private (Donor)
 */
const updateAvailability = async (req, res, next) => {
  try {
    const { availabilityStatus } = req.body;

    if (typeof availabilityStatus !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'availabilityStatus must be a boolean (true or false)',
      });
    }

    const profile = await DonorProfile.findOneAndUpdate(
      { user: req.user.id },
      {
        availabilityStatus,
        lastAvailabilityUpdate: new Date(),
      },
      { returnDocument: 'after' }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Donor profile not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Availability updated to ${availabilityStatus ? 'AVAILABLE' : 'UNAVAILABLE'}`,
      availabilityStatus: profile.availabilityStatus,
      lastAvailabilityUpdate: profile.lastAvailabilityUpdate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/donors/requests
 * @desc    Get active blood requests relevant to this donor (matching blood group or nearby)
 * @access  Private (Donor)
 */
const getNearbyRequests = async (req, res, next) => {
  try {
    const profile = await DonorProfile.findOne({ user: req.user.id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Donor profile not found',
      });
    }

    // Active requests with status 'open', 'donors_contacted', 'awaiting_responses', 'coordination_in_progress'
    const activeStatuses = ['open', 'donors_contacted', 'awaiting_responses', 'coordination_in_progress'];

    // Find any requests where this donor has already responded
    const responses = await DonorResponse.find({ donor: req.user.id }).lean();
    const responsesMap = {};
    responses.forEach((r) => {
      responsesMap[r.bloodRequest.toString()] = r;
    });

    // Query active requests
    const query = {
      status: { $in: activeStatuses },
      requiredBy: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Not expired long ago
    };

    // Filter by matching blood group by default, but allow fetching all active if specified
    const { allBloodGroups } = req.query;
    if (!allBloodGroups || allBloodGroups === 'false') {
      query.bloodGroup = profile.bloodGroup;
    }

    const requests = await BloodRequest.find(query)
      .populate('requester', 'name email phone')
      .sort({ urgency: -1, createdAt: -1 })
      .lean();

    // Attach donor's response status to each request and calculate distance
    const donorCoords = profile.location.coordinates;
    const enrichedRequests = requests.map((reqItem) => {
      let distanceKm = null;
      if (reqItem.hospital?.location?.coordinates && donorCoords) {
        // Haversine formula approximation for fast distance
        const [lon1, lat1] = donorCoords;
        const [lon2, lat2] = reqItem.hospital.location.coordinates;
        const R = 6371; // Earth's radius in km
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceKm = Math.round(R * c * 10) / 10;
      }

      return {
        ...reqItem,
        myResponse: responsesMap[reqItem._id.toString()] || null,
        distanceKm,
        isExactMatch: reqItem.bloodGroup === profile.bloodGroup,
      };
    });

    return res.status(200).json({
      success: true,
      count: enrichedRequests.length,
      requests: enrichedRequests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/donors/history
 * @desc    Get donor's completed/fulfilled donations history
 * @access  Private (Donor)
 */
const getDonationHistory = async (req, res, next) => {
  try {
    const profile = await DonorProfile.findOne({ user: req.user.id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Donor profile not found',
      });
    }

    const responses = await DonorResponse.find({
      donor: req.user.id,
      responseStatus: 'accepted',
    })
      .populate({
        path: 'bloodRequest',
        select: 'bloodGroup unitsRequested hospital urgency status fulfilledAt createdAt',
      })
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      totalDonationsCompleted: profile.totalDonationsCompleted,
      lastDonationDate: profile.lastDonationDate,
      history: responses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/donors/nearby
 * @desc    Search for nearby potential donors using geospatial matching
 * @access  Private (Requester, Admin)
 */
const searchNearbyDonors = async (req, res, next) => {
  try {
    const {
      bloodGroup,
      lat,
      lng,
      radiusKm = 50,
      requestId,
      includeCompatible = 'false',
    } = req.query;

    if (!bloodGroup || !lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Blood group, latitude (lat), and longitude (lng) are required query parameters',
      });
    }

    const coordinates = [parseFloat(lng), parseFloat(lat)];

    const matchedDonors = await findMatchingDonors({
      bloodGroup,
      coordinates,
      radiusKm: parseFloat(radiusKm),
      bloodRequestId: requestId || null,
      includeCompatible: includeCompatible === 'true',
    });

    return res.status(200).json({
      success: true,
      count: matchedDonors.length,
      radiusKm: parseFloat(radiusKm),
      donors: matchedDonors,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  updateAvailability,
  getNearbyRequests,
  getDonationHistory,
  searchNearbyDonors,
};

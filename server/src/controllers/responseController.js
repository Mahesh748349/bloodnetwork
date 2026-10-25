const DonorResponse = require('../models/DonorResponse');
const BloodRequest = require('../models/BloodRequest');
const DonorProfile = require('../models/DonorProfile');
const User = require('../models/User');
const { sendNotification } = require('../services/notificationService');

/**
 * @route   POST /api/requests/:id/responses
 * @desc    Donor responds to a blood request (accept, decline, unavailable)
 * @access  Private (Donor)
 */
const respondToRequest = async (req, res, next) => {
  try {
    const { responseStatus, donorNotes = '' } = req.body;
    const bloodRequestId = req.params.id;

    const validStatuses = ['accepted', 'declined', 'unavailable'];
    if (!validStatuses.includes(responseStatus)) {
      return res.status(400).json({
        success: false,
        message: `responseStatus must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const bloodRequest = await BloodRequest.findById(bloodRequestId).populate('requester');
    if (!bloodRequest) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found',
      });
    }

    if (['fulfilled', 'cancelled'].includes(bloodRequest.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot respond to a request that is already ${bloodRequest.status}`,
      });
    }

    const donorProfile = await DonorProfile.findOne({ user: req.user.id });

    // Upsert or update existing response
    let donorResponse = await DonorResponse.findOne({
      bloodRequest: bloodRequestId,
      donor: req.user.id,
    });

    const previousStatus = donorResponse ? donorResponse.responseStatus : 'not_contacted';

    if (donorResponse) {
      donorResponse.responseStatus = responseStatus;
      donorResponse.donorNotes = donorNotes;
      donorResponse.respondedAt = new Date();
      await donorResponse.save();
    } else {
      donorResponse = await DonorResponse.create({
        bloodRequest: bloodRequestId,
        donor: req.user.id,
        donorProfile: donorProfile ? donorProfile._id : null,
        responseStatus,
        donorNotes,
        respondedAt: new Date(),
      });
    }

    // Update accepted donors counter on BloodRequest
    if (responseStatus === 'accepted' && previousStatus !== 'accepted') {
      bloodRequest.acceptedDonorsCount += 1;
      // If was 'donors_contacted', bump to 'awaiting_responses' or 'coordination_in_progress'
      if (bloodRequest.status === 'open' || bloodRequest.status === 'donors_contacted') {
        bloodRequest.status = 'awaiting_responses';
      }
      await bloodRequest.save();

      // Notify the requester about the donor's acceptance
      if (bloodRequest.requester) {
        await sendNotification({
          recipientId: bloodRequest.requester._id,
          recipientEmail: bloodRequest.requester.email,
          recipientName: bloodRequest.requester.name,
          bloodRequestId: bloodRequest._id,
          title: `Donor Accepted Request: ${bloodRequest.bloodGroup}`,
          message: `A registered donor (${req.user.name}, Blood Group: ${donorProfile?.bloodGroup || 'Matched'}) has accepted your request for ${bloodRequest.hospital.name}. Donor note: "${donorNotes || 'Available to donate'}"`,
          type: 'donor_accepted',
          channel: 'both',
        });
      }
    } else if (responseStatus !== 'accepted' && previousStatus === 'accepted') {
      bloodRequest.acceptedDonorsCount = Math.max(0, bloodRequest.acceptedDonorsCount - 1);
      await bloodRequest.save();
    }

    return res.status(200).json({
      success: true,
      message: `Your response '${responseStatus}' has been recorded`,
      response: donorResponse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/requests/:id/responses
 * @desc    Get all donor responses for a blood request
 * @access  Private (Requester, Admin)
 */
const getRequestResponses = async (req, res, next) => {
  try {
    const bloodRequest = await BloodRequest.findById(req.params.id);
    if (!bloodRequest) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found',
      });
    }

    const isOwner = bloodRequest.requester.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view responses for this request',
      });
    }

    const responses = await DonorResponse.find({ bloodRequest: req.params.id })
      .populate('donor', 'name email phone status')
      .populate('donorProfile', 'bloodGroup availabilityStatus verificationStatus address contactPreferences')
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: responses.length,
      responses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/responses/me
 * @desc    Get all responses submitted by the logged in donor
 * @access  Private (Donor)
 */
const getMyResponses = async (req, res, next) => {
  try {
    const responses = await DonorResponse.find({ donor: req.user.id })
      .populate({
        path: 'bloodRequest',
        populate: { path: 'requester', select: 'name email phone' },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: responses.length,
      responses,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  respondToRequest,
  getRequestResponses,
  getMyResponses,
};

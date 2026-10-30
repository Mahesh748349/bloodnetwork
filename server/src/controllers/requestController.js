const BloodRequest = require('../models/BloodRequest');
const DonorResponse = require('../models/DonorResponse');
const User = require('../models/User');
const DonorProfile = require('../models/DonorProfile');
const Organization = require('../models/Organization');
const EscalationLog = require('../models/EscalationLog');
const { findMatchingDonors } = require('../services/matchingService');
const { sendNotification } = require('../services/notificationService');
const { logAction } = require('../services/auditService');
const { evaluateDonorEligibility } = require('../services/deferralService');

/**
 * Valid state transitions for BloodRequest lifecycle
 */
const VALID_TRANSITIONS = {
  open: ['donors_contacted', 'awaiting_responses', 'coordination_in_progress', 'cancelled'],
  donors_contacted: ['awaiting_responses', 'coordination_in_progress', 'cancelled'],
  awaiting_responses: ['coordination_in_progress', 'cancelled'],
  coordination_in_progress: ['fulfilled', 'cancelled'],
  fulfilled: [], // Terminal state
  cancelled: [], // Terminal state
};

/**
 * @route   POST /api/requests
 * @desc    Create a new emergency blood request
 * @access  Private (Requester, Admin)
 */
const createRequest = async (req, res, next) => {
  try {
    const {
      patientName,
      bloodGroup,
      unitsRequested,
      hospitalName,
      hospitalAddress,
      hospitalPhone,
      coordinates, // [longitude, latitude]
      urgency = 'high',
      requiredBy,
      description,
      autoNotifyRadiusKm = 25,
    } = req.body;

    if (!bloodGroup || !unitsRequested || !requiredBy) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: bloodGroup, unitsRequested, requiredBy',
      });
    }

    // Determine target organization and strictly bind request to the user's hospital
    let finalOrgId = req.user.organizationId;
    if ((req.user.role === 'admin' || req.user.role === 'platform_admin') && req.body.organizationId) {
      finalOrgId = req.body.organizationId;
    }

    let finalHospitalName = hospitalName || 'Emergency Center';
    let finalHospitalAddress = hospitalAddress || 'Bangalore, Karnataka';
    let finalHospitalPhone = hospitalPhone || '';
    let finalCoords =
      Array.isArray(coordinates) && coordinates.length === 2
        ? [Number(coordinates[0]), Number(coordinates[1])]
        : [77.5946, 12.9716];

    if (finalOrgId) {
      const org = await Organization.findById(finalOrgId);
      if (org) {
        // Enforce authentic hospital identity from the organization record
        finalHospitalName = org.name;
        finalHospitalAddress =
          org.address?.formattedAddress ||
          `${org.name}, ${org.address?.city || 'Bangalore'}, ${org.address?.state || 'Karnataka'}`;
        finalHospitalPhone = org.contactInformation?.phone || finalHospitalPhone;
        if (org.location?.coordinates && org.location.coordinates.length === 2) {
          finalCoords = org.location.coordinates;
        }
      }
    }

    const bloodRequest = await BloodRequest.create({
      requester: req.user.id,
      organizationId: finalOrgId || null,
      patientName: patientName || 'Emergency Patient',
      bloodGroup,
      unitsRequested: Number(unitsRequested),
      hospital: {
        name: finalHospitalName,
        address: finalHospitalAddress,
        contactPhone: finalHospitalPhone,
        location: {
          type: 'Point',
          coordinates: finalCoords,
        },
      },
      urgency,
      requiredBy: new Date(requiredBy),
      description: description || '',
      status: 'open',
    });

    // Count matching available donors initially
    try {
      const initialMatches = await findMatchingDonors({
        bloodGroup,
        coordinates: finalCoords,
        radiusKm: Number(autoNotifyRadiusKm) || 30,
        bloodRequestId: bloodRequest._id,
      });
      bloodRequest.matchedDonorsCount = initialMatches.length;
      await bloodRequest.save();
    } catch (e) {
      console.warn('[Matching Init Notice]', e.message);
    }

    await logAction({
      actorId: req.user.id,
      action: 'CREATE_BLOOD_REQUEST',
      recordModel: 'BloodRequest',
      recordId: bloodRequest._id,
      details: { bloodGroup, units: unitsRequested, hospital: hospitalName, urgency },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Emergency blood request created successfully',
      bloodRequest,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/requests
 * @desc    Get blood requests with filters
 * @access  Private
 */
const getRequests = async (req, res, next) => {
  try {
    const { bloodGroup, urgency, status, myRequestsOnly, search, organizationId } = req.query;

    const query = {};

    if (myRequestsOnly === 'true') {
      query.requester = req.user.id;
    }

    if (organizationId) {
      query.organizationId = organizationId;
    }

    if (bloodGroup) {
      query.bloodGroup = bloodGroup;
    }

    if (urgency) {
      query.urgency = urgency;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { 'hospital.name': { $regex: search, $options: 'i' } },
        { 'hospital.address': { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const requests = await BloodRequest.find(query)
      .populate('requester', 'name email phone role')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/requests/:id
 * @desc    Get request by ID with response summaries
 * @access  Private
 */
const getRequestById = async (req, res, next) => {
  try {
    const bloodRequest = await BloodRequest.findById(req.params.id).populate(
      'requester',
      'name email phone role'
    );

    if (!bloodRequest) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found',
      });
    }

    // If requester or admin, fetch detailed responses
    let responses = [];
    if (req.user.role === 'admin' || bloodRequest.requester._id.toString() === req.user.id) {
      responses = await DonorResponse.find({ bloodRequest: bloodRequest._id })
        .populate('donor', 'name email phone')
        .populate('donorProfile', 'bloodGroup availabilityStatus verificationStatus address')
        .sort({ updatedAt: -1 });
    }

    return res.status(200).json({
      success: true,
      bloodRequest,
      responses,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/requests/:id/status
 * @desc    Explicit lifecycle state transition
 * @access  Private (Requester, Admin)
 */
const updateRequestStatus = async (req, res, next) => {
  try {
    const { status, closureNotes } = req.body;

    const bloodRequest = await BloodRequest.findById(req.params.id);
    if (!bloodRequest) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found',
      });
    }

    // Authorization check - tenant isolation
    const isOwner = bloodRequest.requester.toString() === req.user.id;
    const isOrgStaff =
      bloodRequest.organizationId &&
      req.user.organizationId &&
      bloodRequest.organizationId.toString() === req.user.organizationId.toString();
    const isPlatformAdmin = req.user.role === 'admin' || req.user.role === 'platform_admin';
    if (!isOwner && !isOrgStaff && !isPlatformAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update status of this request for another organization',
      });
    }

    const currentStatus = bloodRequest.status;
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid state transition from '${currentStatus}' to '${status}'. Allowed: [${allowedTransitions.join(', ')}]`,
      });
    }

    bloodRequest.status = status;
    if (closureNotes) {
      bloodRequest.closureNotes = closureNotes;
    }

    if (status === 'fulfilled') {
      bloodRequest.fulfilledAt = new Date();
    } else if (status === 'cancelled') {
      bloodRequest.cancelledAt = new Date();
    }

    await bloodRequest.save();

    await logAction({
      actorId: req.user.id,
      action: 'UPDATE_REQUEST_STATUS',
      recordModel: 'BloodRequest',
      recordId: bloodRequest._id,
      details: { previousStatus: currentStatus, newStatus: status, closureNotes },
      req,
    });

    return res.status(200).json({
      success: true,
      message: `Request status transitioned to ${status}`,
      bloodRequest,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/requests/:id/cancel
 * @desc    Cancel an open or in-progress request
 * @access  Private (Requester, Admin)
 */
const cancelRequest = async (req, res, next) => {
  try {
    const { reason = 'Cancelled by requester' } = req.body;

    const bloodRequest = await BloodRequest.findById(req.params.id);
    if (!bloodRequest) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found',
      });
    }

    const isOwner = bloodRequest.requester.toString() === req.user.id;
    const isOrgStaff =
      bloodRequest.organizationId &&
      req.user.organizationId &&
      bloodRequest.organizationId.toString() === req.user.organizationId.toString();
    const isPlatformAdmin = req.user.role === 'admin' || req.user.role === 'platform_admin';
    if (!isOwner && !isOrgStaff && !isPlatformAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this request for another organization',
      });
    }

    if (bloodRequest.status === 'fulfilled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel an already fulfilled request',
      });
    }

    bloodRequest.status = 'cancelled';
    bloodRequest.closureNotes = reason;
    bloodRequest.cancelledAt = new Date();
    await bloodRequest.save();

    await logAction({
      actorId: req.user.id,
      action: 'CANCEL_BLOOD_REQUEST',
      recordModel: 'BloodRequest',
      recordId: bloodRequest._id,
      details: { reason },
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Request cancelled successfully',
      bloodRequest,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/requests/:id/contact
 * @desc    Contact matched donors (sends notification & creates response records)
 * @access  Private (Requester, Admin)
 */
const contactMatchedDonors = async (req, res, next) => {
  try {
    const { donorUserIds = [], message = '' } = req.body;

    const bloodRequest = await BloodRequest.findById(req.params.id);
    if (!bloodRequest) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found',
      });
    }

    if (['fulfilled', 'cancelled'].includes(bloodRequest.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot contact donors for a ${bloodRequest.status} request`,
      });
    }

    if (!Array.isArray(donorUserIds) || donorUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of donorUserIds to contact',
      });
    }

    let newlyContactedCount = 0;

    for (const donorId of donorUserIds) {
      const donorUser = await User.findById(donorId);
      if (!donorUser) continue;

      // Revalidate donor eligibility across network before inviting
      const eligibility = await evaluateDonorEligibility(donorId);
      if (!eligibility.eligible) {
        continue;
      }

      const donorProfile = await DonorProfile.findOne({ user: donorId });

      // Upsert DonorResponse record to avoid duplicates
      const existingResp = await DonorResponse.findOne({
        bloodRequest: bloodRequest._id,
        donor: donorId,
      });

      if (!existingResp) {
        await DonorResponse.create({
          bloodRequest: bloodRequest._id,
          donor: donorId,
          donorProfile: donorProfile ? donorProfile._id : null,
          responseStatus: 'contacted',
        });
        newlyContactedCount++;
      }

      // Send in-app and email notification
      const notificationTitle = `Urgent Blood Donation Request: ${bloodRequest.bloodGroup}`;
      const notificationBody =
        message ||
        `Hospital ${bloodRequest.hospital.name} urgently requires ${bloodRequest.unitsRequested} units of ${bloodRequest.bloodGroup} blood by ${new Date(bloodRequest.requiredBy).toLocaleString()}. Can you help?`;

      await sendNotification({
        recipientId: donorUser._id,
        recipientEmail: donorUser.email,
        recipientName: donorUser.name,
        bloodRequestId: bloodRequest._id,
        title: notificationTitle,
        message: notificationBody,
        type: 'contact_invite',
        channel: 'both',
      });
    }

    // Transition request status to 'donors_contacted' if it was 'open'
    if (bloodRequest.status === 'open') {
      bloodRequest.status = 'donors_contacted';
    }
    bloodRequest.contactedDonorsCount += newlyContactedCount;
    await bloodRequest.save();

    return res.status(200).json({
      success: true,
      message: `Successfully sent emergency invitations to ${newlyContactedCount} donors`,
      contactedCount: bloodRequest.contactedDonorsCount,
      bloodRequest,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/requests/:id/matched-donors
 * @desc    Get matched donors for this specific request using its hospital location
 * @access  Private (Requester, Admin)
 */
const getMatchedDonorsForRequest = async (req, res, next) => {
  try {
    const { radiusKm = 50, includeCompatible = 'false' } = req.query;

    const bloodRequest = await BloodRequest.findById(req.params.id);
    if (!bloodRequest) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found',
      });
    }

    const coordinates = bloodRequest.hospital.location.coordinates;
    const matches = await findMatchingDonors({
      bloodGroup: bloodRequest.bloodGroup,
      coordinates,
      radiusKm: Number(radiusKm),
      bloodRequestId: bloodRequest._id,
      includeCompatible: includeCompatible === 'true',
    });

    return res.status(200).json({
      success: true,
      count: matches.length,
      radiusKm: Number(radiusKm),
      donors: matches,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/requests/:id/sos-broadcast
 * @desc    Trigger network-wide high-priority SOS emergency alert to all matching & compatible donors
 * @access  Private (Hospital Staff, Admin)
 */
const sosEmergencyBroadcast = async (req, res, next) => {
  try {
    const bloodRequest = await BloodRequest.findById(req.params.id);
    if (!bloodRequest) {
      return res.status(404).json({
        success: false,
        message: 'Blood request not found',
      });
    }

    if (['fulfilled', 'cancelled'].includes(bloodRequest.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot trigger SOS broadcast on a ${bloodRequest.status} request.`,
      });
    }

    const coordinates = bloodRequest.hospital.location.coordinates;
    const sosRadiusKm = 100; // Expanded SOS emergency radius

    // Discover all exact and compatible eligible donors within 100km
    const matchingDonors = await findMatchingDonors({
      bloodGroup: bloodRequest.bloodGroup,
      coordinates,
      radiusKm: sosRadiusKm,
      bloodRequestId: bloodRequest._id,
      includeCompatible: true,
    });

    let reachedCount = 0;
    const reachedDonors = [];

    for (const match of matchingDonors) {
      const donorUser = await User.findById(match.user._id);
      if (!donorUser) continue;

      // Ensure donor is eligible
      const eligibility = await evaluateDonorEligibility(match.user._id);
      if (!eligibility.eligible) continue;

      // Upsert donor response
      const existingResp = await DonorResponse.findOne({
        bloodRequest: bloodRequest._id,
        donor: donorUser._id,
      });

      if (!existingResp) {
        await DonorResponse.create({
          bloodRequest: bloodRequest._id,
          donor: donorUser._id,
          donorProfile: match._id,
          responseStatus: 'contacted',
        });
        reachedCount++;
      }

      reachedDonors.push({
        name: donorUser.name,
        bloodGroup: match.bloodGroup,
        distanceKm: match.distanceKm,
        city: match.city,
      });

      // Dispatch emergency alert
      await sendNotification({
        recipientId: donorUser._id,
        recipientEmail: donorUser.email,
        recipientName: donorUser.name,
        bloodRequestId: bloodRequest._id,
        title: `🚨 CRITICAL SOS BROADCAST: ${bloodRequest.bloodGroup} Blood Needed Urgently!`,
        message: `EMERGENCY ALERT: Hospital "${bloodRequest.hospital.name}" urgently requires ${bloodRequest.unitsRequested} units of ${bloodRequest.bloodGroup} blood for patient "${bloodRequest.patientName}". Your compatible blood can save a life right now!`,
        type: 'sos_broadcast',
        channel: 'both',
      });
    }

    bloodRequest.isSosBroadcast = true;
    bloodRequest.urgency = 'critical';
    if (bloodRequest.status === 'open') {
      bloodRequest.status = 'donors_contacted';
    }
    bloodRequest.contactedDonorsCount += reachedCount;
    await bloodRequest.save();

    await logAction({
      actorId: req.user.id,
      action: 'SOS_EMERGENCY_BROADCAST',
      recordModel: 'BloodRequest',
      recordId: bloodRequest._id,
      details: {
        radiusKm: sosRadiusKm,
        donorsReached: reachedDonors.length,
        bloodGroup: bloodRequest.bloodGroup,
      },
      req,
    });

    return res.status(200).json({
      success: true,
      message: `SOS Emergency Alert successfully broadcasted to ${reachedDonors.length} compatible donors across 100km radius!`,
      broadcastCount: reachedDonors.length,
      reachedDonors,
      bloodRequest,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/requests/:id/escalate
 * @desc    Auto or manual urgency escalation when responses are delayed
 * @access  Private (Hospital Staff, Admin)
 */
const escalateRequest = async (req, res, next) => {
  try {
    const bloodRequest = await BloodRequest.findById(req.params.id);
    if (!bloodRequest) {
      return res.status(404).json({ success: false, message: 'Blood request not found' });
    }

    if (['fulfilled', 'cancelled'].includes(bloodRequest.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot escalate a ${bloodRequest.status} request.`,
      });
    }

    const currentLevel = bloodRequest.escalationLevel || 0;
    const newLevel = currentLevel + 1;
    const expandedRadius = Math.min(150, 40 + newLevel * 25);
    const includeCompatible = newLevel >= 2;

    const coordinates = bloodRequest.hospital.location.coordinates;
    const matches = await findMatchingDonors({
      bloodGroup: bloodRequest.bloodGroup,
      coordinates,
      radiusKm: expandedRadius,
      bloodRequestId: bloodRequest._id,
      includeCompatible,
    });

    let newContacts = 0;
    for (const match of matches) {
      const existing = await DonorResponse.findOne({
        bloodRequest: bloodRequest._id,
        donor: match.user._id,
      });

      if (!existing) {
        await DonorResponse.create({
          bloodRequest: bloodRequest._id,
          donor: match.user._id,
          donorProfile: match._id,
          responseStatus: 'contacted',
        });
        newContacts++;

        const donorUser = await User.findById(match.user._id);
        if (donorUser) {
          await sendNotification({
            recipientId: donorUser._id,
            recipientEmail: donorUser.email,
            recipientName: donorUser.name,
            bloodRequestId: bloodRequest._id,
            title: `[ESCALATED LEVEL ${newLevel}] Urgent Blood Request: ${bloodRequest.bloodGroup}`,
            message: `Priority Escalation: ${bloodRequest.hospital.name} still urgently needs ${bloodRequest.unitsRequested} units of ${bloodRequest.bloodGroup}. Search radius expanded to ${expandedRadius}km.`,
            type: 'escalation_alert',
            channel: 'both',
          });
        }
      }
    }

    bloodRequest.escalationLevel = newLevel;
    bloodRequest.urgency = 'critical';
    bloodRequest.contactedDonorsCount += newContacts;
    await bloodRequest.save();

    const escalationLog = await EscalationLog.create({
      bloodRequestId: bloodRequest._id,
      escalationLevel: newLevel,
      triggerReason: req.body.reason || `Level ${newLevel} urgency escalation triggered`,
      radiusExpandedTo: expandedRadius,
      compatibleGroupsIncluded: includeCompatible,
      neighboringHospitalsNotified: true,
      donorsReached: newContacts,
      performedBy: req.user.id,
    });

    await logAction({
      actorId: req.user.id,
      action: 'ESCALATE_BLOOD_REQUEST',
      recordModel: 'BloodRequest',
      recordId: bloodRequest._id,
      details: { newLevel, expandedRadius, newContacts },
      req,
    });

    return res.status(200).json({
      success: true,
      message: `Request escalated to Level ${newLevel}. Radius expanded to ${expandedRadius}km with ${newContacts} additional donors alerted.`,
      escalationLevel: newLevel,
      radiusKm: expandedRadius,
      newContacts,
      bloodRequest,
      escalationLog,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRequest,
  getRequests,
  getRequestById,
  updateRequestStatus,
  cancelRequest,
  contactMatchedDonors,
  getMatchedDonorsForRequest,
  sosEmergencyBroadcast,
  escalateRequest,
};

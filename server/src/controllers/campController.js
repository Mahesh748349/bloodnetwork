const DonationCamp = require('../models/DonationCamp');
const Organization = require('../models/Organization');
const { logAction } = require('../services/auditService');

/**
 * @route   POST /api/camps
 * @desc    Schedule a community blood donation camp
 * @access  Private (Hospital Admin, Admin, Platform Admin)
 */
const createCamp = async (req, res, next) => {
  try {
    const {
      campName,
      description,
      address,
      city,
      state,
      coordinates,
      scheduledDate,
      endDate,
      targetUnits = 50,
      organizerContact,
      broadcastRadius = 30,
      organizationId,
    } = req.body;

    let orgId =
      req.user.role === 'admin' || req.user.role === 'platform_admin'
        ? organizationId || req.user.organizationId
        : req.user.organizationId;

    if (!orgId && (req.user.role === 'admin' || req.user.role === 'platform_admin')) {
      const firstOrg = await Organization.findOne({ status: 'active' });
      if (firstOrg) orgId = firstOrg._id;
    }

    if (!orgId) {
      return res.status(400).json({
        success: false,
        message: 'Organization affiliation is required to schedule a blood donation camp.',
      });
    }

    if (!campName || !address || !scheduledDate) {
      return res.status(400).json({
        success: false,
        message: 'Camp name, location address, and scheduled date are required.',
      });
    }

    const defaultCoords =
      Array.isArray(coordinates) && coordinates.length === 2
        ? [Number(coordinates[0]), Number(coordinates[1])]
        : [77.5946, 12.9716];

    const camp = await DonationCamp.create({
      organizationId: orgId,
      campName,
      description: description || '',
      location: {
        address,
        city: city || 'City',
        state: state || 'State',
        coordinates: {
          type: 'Point',
          coordinates: defaultCoords,
        },
      },
      scheduledDate: new Date(scheduledDate),
      endDate: endDate ? new Date(endDate) : new Date(new Date(scheduledDate).getTime() + 8 * 3600 * 1000),
      targetUnits: Number(targetUnits) || 50,
      organizerContact: organizerContact || '',
      broadcastRadius: Number(broadcastRadius) || 30,
      createdBy: req.user.id,
      status: 'upcoming',
    });

    await logAction({
      actorId: req.user.id,
      action: 'CREATE_DONATION_CAMP',
      recordModel: 'Organization',
      recordId: orgId,
      details: { campName, scheduledDate, targetUnits, campId: camp._id },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Blood donation camp scheduled successfully',
      camp,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/camps
 * @desc    Get upcoming blood donation camps
 * @access  Private
 */
const getCamps = async (req, res, next) => {
  try {
    const { status = 'upcoming', organizationId } = req.query;
    const filter = {};

    if (status !== 'all') {
      filter.status = status;
    }
    if (organizationId) {
      filter.organizationId = organizationId;
    }

    const camps = await DonationCamp.find(filter)
      .populate('organizationId', 'name address contactInformation')
      .populate('createdBy', 'name')
      .sort({ scheduledDate: 1 });

    const formatted = camps.map((camp) => {
      const isRegistered = camp.registeredDonors.some(
        (id) => id.toString() === req.user.id.toString()
      );
      return {
        ...camp.toObject(),
        registeredCount: camp.registeredDonors.length,
        isRegistered,
      };
    });

    return res.status(200).json({
      success: true,
      count: formatted.length,
      camps: formatted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/camps/:id
 * @desc    Get single camp details
 * @access  Private
 */
const getCampById = async (req, res, next) => {
  try {
    const camp = await DonationCamp.findById(req.params.id)
      .populate('organizationId', 'name address contactInformation')
      .populate('registeredDonors', 'name email phone');

    if (!camp) {
      return res.status(404).json({ success: false, message: 'Donation camp not found' });
    }

    const isRegistered = camp.registeredDonors.some(
      (d) => d._id.toString() === req.user.id.toString()
    );

    return res.status(200).json({
      success: true,
      camp: {
        ...camp.toObject(),
        registeredCount: camp.registeredDonors.length,
        isRegistered,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/camps/:id/register
 * @desc    Donor signs up for an upcoming camp
 * @access  Private (Donor)
 */
const registerForCamp = async (req, res, next) => {
  try {
    const camp = await DonationCamp.findById(req.params.id);
    if (!camp) {
      return res.status(404).json({ success: false, message: 'Donation camp not found' });
    }

    if (camp.status !== 'upcoming') {
      return res.status(400).json({
        success: false,
        message: 'Cannot register for a camp that is not currently upcoming.',
      });
    }

    if (camp.registeredDonors.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this blood donation camp.',
      });
    }

    camp.registeredDonors.push(req.user.id);
    await camp.save();

    return res.status(200).json({
      success: true,
      message: `Successfully registered for "${camp.campName}". Thank you for your commitment!`,
      registeredCount: camp.registeredDonors.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/camps/:id/register
 * @desc    Donor cancels registration
 * @access  Private (Donor)
 */
const unregisterFromCamp = async (req, res, next) => {
  try {
    const camp = await DonationCamp.findById(req.params.id);
    if (!camp) {
      return res.status(404).json({ success: false, message: 'Donation camp not found' });
    }

    camp.registeredDonors = camp.registeredDonors.filter(
      (id) => id.toString() !== req.user.id.toString()
    );
    await camp.save();

    return res.status(200).json({
      success: true,
      message: 'Registration cancelled',
      registeredCount: camp.registeredDonors.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/camps/:id/status
 * @desc    Update camp operational status
 * @access  Private (Hospital Admin, Platform Admin)
 */
const updateCampStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const camp = await DonationCamp.findById(req.params.id);
    if (!camp) {
      return res.status(404).json({ success: false, message: 'Donation camp not found' });
    }

    camp.status = status;
    await camp.save();

    return res.status(200).json({
      success: true,
      message: `Camp status updated to ${status}`,
      camp,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCamp,
  getCamps,
  getCampById,
  registerForCamp,
  unregisterFromCamp,
  updateCampStatus,
};


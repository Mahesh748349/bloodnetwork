const DonorBadge = require('../models/DonorBadge');
const DonorProfile = require('../models/DonorProfile');
const { evaluateAndAwardBadges } = require('../services/badgeService');

/**
 * @route   GET /api/badges/me
 * @desc    Get current donor's earned badges and milestones
 * @access  Private (Donor)
 */
const getMyBadges = async (req, res, next) => {
  try {
    // Auto-evaluate in case any were earned
    await evaluateAndAwardBadges(req.user.id);

    const badges = await DonorBadge.find({ donorId: req.user.id }).sort({ awardedAt: -1 });

    return res.status(200).json({
      success: true,
      count: badges.length,
      badges,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/badges/donor/:donorId
 * @desc    Get public badges for a specific donor
 * @access  Private
 */
const getDonorBadges = async (req, res, next) => {
  try {
    const badges = await DonorBadge.find({ donorId: req.params.donorId }).sort({ awardedAt: -1 });

    return res.status(200).json({
      success: true,
      count: badges.length,
      badges,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/badges/leaderboard
 * @desc    Get top donor contributors across the network
 * @access  Private
 */
const getLeaderboard = async (req, res, next) => {
  try {
    const topDonors = await DonorProfile.find({
      totalDonationsCompleted: { $gt: 0 },
      'consentSettings.crossHospitalSharing': true,
    })
      .populate('user', 'name')
      .sort({ totalDonationsCompleted: -1 })
      .limit(20)
      .select('bloodGroup totalDonationsCompleted lastDonationDate address.city');

    const formatted = topDonors.map((d, index) => ({
      rank: index + 1,
      name: d.user ? d.user.name : 'Anonymous Hero',
      bloodGroup: d.bloodGroup,
      city: d.address?.city || 'City Blood Center',
      donationsCount: d.totalDonationsCompleted,
      lastDonationDate: d.lastDonationDate,
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      leaderboard: formatted,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyBadges,
  getDonorBadges,
  getLeaderboard,
};


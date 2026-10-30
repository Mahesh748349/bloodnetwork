const DonorBadge = require('../models/DonorBadge');
const DonorProfile = require('../models/DonorProfile');
const DonationEvent = require('../models/DonationEvent');
const { logAction } = require('./auditService');

/**
 * Check criteria and award badges after a verified donation event
 */
const evaluateAndAwardBadges = async (donorUserId, req = null) => {
  try {
    const profile = await DonorProfile.findOne({ user: donorUserId });
    if (!profile) return [];

    const verifiedEvents = await DonationEvent.find({
      donorId: donorUserId,
      status: 'verified',
    });

    const totalDonations = verifiedEvents.length;
    const existingBadges = await DonorBadge.find({ donorId: donorUserId });
    const existingTypes = new Set(existingBadges.map((b) => b.badgeType));

    const newlyAwarded = [];

    // Milestone badges
    const milestones = [
      { type: 'first_donation', threshold: 1, desc: 'Completed first verified blood donation!' },
      { type: 'five_donations', threshold: 5, desc: 'Completed 5 life-saving blood donations!' },
      { type: 'ten_donations', threshold: 10, desc: 'Bronze Donor: 10 verified donations!' },
      { type: 'twenty_five_donations', threshold: 25, desc: 'Silver Donor: 25 verified donations!' },
      { type: 'veteran_donor', threshold: 50, desc: 'Gold Veteran: 50 verified donations!' },
    ];

    for (const m of milestones) {
      if (totalDonations >= m.threshold && !existingTypes.has(m.type)) {
        const badge = await DonorBadge.create({
          donorId: donorUserId,
          badgeType: m.type,
          donationCount: totalDonations,
          description: m.desc,
        });
        newlyAwarded.push(badge);
      }
    }

    // Rare blood group badge (O- or AB-)
    if (['O-', 'AB-'].includes(profile.bloodGroup) && !existingTypes.has('rare_blood_group')) {
      const badge = await DonorBadge.create({
        donorId: donorUserId,
        badgeType: 'rare_blood_group',
        donationCount: totalDonations,
        description: `Rare ${profile.bloodGroup} Blood Group Champion`,
      });
      newlyAwarded.push(badge);
    }

    // Cross-hospital donor badge (donated at 2+ different hospitals)
    const distinctOrgs = new Set(
      verifiedEvents
        .filter((e) => e.organizationId)
        .map((e) => e.organizationId.toString())
    );

    if (distinctOrgs.size >= 2 && !existingTypes.has('cross_hospital')) {
      const badge = await DonorBadge.create({
        donorId: donorUserId,
        badgeType: 'cross_hospital',
        donationCount: totalDonations,
        description: 'Multi-Hospital Hero: Donated across multiple health organizations',
      });
      newlyAwarded.push(badge);
    }

    // Regular donor: 3+ donations
    if (totalDonations >= 3 && !existingTypes.has('regular_donor')) {
      const badge = await DonorBadge.create({
        donorId: donorUserId,
        badgeType: 'regular_donor',
        donationCount: totalDonations,
        description: 'Active Consistent Lifesaver',
      });
      newlyAwarded.push(badge);
    }

    if (newlyAwarded.length > 0 && req) {
      await logAction({
        actorId: donorUserId,
        action: 'AWARD_BADGES',
        recordModel: 'User',
        recordId: donorUserId,
        details: { badgesAwarded: newlyAwarded.map((b) => b.badgeType) },
        req,
      });
    }

    return newlyAwarded;
  } catch (error) {
    console.error('[BadgeService Error]', error.message);
    return [];
  }
};

module.exports = {
  evaluateAndAwardBadges,
};


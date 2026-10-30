const mongoose = require('mongoose');

const donorBadgeSchema = new mongoose.Schema(
  {
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    badgeType: {
      type: String,
      enum: [
        'first_donation', // 1st verified donation
        'five_donations', // 5 verified donations
        'ten_donations', // 10 verified donations
        'twenty_five_donations', // 25 donations
        'rare_blood_group', // O- or AB- donor
        'cross_hospital', // donated at 2+ different hospitals
        'emergency_hero', // responded to critical request
        'regular_donor', // donated multiple times
        'veteran_donor', // 50+ donations
      ],
      required: true,
    },
    awardedAt: { type: Date, default: Date.now },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
    donationCount: { type: Number, default: 0 },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

// Prevent duplicate badges of same type per donor
donorBadgeSchema.index({ donorId: 1, badgeType: 1 }, { unique: true });

module.exports = mongoose.model('DonorBadge', donorBadgeSchema);


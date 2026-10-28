const mongoose = require('mongoose');
const crypto = require('crypto');

const donationEventSchema = new mongoose.Schema(
  {
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Donor ID is required'],
    },
    donorProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DonorProfile',
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
    },
    eventId: {
      type: String,
      required: true,
      default: () => `DON-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    },
    bloodRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
    },
    donationDate: {
      type: Date,
      required: [true, 'Donation date is required'],
    },
    donationType: {
      type: String,
      enum: ['whole_blood', 'platelets', 'plasma', 'double_red_cells', 'other'],
      default: 'whole_blood',
    },
    status: {
      type: String,
      enum: [
        'scheduled',
        'donor_arrived',
        'screening_passed',
        'in_progress',
        'completed',
        'verified',
        'cancelled',
        'donor_deferred',
      ],
      default: 'scheduled',
    },
    deferralRuleVersion: {
      type: String,
      default: '',
    },
    deferralUntil: {
      type: Date,
    },
    unitsCollected: {
      type: Number,
      default: 1,
      min: 0,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Staff member who recorded the event is required'],
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    verificationNotes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate processing of the same donation event
donationEventSchema.index({ eventId: 1 }, { unique: true });
// Fast lookup by donor
donationEventSchema.index({ donorId: 1, donationDate: -1 });
// Fast lookup by organization
donationEventSchema.index({ organizationId: 1, createdAt: -1 });
// Prevent duplicate verified donations for same donor on same date at same org
donationEventSchema.index(
  { donorId: 1, organizationId: 1, donationDate: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'verified' },
  }
);

module.exports = mongoose.model('DonationEvent', donationEventSchema);


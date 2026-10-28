const mongoose = require('mongoose');

const donorDeferralSchema = new mongoose.Schema(
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
    sourceDonationEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DonationEvent',
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'released_early', 'requires_medical_review', 'overridden'],
      default: 'active',
    },
    startDate: {
      type: Date,
      required: [true, 'Deferral start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'Deferral end date is required'],
    },
    reasonCode: {
      type: String,
      enum: [
        'post_whole_blood',
        'post_platelets',
        'post_plasma',
        'post_double_red_cells',
        'medical_condition',
        'clinical_override',
        'administrative',
        'other',
      ],
      default: 'post_whole_blood',
    },
    reasonDescription: {
      type: String,
      default: '',
      trim: true,
    },
    ruleVersion: {
      type: String,
      default: '',
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    authorizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Authorized by user is required'],
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    reviewNotes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate active deferrals from the same donation event
donorDeferralSchema.index(
  { donorId: 1, sourceDonationEventId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' },
  }
);
// Fast lookup for active deferrals by donor
donorDeferralSchema.index({ donorId: 1, status: 1, endDate: 1 });
// Administrative queries
donorDeferralSchema.index({ status: 1, endDate: 1 });
donorDeferralSchema.index({ organizationId: 1, createdAt: -1 });

module.exports = mongoose.model('DonorDeferral', donorDeferralSchema);


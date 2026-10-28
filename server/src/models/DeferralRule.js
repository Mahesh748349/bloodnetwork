const mongoose = require('mongoose');

const deferralRuleSchema = new mongoose.Schema(
  {
    donationType: {
      type: String,
      enum: ['whole_blood', 'platelets', 'plasma', 'double_red_cells', 'other'],
      required: [true, 'Donation type is required'],
    },
    deferralDays: {
      type: Number,
      required: [true, 'Deferral period in days is required'],
      min: [0, 'Deferral days cannot be negative'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    jurisdiction: {
      type: String,
      default: 'default',
      trim: true,
    },
    requiresMedicalReviewOnExpiry: {
      type: Boolean,
      default: false,
    },
    version: {
      type: String,
      required: [true, 'Rule version is required'],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    effectiveFrom: {
      type: Date,
      default: Date.now,
    },
    effectiveUntil: {
      type: Date,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique active rule per donation type + jurisdiction + version
deferralRuleSchema.index(
  { donationType: 1, jurisdiction: 1, version: 1 },
  { unique: true }
);
deferralRuleSchema.index({ isActive: 1, donationType: 1 });

module.exports = mongoose.model('DeferralRule', deferralRuleSchema);


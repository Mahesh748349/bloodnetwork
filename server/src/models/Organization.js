const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: [200, 'Organization name cannot exceed 200 characters'],
    },
    organizationType: {
      type: String,
      enum: {
        values: ['hospital', 'blood_bank', 'clinic', 'red_cross_chapter', 'other'],
        message: '{VALUE} is not a valid organization type',
      },
      required: [true, 'Organization type is required'],
    },
    registrationIdentifier: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      country: { type: String, default: 'India' },
      formattedAddress: { type: String, default: '' },
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [77.5946, 12.9716], // Default: Bangalore
        validate: {
          validator: function (val) {
            return (
              Array.isArray(val) &&
              val.length === 2 &&
              val[0] >= -180 &&
              val[0] <= 180 &&
              val[1] >= -90 &&
              val[1] <= 90
            );
          },
          message: 'Invalid GeoJSON coordinates [longitude, latitude]',
        },
      },
    },
    contactInformation: {
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      website: { type: String, default: '' },
      emergencyPhone: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['pending_approval', 'active', 'suspended', 'deactivated'],
      default: 'pending_approval',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    settings: {
      defaultDeferralRuleSet: { type: String, default: 'standard' },
      autoApproveStaff: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

organizationSchema.index({ location: '2dsphere' });
organizationSchema.index({ status: 1 });
organizationSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Organization', organizationSchema);


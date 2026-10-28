const mongoose = require('mongoose');

const donorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    bloodGroup: {
      type: String,
      required: [true, 'Blood group is required'],
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: function (val) {
            return (
              Array.isArray(val) &&
              val.length === 2 &&
              val[0] >= -180 &&
              val[0] <= 180 && // longitude
              val[1] >= -90 &&
              val[1] <= 90 // latitude
            );
          },
          message: 'Invalid GeoJSON coordinates [longitude, latitude]',
        },
      },
    },
    address: {
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      formattedAddress: { type: String, default: '' },
    },
    availabilityStatus: {
      type: Boolean,
      default: true,
    },
    currentDeferralStatus: {
      type: String,
      enum: [
        'available',
        'unavailable',
        'temporarily_deferred',
        'requires_medical_review',
        'suspended',
        'inactive',
      ],
      default: 'available',
    },
    currentDeferralUntil: {
      type: Date,
      default: null,
    },
    lastEligibilityReviewAt: {
      type: Date,
      default: null,
    },
    consentSettings: {
      crossHospitalSharing: { type: Boolean, default: true },
      emergencyAlerts: { type: Boolean, default: true },
    },
    lastAvailabilityUpdate: {
      type: Date,
      default: Date.now,
    },
    contactPreferences: {
      email: { type: Boolean, default: true },
      phone: { type: Boolean, default: true },
      preferredHours: { type: String, default: 'Anytime' },
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    medicalReviewNotes: {
      type: String,
      default: '',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    totalDonationsCompleted: {
      type: Number,
      default: 0,
    },
    lastDonationDate: {
      type: Date,
    },
    consentGiven: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for MongoDB geospatial proximity matching
donorProfileSchema.index({ location: '2dsphere' });
donorProfileSchema.index({ bloodGroup: 1, availabilityStatus: 1, currentDeferralStatus: 1 });
donorProfileSchema.index({ currentDeferralStatus: 1, currentDeferralUntil: 1 });

module.exports = mongoose.model('DonorProfile', donorProfileSchema);

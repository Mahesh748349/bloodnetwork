const mongoose = require('mongoose');

const donationCampSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    campName: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    location: {
      address: { type: String, required: true },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [77.5946, 12.9716] }, // [lng, lat]
      },
    },
    scheduledDate: { type: Date, required: true },
    endDate: { type: Date },
    targetUnits: { type: Number, default: 50 },
    registeredDonors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      default: 'upcoming',
    },
    organizerContact: { type: String, default: '' },
    broadcastRadius: { type: Number, default: 30 }, // km
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

donationCampSchema.index({ organizationId: 1, scheduledDate: 1 });
donationCampSchema.index({ 'location.coordinates': '2dsphere' });

module.exports = mongoose.model('DonationCamp', donationCampSchema);


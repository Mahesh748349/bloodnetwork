const mongoose = require('mongoose');

const donorResponseSchema = new mongoose.Schema(
  {
    bloodRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
      required: true,
    },
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    donorProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DonorProfile',
    },
    responseStatus: {
      type: String,
      enum: ['contacted', 'accepted', 'declined', 'unavailable'],
      default: 'contacted',
    },
    donorNotes: {
      type: String,
      default: '',
      trim: true,
    },
    respondedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique responses: a donor can only have one response record per blood request
donorResponseSchema.index({ bloodRequest: 1, donor: 1 }, { unique: true });
donorResponseSchema.index({ donor: 1, responseStatus: 1 });
donorResponseSchema.index({ bloodRequest: 1, responseStatus: 1 });

module.exports = mongoose.model('DonorResponse', donorResponseSchema);

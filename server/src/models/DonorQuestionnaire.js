const mongoose = require('mongoose');

const donorQuestionnaireSchema = new mongoose.Schema(
  {
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bloodRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodRequest', default: null },
    donationEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'DonationEvent', default: null },
    submittedAt: { type: Date, default: Date.now },
    recentIllness: {
      hasIllness: { type: Boolean, default: false },
      details: { type: String, default: '' },
    },
    recentMedications: {
      onMedications: { type: Boolean, default: false },
      details: { type: String, default: '' },
    },
    recentTravel: {
      hasTraveled: { type: Boolean, default: false },
      countries: { type: String, default: '' },
    },
    weightKg: { type: Number, default: null },
    bloodPressureSystolic: { type: Number, default: null },
    bloodPressureDiastolic: { type: Number, default: null },
    hemoglobinSelfReport: { type: Number, default: null },
    lastMealHoursAgo: { type: Number, default: null },
    alcoholLast24h: { type: Boolean, default: false },
    tattooPiercingLast6m: { type: Boolean, default: false },
    pregnantOrRecentBirth: { type: Boolean, default: false },
    consentToScreening: { type: Boolean, required: true },
    screeningResult: {
      type: String,
      enum: ['passed', 'flagged', 'deferred', 'pending'],
      default: 'pending',
    },
    flaggedReasons: [{ type: String }],
    reviewedByStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

donorQuestionnaireSchema.index({ donorId: 1, submittedAt: -1 });
donorQuestionnaireSchema.index({ bloodRequestId: 1 });

module.exports = mongoose.model('DonorQuestionnaire', donorQuestionnaireSchema);


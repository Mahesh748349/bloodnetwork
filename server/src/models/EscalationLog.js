const mongoose = require('mongoose');

const escalationLogSchema = new mongoose.Schema(
  {
    bloodRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
      required: true,
    },
    escalationLevel: { type: Number, default: 1 },
    triggeredAt: { type: Date, default: Date.now },
    triggerReason: { type: String, default: '' },
    radiusExpandedTo: { type: Number, default: 50 },
    compatibleGroupsIncluded: { type: Boolean, default: false },
    neighboringHospitalsNotified: { type: Boolean, default: false },
    donorsReached: { type: Number, default: 0 },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

escalationLogSchema.index({ bloodRequestId: 1, createdAt: -1 });

module.exports = mongoose.model('EscalationLog', escalationLogSchema);


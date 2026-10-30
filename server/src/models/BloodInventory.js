const mongoose = require('mongoose');

const bloodInventorySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    bloodGroup: {
      type: String,
      required: true,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    componentType: {
      type: String,
      required: true,
      enum: ['whole_blood', 'red_blood_cells', 'platelets', 'plasma', 'cryoprecipitate'],
      default: 'whole_blood',
    },
    unitsAvailable: { type: Number, default: 0, min: 0 },
    unitsReserved: { type: Number, default: 0, min: 0 },
    collectedDate: { type: Date },
    expiryDate: { type: Date },
    batchId: { type: String, trim: true, default: '' },
    storageLocation: { type: String, default: '' },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['available', 'reserved', 'expired', 'discarded'],
      default: 'available',
    },
  },
  { timestamps: true }
);

bloodInventorySchema.index({ organizationId: 1, bloodGroup: 1, componentType: 1 });
bloodInventorySchema.index({ expiryDate: 1, status: 1 });
bloodInventorySchema.index({ organizationId: 1, status: 1 });

module.exports = mongoose.model('BloodInventory', bloodInventorySchema);


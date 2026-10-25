const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    patientName: {
      type: String,
      trim: true,
      default: 'Emergency Patient',
    },
    bloodGroup: {
      type: String,
      required: [true, 'Blood group is required'],
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    unitsRequested: {
      type: Number,
      required: [true, 'Units requested is required'],
      min: [1, 'Must request at least 1 unit'],
      max: [50, 'Units cannot exceed 50 per request'],
    },
    hospital: {
      name: {
        type: String,
        required: [true, 'Hospital or collection center name is required'],
        trim: true,
      },
      address: {
        type: String,
        required: [true, 'Hospital address is required'],
        trim: true,
      },
      contactPhone: {
        type: String,
        trim: true,
        default: '',
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
                val[0] <= 180 &&
                val[1] >= -90 &&
                val[1] <= 90
              );
            },
            message: 'Invalid GeoJSON coordinates for hospital [longitude, latitude]',
          },
        },
      },
    },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'high',
    },
    requiredBy: {
      type: Date,
      required: [true, 'Required-by date and time is required'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: [
        'open',
        'donors_contacted',
        'awaiting_responses',
        'coordination_in_progress',
        'fulfilled',
        'cancelled',
      ],
      default: 'open',
    },
    matchedDonorsCount: {
      type: Number,
      default: 0,
    },
    contactedDonorsCount: {
      type: Number,
      default: 0,
    },
    acceptedDonorsCount: {
      type: Number,
      default: 0,
    },
    closureNotes: {
      type: String,
      default: '',
    },
    fulfilledAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

bloodRequestSchema.index({ 'hospital.location': '2dsphere' });
bloodRequestSchema.index({ status: 1, bloodGroup: 1, urgency: 1 });
bloodRequestSchema.index({ requester: 1, createdAt: -1 });

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);

const mongoose = require('mongoose');

const buildingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['Male', 'Female', 'Unisex'],
      default: 'Unisex',
    },
    floors: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
    },
    roomsPerFloor: {
      type: Number,
      required: true,
      min: 1,
      max: 200,
    },
    defaultRoomType: {
      type: String,
      enum: ['Single', 'Double', 'Triple', 'Dormitory'],
      default: 'Triple',
    },
    defaultCapacity: {
      type: Number,
      min: 1,
      max: 20,
      default: 3,
    },
    defaultMonthlyRent: {
      type: Number,
      min: 0,
      default: 3000,
    },
    amenities: {
      hasAC: { type: Boolean, default: false },
      hasWifi: { type: Boolean, default: true },
      hasAttachedBathroom: { type: Boolean, default: false },
      hasBalcony: { type: Boolean, default: false },
      hasTV: { type: Boolean, default: false },
    },
    defaultFeatures: [{ type: String, trim: true }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

buildingSchema.index({ name: 1 }, { unique: true });

const Building = mongoose.models.Building || mongoose.model('Building', buildingSchema);
module.exports = Building;

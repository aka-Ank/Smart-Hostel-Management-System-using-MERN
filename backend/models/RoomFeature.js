const mongoose = require('mongoose');

const roomFeatureSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const RoomFeature = mongoose.models.RoomFeature || mongoose.model('RoomFeature', roomFeatureSchema);
module.exports = RoomFeature;

const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    roomNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
    floor:      { type: Number, required: true, min: 1, max: 100 },
    block:      { type: String, required: true, trim: true, uppercase: true },
    building:   { type: mongoose.Schema.Types.ObjectId, ref: 'Building', default: null },
    buildingName: { type: String, required: true, trim: true, uppercase: true },
    roomNumberOnFloor: { type: Number, required: true, min: 1, max: 999 },
    type:       { type: String, required: true, enum: ['Single','Double','Triple','Dormitory'], default: 'Triple' },
    capacity:   { type: Number, required: true, min: 1, max: 20, default: 3 },
    occupants:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
    amenities: {
      hasAC:               { type: Boolean, default: false },
      hasWifi:             { type: Boolean, default: true  },
      hasAttachedBathroom: { type: Boolean, default: false },
      hasBalcony:          { type: Boolean, default: false },
      hasTV:               { type: Boolean, default: false },
    },
    features: [{ type: String, trim: true }],
    monthlyRent: { type: Number, required: true, min: 0 },
    status:      { type: String, enum: ['Available','Full','Maintenance','Reserved'], default: 'Available' },
    description: { type: String, trim: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

roomSchema.virtual('availableSlots').get(function () {
  return this.capacity - (this.occupants ? this.occupants.length : 0);
});

roomSchema.virtual('occupancyRate').get(function () {
  if (!this.occupants || this.capacity === 0) return 0;
  return Math.round((this.occupants.length / this.capacity) * 100);
});

roomSchema.pre('save', function (next) {
  if (this.status !== 'Maintenance' && this.status !== 'Reserved') {
    const occLen = this.occupants ? this.occupants.length : 0;
    this.status = occLen >= this.capacity ? 'Full' : 'Available';
  }
  next();
});

const Room = mongoose.models.Room || mongoose.model('Room', roomSchema);
module.exports = Room;

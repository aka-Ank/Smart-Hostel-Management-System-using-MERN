const mongoose = require('mongoose');

const roomChangeRequestSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    currentRoom: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
    requestedRoom: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
      default: 'Pending',
    },
    adminNotes: { type: String, trim: true, default: '' },
    previewRoomNumber: { type: String, trim: true, default: '' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

roomChangeRequestSchema.index({ student: 1, status: 1 });

const RoomChangeRequest = mongoose.models.RoomChangeRequest || mongoose.model('RoomChangeRequest', roomChangeRequestSchema);
module.exports = RoomChangeRequest;

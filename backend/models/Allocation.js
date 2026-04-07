const mongoose = require('mongoose');

const allocationSchema = new mongoose.Schema(
  {
    student:     { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    room:        { type: mongoose.Schema.Types.ObjectId, ref: 'Room',    required: true },
    action:      { type: String, enum: ['allocated', 'vacated'], required: true },
    allocatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin',   required: true },
    studentName: { type: String },
    studentId:   { type: String },
    roomNumber:  { type: String },
    block:       { type: String },
    floor:       { type: Number },
    allocatedAt: { type: Date, default: Date.now },
    vacatedAt:   { type: Date, default: null },
    remarks:     { type: String, default: '' },
  },
  { timestamps: true }
);

const Allocation = mongoose.models.Allocation || mongoose.model('Allocation', allocationSchema);
module.exports = Allocation;

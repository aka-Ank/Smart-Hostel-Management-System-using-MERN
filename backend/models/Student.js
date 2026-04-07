const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const proofSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const studentSchema = new mongoose.Schema(
  {
    studentId:    { type: String, required: true, unique: true, trim: true, uppercase: true },
    name:         { type: String, required: true, trim: true },
    email:        { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone:        { type: String, required: true, unique: true, trim: true },
    password:     { type: String, minlength: 6, select: false },
    dateOfBirth:  { type: Date, required: true },
    gender:       { type: String, required: true, enum: ['Male', 'Female', 'Other'] },
    course:       { type: String, required: true, trim: true },
    year:         { type: Number, required: true, min: 1, max: 6 },
    address: {
      street:  String,
      city:    String,
      state:   String,
      pincode: String,
    },
    guardianName:  { type: String, trim: true },
    guardianPhone: { type: String, trim: true },
    room:          { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
    roomLocked:    { type: Boolean, default: false },
    admissionDate: { type: Date, default: Date.now },
    status:        { type: String, enum: ['Active', 'Inactive', 'Graduated', 'Suspended'], default: 'Active' },
    feesPaid:      { type: Boolean, default: false },
    feeApprovalStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    feeRemarks: { type: String, trim: true, default: '' },
    feeProofs: [proofSchema],
    detailsApprovalStatus: { type: String, enum: ['Pending', 'Approved'], default: 'Pending' },
    profileImage:  { type: String, default: '' },
    editCount:     { type: Number, default: 0 },
    maxEdits:      { type: Number, default: 2 },
    roomChangeRequestCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

studentSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

studentSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);
module.exports = Student;

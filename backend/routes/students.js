const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const Student    = require('../models/Student');
const Building   = require('../models/Building');
const Room       = require('../models/Room');
const Allocation = require('../models/Allocation');
const { protect } = require('../middleware/auth');
const { isBuildingAllowedForStudent } = require('../utils/eligibility');

router.get('/', protect, async (req, res) => {
  try {
    const page   = Number(req.query.page)  || 1;
    const limit  = Number(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const gender = req.query.gender || '';
    const year   = req.query.year   || '';
    const sort   = req.query.sort   || '-createdAt';
    const query  = {};
    if (search && search.trim() !== '') {
      query.$or = [
        { name:      { $regex: search.trim(), $options: 'i' } },
        { studentId: { $regex: search.trim(), $options: 'i' } },
        { email:     { $regex: search.trim(), $options: 'i' } },
        { course:    { $regex: search.trim(), $options: 'i' } },
        { phone:     { $regex: search.trim(), $options: 'i' } },
      ];
    }
    if (status) query.status = status;
    if (gender) query.gender = gender;
    if (year)   query.year   = Number(year);
    const total    = await Student.countDocuments(query);
    const students = await Student.find(query)
      .populate('room', 'roomNumber block floor type')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);
    res.json({ success: true, count: students.length, total, totalPages: Math.ceil(total / limit), currentPage: page, data: students });
  } catch (error) {
    console.error('GET /students error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate({
        path: 'room',
        select: 'roomNumber block buildingName floor type amenities features monthlyRent building',
        populate: { path: 'building', select: 'name displayName type' },
      });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/:id/approve-details', protect, async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, { detailsApprovalStatus: 'Approved' }, { new: true });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data: student, message: 'Student details approved' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.patch('/:id/fees/review', protect, async (req, res) => {
  try {
    const { action, remarks = '' } = req.body;
    if (!['Approved', 'Rejected'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    student.feeApprovalStatus = action;
    student.feesPaid = action === 'Approved';
    student.feeRemarks = remarks;
    await student.save();

    res.json({ success: true, data: student, message: `Fee ${action.toLowerCase()}` });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/:id/fees/proofs/:proofId', protect, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select('feeProofs');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    const proof = student.feeProofs?.id(req.params.proofId);
    if (!proof) return res.status(404).json({ success: false, message: 'Proof not found' });
    if (!fs.existsSync(proof.path)) return res.status(404).json({ success: false, message: 'Stored file is missing' });

    res.setHeader('Content-Type', proof.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(proof.originalName)}"`);
    return res.sendFile(path.resolve(proof.path));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const student = await Student.create(req.body);
    res.status(201).json({ success: true, data: student });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ success: false, message: `${field} already exists` });
    }
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('room', 'roomNumber block floor type');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (student.room) {
      await Room.findByIdAndUpdate(student.room, { $pull: { occupants: student._id } });
    }
    await student.deleteOne();
    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/allocate-room', protect, async (req, res) => {
  try {
    const { roomId } = req.body;
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    const building = await Building.findOne({ name: room.buildingName || room.block }).select('type');
    if (!isBuildingAllowedForStudent(student.gender, building?.type || 'Unisex')) {
      return res.status(400).json({ success: false, message: 'This building is not allowed for the selected student.' });
    }
    if (room.occupants.length >= room.capacity) return res.status(400).json({ success: false, message: 'Room is full' });
    if (room.status === 'Maintenance' || room.status === 'Reserved') return res.status(400).json({ success: false, message: `Room is ${room.status}` });
    if (student.room) {
      const oldRoom = await Room.findById(student.room);
      await Room.findByIdAndUpdate(student.room, { $pull: { occupants: student._id } });
      if (oldRoom) { oldRoom.occupants = oldRoom.occupants.filter(o => o.toString() !== student._id.toString()); await oldRoom.save(); }
      await Allocation.create({ student: student._id, room: student.room, action: 'vacated', allocatedBy: req.admin._id, studentName: student.name, studentId: student.studentId, roomNumber: oldRoom ? oldRoom.roomNumber : '', block: oldRoom ? oldRoom.block : '', floor: oldRoom ? oldRoom.floor : 0, vacatedAt: new Date() });
    }
    room.occupants.push(student._id);
    await room.save();
    student.room = room._id;
    await student.save();
    await Allocation.create({ student: student._id, room: room._id, action: 'allocated', allocatedBy: req.admin._id, studentName: student.name, studentId: student.studentId, roomNumber: room.roomNumber, block: room.block, floor: room.floor, allocatedAt: new Date() });
    res.json({ success: true, message: 'Room allocated successfully', data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/vacate-room', protect, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (!student.room) return res.status(400).json({ success: false, message: 'Student has no room' });
    const room = await Room.findById(student.room);
    if (room) { room.occupants = room.occupants.filter(o => o.toString() !== student._id.toString()); await room.save(); }
    await Allocation.create({ student: student._id, room: student.room, action: 'vacated', allocatedBy: req.admin._id, studentName: student.name, studentId: student.studentId, roomNumber: room ? room.roomNumber : '', block: room ? room.block : '', floor: room ? room.floor : 0, vacatedAt: new Date() });
    student.room = null;
    await student.save();
    res.json({ success: true, message: 'Room vacated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id/allocations', protect, async (req, res) => {
  try {
    const history = await Allocation.find({ student: req.params.id })
      .populate('room', 'roomNumber block floor type')
      .populate('allocatedBy', 'name email')
      .sort('-createdAt');
    res.json({ success: true, count: history.length, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

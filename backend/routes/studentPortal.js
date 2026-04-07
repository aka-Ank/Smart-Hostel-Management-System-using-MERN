const express = require('express');
const fs = require('fs');
const path = require('path');
const router  = express.Router();
const Student    = require('../models/Student');
const Room       = require('../models/Room');
const Allocation = require('../models/Allocation');
const RoomChangeRequest = require('../models/RoomChangeRequest');
const Building = require('../models/Building');
const { protect, studentOnly } = require('../middleware/auth');
const { isBuildingAllowedForStudent } = require('../utils/eligibility');
const { uploadFeeProofs } = require('../utils/upload');

// ── GET my profile ──
router.get('/profile', protect, studentOnly, async (req, res) => {
  try {
    const student = await Student.findById(req.userId)
      .populate({
        path: 'room',
        select: 'roomNumber block buildingName floor type monthlyRent amenities features building',
        populate: { path: 'building', select: 'name displayName type' },
      });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── UPDATE my profile (before admin approval only) ──
router.put('/profile', protect, studentOnly, async (req, res) => {
  try {
    const student = await Student.findById(req.userId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    if (student.detailsApprovalStatus === 'Approved') {
      return res.status(400).json({
        success: false,
        message: 'Your details are already approved by admin and can no longer be edited.',
      });
    }

    const allowedFields = ['name', 'phone', 'guardianName', 'guardianPhone', 'address'];
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    updates.editCount = student.editCount + 1;
    updates.detailsApprovalStatus = 'Pending';

    const updated = await Student.findByIdAndUpdate(req.userId, updates, { new: true, runValidators: true })
      .populate({
        path: 'room',
        select: 'roomNumber block buildingName floor type monthlyRent amenities features building',
        populate: { path: 'building', select: 'name displayName type' },
      });

    res.json({
      success: true,
      message: 'Profile updated and marked for admin review.',
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET available rooms (sorted properly, all rooms) ──
router.get('/available-rooms', protect, studentOnly, async (req, res) => {
  try {
    const { block, building, floor, search } = req.query;
    const query = { status: 'Available' };
    if (block || building) query.buildingName = String(block || building).toUpperCase();
    if (floor !== undefined && floor !== '') query.floor = Number(floor);
    if (search) query.roomNumber = { $regex: search, $options: 'i' };
    const student = await Student.findById(req.userId).select('gender');

    const rooms = await Room.find(query)
      .select('roomNumber block buildingName floor type capacity occupants monthlyRent amenities features status building')
      .populate('building', 'name displayName type')
      .sort({ buildingName: 1, floor: 1, roomNumberOnFloor: 1 })
      .limit(1000);

    const filteredRooms = rooms.filter((room) => isBuildingAllowedForStudent(student.gender, room.building?.type || 'Unisex'));

    res.json({ success: true, count: filteredRooms.length, data: filteredRooms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/room-change-requests', protect, studentOnly, async (req, res) => {
  try {
    const requests = await RoomChangeRequest.find({ student: req.userId })
      .populate('currentRoom', 'roomNumber buildingName floor')
      .populate('requestedRoom', 'roomNumber buildingName floor')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── SELECT my room (only once — locked after) ──
router.post('/select-room', protect, studentOnly, async (req, res) => {
  try {
    const { roomId } = req.body;

    const student = await Student.findById(req.userId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    if (student.roomLocked) {
      return res.status(400).json({
        success: false,
        message: 'You have already selected a room. Room selection is permanent. Contact admin if you need to change.',
      });
    }

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    const building = await Building.findOne({ name: room.buildingName || room.block }).select('name displayName type');
    if (!isBuildingAllowedForStudent(student.gender, building?.type || 'Unisex')) {
      return res.status(400).json({ success: false, message: 'This building is not available for your gender category.' });
    }

    if (room.status === 'Full') {
      return res.status(400).json({ success: false, message: 'This room is full. Please choose another room.' });
    }

    if (room.status === 'Maintenance' || room.status === 'Reserved') {
      return res.status(400).json({ success: false, message: `Room is ${room.status} and not available.` });
    }

    if (room.occupants.length >= room.capacity) {
      return res.status(400).json({ success: false, message: 'This room is full. Please choose another room.' });
    }

    // Check student not already in occupants
    const alreadyIn = room.occupants.some(o => o.toString() === student._id.toString());
    if (!alreadyIn) {
      room.occupants.push(student._id);
    }

    // Update room status
    if (room.occupants.length >= room.capacity) {
      room.status = 'Full';
    } else {
      room.status = 'Available';
    }

    await room.save();

    // Update student
    student.room       = room._id;
    student.roomLocked = true;
    await student.save();

    // Save allocation history
    await Allocation.create({
      student:     student._id,
      room:        room._id,
      action:      'allocated',
      allocatedBy: student._id,
      studentName: student.name,
      studentId:   student.studentId,
      roomNumber:  room.roomNumber,
      block:       room.block,
      floor:       room.floor,
      allocatedAt: new Date(),
    });

    console.log(`✅ Student ${student.name} selected room ${room.roomNumber}. Occupants: ${room.occupants.length}/${room.capacity}. Status: ${room.status}`);

    const updated = await Student.findById(req.userId)
      .populate({
        path: 'room',
        select: 'roomNumber block buildingName floor type monthlyRent amenities features building',
        populate: { path: 'building', select: 'name displayName type' },
      });

    res.json({
      success: true,
      message: `Room ${room.roomNumber} selected successfully! Your room is now locked and cannot be changed.`,
      data: updated,
    });
  } catch (error) {
    console.error('select-room error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/fees/proofs', protect, studentOnly, uploadFeeProofs.array('proofs', 4), async (req, res) => {
  try {
    const student = await Student.findById(req.userId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const proofs = (req.files || []).map((file) => ({
      originalName: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
    }));

    student.feeProofs = proofs;
    student.feeApprovalStatus = 'Pending';
    student.feesPaid = false;
    await student.save();

    res.status(201).json({ success: true, message: 'Fee proof uploaded and sent for admin approval.', data: student.feeProofs });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/fees/proofs/:proofId', protect, studentOnly, async (req, res) => {
  try {
    const student = await Student.findById(req.userId).select('feeProofs');
    const proof = student?.feeProofs?.id(req.params.proofId);
    if (!proof) return res.status(404).json({ success: false, message: 'Proof not found' });
    if (!fs.existsSync(proof.path)) return res.status(404).json({ success: false, message: 'Stored file is missing' });

    res.setHeader('Content-Type', proof.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(proof.originalName)}"`);
    return res.sendFile(path.resolve(proof.path));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET my allocation history ──
router.get('/my-allocations', protect, studentOnly, async (req, res) => {
  try {
    const history = await Allocation.find({ student: req.userId })
      .populate('room', 'roomNumber block floor type')
      .sort('-createdAt');
    res.json({ success: true, count: history.length, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET my fee status ──
router.get('/fees', protect, studentOnly, async (req, res) => {
  try {
    const student = await Student.findById(req.userId).select('feesPaid feeApprovalStatus feeRemarks feeProofs name studentId');
    res.json({
      success: true,
      data: {
        feesPaid: student.feesPaid,
        feeApprovalStatus: student.feeApprovalStatus,
        feeRemarks: student.feeRemarks,
        proofs: student.feeProofs,
        status: student.feeApprovalStatus === 'Approved' ? 'Approved' : student.feeApprovalStatus === 'Rejected' ? 'Rejected' : 'Pending',
        message: student.feeApprovalStatus === 'Approved'
          ? 'Your fee has been approved. Room change approvals are now allowed.'
          : student.feeApprovalStatus === 'Rejected'
            ? 'Your fee proof was rejected. Please upload a valid proof.'
            : 'Upload fee proof and wait for admin approval before requesting room changes.',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

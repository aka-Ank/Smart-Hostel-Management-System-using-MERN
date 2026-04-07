const express = require('express');
const router = express.Router();
const RoomChangeRequest = require('../models/RoomChangeRequest');
const Room = require('../models/Room');
const Student = require('../models/Student');
const Building = require('../models/Building');
const { protect, adminOnly, studentOnly } = require('../middleware/auth');
const { moveStudentToRoom } = require('../utils/roomAssignments');
const { isBuildingAllowedForStudent, isFeeApproved } = require('../utils/eligibility');

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const status = req.query.status || '';
    const query = {};
    if (status) query.status = status;

    const requests = await RoomChangeRequest.find(query)
      .populate('student', 'name studentId email phone')
      .populate('currentRoom', 'roomNumber buildingName floor')
      .populate({ path: 'requestedRoom', select: 'roomNumber buildingName floor status capacity occupants building', populate: { path: 'building', select: 'name displayName type' } })
      .populate('resolvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/:id/review', protect, adminOnly, async (req, res) => {
  try {
    const { action, adminNotes = '' } = req.body;
    if (!['Approved', 'Rejected'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    const request = await RoomChangeRequest.findById(req.params.id)
      .populate('student')
      .populate({ path: 'requestedRoom', populate: { path: 'building', select: 'name displayName type' } });

    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'This request has already been reviewed' });
    }

    if (action === 'Approved') {
      const student = await Student.findById(request.student._id);
      const room = await Room.findById(request.requestedRoom._id);
      if (!student || !room) {
        return res.status(404).json({ success: false, message: 'Student or room no longer exists' });
      }
      if (room.status === 'Maintenance' || room.status === 'Reserved' || room.occupants.length >= room.capacity) {
        return res.status(400).json({ success: false, message: 'Requested room is no longer available' });
      }
      const building = await Building.findOne({ name: room.buildingName || room.block }).select('type');
      if (!isFeeApproved(student)) {
        return res.status(400).json({ success: false, message: 'Fee approval is required before approving a room change.' });
      }
      if (!isBuildingAllowedForStudent(student.gender, building?.type || 'Unisex')) {
        return res.status(400).json({ success: false, message: 'Requested building is not allowed for this student.' });
      }

      await moveStudentToRoom({
        student,
        targetRoom: room,
        actorAdminId: req.admin._id,
        reason: `Approved room change request: ${adminNotes}`.trim(),
      });
    }

    request.status = action;
    request.adminNotes = adminNotes;
    request.resolvedBy = req.admin._id;
    request.resolvedAt = new Date();
    await request.save();

    res.json({ success: true, data: request, message: `Request ${action.toLowerCase()}` });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/mine/list', protect, studentOnly, async (req, res) => {
  try {
    const requests = await RoomChangeRequest.find({ student: req.userId })
      .populate('currentRoom', 'roomNumber buildingName floor')
      .populate({ path: 'requestedRoom', select: 'roomNumber buildingName floor building', populate: { path: 'building', select: 'name displayName type' } })
      .sort({ createdAt: -1 });
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/mine', protect, studentOnly, async (req, res) => {
  try {
    const { requestedRoomId, reason } = req.body;
    const student = await Student.findById(req.userId).populate('room', 'roomNumber');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (!student.room) {
      return res.status(400).json({ success: false, message: 'You need an allocated room before requesting a change' });
    }
    if (!requestedRoomId || !reason?.trim()) {
      return res.status(400).json({ success: false, message: 'Requested room and reason are required' });
    }
    if (!isFeeApproved(student)) {
      return res.status(400).json({ success: false, message: 'Fee must be approved before submitting a room change request.' });
    }

    const requestedRoom = await Room.findById(requestedRoomId).populate('building', 'name displayName type');
    if (!requestedRoom) return res.status(404).json({ success: false, message: 'Requested room not found' });
    if (String(requestedRoom._id) === String(student.room._id)) {
      return res.status(400).json({ success: false, message: 'Requested room must be different from your current room' });
    }
    const building = requestedRoom.building || await Building.findOne({ name: requestedRoom.buildingName || requestedRoom.block }).select('name displayName type');
    if (!isBuildingAllowedForStudent(student.gender, building?.type || 'Unisex')) {
      return res.status(400).json({ success: false, message: 'This building is not available for your gender category.' });
    }

    const pending = await RoomChangeRequest.findOne({ student: student._id, status: 'Pending' });
    if (pending) {
      return res.status(400).json({ success: false, message: 'You already have a pending room change request' });
    }

    const request = await RoomChangeRequest.create({
      student: student._id,
      currentRoom: student.room._id,
      requestedRoom: requestedRoom._id,
      reason: reason.trim(),
      previewRoomNumber: requestedRoom.roomNumber,
    });

    student.roomChangeRequestCount += 1;
    await student.save();

    res.status(201).json({ success: true, data: request, message: 'Room change request submitted for admin approval' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/mine/:id', protect, studentOnly, async (req, res) => {
  try {
    const { requestedRoomId, reason } = req.body;
    const request = await RoomChangeRequest.findOne({ _id: req.params.id, student: req.userId });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'Pending') return res.status(400).json({ success: false, message: 'Only pending requests can be modified.' });

    const student = await Student.findById(req.userId).select('gender feeApprovalStatus');
    if (!isFeeApproved(student)) {
      return res.status(400).json({ success: false, message: 'Fee must be approved before changing the request.' });
    }

    const requestedRoom = await Room.findById(requestedRoomId).populate('building', 'name displayName type');
    if (!requestedRoom) return res.status(404).json({ success: false, message: 'Requested room not found' });
    if (!isBuildingAllowedForStudent(student.gender, requestedRoom.building?.type || 'Unisex')) {
      return res.status(400).json({ success: false, message: 'This building is not available for your gender category.' });
    }

    request.requestedRoom = requestedRoom._id;
    request.previewRoomNumber = requestedRoom.roomNumber;
    request.reason = String(reason || '').trim();
    await request.save();

    res.json({ success: true, data: request, message: 'Room change request updated.' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;

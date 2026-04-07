const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Student = require('../models/Student');
const Building = require('../models/Building');
const { protect, authorize } = require('../middleware/auth');
const { buildRoomNumber, parseRoomNumber } = require('../utils/roomUtils');

function buildRoomPayload(input, existingRoom = null) {
  const parsed = parseRoomNumber(input.roomNumber) || {};
  const buildingName = String(
    input.buildingName || input.block || parsed.buildingName || existingRoom?.buildingName || ''
  ).trim().toUpperCase();
  const floor = Number(input.floor ?? parsed.floor ?? existingRoom?.floor);
  const roomNumberOnFloor = Number(
    input.roomNumberOnFloor ?? parsed.roomNumberOnFloor ?? existingRoom?.roomNumberOnFloor
  );

  return {
    roomNumber: String(
      input.roomNumber || buildRoomNumber(buildingName, floor, roomNumberOnFloor)
    ).trim().toUpperCase(),
    floor,
    block: buildingName,
    buildingName,
    roomNumberOnFloor,
    building: input.building || existingRoom?.building || null,
    type: input.type || existingRoom?.type || 'Triple',
    capacity: Number(input.capacity ?? existingRoom?.capacity ?? 3),
    monthlyRent: Number(input.monthlyRent ?? existingRoom?.monthlyRent ?? 0),
    status: input.status || existingRoom?.status || 'Available',
    description: input.description ?? existingRoom?.description ?? '',
    amenities: {
      hasAC: Boolean(input.amenities?.hasAC ?? existingRoom?.amenities?.hasAC),
      hasWifi: Boolean(input.amenities?.hasWifi ?? existingRoom?.amenities?.hasWifi ?? true),
      hasAttachedBathroom: Boolean(input.amenities?.hasAttachedBathroom ?? existingRoom?.amenities?.hasAttachedBathroom),
      hasBalcony: Boolean(input.amenities?.hasBalcony ?? existingRoom?.amenities?.hasBalcony),
      hasTV: Boolean(input.amenities?.hasTV ?? existingRoom?.amenities?.hasTV),
    },
    features: Array.isArray(input.features) ? input.features.filter(Boolean) : (existingRoom?.features || []),
  };
}

router.get('/public-summary', async (_req, res) => {
  try {
    const totalRooms = await Room.countDocuments();
    const occupiedRooms = await Room.countDocuments({ 'occupants.0': { $exists: true } });
    const availableRooms = await Room.countDocuments({
      'occupants.0': { $exists: false },
      status: { $nin: ['Maintenance', 'Reserved'] },
    });

    res.json({
      success: true,
      data: {
        totalRooms,
        occupiedRooms,
        availableRooms,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/stats', protect, async (_req, res) => {
  try {
    const totalRooms = await Room.countDocuments();
    const totalBedsAgg = await Room.aggregate([{ $group: { _id: null, totalBeds: { $sum: '$capacity' } } }]);

    const available = await Room.countDocuments({
      'occupants.0': { $exists: false },
      status: { $nin: ['Maintenance', 'Reserved'] },
    });
    const occupied = await Room.countDocuments({ 'occupants.0': { $exists: true } });
    const full = await Room.countDocuments({ status: 'Full' });
    const maintenance = await Room.countDocuments({ status: 'Maintenance' });
    const reserved = await Room.countDocuments({ status: 'Reserved' });

    const totalStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ status: 'Active' });
    const feesPending = await Student.countDocuments({ feesPaid: false, status: 'Active' });
    const allocated = await Student.countDocuments({ room: { $ne: null } });

    const byType = await Room.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 }, totalCapacity: { $sum: '$capacity' } } },
      { $sort: { _id: 1 } },
    ]);

    const byBlock = await Room.aggregate([
      {
        $group: {
          _id: { $ifNull: ['$buildingName', '$block'] },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalBeds = totalBedsAgg[0]?.totalBeds || 0;
    const occupancyRate = totalBeds > 0 ? Math.round((allocated / totalBeds) * 100) : 0;

    res.json({
      success: true,
      data: {
        rooms: {
          total: totalRooms,
          available,
          occupied,
          full,
          maintenance,
          reserved,
          byType,
          byBlock,
          occupancyRate,
          totalBeds,
        },
        students: {
          total: totalStudents,
          active: activeStudents,
          feesPending,
          allocated,
        },
      },
    });
  } catch (error) {
    console.error('GET /rooms/stats error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search || '';
    const type = req.query.type || '';
    const block = req.query.block || req.query.building || '';
    const status = req.query.status || '';
    const floor = req.query.floor;
    const roomNumber = req.query.roomNumber || '';

    const query = {};

    if (search) {
      query.$or = [
        { roomNumber: { $regex: search, $options: 'i' } },
        { buildingName: { $regex: search, $options: 'i' } },
        { block: { $regex: search, $options: 'i' } },
      ];
    }

    if (roomNumber) {
      query.roomNumber = { $regex: roomNumber, $options: 'i' };
    }

    if (type) query.type = type;
    if (block) query.buildingName = block.toUpperCase();
    if (status) query.status = status;
    if (floor !== undefined && floor !== '') query.floor = Number(floor);

    const total = await Room.countDocuments(query);
    const rooms = await Room.find(query)
      .populate('occupants', 'name studentId course year')
      .populate('building', 'name displayName type')
      .sort({ buildingName: 1, floor: 1, roomNumberOnFloor: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      count: rooms.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: rooms,
    });
  } catch (error) {
    console.error('GET /rooms error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', protect, authorize('superadmin', 'admin', 'warden'), async (req, res) => {
  try {
    const payload = buildRoomPayload(req.body);
    if (!payload.roomNumber || !payload.buildingName || !payload.floor || !payload.roomNumberOnFloor) {
      return res.status(400).json({ success: false, message: 'Building, floor and room number are required' });
    }

    if (!payload.building && payload.buildingName) {
      const building = await Building.findOne({ name: payload.buildingName });
      if (building) payload.building = building._id;
    }

    const room = await Room.create(payload);
    res.status(201).json({ success: true, data: room });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Room number already exists' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/bulk-create', protect, authorize('superadmin', 'admin', 'warden'), async (req, res) => {
  try {
    const {
      buildingName,
      buildingId,
      floor,
      fromRoomNumber,
      toRoomNumber,
      monthlyRent,
      type = 'Triple',
      capacity = 3,
      amenities = {},
    } = req.body;

    if (!buildingName || !floor || !fromRoomNumber || !toRoomNumber) {
      return res.status(400).json({ success: false, message: 'Building, floor and range are required' });
    }

    const rooms = [];
    for (let roomNo = Number(fromRoomNumber); roomNo <= Number(toRoomNumber); roomNo += 1) {
      rooms.push({
        roomNumber: buildRoomNumber(String(buildingName).toUpperCase(), Number(floor), roomNo),
        building: buildingId || null,
        buildingName: String(buildingName).toUpperCase(),
        block: String(buildingName).toUpperCase(),
        floor: Number(floor),
        roomNumberOnFloor: roomNo,
        monthlyRent: Number(monthlyRent),
        type,
        capacity: Number(capacity),
        amenities,
      });
    }

    const created = await Room.insertMany(rooms, { ordered: true });
    res.status(201).json({ success: true, count: created.length, data: created });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/bulk-update', protect, authorize('superadmin', 'admin', 'warden'), async (req, res) => {
  try {
    const { roomIds = [], updates = {} } = req.body;
    if (!Array.isArray(roomIds) || roomIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one room' });
    }

    const safeUpdates = {};
    ['status', 'monthlyRent', 'type', 'description'].forEach((field) => {
      if (updates[field] !== undefined && updates[field] !== '') safeUpdates[field] = updates[field];
    });
    if (updates.amenities) safeUpdates.amenities = updates.amenities;
    if (Array.isArray(updates.features)) safeUpdates.features = updates.features;

    await Room.updateMany({ _id: { $in: roomIds } }, { $set: safeUpdates });
    res.json({ success: true, message: `Updated ${roomIds.length} room(s)` });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/bulk-delete', protect, authorize('superadmin', 'admin', 'warden'), async (req, res) => {
  try {
    const { roomIds = [] } = req.body;
    if (!Array.isArray(roomIds) || roomIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one room' });
    }

    const occupied = await Room.find({ _id: { $in: roomIds }, 'occupants.0': { $exists: true } }).select('_id');
    if (occupied.length > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete rooms that still have occupants' });
    }

    const result = await Room.deleteMany({ _id: { $in: roomIds } });
    res.json({ success: true, message: `Deleted ${result.deletedCount} room(s)` });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('occupants', 'name studentId email course year gender phone')
      .populate('building', 'name displayName type floors roomsPerFloor');
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', protect, authorize('superadmin', 'admin', 'warden'), async (req, res) => {
  try {
    const existing = await Room.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Room not found' });

    const payload = buildRoomPayload(req.body, existing);
    if (!payload.building && payload.buildingName) {
      const building = await Building.findOne({ name: payload.buildingName });
      if (building) payload.building = building._id;
    }

    const room = await Room.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true })
      .populate('occupants', 'name studentId course year')
      .populate('building', 'name displayName type');
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/:id', protect, authorize('superadmin', 'admin', 'warden'), async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (room.occupants.length > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete room with occupants.' });
    }
    await room.deleteOne();
    res.json({ success: true, message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

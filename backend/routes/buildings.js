const express = require('express');
const router = express.Router();
const Building = require('../models/Building');
const Room = require('../models/Room');
const { protect, authorize } = require('../middleware/auth');
const { buildRoomNumber } = require('../utils/roomUtils');

router.get('/', protect, async (_req, res) => {
  try {
    const buildings = await Building.find().sort({ name: 1 }).lean();
    const roomCounts = await Room.aggregate([
      {
        $group: {
          _id: { $ifNull: ['$buildingName', '$block'] },
          rooms: { $sum: 1 },
          occupiedRooms: {
            $sum: {
              $cond: [{ $gt: [{ $size: '$occupants' }, 0] }, 1, 0],
            },
          },
        },
      },
    ]);

    const countsByBuilding = new Map(roomCounts.map((item) => [item._id, item]));
    const data = buildings.map((building) => ({
      ...building,
      stats: countsByBuilding.get(building.name) || { rooms: 0, occupiedRooms: 0 },
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', protect, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const {
      name,
      type,
      floors,
      roomsPerFloor,
      defaultRoomType = 'Triple',
      defaultCapacity = 3,
      defaultMonthlyRent = 3000,
      amenities = {},
      defaultFeatures = [],
    } = req.body;

    if (!name || !floors || !roomsPerFloor) {
      return res.status(400).json({ success: false, message: 'Building name, floors and rooms per floor are required' });
    }

    const normalizedName = String(name).trim().toUpperCase();
    const building = await Building.create({
      name: normalizedName,
      displayName: normalizedName,
      type,
      floors: Number(floors),
      roomsPerFloor: Number(roomsPerFloor),
      defaultRoomType,
      defaultCapacity: Number(defaultCapacity),
      defaultMonthlyRent: Number(defaultMonthlyRent),
      amenities,
      defaultFeatures,
    });

    const rooms = [];
    for (let floor = 1; floor <= Number(floors); floor += 1) {
      for (let roomNumberOnFloor = 1; roomNumberOnFloor <= Number(roomsPerFloor); roomNumberOnFloor += 1) {
        rooms.push({
          roomNumber: buildRoomNumber(normalizedName, floor, roomNumberOnFloor),
          floor,
          block: normalizedName,
          buildingName: normalizedName,
          building: building._id,
          roomNumberOnFloor,
          type: defaultRoomType,
          capacity: Number(defaultCapacity),
          monthlyRent: Number(defaultMonthlyRent),
          amenities,
          features: defaultFeatures,
        });
      }
    }

    await Room.insertMany(rooms, { ordered: true });
    res.status(201).json({ success: true, data: building, message: `Created ${rooms.length} rooms for building ${normalizedName}` });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Building already exists' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/:id', protect, authorize('superadmin', 'admin'), async (req, res) => {
  try {
    const building = await Building.findByIdAndUpdate(
      req.params.id,
      {
        displayName: req.body.displayName || req.body.name,
        type: req.body.type,
        floors: req.body.floors,
        roomsPerFloor: req.body.roomsPerFloor,
        defaultRoomType: req.body.defaultRoomType,
        defaultCapacity: req.body.defaultCapacity,
        defaultMonthlyRent: req.body.defaultMonthlyRent,
        amenities: req.body.amenities,
        defaultFeatures: req.body.defaultFeatures,
        isActive: req.body.isActive,
      },
      { new: true, runValidators: true }
    );

    if (!building) return res.status(404).json({ success: false, message: 'Building not found' });
    res.json({ success: true, data: building });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;

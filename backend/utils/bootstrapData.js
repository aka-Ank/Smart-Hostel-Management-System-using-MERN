const Building = require('../models/Building');
const Room = require('../models/Room');
const Student = require('../models/Student');

function parseLegacyRoom(roomNumber = '') {
  const match = String(roomNumber).trim().toUpperCase().match(/^([A-Z]+)(\d{3,})$/);
  if (!match) return null;
  const digits = match[2];
  const floorPart = digits.slice(0, -2);
  const roomPart = digits.slice(-2);
  return {
    buildingName: match[1],
    floor: Number(floorPart),
    roomNumberOnFloor: Number(roomPart),
  };
}

async function bootstrapData() {
  const rooms = await Room.find();
  if (rooms.length === 0) return;

  const buildingStats = new Map();

  for (const room of rooms) {
    const parsed = parseLegacyRoom(room.roomNumber) || {};
    const buildingName = String(room.buildingName || room.block || parsed.buildingName || '').toUpperCase();
    const floor = Number(room.floor || parsed.floor || 1);
    const roomNumberOnFloor = Number(room.roomNumberOnFloor || parsed.roomNumberOnFloor || 1);

    let changed = false;
    if (buildingName && room.buildingName !== buildingName) {
      room.buildingName = buildingName;
      room.block = buildingName;
      changed = true;
    }
    if (!room.roomNumberOnFloor || room.roomNumberOnFloor !== roomNumberOnFloor) {
      room.roomNumberOnFloor = roomNumberOnFloor;
      changed = true;
    }
    if (!room.floor || room.floor !== floor) {
      room.floor = floor;
      changed = true;
    }
    if (changed) await room.save();

    if (buildingName) {
      const current = buildingStats.get(buildingName) || { floors: 0, roomsPerFloor: 0 };
      current.floors = Math.max(current.floors, floor);
      current.roomsPerFloor = Math.max(current.roomsPerFloor, roomNumberOnFloor);
      buildingStats.set(buildingName, current);
    }
  }

  for (const [buildingName, stats] of buildingStats.entries()) {
    let building = await Building.findOne({ name: buildingName });
    if (!building) {
      building = await Building.create({
        name: buildingName,
        displayName: buildingName,
        type: 'Unisex',
        floors: stats.floors,
        roomsPerFloor: stats.roomsPerFloor,
      });
    }

    await Room.updateMany(
      { buildingName, $or: [{ building: null }, { building: { $exists: false } }] },
      { $set: { building: building._id } }
    );
  }

  await Student.updateMany(
    { feeApprovalStatus: { $exists: false }, feesPaid: true },
    { $set: { feeApprovalStatus: 'Approved' } }
  );

  await Student.updateMany(
    { feeApprovalStatus: { $exists: false }, feesPaid: false },
    { $set: { feeApprovalStatus: 'Pending' } }
  );

  await Student.updateMany(
    { detailsApprovalStatus: { $exists: false }, editCount: { $gt: 0 } },
    { $set: { detailsApprovalStatus: 'Approved' } }
  );

  await Student.updateMany(
    { detailsApprovalStatus: { $exists: false }, editCount: 0 },
    { $set: { detailsApprovalStatus: 'Pending' } }
  );
}

module.exports = bootstrapData;

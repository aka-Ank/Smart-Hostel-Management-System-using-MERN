const Allocation = require('../models/Allocation');
const Room = require('../models/Room');

async function moveStudentToRoom({ student, targetRoom, actorAdminId, reason = '' }) {
  const previousRoomId = student.room ? String(student.room) : null;

  if (previousRoomId && previousRoomId === String(targetRoom._id)) {
    return targetRoom;
  }

  if (student.room) {
    const previousRoom = await Room.findById(student.room);
    if (previousRoom) {
      previousRoom.occupants = previousRoom.occupants.filter(
        (occupantId) => occupantId.toString() !== student._id.toString()
      );
      await previousRoom.save();

      await Allocation.create({
        student: student._id,
        room: previousRoom._id,
        action: 'vacated',
        allocatedBy: actorAdminId,
        studentName: student.name,
        studentId: student.studentId,
        roomNumber: previousRoom.roomNumber,
        block: previousRoom.block,
        floor: previousRoom.floor,
        vacatedAt: new Date(),
        remarks: reason,
      });
    }
  }

  const alreadyPresent = targetRoom.occupants.some(
    (occupantId) => occupantId.toString() === student._id.toString()
  );

  if (!alreadyPresent) {
    targetRoom.occupants.push(student._id);
  }

  await targetRoom.save();

  student.room = targetRoom._id;
  student.roomLocked = true;
  await student.save();

  await Allocation.create({
    student: student._id,
    room: targetRoom._id,
    action: 'allocated',
    allocatedBy: actorAdminId,
    studentName: student.name,
    studentId: student.studentId,
    roomNumber: targetRoom.roomNumber,
    block: targetRoom.block,
    floor: targetRoom.floor,
    allocatedAt: new Date(),
    remarks: reason,
  });

  return targetRoom;
}

module.exports = {
  moveStudentToRoom,
};

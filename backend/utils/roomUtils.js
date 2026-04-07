function padRoomNumber(value) {
  return String(value).padStart(2, '0');
}

function buildRoomNumber(buildingName, floor, roomNumberOnFloor) {
  return `${buildingName}-${floor}-${padRoomNumber(roomNumberOnFloor)}`;
}

function parseRoomNumber(roomNumber = '') {
  const match = String(roomNumber).trim().toUpperCase().match(/^([A-Z0-9]+)-(\d+)-(\d+)$/);
  if (!match) return null;
  return {
    buildingName: match[1],
    floor: Number(match[2]),
    roomNumberOnFloor: Number(match[3]),
  };
}

module.exports = {
  buildRoomNumber,
  padRoomNumber,
  parseRoomNumber,
};

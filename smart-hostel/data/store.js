// Dummy in-memory data store.
// Data will reset every time you restart the server.

let users = [];

let hostel = {
  floors: 0,
  roomsPerFloor: 0,
  rooms: [],
  allocationMode: "" // "force" or "custom"
};

module.exports = {
  users,
  hostel
};

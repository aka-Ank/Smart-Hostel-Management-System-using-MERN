const express = require("express");
const path = require("path");
const { hostel } = require("../data/store");

const router = express.Router();

// Serve warden dashboard page
router.get("/warden", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/wardenDashboard.html"));
});

// Serve create hostel page
router.get("/warden/create", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/createHostel.html"));
});

// API to create hostel rooms based on floors and roomsPerFloor
router.post("/warden/create-hostel", (req, res) => {
  const floors = Number(req.body.floors);
  const roomsPerFloor = Number(req.body.roomsPerFloor);
  const allocationMode = req.body.allocationMode;

  if (!floors || !roomsPerFloor || !allocationMode) {
    return res.status(400).json({ message: "Please provide all hostel details." });
  }

  hostel.floors = floors;
  hostel.roomsPerFloor = roomsPerFloor;
  hostel.allocationMode = allocationMode;
  hostel.rooms = [];

  // Room generation logic: F1-R1, F1-R2, F2-R1, etc.
  for (let f = 1; f <= floors; f += 1) {
    for (let r = 1; r <= roomsPerFloor; r += 1) {
      hostel.rooms.push({
        roomNumber: `F${f}-R${r}`,
        occupied: false,
        studentEmail: null
      });
    }
  }

  return res.json({
    message: "Hostel created successfully.",
    hostel
  });
});

// API to see all rooms and current occupancy
router.get("/warden/rooms", (req, res) => {
  return res.json({
    message: "Room list fetched successfully.",
    rooms: hostel.rooms,
    allocationMode: hostel.allocationMode
  });
});

module.exports = router;

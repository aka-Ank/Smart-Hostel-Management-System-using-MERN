const express = require("express");
const path = require("path");
const { users, hostel } = require("../data/store");

const router = express.Router();

// Serve student dashboard page
router.get("/student", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/studentDashboard.html"));
});

// Serve room selection page for custom allocation
router.get("/student/choose", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/chooseRoom.html"));
});

// API: check student and room status
router.get("/student/status", (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: "Student email is required." });
  }

  const student = users.find((user) => user.email === email && user.role === "student");
  if (!student) {
    return res.status(404).json({ message: "Student not found." });
  }

  const assignedRoom = hostel.rooms.find((room) => room.studentEmail === email);

  return res.json({
    message: "Student status fetched.",
    student: { name: student.name, email: student.email },
    assignedRoom: assignedRoom || null,
    allocationMode: hostel.allocationMode,
    hostelCreated: hostel.rooms.length > 0
  });
});

// API: force-fill allocation assigns first available room automatically
router.post("/student/auto-assign", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Student email is required." });
  }

  const existingRoom = hostel.rooms.find((room) => room.studentEmail === email);
  if (existingRoom) {
    return res.json({ message: "Room already assigned.", room: existingRoom });
  }

  const freeRoom = hostel.rooms.find((room) => !room.occupied);
  if (!freeRoom) {
    return res.status(400).json({ message: "No available rooms." });
  }

  freeRoom.occupied = true;
  freeRoom.studentEmail = email;

  return res.json({ message: "Room assigned successfully.", room: freeRoom });
});

// API: list only unoccupied rooms for custom selection
router.get("/student/available-rooms", (req, res) => {
  const availableRooms = hostel.rooms.filter((room) => !room.occupied);
  return res.json({
    message: "Available rooms fetched.",
    rooms: availableRooms
  });
});

// API: custom room selection by student
router.post("/student/select-room", (req, res) => {
  const { email, roomNumber } = req.body;

  if (!email || !roomNumber) {
    return res.status(400).json({ message: "Email and room number are required." });
  }

  const existingRoom = hostel.rooms.find((room) => room.studentEmail === email);
  if (existingRoom) {
    return res.status(400).json({ message: "Student already has a room.", room: existingRoom });
  }

  const selectedRoom = hostel.rooms.find((room) => room.roomNumber === roomNumber);
  if (!selectedRoom) {
    return res.status(404).json({ message: "Room not found." });
  }

  if (selectedRoom.occupied) {
    return res.status(400).json({ message: "Room already occupied." });
  }

  selectedRoom.occupied = true;
  selectedRoom.studentEmail = email;

  return res.json({ message: "Room selected successfully.", room: selectedRoom });
});

module.exports = router;

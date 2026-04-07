const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const Admin   = require('../models/Admin');
const Student = require('../models/Student');
const { protect } = require('../middleware/auth');

// JWT token expires in 2 hours
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '2h' });
};

// ── ADMIN REGISTER ──
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (await Admin.findOne({ email })) {
      return res.status(400).json({ success: false, message: 'Admin already exists' });
    }
    const admin = await Admin.create({ name, email, password, role });
    const token = generateToken(admin._id, 'admin');
    res.status(201).json({
      success: true, token,
      user: { id: admin._id, name: admin.name, email: admin.email, role: admin.role, userType: 'admin' },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── ADMIN LOGIN ──
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!admin.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }
    const token = generateToken(admin._id, 'admin');
    res.json({
      success: true, token,
      user: { id: admin._id, name: admin.name, email: admin.email, role: admin.role, userType: 'admin' },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── STUDENT REGISTER ──
router.post('/student/register', async (req, res) => {
  try {
    const {
      studentId, name, email, phone, password,
      dateOfBirth, gender, course, year,
      guardianName, guardianPhone, address,
    } = req.body;

    if (!studentId || !name || !email || !phone || !password || !dateOfBirth || !gender || !course || !year) {
      return res.status(400).json({ success: false, message: 'Please fill all required fields' });
    }

    const exists = await Student.findOne({ $or: [{ email }, { studentId }, { phone }] });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Student with this ID, email or phone already exists' });
    }

    const student = await Student.create({
      studentId, name, email, phone, password,
      dateOfBirth, gender, course, year,
      guardianName, guardianPhone, address,
    });

    const token = generateToken(student._id, 'student');
    res.status(201).json({
      success: true, token,
      user: {
        id: student._id, studentId: student.studentId,
        name: student.name, email: student.email, phone: student.phone,
        course: student.course, year: student.year, room: student.room,
        feesPaid: student.feesPaid, editCount: student.editCount,
        maxEdits: student.maxEdits, roomLocked: student.roomLocked,
        userType: 'student',
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ success: false, message: `${field} already exists` });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── STUDENT LOGIN ──
router.post('/student/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide your ID/Email/Phone and password' });
    }

    const student = await Student.findOne({
      $or: [
        { studentId: identifier.toUpperCase() },
        { email:     identifier.toLowerCase() },
        { phone:     identifier },
      ]
    }).select('+password').populate('room', 'roomNumber block floor type monthlyRent');

    if (!student || !(await student.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (student.status === 'Suspended') {
      return res.status(401).json({ success: false, message: 'Your account has been suspended. Contact admin.' });
    }

    const token = generateToken(student._id, 'student');
    res.json({
      success: true, token,
      user: {
        id: student._id, studentId: student.studentId,
        name: student.name, email: student.email, phone: student.phone,
        course: student.course, year: student.year, gender: student.gender,
        room: student.room, feesPaid: student.feesPaid,
        editCount: student.editCount, maxEdits: student.maxEdits,
        roomLocked: student.roomLocked, status: student.status,
        userType: 'student',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── REFRESH TOKEN (called every 90 minutes to keep session alive) ──
router.post('/refresh', protect, async (req, res) => {
  try {
    // Generate a fresh token
    const newToken = generateToken(req.userId, req.userType);
    res.json({ success: true, token: newToken });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET CURRENT USER ──
router.get('/me', protect, async (req, res) => {
  try {
    if (req.userType === 'student') {
      const student = await Student.findById(req.userId)
        .populate('room', 'roomNumber block floor type monthlyRent amenities');
      if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
      return res.json({ success: true, user: { ...student.toObject(), userType: 'student' } });
    } else {
      return res.json({ success: true, user: { ...req.admin.toObject(), userType: 'admin' } });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
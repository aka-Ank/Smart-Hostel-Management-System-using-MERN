const jwt     = require('jsonwebtoken');
const Admin   = require('../models/Admin');
const Student = require('../models/Student');

// Works for both admin and student tokens
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId   = decoded.id;
    req.userType = decoded.role || 'admin';

    if (req.userType === 'student') {
      const student = await Student.findById(decoded.id);
      if (!student) return res.status(401).json({ success: false, message: 'Student not found' });
      req.student = student;
    } else {
      const admin = await Admin.findById(decoded.id).select('-password');
      if (!admin || !admin.isActive) return res.status(401).json({ success: false, message: 'Not authorized' });
      req.admin = admin;
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

// Only admin can access
const adminOnly = (req, res, next) => {
  if (req.userType !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// Only student can access
const studentOnly = (req, res, next) => {
  if (req.userType !== 'student') {
    return res.status(403).json({ success: false, message: 'Student access required' });
  }
  next();
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.admin?.role)) {
      return res.status(403).json({ success: false, message: `Role '${req.admin?.role}' is not authorized` });
    }
    next();
  };
};

module.exports = { protect, adminOnly, studentOnly, authorize };
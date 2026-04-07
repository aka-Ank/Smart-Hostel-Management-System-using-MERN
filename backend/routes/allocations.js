const express = require('express');
const router = express.Router();
const Allocation = require('../models/Allocation');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const page   = Number(req.query.page)  || 1;
    const limit  = Number(req.query.limit) || 20;
    const action = req.query.action || '';
    const query  = {};
    if (action) query.action = action;
    const total = await Allocation.countDocuments(query);
    const allocations = await Allocation.find(query)
      .populate('student',     'name studentId course year')
      .populate('room',        'roomNumber block floor type')
      .populate('allocatedBy', 'name')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit);
    res.json({ success: true, count: allocations.length, total, totalPages: Math.ceil(total / limit), currentPage: page, data: allocations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

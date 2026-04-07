const express = require('express');
const router = express.Router();
const RoomFeature = require('../models/RoomFeature');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, async (_req, res) => {
  try {
    const features = await RoomFeature.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: features });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', protect, authorize('superadmin', 'admin', 'warden'), async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ success: false, message: 'Feature name is required' });
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const feature = await RoomFeature.create({ name, key });
    res.status(201).json({ success: true, data: feature });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Feature already exists' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/:id', protect, authorize('superadmin', 'admin', 'warden'), async (req, res) => {
  try {
    const feature = await RoomFeature.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!feature) return res.status(404).json({ success: false, message: 'Feature not found' });
    res.json({ success: true, data: feature });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;

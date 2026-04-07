require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const connectDB = require('./config/db');
const bootstrapAuth = require('./utils/bootstrapAuth');
const bootstrapData = require('./utils/bootstrapData');

const authRoutes          = require('./routes/auth');
const adminRoutes         = require('./routes/admins');
const buildingRoutes      = require('./routes/buildings');
const roomFeatureRoutes   = require('./routes/roomFeatures');
const studentRoutes       = require('./routes/students');
const roomRoutes          = require('./routes/rooms');
const allocationRoutes    = require('./routes/allocations');
const chatbotRoutes       = require('./routes/chatbot');
const roomChangeRequestRoutes = require('./routes/roomChangeRequests');
const studentPortalRoutes = require('./routes/studentPortal');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

app.use('/api/auth',           authRoutes);
app.use('/api/admins',         adminRoutes);
app.use('/api/buildings',      buildingRoutes);
app.use('/api/room-features',  roomFeatureRoutes);
app.use('/api/students',       studentRoutes);
app.use('/api/rooms',          roomRoutes);
app.use('/api/allocations',    allocationRoutes);
app.use('/api/chatbot',        chatbotRoutes);
app.use('/api/room-change-requests', roomChangeRequestRoutes);
app.use('/api/student-portal', studentPortalRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Hostel Management API is running', timestamp: new Date() });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  await connectDB();
  await bootstrapData();
  await bootstrapAuth();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  });
};

startServer().catch((error) => {
  console.error(`Failed to start server: ${error.message}`);
  process.exit(1);
});

module.exports = app;

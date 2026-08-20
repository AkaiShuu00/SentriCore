const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const residentRoutes = require('./routes/residents');
const guardRoutes = require('./routes/guards');
const registrationRoutes = require('./routes/registrations');
const entryRoutes = require('./routes/entry');
const blocklistRoutes = require('./routes/blocklist');
const announcementRoutes = require('./routes/announcements');
const gateRoutes = require('./routes/gates');
const { startCronJobs } = require('./cron');
const reportRoutes = require('./routes/reports');

// Import db
require('./config/db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/residents', residentRoutes);
app.use('/api/guards', guardRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/entry', entryRoutes);
app.use('/api/blocklist', blocklistRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/gates', gateRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: '✅ SentriCore API is running!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error.', error: err.message });
});

startCronJobs();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 SentriCore backend running on port ${PORT}`);
});
require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { initializeFirebase } = require('./src/config/firebase');

const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Initialize Firebase Admin SDK
initializeFirebase();

// Start Background Jobs
const { startNotificationCron } = require('./src/cron/notification.cron');
startNotificationCron();

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

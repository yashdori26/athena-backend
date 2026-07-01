console.log("DEBUG: Starting server.js");
require('dotenv').config();
console.log("DEBUG: dotenv loaded");

const app = require('./src/app');
console.log("DEBUG: app loaded");

const connectDB = require('./src/config/db');
console.log("DEBUG: db loaded");

const { initializeFirebase } = require('./src/config/firebase');
console.log("DEBUG: firebase loaded");

const PORT = parseInt(process.env.PORT, 10) || 5000;
console.log("DEBUG: PORT is", PORT);

// Connect to Database
console.log("DEBUG: Calling connectDB");
connectDB();
console.log("DEBUG: connectDB called");

// Initialize Firebase Admin SDK
console.log("DEBUG: Calling initializeFirebase");
initializeFirebase();
console.log("DEBUG: initializeFirebase called");

// Start Background Jobs
console.log("DEBUG: Requiring notification cron");
const { startNotificationCron } = require('./src/cron/notification.cron');
console.log("DEBUG: Calling startNotificationCron");
startNotificationCron();
console.log("DEBUG: startNotificationCron called");

console.log("DEBUG: Calling app.listen");
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
console.log("DEBUG: app.listen called");

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

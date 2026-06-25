const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

const authRoutes = require('./routes/auth.routes');
const notesRoutes = require('./routes/notes.routes');
const chatRoutes = require('./routes/chat.routes');
const quizRoutes = require('./routes/quiz.routes');
const flashcardRoutes = require('./routes/flashcards.routes');
const subjectRoutes = require('./routes/subject.routes');
const userProgressRoutes = require('./routes/userProgress.routes');
const communityRoutes = require('./routes/community.routes');
const startCronJobs = require('./utils/cronJobs');

const app = express();

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN || 'https://placeholder@o0.ingest.sentry.io/0',
  integrations: [
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 1.0, 
  profilesSampleRate: 1.0, 
});

// The request handler must be the first middleware on the app
Sentry.setupExpressErrorHandler(app);

// Performance & Security Middlewares
app.use(compression()); // Gzip compression
app.use(helmet());
app.use(cors());

const mongoSanitize = require('express-mongo-sanitize');

// Rate Limiting with Redis
const RedisStore = require('rate-limit-redis').default;
const redisClient = require('./config/redis');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  // store: new RedisStore({
  //   sendCommand: (...args) => redisClient.call(...args),
  // }),
});
app.use('/api/', limiter);

// Body Parser
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Data Sanitization against NoSQL query injection
app.use(mongoSanitize());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'AI Study Helper Backend is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/progress', userProgressRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/documents', require('./routes/documents.routes'));
app.use('/api/webhooks/admob', require('./routes/admob.routes'));

// Start Cron Jobs
startCronJobs();

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

module.exports = app;

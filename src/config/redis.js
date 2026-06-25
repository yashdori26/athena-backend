const Redis = require('ioredis');

// Connect to local Redis instance by default
// In production, this would be a URL from an environment variable (e.g., REDIS_URL)
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redisClient.on('connect', () => {
    console.log('✅ Redis client connected successfully');
});

redisClient.on('error', (err) => {
    // console.log('❌ Redis client connection error:', err);
});

module.exports = redisClient;

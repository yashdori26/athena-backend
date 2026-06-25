const redisClient = require('../config/redis');

// Standard TTL cache set to 24 hours (86400 seconds)
const TTL_SECONDS = 86400;

/**
 * Normalizes and cleans a topic string for reliable caching keys
 */
const _normalizeKey = (topic) => {
  return topic.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
};

module.exports = {
  get: async (keyPrefix, topic) => {
    try {
      const data = await redisClient.get(`${keyPrefix}_${_normalizeKey(topic)}`);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (e) {
      console.error('Redis Get Error:', e);
      return null;
    }
  },
  
  set: async (keyPrefix, topic, data) => {
    try {
      await redisClient.setex(`${keyPrefix}_${_normalizeKey(topic)}`, TTL_SECONDS, JSON.stringify(data));
    } catch (e) {
      console.error('Redis Set Error:', e);
    }
  },
  
  flush: async () => {
    try {
      await redisClient.flushall();
    } catch (e) {
      console.error('Redis Flush Error:', e);
    }
  }
};

import { fail } from '../utils/response.js';

export function rateLimit({ windowMs = 60 * 1000, max = 30, message = 'Too many requests, please try again later.' } = {}) {
  const requests = new Map();

  // Periodic cleanup
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of requests.entries()) {
      if (now - record.startTime > windowMs) {
        requests.delete(key);
      }
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const key = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();

    let record = requests.get(key);
    if (!record || now - record.startTime > windowMs) {
      record = { count: 1, startTime: now };
      requests.set(key, record);
    } else {
      record.count += 1;
    }

    if (record.count > max) {
      res.setHeader('Retry-After', Math.ceil((record.startTime + windowMs - now) / 1000));
      return fail(res, 429, message);
    }

    next();
  };
}

export default rateLimit;

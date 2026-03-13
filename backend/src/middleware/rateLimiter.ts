import rateLimit from "express-rate-limit";

// General API rate limit
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 1000,                    // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
});

// Stricter limit for feedback creation
// Prevents spam
export const createFeedbackLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 105,                      // 5 submissions per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many feedback submissions, please wait",
  },
  // Use Redis store in production for distributed rate limiting
  // store: new RedisStore({
  //   sendCommand: (...args) => getRedisClient().call(...args),
  // }),
});
import express from "express";
import cors from "cors";
import helmet from "helmet";
import feedbackRoutes from "./routes/feedback.routes";
import { errorHandler } from "./middleware/errorHandler";
import { generalLimiter } from "./middleware/rateLimiter";
import { logger } from "./config/logger";
import { metrics } from "./utils/metrics";

const app = express();

// ════════════════════════════
// Security middleware
// ════════════════════════════
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PATCH"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json({ limit: "10kb" })); // prevent large payloads
app.use(generalLimiter);

// ════════════════════════════
// Request logging
// ════════════════════════════
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration,
    });

    metrics.increment("http_requests_total");
    metrics.recordTiming("http_request_duration", duration);
  });

  next();
});

// ════════════════════════════
// Health check
// ════════════════════════════
app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    metrics: metrics.getSnapshot(),
  });
});

// ════════════════════════════
// API routes
// ════════════════════════════
app.use("/api/feedback", feedbackRoutes);

// ════════════════════════════
// Error handler (must be last)
// ════════════════════════════
app.use(errorHandler);

export default app;
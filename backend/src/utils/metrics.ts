import { Feedback } from "../models/feedback.model";
import { logger } from "../config/logger";

// Simple in-memory metrics (use Prometheus/Datadog in production)
class MetricsCollector {
  private counters: Map<string, number> = new Map();
  private timers: Map<string, number[]> = new Map();

  increment(metric: string, value = 1): void {
    const current = this.counters.get(metric) || 0;
    this.counters.set(metric, current + value);
  }

  recordTiming(metric: string, durationMs: number): void {
    const timings = this.timers.get(metric) || [];
    timings.push(durationMs);
    // Keep only last 1000 entries
    if (timings.length > 1000) timings.shift();
    this.timers.set(metric, timings);
  }

  getSnapshot(): Record<string, unknown> {
    const snapshot: Record<string, unknown> = {};

    for (const [key, value] of this.counters) {
      snapshot[key] = value;
    }

    for (const [key, timings] of this.timers) {
      if (timings.length === 0) continue;
      const sorted = [...timings].sort((a, b) => a - b);
      snapshot[`${key}_p50`] = sorted[Math.floor(sorted.length * 0.5)];
      snapshot[`${key}_p95`] = sorted[Math.floor(sorted.length * 0.95)];
      snapshot[`${key}_p99`] = sorted[Math.floor(sorted.length * 0.99)];
      snapshot[`${key}_avg`] =
        sorted.reduce((a, b) => a + b, 0) / sorted.length;
    }

    return snapshot;
  }
}

export const metrics = new MetricsCollector();
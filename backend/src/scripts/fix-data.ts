// backend/src/scripts/fix-data.ts

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { Feedback } from "../models/feedback.model";

async function fixData() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log("Connected to MongoDB\n");

  // ═══════════════════════════════
  // Fix all [Fallback] prefixes
  // ═══════════════════════════════

  const allFeedback = await Feedback.find({});
  let fixedCount = 0;

  for (const doc of allFeedback) {
    if (doc.summary && doc.summary.includes("[Fallback]")) {
      // Remove ALL instances of [Fallback]
      let cleanSummary = doc.summary;
      while (cleanSummary.includes("[Fallback]")) {
        cleanSummary = cleanSummary.replace("[Fallback]", "");
      }
      cleanSummary = cleanSummary.trim();

      // If nothing meaningful left, use the message
      if (!cleanSummary || cleanSummary === "..." || cleanSummary.length < 3) {
        cleanSummary = (doc.message || "No message").substring(0, 120);
      }

      await Feedback.findByIdAndUpdate(doc._id, {
        summary: cleanSummary,
      });

      console.log(`Fixed: ${doc._id}`);
      console.log(`  Before: ${doc.summary}`);
      console.log(`  After:  ${cleanSummary}\n`);
      fixedCount++;
    }
  }

  console.log(`\nFixed ${fixedCount} records out of ${allFeedback.length} total`);

  await mongoose.disconnect();
  process.exit(0);
}

fixData().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
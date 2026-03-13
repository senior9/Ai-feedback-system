import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { logger } from "../config/logger";
import type { AIAnalysisResult } from "../types/feedback.types";

// Schema
const analysisSchema = z.object({
  category: z.enum([
    "payment", "ui_bug", "feature_request",
    "performance", "security", "onboarding", "other",
  ]),
  priority: z.enum(["critical", "high", "medium", "low"]),
  sentiment: z.enum(["positive", "negative", "neutral"]),
  team: z.enum([
    "payments", "frontend", "product",
    "infrastructure", "security", "growth", "general",
  ]),
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1).max(300),
});

// ════════════════════════════════════════════
// PROMPT BUILDERS — Plain strings, NO PromptTemplate
// ════════════════════════════════════════════

function buildClassificationPrompt(message: string): string {
  return `You are a senior customer support AI analyst.
Classify this feedback accurately.

CATEGORIES:
- "payment": billing, charges, refunds, subscription, pricing, invoices, checkout
- "ui_bug": visual glitches, layout broken, buttons not working, CSS, rendering
- "feature_request": new functionality, suggestions, improvements, wishlist
- "performance": slow loading, timeouts, crashes, downtime, latency, outages
- "security": vulnerabilities, authentication, passwords, data privacy, breaches
- "onboarding": signup problems, getting started, tutorials, registration
- "other": general feedback, praise, doesn't fit above

PRIORITY:
- "critical": data loss, security breach, complete outage, payment stuck
- "high": core feature broken, significant user impact, revenue affected
- "medium": non-critical bug, moderate inconvenience, workaround exists
- "low": cosmetic issue, small suggestion, positive feedback

TEAMS:
- "payments": money-related issues
- "frontend": UI/UX bugs, visual issues
- "product": feature requests, suggestions
- "infrastructure": performance, downtime, API issues
- "security": auth, data privacy, vulnerabilities
- "growth": onboarding, signup, conversion
- "general": everything else

EXAMPLES:

Input: "I was charged twice for my subscription"
Output: {"category":"payment","priority":"high","sentiment":"negative","team":"payments","confidence":0.95,"summary":"Double charged for subscription"}

Input: "Submit button doesn't work on mobile Safari"
Output: {"category":"ui_bug","priority":"high","sentiment":"negative","team":"frontend","confidence":0.94,"summary":"Submit button broken on mobile Safari"}

Input: "Love the new dark mode! Great work!"
Output: {"category":"other","priority":"low","sentiment":"positive","team":"general","confidence":0.90,"summary":"Positive feedback about dark mode"}

Input: "Platform has been down for 2 hours. Team is blocked."
Output: {"category":"performance","priority":"critical","sentiment":"negative","team":"infrastructure","confidence":0.98,"summary":"Complete platform outage for 2 hours"}

Input: "My account was accessed from an unknown IP in Russia"
Output: {"category":"security","priority":"critical","sentiment":"negative","team":"security","confidence":0.97,"summary":"Possible account compromise from foreign IP"}

Input: "Would be nice to have CSV export for reports"
Output: {"category":"feature_request","priority":"medium","sentiment":"neutral","team":"product","confidence":0.91,"summary":"User requests CSV export for reports"}

Input: "I just signed up but have no idea what to do first"
Output: {"category":"onboarding","priority":"medium","sentiment":"negative","team":"growth","confidence":0.92,"summary":"New user confused, no onboarding guidance"}

Input: "The product is okay. Nothing special."
Output: {"category":"other","priority":"low","sentiment":"neutral","team":"general","confidence":0.85,"summary":"Generic neutral feedback"}

Input: "Credit card keeps getting declined. Works on other sites."
Output: {"category":"payment","priority":"high","sentiment":"negative","team":"payments","confidence":0.91,"summary":"Credit cards being declined, work elsewhere"}

Input: "Session tokens not invalidated after password change"
Output: {"category":"security","priority":"critical","sentiment":"negative","team":"security","confidence":0.98,"summary":"Security vulnerability - tokens persist after password change"}

NOW CLASSIFY THIS FEEDBACK:
"${message}"

IMPORTANT:
- Respond with ONLY a raw JSON object
- No markdown, no code blocks, no backticks, no explanation
- Just the JSON starting with { and ending with }
- confidence should be between 0.70 and 0.99`;
}

function buildVerificationPrompt(
  message: string,
  first: AIAnalysisResult
): string {
  return `You verify feedback classifications.

FEEDBACK: "${message}"

CURRENT CLASSIFICATION:
category: ${first.category}
priority: ${first.priority}
sentiment: ${first.sentiment}
team: ${first.team}
confidence: ${first.confidence}
summary: ${first.summary}

Is this correct? If yes, return same values. If wrong, fix them.

Respond with ONLY a raw JSON object. No markdown. No explanation.`;
}

// ════════════════════════════════════════════
// AI SERVICE CLASS
// ════════════════════════════════════════════

export class AIService {
  private model: ChatGoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
      logger.error("GOOGLE_AI_API_KEY is missing!");
      throw new Error("Missing GOOGLE_AI_API_KEY");
    }

    logger.info(
      { keyPrefix: apiKey.substring(0, 8) + "...", keyLength: apiKey.length },
      "AI Service initialized"
    );

    this.model = new ChatGoogleGenerativeAI({
    modelName: "gemini-1.5-pro",
    apiKey,
    temperature: 0.1,
    maxOutputTokens: 500,
});
  }

  // Clean AI response
  private cleanResponse(raw: string): string {
    let cleaned = raw.trim();

    // Remove markdown
    cleaned = cleaned.replace(/```json\s*/gi, "");
    cleaned = cleaned.replace(/```\s*/gi, "");
    cleaned = cleaned.trim();

    // Find JSON
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("No JSON found in AI response");
    }

    cleaned = cleaned.slice(start, end + 1);
    cleaned = cleaned.replace(/,\s*}/g, "}");

    return cleaned;
  }

  // Parse and validate
  private parse(rawContent: string, label: string): AIAnalysisResult {
    const cleaned = this.cleanResponse(rawContent);

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      logger.error({ cleaned: cleaned.substring(0, 200), label }, "JSON parse failed");
      throw new Error(`JSON parse failed (${label})`);
    }

    const result = analysisSchema.safeParse(parsed);
    if (!result.success) {
      logger.error({ parsed, errors: result.error.errors, label }, "Validation failed");
      throw new Error(`Validation failed (${label})`);
    }

    return result.data;
  }

  // Call Gemini with timeout
  private async callGemini(prompt: string, label: string): Promise<string> {
    const startTime = Date.now();

    logger.info({ label, promptLength: prompt.length }, "Calling Gemini");

    try {
      const response = await Promise.race([
        this.model.invoke(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Gemini timeout after 30s")), 30000)
        ),
      ]);

      const content =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      logger.info(
        { label, durationMs: Date.now() - startTime, responseLength: content.length },
        "Gemini responded"
      );

      return content;
    } catch (error) {
      logger.error(
        {
          label,
          durationMs: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error),
        },
        "Gemini call FAILED"
      );
      throw error;
    }
  }

  // Business rules
  private applyRules(message: string, result: AIAnalysisResult): AIAnalysisResult {
    const lower = message.toLowerCase();
    const modified = { ...result };

    // Security → critical
    if (/breach|hack|compromised|unauthorized|data leak|vulnerability|exploit/.test(lower)) {
      modified.priority = "critical";
      modified.team = "security";
      modified.category = "security";
    }

    // Payment stuck → critical
    if (/charged twice|double charged|payment stuck|money lost|fraudulent/.test(lower)) {
      modified.priority = "critical";
      modified.team = "payments";
      modified.category = "payment";
    }

    // Outage → critical
    if (/completely down|total outage|site is down|nothing works/.test(lower)) {
      modified.priority = "critical";
      modified.team = "infrastructure";
      modified.category = "performance";
    }

    // Team-category alignment
    const align: Record<string, string> = {
      payment: "payments",
      security: "security",
      onboarding: "growth",
      ui_bug: "frontend",
      performance: "infrastructure",
      feature_request: "product",
    };
    if (align[modified.category]) {
      modified.team = align[modified.category] as AIAnalysisResult["team"];
    }

    // Positive + critical = wrong
    if (modified.sentiment === "positive" && modified.priority === "critical") {
      if (!/but|however|issue|problem/.test(lower)) {
        modified.priority = "low";
      }
    }

    return modified;
  }

  // ════════════════════════════════════════════
  // MAIN METHOD
  // ════════════════════════════════════════════

  async analyzeFeedback(message: string): Promise<AIAnalysisResult> {
    const startTime = Date.now();

    logger.info({ messageLength: message.length }, "Starting AI analysis");

    // PASS 1 — Classification
    const prompt = buildClassificationPrompt(message);
    const rawResponse = await this.callGemini(prompt, "classify");
    const firstResult = this.parse(rawResponse, "first-pass");

    logger.info(
      {
        category: firstResult.category,
        priority: firstResult.priority,
        confidence: firstResult.confidence,
      },
      "First pass done"
    );

    // PASS 2 — Only if confidence < 0.80
    let finalResult: AIAnalysisResult;

    if (firstResult.confidence < 0.80) {
      try {
        const verifyPrompt = buildVerificationPrompt(message, firstResult);
        const verifyResponse = await this.callGemini(verifyPrompt, "verify");
        const secondResult = this.parse(verifyResponse, "second-pass");

        const agree =
          firstResult.category === secondResult.category &&
          firstResult.priority === secondResult.priority;

        finalResult = agree
          ? {
              ...secondResult,
              confidence: Math.min(
                (firstResult.confidence + secondResult.confidence) / 2 + 0.1,
                0.99
              ),
            }
          : secondResult.confidence >= firstResult.confidence
            ? secondResult
            : firstResult;
      } catch {
        finalResult = firstResult;
      }
    } else {
      finalResult = firstResult;
    }

    // Apply business rules
    finalResult = this.applyRules(message, finalResult);

    logger.info(
      {
        ...finalResult,
        durationMs: Date.now() - startTime,
      },
      "AI analysis COMPLETE"
    );

    return finalResult;
  }

  // ════════════════════════════════════════════
  // FALLBACK — No [Fallback] prefix
  // ════════════════════════════════════════════

  static fallbackAnalysis(message: string): AIAnalysisResult {
    const lower = message.toLowerCase();

    const scores: Record<string, number> = {
      payment: 0, ui_bug: 0, feature_request: 0,
      performance: 0, security: 0, onboarding: 0, other: 1,
    };

    if (/pay|bill|charge|refund|subscri|pric|invoice|checkout|credit|money/.test(lower)) scores.payment += 5;
    if (/bug|broken|glitch|display|layout|button|render|css|visual|click/.test(lower)) scores.ui_bug += 5;
    if (/feature|wish|suggest|would be nice|add|please add|missing|want/.test(lower)) scores.feature_request += 5;
    if (/slow|timeout|crash|down|latency|loading|speed|lag|outage/.test(lower)) scores.performance += 5;
    if (/secur|hack|leak|auth|password|vulnerab|breach|token/.test(lower)) scores.security += 5;
    if (/signup|sign up|onboard|register|getting started|tutorial/.test(lower)) scores.onboarding += 5;

    let category: AIAnalysisResult["category"] = "other";
    let maxScore = 0;
    for (const [cat, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        category = cat as AIAnalysisResult["category"];
      }
    }

    const teamMap: Record<string, AIAnalysisResult["team"]> = {
      payment: "payments", ui_bug: "frontend", feature_request: "product",
      performance: "infrastructure", security: "security",
      onboarding: "growth", other: "general",
    };

    let priority: AIAnalysisResult["priority"] = "medium";
    if (/urgent|emergency|critical|asap|blocking/.test(lower)) priority = "critical";
    else if (/important|serious|broken|not working/.test(lower)) priority = "high";
    else if (/minor|cosmetic|nice to have/.test(lower)) priority = "low";

    let sentiment: AIAnalysisResult["sentiment"] = "neutral";
    if (/angry|terrible|worst|hate|awful|frustrated|unacceptable/.test(lower)) sentiment = "negative";
    else if (/love|great|awesome|thank|excellent|amazing/.test(lower)) sentiment = "positive";

    const confidence = maxScore > 0 ? 0.45 : 0.20;

    // NO PREFIX — clean summary
    const summary = message.length > 120
      ? message.substring(0, 120) + "..."
      : message;

    return {
      category,
      priority,
      sentiment,
      team: teamMap[category] || "general",
      confidence,
      summary,
    };
  }
}
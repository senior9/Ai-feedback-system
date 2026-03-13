import dotenv from "dotenv";
dotenv.config();

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const apiKey = process.env.GOOGLE_AI_API_KEY!;

// All possible Gemini model names
const models = [
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
  "gemini-1.5-flash-001",
  "gemini-1.5-flash-002",
  "gemini-1.5-pro-latest",
  "gemini-1.5-pro",
  "gemini-pro",
  "gemini-pro-latest",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
];

async function findFreeModel() {
  console.log("\n══════════════════════════════════════════");
  console.log("   FINDING MODEL WITH FREE QUOTA");
  console.log("══════════════════════════════════════════\n");

  let workingModel = null;

  for (const modelName of models) {
    process.stdout.write(`Testing ${modelName.padEnd(25)} `);

    try {
      const model = new ChatGoogleGenerativeAI({
        modelName,
        apiKey,
        temperature: 0.1,
        maxOutputTokens: 50,
      });

      await model.invoke("Say OK");

      console.log("✅ WORKS!");
      workingModel = modelName;
      break; // Found one that works!

    } catch (error: any) {
      const msg = error.message || "";

      if (msg.includes("429") || msg.includes("quota")) {
        console.log("❌ No quota");
      } else if (msg.includes("404") || msg.includes("not found")) {
        console.log("❌ Not found");
      } else if (msg.includes("400")) {
        console.log("❌ Bad request");
      } else {
        console.log("❌ Error");
      }
    }

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log("\n══════════════════════════════════════════");

  if (workingModel) {
    console.log(`\n✅ USE THIS MODEL: "${workingModel}"\n`);
    console.log("Update ai.service.ts:");
    console.log(`  modelName: "${workingModel}",\n`);
  } else {
    console.log("\n❌ No free models available!");
    console.log("\nOptions:");
    console.log("1. Wait 24 hours for quota reset");
    console.log("2. Create a new Google Cloud project");
    console.log("3. Enable billing on your project\n");
  }

  process.exit(0);
}

findFreeModel().catch(console.error);
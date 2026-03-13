// backend/src/scripts/test-ai.ts

import dotenv from "dotenv";
dotenv.config();

async function testAI() {
  console.log("\n══════════════════════════════════");
  console.log("        AI DIAGNOSTIC TEST");
  console.log("══════════════════════════════════\n");

  // CHECK 1: API Key
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  console.log("1. API Key Check:");
  console.log("   Exists:", !!apiKey);
  console.log("   Length:", apiKey?.length || 0);
  console.log("   Prefix:", apiKey?.substring(0, 10) || "MISSING");
  console.log("");

  if (!apiKey || apiKey.length < 20) {
    console.log("❌ API key missing or invalid\n");
    process.exit(1);
  }

  // CHECK 2: Package
  console.log("2. Package Check:");
  try {
    const { ChatGoogleGenerativeAI } = await import("@langchain/google-genai");
    console.log("   @langchain/google-genai: ✅ installed\n");

    // CHECK 3: Model
    console.log("3. Model Check:");
    const model = new ChatGoogleGenerativeAI({
      modelName: "gemini-1.5-pro",    // ✅ UPDATED MODEL
      apiKey: apiKey,
      temperature: 0.1,
      maxOutputTokens: 200,
    });
    console.log("   Model created: ✅\n");

    // CHECK 4: API Call
    console.log("4. API Call Check:");
    console.log("   Calling Gemini...\n");

    const startTime = Date.now();

    try {
      const response = await model.invoke(
        'Reply with only: {"status":"working"}'
      );

      const duration = Date.now() - startTime;
      const content =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      console.log("   ✅ SUCCESS!");
      console.log("   Duration:", duration, "ms");
      console.log("   Response:", content.substring(0, 100));
      console.log("");

    } catch (apiError: any) {
      console.log("   ❌ FAILED");
      console.log("   Error:", apiError.message);
      console.log("");

      // Try alternative models
      console.log("   Trying alternative models...\n");

      const alternativeModels = [
        "gemini-2.0-flash-lite",
        "gemini-pro",
        "gemini-1.5-pro",
      ];

      for (const altModel of alternativeModels) {
        try {
          console.log(`   Testing ${altModel}...`);
          const altModelInstance = new ChatGoogleGenerativeAI({
            modelName: altModel,
            apiKey: apiKey,
            temperature: 0.1,
            maxOutputTokens: 100,
          });

          const altResponse = await altModelInstance.invoke("Say hi");
          console.log(`   ✅ ${altModel} WORKS!\n`);
          console.log(`   👉 Use modelName: "${altModel}" in ai.service.ts\n`);
          break;
        } catch {
          console.log(`   ❌ ${altModel} failed\n`);
        }
      }

      process.exit(1);
    }

    // CHECK 5: Classification
    console.log("5. Classification Check:");

    try {
      const classifyResponse = await model.invoke(
        `Classify: "I was charged twice for my subscription"

Reply with ONLY JSON: {"category":"payment","priority":"high","sentiment":"negative","team":"payments","confidence":0.95,"summary":"Double charged"}`
      );

      const content =
        typeof classifyResponse.content === "string"
          ? classifyResponse.content
          : JSON.stringify(classifyResponse.content);

      console.log("   ✅ Classification works!");
      console.log("   Response:", content.substring(0, 150));

    } catch (classifyError: any) {
      console.log("   ❌ Classification failed:", classifyError.message);
    }

  } catch (importError: any) {
    console.log("   ❌ Import failed:", importError.message);
    process.exit(1);
  }

  console.log("\n══════════════════════════════════");
  console.log("           ALL TESTS DONE");
  console.log("══════════════════════════════════\n");

  process.exit(0);
}

testAI().catch(console.error);
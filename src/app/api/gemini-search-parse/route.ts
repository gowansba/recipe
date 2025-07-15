

import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: Request) {
  console.log("Received request for Gemini keyword extraction.");
  let text;
  try {
    const body = await request.json();
    text = body.text;
    console.log("Request body text:", text ? text.substring(0, 100) + '...' : 'No text');
  } catch (e) {
    console.error("Failed to parse request JSON body:", e);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }


  if (!text) {
    console.log("No text provided in request.");
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set in environment variables.");
      return NextResponse.json({ error: "Gemini API key is not configured." }, { status: 500 });
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an expert at understanding user search queries for recipes. Your goal is to extract the key ingredients and search terms from a user's query. The output should be a JSON object with a single key, "keywords", which is an array of strings.

    For example, if the user says "I want to make dinner with chicken and rice", the output should be:
    {
      "keywords": ["chicken", "rice"]
    }

    If the user says "show me some dessert recipes", the output should be:
    {
      "keywords": ["dessert"]
    }

    User Query:
    ${text}

    JSON Output:`;

    let result;
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`Sending prompt to Gemini (Attempt ${i + 1})`);
        result = await model.generateContent(prompt);
        break; // Success, exit loop
      } catch (error: any) {
        if (error.status === 503 && i < maxRetries - 1) {
          console.warn(`Gemini API is overloaded. Retrying in ${i + 1} second(s)...`);
          await delay((i + 1) * 1000);
        } else {
          throw error; // Re-throw other errors or on last retry
        }
      }
    }

    if (!result) {
        throw new Error("AI model failed to generate content after multiple retries.");
    }

    const response = await result.response;
    const geminiText = response.text();
    console.log("Gemini raw text response:", geminiText);

    let parsedResult: { keywords: string[] };
    try {
      const jsonMatch = geminiText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        parsedResult = JSON.parse(jsonMatch[1]);
        console.log("Successfully parsed JSON from markdown block.");
      } else {
        parsedResult = JSON.parse(geminiText);
        console.log("Successfully parsed raw JSON.");
      }
    } catch (jsonError) {
      console.error("Failed to parse Gemini's JSON response:", jsonError);
      console.error("Gemini's raw response that failed parsing:", geminiText);
      return NextResponse.json({ error: "Failed to parse Gemini's response", rawResponse: geminiText }, { status: 500 });
    }

    console.log("Returning extracted keywords:", parsedResult.keywords);
    return NextResponse.json(parsedResult);

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return NextResponse.json({ error: "Failed to process search query with AI. The service may be temporarily unavailable." }, { status: 500 });
  }
}


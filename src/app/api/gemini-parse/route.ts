import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

interface IngredientGroup {
  name: string;
  ingredients: string[];
}

interface ParsedRecipe {
  recipeName: string;
  categories: string[];
  ingredientGroups: IngredientGroup[];
  instructions: string[];
}

export async function POST(request: Request) {
  const { text } = await request.json();

  if (!text) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not set.");
      return NextResponse.json({ error: "Gemini API key is not configured." }, { status: 500 });
    }
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an expert recipe parser and enhancer. Your goal is to take raw recipe text and transform it into a highly readable, user-friendly, and structured JSON object. Focus on clarity, conciseness, and ease of use for someone actually making the recipe.

    The JSON object should have the following keys:
    - recipeName: string (e.g., "Classic Chocolate Chip Cookies") - Infer a clear and appealing name if not explicitly stated.
    - categories: string[] (e.g., ["dessert", "baking"]) - Choose relevant categories from: breakfast, snacks, lunch, appetizers, dinner, dessert, sauce, misc. Select all that apply.
    - ingredientGroups: { name: string; ingredients: string[] }[] - This is crucial for readability. Group ingredients logically based on their use in the recipe (e.g., "Dry Ingredients", "Wet Ingredients", "For the Sauce", "Garnish"). If no logical groups are apparent, use a single group named "Ingredients". Ensure each ingredient is a separate string.
    - instructions: string[] - Break down instructions into clear, concise, actionable steps. Each step should be a single sentence or a very short phrase. **DO NOT include any numbering (e.g., "1.", "2.") in the instructions themselves; the UI will handle numbering.** Remove any unnecessary conversational filler. Focus on the essential actions a user needs to take.

    Here are some guidelines for enhancement:
    - **Ingredient Grouping:** If the instructions mention combining "dry ingredients" or "wet ingredients," create corresponding groups. If a specific component (like a sauce or frosting) has its own set of ingredients, create a group for it.
    - **Instruction Clarity:** Rewrite verbose instructions to be direct and easy to follow. For example, "Take a large bowl and carefully combine the flour, sugar, and baking powder together" should become "Combine flour, sugar, and baking powder in a large bowl."
    - **Conciseness:** Eliminate redundant words or phrases.
    - **Action-Oriented:** Start instructions with action verbs.

    Recipe Text:\n\n${text}\n\nJSON Output:`;

    console.log("Sending prompt to Gemini:", prompt);
    const result = await model.generateContent(prompt);
    console.log("Received result from Gemini.");
    const response = await result.response;
    const geminiText = response.text();
    console.log("Gemini raw text response:", geminiText);

    // Attempt to parse the JSON string from Gemini's response
    console.log("Attempting to parse Gemini's response as JSON.");
    let parsedRecipe: ParsedRecipe; // Explicitly type parsedRecipe
    try {
      // Gemini might return markdown code block, so try to extract JSON
      const jsonMatch = geminiText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        parsedRecipe = JSON.parse(jsonMatch[1]);
        console.log("Successfully parsed JSON from markdown block.");
      } else {
        parsedRecipe = JSON.parse(geminiText);
        console.log("Successfully parsed raw JSON.");
      }
    } catch (jsonError: unknown) {
      console.error("Failed to parse Gemini's response as JSON:", jsonError);
      console.error("Gemini's raw response:", geminiText);
      let errorMessage = "Unknown JSON parsing error.";
      if (jsonError instanceof Error) {
        errorMessage = jsonError.message;
      }
      return NextResponse.json({ error: "Failed to parse Gemini's response as JSON", rawResponse: geminiText, details: errorMessage }, { status: 500 });
    }

    console.log("Returning parsed recipe:", parsedRecipe);
    console.log("Parsed categories from Gemini:", parsedRecipe.categories);
    return NextResponse.json(parsedRecipe);
  } catch (error: unknown) {
      console.error("Error calling Gemini API:", error);
      let errorMessage = "Unknown Gemini API error.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      return NextResponse.json({ error: "Failed to process recipe with AI", details: errorMessage }, { status: 500 });
  }
}
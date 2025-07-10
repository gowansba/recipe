export interface IngredientGroup {
  name: string;
  ingredients: string[];
}

export interface ParsedRecipe {
  recipeName: string;
  categories: string[];
  ingredientGroups: IngredientGroup[];
  instructions: string[];
}

export async function parseRecipeWithAI(rawText: string): Promise<ParsedRecipe> {
  const response = await fetch("/api/gemini-parse", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: rawText }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("AI parsing failed:", errorData);
    throw new Error(errorData.error || "Failed to parse recipe with AI");
  }

  const data = await response.json();
  return data;
}
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { parseRecipeWithAI, ParsedRecipe, IngredientGroup } from '@/lib/ai-parser';

export default function AITextInputPage() {
  const [rawText, setRawText] = useState<string>("");
  const [parsedRecipeDraft, setParsedRecipeDraft] = useState<ParsedRecipe | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [stage, setStage] = useState<"input" | "preview">("input");

  const router = useRouter();

  const handleParseWithAI = async () => {
    setLoading(true);
    try {
      const parsed = await parseRecipeWithAI(rawText);
      setParsedRecipeDraft(parsed);
      setStage("preview");
    } catch (error) {
      console.error("Error parsing text with AI:", error);
      alert("Failed to parse recipe with AI. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditManually = () => {
    localStorage.setItem("draftRecipe", JSON.stringify(parsedRecipeDraft));
    router.push("/create/manual");
  };

  const handleReviseWithAI = () => {
    alert("AI revision is coming soon!");
    console.log("Revising with AI:", parsedRecipeDraft);
  };

  const handlePublish = () => {
    const existingRecipes = JSON.parse(localStorage.getItem("allRecipes") || "[]");
    localStorage.setItem("allRecipes", JSON.stringify([...existingRecipes, parsedRecipeDraft]));

    alert("Recipe published to your recipe book!");
    router.push("/book");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Help with AI (Text Input)</CardTitle>
          <CardDescription>
            {stage === "input"
              ? "Paste your recipe text below and let AI structure it for you."
              : "Review the AI-parsed recipe and choose your next step."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stage === "input" && (
            <div className="flex flex-col gap-4">
              <Textarea
                placeholder="Paste your recipe text here..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={15}
                className="font-mono text-sm"
              />
              <Button
                onClick={handleParseWithAI}
                disabled={rawText.trim() === "" || loading}
                className="w-full"
              >
                {loading ? "Parsing..." : "Parse with AI"}
              </Button>
            </div>
          )}

          {stage === "preview" && parsedRecipeDraft && (
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold">AI-Parsed Recipe Draft:</h3>
              <div className="border p-4 rounded-md bg-gray-50 overflow-auto max-h-[400px]">
                <h4 className="font-bold">Recipe Name:</h4>
                <p>{parsedRecipeDraft.recipeName}</p>
                <h4 className="font-bold mt-2">Categories:</h4>
                <p>{parsedRecipeDraft.categories.join(", ")}</p>
                <h4 className="font-bold mt-2">Ingredients:</h4>
                {parsedRecipeDraft.ingredientGroups.map((group: IngredientGroup, i: number) => (
                  <div key={i} className="ml-4">
                    <h5 className="font-semibold">{group.name}</h5>
                    <ul className="list-disc pl-5">
                      {group.ingredients.map((ing: string, j: number) => (
                        <li key={j}>{ing}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                <h4 className="font-bold mt-2">Instructions:</h4>
                <ol className="list-decimal pl-5">
                  {parsedRecipeDraft.instructions.map((inst: string, i: number) => (
                    <li key={i}>{inst}</li>
                  ))}
                </ol>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleEditManually}>Edit Manually</Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleReviseWithAI}>
                        Revise with AI
                        <Info className="ml-2 h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>AI will help revise the recipe for best readability and scanning when making the recipe.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button onClick={handlePublish}>Publish to Recipe Book</Button>
              </div>
            </div>
          )}
        </CardContent>
        <CardDescription className="p-6 pt-0">
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </CardDescription>
      </Card>
    </main>
  );
}
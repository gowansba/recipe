"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { parseRecipeWithAI, ParsedRecipe, IngredientGroup } from '@/lib/ai-parser';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showNoMatchDialog, setShowNoMatchDialog] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoadingUser(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!loadingUser && !user) {
      router.push("/login");
    }
  }, [loadingUser, user, router]);

  if (loadingUser) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <p>Loading user session...</p>
      </main>
    );
  }

  if (!user) {
    return null; // Render nothing while redirecting
  };

  const handleSearch = async () => {
    setLoadingSearch(true);
    const allRecipes: ParsedRecipe[] = JSON.parse(localStorage.getItem("allRecipes") || "[]");
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    const matchedRecipes = allRecipes.filter((recipe: ParsedRecipe) => {
      const nameMatch = recipe.recipeName.toLowerCase().includes(lowerCaseSearchTerm);
      const ingredientsMatch = recipe.ingredientGroups.some((group: IngredientGroup) =>
        group.ingredients.some((ing: string) => ing.toLowerCase().includes(lowerCaseSearchTerm))
      );
      const categoriesMatch = recipe.categories.some((cat: string) => cat.toLowerCase().includes(lowerCaseSearchTerm));
      return nameMatch || ingredientsMatch || categoriesMatch;
    });

    if (matchedRecipes.length > 0) {
      localStorage.setItem("filteredRecipes", JSON.stringify(matchedRecipes));
      router.push("/book");
    } else {
      setShowNoMatchDialog(true);
    }
    setLoadingSearch(false);
  };

  const handleCreateAIRecipeFromSearch = async () => {
    setShowNoMatchDialog(false);
    setLoadingSearch(true);
    try {
      const promptText = `Create a recipe for: ${searchTerm}. Provide a recipe name, categories, ingredient groups, and instructions.`;
      const parsed = await parseRecipeWithAI(promptText);
      localStorage.setItem("draftRecipe", JSON.stringify(parsed));
      router.push("/create/manual");
    } catch (error) {
      console.error("Failed to create AI recipe from search:", error);
      alert("Failed to create recipe with AI. Please try again.");
    } finally {
      setLoadingSearch(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-4xl font-bold">Welcome to your Recipe Book</h1>
        <div className="flex w-full max-w-md items-center space-x-2 mb-4">
          <Input
            type="text"
            placeholder="Search recipes (e.g., chicken, rice, dinner)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
          />
          <Button type="submit" onClick={handleSearch} disabled={loadingSearch}>
            {loadingSearch ? "Searching..." : "Search"}
          </Button>
        </div>
        <div className="flex gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="lg">
                Create a new Recipe <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <Link href="/create/manual">Manual Input</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/create/photo">Upload Photo</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/create/ai-text">Help with AI (Text Input)</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="/book">
            <Button size="lg" variant="outline">View your Recipe Book</Button>
          </Link>
        </div>
      </div>

      <Dialog open={showNoMatchDialog} onOpenChange={setShowNoMatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No Recipes Found</DialogTitle>
            <DialogDescription>
              No recipes matched your search criteria. Would you like to create a new recipe based on your search?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreateAIRecipeFromSearch}>Create AI Recipe</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
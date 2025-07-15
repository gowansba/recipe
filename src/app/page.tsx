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
import { User } from '@supabase/supabase-js';

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showNoMatchDialog, setShowNoMatchDialog] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Import supabase client dynamically to avoid SSR issues
    const loadSupabase = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        
                 const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
           setUser(session?.user ?? null);
           setLoadingUser(false);
           if (event === 'SIGNED_OUT') {
             router.push('/login');
           }
         });

        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Failed to load Supabase:', error);
        setLoadingUser(false);
      }
    };

    loadSupabase();
  }, [router]);

  const handleLogout = async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleSearch = async () => {
    setLoadingSearch(true);
    console.log(`Searching for: ${searchTerm}`);

    if (!user) {
      router.push("/login");
      return;
    }

    try {
      // Step 1: Use AI to extract keywords from the natural language search term
      const aiResponse = await fetch("/api/gemini-search-parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: searchTerm }),
      });

      const aiResponseBody = await aiResponse.json();
      console.log("AI keyword extraction response:", aiResponseBody);

      if (!aiResponse.ok) {
        console.error("AI keyword extraction API returned an error:", aiResponseBody);
        throw new Error(aiResponseBody.error || "Failed to extract keywords with AI");
      }

      const { keywords } = aiResponseBody;
      console.log("Extracted keywords:", keywords);

      // Step 2: Use extracted keywords to search Supabase
      const supabaseSearchTerm = keywords.join(" "); // Join keywords for Supabase search
      const supabaseResponse = await fetch("/api/search-recipes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ searchTerm: supabaseSearchTerm, userId: user.id }),
      });

      if (!supabaseResponse.ok) {
        throw new Error("Failed to search recipes in Supabase");
      }

      const matchedRecipes = await supabaseResponse.json();
      console.log("Matched recipes from Supabase:", matchedRecipes);

      if (matchedRecipes.length > 0) {
        localStorage.setItem("filteredRecipes", JSON.stringify(matchedRecipes));
        router.push("/book");
      } else {
        setShowNoMatchDialog(true);
      }
    } catch (error) {
      console.error("Failed to perform intelligent search:", error);
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
    <main className="flex min-h-screen flex-col items-center justify-center p-24 relative">
      <div className="absolute top-8 right-8">
        {loadingUser ? (
          <p>...</p>
        ) : user ? (
          <div className="flex items-center gap-4">
            <p>{user.email}</p>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        ) : (
          <Link href="/login">
            <Button>Login</Button>
          </Link>
        )}
      </div>
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-4xl font-bold">Recipeasy</h1>
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
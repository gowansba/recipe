
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';

interface IngredientGroup {
  name: string;
  ingredients: string[];
}

interface Recipe {
  id?: string;
  recipeName: string;
  recipe_name?: string; // For Supabase compatibility
  categories: string[];
  ingredientGroups?: IngredientGroup[];
  ingredient_groups?: IngredientGroup[]; // For Supabase compatibility
  instructions: string[];
}

const allCategories = [
  { id: "all", label: "All Categories" },
  { id: "breakfast", label: "Breakfast" },
  { id: "snacks", label: "Snacks" },
  { id: "lunch", label: "Lunch" },
  { id: "appetizers", label: "Appetizers" },
  { id: "dinner", label: "Dinner" },
  { id: "dessert", label: "Dessert" },
  { id: "sauce", label: "Sauce" },
];



import { User } from '@supabase/supabase-js';

export default function RecipeBook() {
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]); // Stores ALL recipes from Supabase
  const [displayedRecipes, setDisplayedRecipes] = useState<Recipe[]>([]); // Recipes currently shown
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLetter, setSelectedLetter] = useState("");
  const [recipeToDeleteIndex, setRecipeToDeleteIndex] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentRecipeIndex, setCurrentRecipeIndex] = useState(0);
  const [showCoverPage, setShowCoverPage] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadSupabase = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
          setUser(session?.user ?? null);
        });

        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Failed to load Supabase:', error);
      }
    };

    loadSupabase();
  }, []);

  // Helper function to normalize recipe data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizeRecipe = useCallback((recipe: any): Recipe => ({
    id: recipe.id,
    recipeName: recipe.recipe_name || recipe.recipeName,
    categories: recipe.categories || [],
    ingredientGroups: recipe.ingredient_groups || recipe.ingredientGroups || [],
    instructions: recipe.instructions || []
  }), []);

  // Function to apply category and letter filters
  const applyFilters = useCallback((recipesToFilter: Recipe[]) => {
    console.log("Applying filters. Selected Category:", selectedCategory, "Selected Letter:", selectedLetter);
    console.log("Recipes to filter (initial):", recipesToFilter.map(r => r.recipeName));
    let tempRecipes = recipesToFilter;

    if (selectedCategory !== "all") {
      tempRecipes = tempRecipes.filter((recipe) => {
        const includesCategory = recipe.categories.map(cat => cat.toLowerCase()).includes(selectedCategory.toLowerCase());
        console.log(`Recipe: ${recipe.recipeName}, Categories: ${recipe.categories}, Includes ${selectedCategory}: ${includesCategory}`);
        return includesCategory;
      });
      console.log("Recipes after category filter:", tempRecipes.map(r => r.recipeName));
    }

    if (selectedLetter !== "") {
      tempRecipes = tempRecipes.filter((recipe) => {
        const startsWithLetter = recipe.recipeName.toLowerCase().startsWith(selectedLetter.toLowerCase());
        console.log(`Recipe: ${recipe.recipeName}, Starts with ${selectedLetter}: ${startsWithLetter}`);
        return startsWithLetter;
      });
      console.log("Recipes after letter filter:", tempRecipes.map(r => r.recipeName));
    }
    return tempRecipes;
  }, [selectedCategory, selectedLetter]);

  // Effect to load ALL recipes from Supabase and handle initial display
  useEffect(() => {
    const loadInitialRecipes = async () => {
      setLoading(true);
      try {
        const { getUserRecipes } = await import('@/lib/recipes');
        const result = await getUserRecipes();

        let fetchedRecipes: Recipe[] = [];
        if (result.success && result.data) {
          fetchedRecipes = result.data.map(normalizeRecipe);
          setAllRecipes(fetchedRecipes); // Store all fetched recipes
        } else {
          console.error('Error loading recipes from Supabase:', result.error);
          // Fallback to localStorage for backward compatibility if Supabase fails
          const storedAllRecipes = localStorage.getItem("allRecipes");
          fetchedRecipes = storedAllRecipes ? JSON.parse(storedAllRecipes).map(normalizeRecipe) : [];
          setAllRecipes(fetchedRecipes);
        }

        // Check for filtered recipes from search in localStorage
        const storedFilteredRecipes = localStorage.getItem("filteredRecipes");
        if (storedFilteredRecipes) {
          try {
            const parsedFilteredRecipes: Recipe[] = JSON.parse(storedFilteredRecipes).map(normalizeRecipe);
            setDisplayedRecipes(parsedFilteredRecipes); // Display filtered results initially
            localStorage.removeItem("filteredRecipes"); // Clear after use
            setShowCoverPage(false); // Go directly to results if search was performed
          } catch (e) {
            console.error("Error parsing filtered recipes from localStorage:", e);
            setDisplayedRecipes(fetchedRecipes); // Fallback to all recipes if parsing fails
            setShowCoverPage(fetchedRecipes.length === 0); // Show cover page if no recipes
          }
        } else {
          setDisplayedRecipes(fetchedRecipes); // Display all recipes if no initial filter
          setShowCoverPage(fetchedRecipes.length === 0); // Show cover page if no recipes
        }

      } catch (error) {
        console.error('Error during initial recipe load:', error);
        // Fallback to localStorage if any error during Supabase fetch
        const storedAllRecipes = localStorage.getItem("allRecipes");
        const fetchedRecipes: Recipe[] = storedAllRecipes ? JSON.parse(storedAllRecipes).map(normalizeRecipe) : [];
        setAllRecipes(fetchedRecipes);
        setDisplayedRecipes(applyFilters(fetchedRecipes)); // Apply filters even on error fallback
        setShowCoverPage(true); // Show cover page on error
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadInitialRecipes();
    }
  }, [user, normalizeRecipe, applyFilters]); // Runs when user state changes

  // Effect to re-apply filters when category or letter changes
  useEffect(() => {
    // Only re-filter if allRecipes has been loaded and it's not the initial load overriding search results
    if (allRecipes.length > 0 || !loading) { 
      const filtered = applyFilters(allRecipes);
      setDisplayedRecipes(filtered);
      setCurrentRecipeIndex(0); // Reset to first recipe in new filtered list
      // Only show recipe page if a specific category is selected (not 'all') or if there are search results
      if (selectedCategory !== "all" && filtered.length > 0) {
        setShowCoverPage(false);
      } else if (localStorage.getItem("filteredRecipes")) { // If coming from a search
        setShowCoverPage(false);
      } else {
        setShowCoverPage(filtered.length === 0);
      }
    }
  }, [selectedCategory, selectedLetter, allRecipes, applyFilters, loading]); // Re-run when filters or allRecipes change

  const handleDeleteRecipe = (index: number) => {
    setRecipeToDeleteIndex(index);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (recipeToDeleteIndex !== null) {
      const recipeToDelete = displayedRecipes[recipeToDeleteIndex]; // Use displayedRecipes for deletion
      
      if (recipeToDelete.id) {
        try {
          const { deleteRecipe } = await import('@/lib/recipes');
          const result = await deleteRecipe(recipeToDelete.id);
          
          if (result.success) {
            // Update allRecipes and let the useEffect re-filter
            setAllRecipes(prev => prev.filter(r => r.id !== recipeToDelete.id));
          } else {
            alert(`Error deleting recipe: ${result.error}`);
          }
        } catch (error) {
          console.error('Error deleting recipe:', error);
          alert('Failed to delete recipe. Please try again.');
        }
      } else {
        // Fallback to localStorage for recipes without IDs (shouldn't happen with Supabase)
        const updatedRecipes = allRecipes.filter((_, idx) => idx !== recipeToDeleteIndex);
        setAllRecipes(updatedRecipes);
        localStorage.setItem("allRecipes", JSON.stringify(updatedRecipes));
      }
      
      setShowDeleteDialog(false);
      setRecipeToDeleteIndex(null);
    }
  };

  const handleEditRecipe = (recipeToEdit: Recipe, originalIndex: number) => {
    console.log("Attempting to edit recipe:", recipeToEdit, "at index:", originalIndex);
    localStorage.setItem("editingRecipe", JSON.stringify({ ...recipeToEdit, originalIndex }));
    window.location.href = "/create/manual"; // Use window.location for full page reload to clear state
  };

  const handlePrintRecipe = (recipeToPrint: Recipe) => {
    console.log("Attempting to print recipe:", recipeToPrint);
    const printContent = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ccc; border-radius: 8px; width: 300px; margin: 20px auto;">
        <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">${recipeToPrint.recipeName}</h2>
        <p style="font-size: 12px; color: #666; margin-bottom: 15px;">Categories: ${recipeToPrint.categories.join(', ')}</p>
        <h3 style="font-size: 18px; font-weight: medium; margin-bottom: 8px;">Ingredients:</h3>
        ${(recipeToPrint.ingredientGroups || []).map(group => `
          <div style="margin-left: 16px; margin-bottom: 8px;">
            <h4 style="font-weight: 600;">${group.name}</h4>
            <ul style="list-style-type: disc; padding-left: 20px;">
              ${group.ingredients.map(ing => `<li style="font-size: 14px;">${ing}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
        <h3 style="font-size: 18px; font-weight: medium; margin-bottom: 8px; margin-top: 15px;">Instructions:</h3>
        <ol style="list-style-type: decimal; padding-left: 20px;">
          ${recipeToPrint.instructions.filter(inst => inst.trim() !== '').map(inst => `<li style="font-size: 14px; margin-bottom: 5px;">${inst}</li>`).join('')}
        </ol>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleNextRecipe = () => {
    setCurrentRecipeIndex((prevIndex) => (prevIndex + 1) % displayedRecipes.length);
  };

  const handlePrevRecipe = () => {
    setCurrentRecipeIndex((prevIndex) =>
      prevIndex === 0 ? displayedRecipes.length - 1 : prevIndex - 1
    );
  };

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedLetter(""); // Clear letter filter when category is selected
    setShowCoverPage(false); // Show recipes when category is clicked
  };

  const currentRecipe = displayedRecipes[currentRecipeIndex];

  return (
    <main className="flex min-h-screen flex-col items-center p-8 relative">
      <Link href="/">
        <Button variant="outline" className="absolute top-4 left-4 z-10">Back to Home</Button>
      </Link>

      <h1 className="text-4xl font-bold mb-8">Your Recipe Book</h1>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="text-lg text-gray-600">Loading your recipes...</div>
        </div>
      ) : showCoverPage ? (
        <div className="book-cover flex items-center justify-center p-8 bg-pink-100 rounded-lg shadow-lg w-full max-w-2xl h-[600px]">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-pink-800 mb-4 font-serif">Recipeasy</h1>
            <p className="text-lg text-pink-600 font-[var(--font-dancing-script)]">Your Culinary Journey Begins Here!</p>
            
          </div>
        </div>
      ) : displayedRecipes.length === 0 ? (
        <div className="text-center text-gray-600 text-lg">
          No recipes found for the current filters. Try adjusting your search or filters.
        </div>
      ) : (
        <div className="book-container flex relative w-full max-w-4xl h-[700px] shadow-2xl rounded-lg overflow-hidden">
          {/* Category Tabs (Left Side) */}
          <div className="category-tabs flex flex-col bg-gray-100 p-4 border-r border-gray-200">
            {allCategories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "ghost"}
                className="mb-2 justify-start"
                onClick={() => handleCategoryClick(category.id)}
              >
                {category.label}
              </Button>
            ))}
          </div>

          {/* Recipe Page (Right Side) */}
          <div className="recipe-page flex-grow bg-white p-8 overflow-y-auto relative">
            <div className="absolute top-4 right-4 flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => handleDeleteRecipe(currentRecipeIndex)}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleEditRecipe(currentRecipe, currentRecipeIndex)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handlePrintRecipe(currentRecipe)}>
                <Printer className="h-4 w-4" />
              </Button>
            </div>
            <h2 className="text-3xl font-bold mb-4">{currentRecipe.recipeName}</h2>
            <p className="text-sm text-gray-500 mb-4">Categories: {currentRecipe.categories.join(', ')}</p>
            
            <h3 className="text-xl font-semibold mb-2">Ingredients:</h3>
            {(currentRecipe.ingredientGroups || []).map((group, groupIndex) => (
              <div key={groupIndex} className="ml-4 mb-3">
                <h4 className="font-semibold">{group.name}</h4>
                <ul className="list-disc pl-5">
                  {group.ingredients.map((ing, ingIndex) => (
                    <li key={ingIndex} className="text-base">{ing}</li>
                  ))}
                </ul>
              </div>
            ))}

            <h3 className="text-xl font-semibold mb-2 mt-6">Instructions:</h3>
            <ol className="list-decimal pl-5">
              {currentRecipe.instructions.filter(inst => inst.trim() !== '').map((inst, instIndex) => (
                <li key={instIndex} className="text-base mb-2">{inst}</li>
              ))}
            </ol>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <Button onClick={handlePrevRecipe} disabled={displayedRecipes.length <= 1}>
                <ChevronLeft className="h-4 w-4 mr-2" /> Previous
              </Button>
              <Button onClick={handleNextRecipe} disabled={displayedRecipes.length <= 1}>
                Next <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this recipe? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

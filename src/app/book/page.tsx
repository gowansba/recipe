"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';

interface IngredientGroup {
  name: string;
  ingredients: string[];
}

interface Recipe {
  recipeName: string;
  categories: string[];
  ingredientGroups: IngredientGroup[];
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

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function RecipeBook() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLetter, setSelectedLetter] = useState("");
  const [recipeToDeleteIndex, setRecipeToDeleteIndex] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRecipes = localStorage.getItem("allRecipes");
      const parsedRecipes: Recipe[] = storedRecipes ? JSON.parse(storedRecipes) : [];
      setRecipes(parsedRecipes);

      const searchQuery = localStorage.getItem("searchQuery");
      if (searchQuery) {
        const lowerCaseSearchTerm = searchQuery.toLowerCase();
        const matchedRecipes = parsedRecipes.filter((recipe: Recipe) => {
          const nameMatch = recipe.recipeName.toLowerCase().includes(lowerCaseSearchTerm);
          const ingredientsMatch = recipe.ingredientGroups.some((group: IngredientGroup) =>
            group.ingredients.some((ing: string) => ing.toLowerCase().includes(lowerCaseSearchTerm))
          );
          const categoriesMatch = recipe.categories.some((cat: string) => cat.toLowerCase().includes(lowerCaseSearchTerm));
          return nameMatch || ingredientsMatch || categoriesMatch;
        });
        setFilteredRecipes(matchedRecipes);
        localStorage.removeItem("searchQuery"); // Clear search query after use
      } else {
        setFilteredRecipes(parsedRecipes);
      }
    }
  }, []);

  useEffect(() => {
    let tempRecipes = recipes;

    if (selectedCategory !== "all") {
      tempRecipes = tempRecipes.filter((recipe) =>
        recipe.categories.includes(selectedCategory)
      );
    }

    if (selectedLetter !== "") {
      tempRecipes = tempRecipes.filter((recipe) =>
        recipe.recipeName.toLowerCase().startsWith(selectedLetter.toLowerCase())
      );
    }
    setFilteredRecipes(tempRecipes);
  }, [recipes, selectedCategory, selectedLetter]);

  const handleDeleteRecipe = (index: number) => {
    setRecipeToDeleteIndex(index);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (recipeToDeleteIndex !== null) {
      console.log("Confirming delete for recipe at index:", recipeToDeleteIndex);
      const updatedRecipes = recipes.filter((_, index) => index !== recipeToDeleteIndex);
      setRecipes(updatedRecipes);
      localStorage.setItem("allRecipes", JSON.stringify(updatedRecipes));
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
        ${recipeToPrint.ingredientGroups.map(group => `
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

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <h1 className="text-4xl font-bold mb-8">Your Recipe Book</h1>
      <Link href="/">
        <Button variant="outline" className="mb-8">Back to Home</Button>
      </Link>

      <div className="flex gap-4 mb-8">
        <Select onValueChange={setSelectedCategory} value={selectedCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {allCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setSelectedLetter("")}>Show All</Button>
      </div>

      <div className="flex flex-wrap justify-center gap-1 mb-8">
        {alphabet.map((letter) => (
          <Button
            key={letter}
            variant={selectedLetter === letter ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedLetter(letter)}
          >
            {letter}
          </Button>
        ))}
      </div>

      {filteredRecipes.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Cover Page */}
          <div className="demoPage bg-pink-100 flex items-center justify-center p-8">
            <div className="text-center">
              <h1 className="text-5xl font-bold text-pink-800 mb-4 font-serif">My Recipe Book</h1>
              <p className="text-lg text-pink-600 font-[var(--font-dancing-script)]">Delicious creations from my kitchen to yours!</p>
            </div>
          </div>
          {allCategories.filter(cat => cat.id !== "all").map((category) => (
            <div key={category.id} className="border p-4 rounded-lg shadow-md bg-white flex items-center justify-center text-center h-[300px]">
              <h2 className="text-2xl font-semibold text-gray-700">{category.label} Recipes</h2>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe, index) => (
            <div key={index} className="border p-4 rounded-lg shadow-md bg-white overflow-auto relative">
              <div className="absolute top-2 right-2 flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleDeleteRecipe(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleEditRecipe(recipe, index)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handlePrintRecipe(recipe)}>
                  <Printer className="h-4 w-4" />
                </Button>
              </div>
              <h2 className="text-2xl font-semibold mb-2">{recipe.recipeName}</h2>
              <p className="text-sm text-gray-500 mb-4">Categories: {recipe.categories.join(', ')}</p>
              <h3 className="text-lg font-medium mb-2">Ingredients:</h3>
              {recipe.ingredientGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="ml-4 mb-2">
                  <h4 className="font-semibold">{group.name}</h4>
                  <ul className="list-disc pl-5">
                    {group.ingredients.map((ing, ingIndex) => (
                      <li key={ingIndex} className="text-sm">{ing}</li>
                    ))}
                  </ul>
                </div>
              ))}
              <h3 className="text-lg font-medium mb-2 mt-4">Instructions:</h3>
              <ol className="list-decimal pl-5">
                {recipe.instructions.filter(inst => inst.trim() !== '').map((inst, instIndex) => (
                  <li key={instIndex} className="text-sm mb-1">{inst}</li>
                ))}
              </ol>
            </div>
          ))}
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
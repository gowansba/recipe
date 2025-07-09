"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [currentPage, setCurrentPage] = useState(0); // 0 for cover, 1+ for recipes

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRecipes = localStorage.getItem("allRecipes");
      setRecipes(storedRecipes ? JSON.parse(storedRecipes) : []);
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
    setCurrentPage(0); // Reset to cover page when filters change
  }, [recipes, selectedCategory, selectedLetter]);

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, filteredRecipes.length));
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  const displayRecipe = filteredRecipes[currentPage - 1]; // -1 because 0 is cover

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

      {filteredRecipes.length === 0 && currentPage === 0 ? (
        <p>No recipes found for the selected filters. Go create some!</p>
      ) : (
        <div className="page-container">
          <div className={`page ${currentPage > 0 ? 'flipped' : ''}`}>
            <div className="page-front bg-pink-100 flex items-center justify-center p-8">
              <div className="text-center">
                <h1 className="text-5xl font-bold text-pink-800 mb-4 font-serif">My Recipe Book</h1>
                <p className="text-lg text-pink-600 font-[var(--font-dancing-script)]">Delicious creations from my kitchen to yours!</p>
              </div>
            </div>
            <div className="page-back border p-4 rounded-lg shadow-md bg-white overflow-auto">
              {displayRecipe ? (
                <>
                  <h2 className="text-2xl font-semibold mb-2">{displayRecipe.recipeName}</h2>
                  <p className="text-sm text-gray-500 mb-4">Categories: {displayRecipe.categories.join(', ')}</p>
                  <h3 className="text-lg font-medium mb-2">Ingredients:</h3>
                  {displayRecipe.ingredientGroups.map((group, groupIndex) => (
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
                    {displayRecipe.instructions.filter(inst => inst.trim() !== '').map((inst, instIndex) => (
                      <li key={instIndex} className="text-sm mb-1">{inst}</li>
                    ))}
                  </ol>
                </>
              ) : (
                <p>No recipe to display. Use the navigation buttons.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {filteredRecipes.length > 0 && (
        <div className="book-navigation">
          <Button onClick={handlePreviousPage} disabled={currentPage === 0}>Previous</Button>
          <Button onClick={handleNextPage} disabled={currentPage === filteredRecipes.length}>Next</Button>
        </div>
      )}
    </main>
  );
}
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronsUpDown } from "lucide-react";

const allCategories = [
  { id: "breakfast", label: "Breakfast" },
  { id: "snacks", label: "Snacks" },
  { id: "lunch", label: "Lunch" },
  { id: "appetizers", label: "Appetizers" },
  { id: "dinner", label: "Dinner" },
  { id: "dessert", label: "Dessert" },
  { id: "sauce", label: "Sauce" },
];

type IngredientGroup = {
  name: string;
  ingredients: string[];
};

export default function Home() {
  const [step, setStep] = useState(1);
  const [recipeName, setRecipeName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [ingredientGroups, setIngredientGroups] = useState<IngredientGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [newIngredients, setNewIngredients] = useState<{ [key: number]: string }>({});
  const [instructions, setInstructions] = useState<string[]>(["", "", "", "", ""]);

  const handleAddGroup = () => {
    if (newGroupName.trim() !== "") {
      setIngredientGroups([...ingredientGroups, { name: newGroupName.trim(), ingredients: [] }]);
      setNewGroupName("");
    }
  };

  const handleAddIngredient = (groupIndex: number) => {
    const ingredientToAdd = newIngredients[groupIndex] || "";
    if (ingredientToAdd.trim() !== "") {
      const newGroups = [...ingredientGroups];
      newGroups[groupIndex].ingredients.push(ingredientToAdd.trim());
      setIngredientGroups(newGroups);
      setNewIngredients({ ...newIngredients, [groupIndex]: "" });
    }
  };

  const handleInstructionChange = (index: number, value: string) => {
    const newInstructions = [...instructions];
    newInstructions[index] = value;
    setInstructions(newInstructions);
  };

  const handleAddInstruction = () => {
    setInstructions([...instructions, ""]);
  };

  const handleNextStep = () => {
    setStep(step + 1);
  };

  const handlePreviousStep = () => {
    setStep(step - 1);
  };
  
  const router = useRouter();

  const handleCreateRecipe = () => {
    const newRecipe = {
      recipeName,
      categories: selectedCategories,
      ingredientGroups,
      instructions,
    };
    // For now, store in a global array (will be replaced by Supabase later)
    const existingRecipes = JSON.parse(localStorage.getItem("allRecipes") || "[]");
    localStorage.setItem("allRecipes", JSON.stringify([...existingRecipes, newRecipe]));

    alert("Recipe created! Redirecting to your recipe book.");
    router.push("/book");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Create your recipe</CardTitle>
          <CardDescription>
            {step === 1 && "Start by adding the details for your recipe."}
            {step === 2 && "Now, let's add the instructions."}
            {step === 3 && "Review your recipe before creating it."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="flex flex-col gap-6">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="recipeName">Recipe Name</Label>
                <Input
                  id="recipeName"
                  type="text"
                  placeholder="e.g., Chocolate Chip Cookies"
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label>Categories</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {selectedCategories.length > 0
                        ? selectedCategories.join(", ")
                        : "Select categories..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Search categories..." />
                      <CommandEmpty>No category found.</CommandEmpty>
                      <CommandGroup>
                        {allCategories.map((category) => (
                          <CommandItem
                            key={category.id}
                            onSelect={() => {
                              setSelectedCategories((prev) =>
                                prev.includes(category.label)
                                  ? prev.filter((c) => c !== category.label)
                                  : [...prev, category.label]
                              );
                            }}
                          >
                            <Checkbox
                              className="mr-2"
                              checked={selectedCategories.includes(category.label)}
                            />
                            {category.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="new-group">Ingredient Group</Label>
                <div className="flex w-full items-center space-x-2">
                  <Input
                    id="new-group"
                    type="text"
                    placeholder="e.g., Toppings"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
                  />
                  <Button onClick={handleAddGroup}>Add Group</Button>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                {ingredientGroups.map((group, groupIndex) => (
                  <div key={groupIndex} className="p-4 border rounded-md">
                    <h3 className="font-semibold mb-2">{group.name}</h3>
                    <div className="flex w-full items-center space-x-2 mb-2">
                       <Input
                         type="text"
                         placeholder="e.g., 2 cups of flour"
                         value={newIngredients[groupIndex] || ''}
                         onChange={(e) => setNewIngredients({ ...newIngredients, [groupIndex]: e.target.value })}
                         onKeyDown={(e) => e.key === 'Enter' && handleAddIngredient(groupIndex)}
                       />
                       <Button onClick={() => handleAddIngredient(groupIndex)}>Add</Button>
                    </div>
                    <ul className="list-disc pl-5">
                      {group.ingredients.map((ing, ingIndex) => (
                        <li key={ingIndex} className="text-sm">{ing}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              {instructions.map((instruction, i) => (
                <div key={i} className="grid w-full gap-1.5">
                  <Label htmlFor={`instruction-${i}`}>Step {i + 1}</Label>
                  <Textarea
                    id={`instruction-${i}`}
                    placeholder={`Describe step ${i + 1}`}
                    value={instruction}
                    onChange={(e) => handleInstructionChange(i, e.target.value)}
                  />
                </div>
              ))}
              <Button variant="outline" onClick={handleAddInstruction}>
                + Add Step
              </Button>
            </div>
          )}
          {step === 3 && (
            <div className="flex flex-col gap-4">
                <div>
                    <h3 className="font-bold">Recipe Name:</h3>
                    <p>{recipeName}</p>
                </div>
                <div>
                    <h3 className="font-bold">Categories:</h3>
                    <p>{selectedCategories.join(', ')}</p>
                </div>
                <div>
                    <h3 className="font-bold">Ingredients:</h3>
                    {ingredientGroups.map((group, i) => (
                        <div key={i} className="ml-4 mt-2">
                            <h4 className="font-semibold">{group.name}</h4>
                            <ul className="list-disc pl-5">
                                {group.ingredients.map((ing, j) => <li key={j}>{ing}</li>)}
                            </ul>
                        </div>
                    ))}
                </div>
                <div>
                    <h3 className="font-bold">Instructions:</h3>
                    <ol className="list-decimal pl-5">
                        {instructions.filter(inst => inst.trim() !== '').map((inst, i) => <li key={i}>{inst}</li>)}
                    </ol>
                </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {step > 1 && <Button variant="outline" onClick={handlePreviousStep}>Back</Button>}
          {step < 3 ? (
            <Button onClick={handleNextStep} className="ml-auto">
              {step === 1 ? "Next: Add Instructions" : "Next: Review"}
            </Button>
          ) : (
            <Button onClick={handleCreateRecipe} className="ml-auto">Create Recipe</Button>
          )}
        </CardFooter>
      </Card>
    </main>
  );
}
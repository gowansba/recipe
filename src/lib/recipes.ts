// Import supabase client dynamically to avoid SSR issues

export interface Recipe {
  id?: string;
  recipe_name: string;
  categories: string[];
  instructions: string[];
  created_at?: string;
  updated_at?: string;
}

export interface IngredientGroup {
  id?: string;
  recipe_id?: string;
  name: string;
  ingredients: string[];
  sort_order?: number;
}

export interface RecipeWithIngredients extends Recipe {
  ingredient_groups: IngredientGroup[];
}

// Create a new recipe with ingredient groups
export async function createRecipe(recipe: {
  recipeName: string;
  categories: string[];
  instructions: string[];
  ingredientGroups: IngredientGroup[];
}): Promise<{ success: boolean; data?: RecipeWithIngredients; error?: string }> {
  try {
    const { supabase: client } = await import('./supabase');
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Insert recipe
    const { data: recipeData, error: recipeError } = await client
      .from('recipes')
      .insert({
        user_id: user.id,
        recipe_name: recipe.recipeName,
        categories: recipe.categories,
        instructions: recipe.instructions.filter(inst => inst.trim() !== '')
      })
      .select()
      .single();

    if (recipeError) {
      console.error('Recipe creation error:', recipeError);
      return { success: false, error: recipeError.message };
    }

    // Insert ingredient groups
    const ingredientGroupsData = recipe.ingredientGroups.map((group, index) => ({
      recipe_id: recipeData.id,
      name: group.name,
      ingredients: group.ingredients,
      sort_order: index
    }));

    const { data: groupsData, error: groupsError } = await client
      .from('ingredient_groups')
      .insert(ingredientGroupsData)
      .select();

    if (groupsError) {
      console.error('Ingredient groups creation error:', groupsError);
      return { success: false, error: groupsError.message };
    }

    const result: RecipeWithIngredients = {
      ...recipeData,
      ingredient_groups: groupsData || []
    };

    return { success: true, data: result };
  } catch (error) {
    console.error('Error creating recipe:', error);
    return { success: false, error: 'Failed to create recipe' };
  }
}

// Get all recipes for current user
export async function getUserRecipes(): Promise<{ success: boolean; data?: RecipeWithIngredients[]; error?: string }> {
  try {
    const { supabase: client } = await import('./supabase');
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Use the view we created in the SQL script
    const { data, error } = await client
      .from('recipes_with_ingredients')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recipes:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return { success: false, error: 'Failed to fetch recipes' };
  }
}

// Update a recipe
export async function updateRecipe(
  recipeId: string, 
  recipe: {
    recipeName: string;
    categories: string[];
    instructions: string[];
    ingredientGroups: IngredientGroup[];
  }
): Promise<{ success: boolean; data?: RecipeWithIngredients; error?: string }> {
  try {
    const { supabase: client } = await import('./supabase');
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Update recipe
    const { data: recipeData, error: recipeError } = await client
      .from('recipes')
      .update({
        recipe_name: recipe.recipeName,
        categories: recipe.categories,
        instructions: recipe.instructions.filter(inst => inst.trim() !== '')
      })
      .eq('id', recipeId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (recipeError) {
      console.error('Recipe update error:', recipeError);
      return { success: false, error: recipeError.message };
    }

    // Delete existing ingredient groups
    const { error: deleteError } = await client
      .from('ingredient_groups')
      .delete()
      .eq('recipe_id', recipeId);

    if (deleteError) {
      console.error('Error deleting ingredient groups:', deleteError);
      return { success: false, error: deleteError.message };
    }

    // Insert new ingredient groups
    const ingredientGroupsData = recipe.ingredientGroups.map((group, index) => ({
      recipe_id: recipeId,
      name: group.name,
      ingredients: group.ingredients,
      sort_order: index
    }));

    const { data: groupsData, error: groupsError } = await client
      .from('ingredient_groups')
      .insert(ingredientGroupsData)
      .select();

    if (groupsError) {
      console.error('Ingredient groups creation error:', groupsError);
      return { success: false, error: groupsError.message };
    }

    const result: RecipeWithIngredients = {
      ...recipeData,
      ingredient_groups: groupsData || []
    };

    return { success: true, data: result };
  } catch (error) {
    console.error('Error updating recipe:', error);
    return { success: false, error: 'Failed to update recipe' };
  }
}

// Delete a recipe
export async function deleteRecipe(recipeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase: client } = await import('./supabase');
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await client
      .from('recipes')
      .delete()
      .eq('id', recipeId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Recipe deletion error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting recipe:', error);
    return { success: false, error: 'Failed to delete recipe' };
  }
}

// Search recipes
export async function searchRecipes(searchTerm: string): Promise<{ success: boolean; data?: RecipeWithIngredients[]; error?: string }> {
  try {
    const { supabase: client } = await import('./supabase');
    
    // Get current user
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Use the search function we created in the SQL script
    const { data, error } = await client
      .rpc('search_recipes', {
        search_term: searchTerm,
        user_id: user.id
      });

    if (error) {
      console.error('Error searching recipes:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error searching recipes:', error);
    return { success: false, error: 'Failed to search recipes' };
  }
} 
-- ============================================================================
-- SUPABASE SETUP SCRIPT FOR RECIPE APP
-- ============================================================================
-- This script sets up the complete database schema for your Next.js recipe app
-- Copy and paste this into your Supabase SQL Editor

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. PROFILES TABLE (extends Supabase auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (id)
);

-- ============================================================================
-- 2. RECIPES TABLE (main recipe storage)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    recipe_name TEXT NOT NULL,
    categories TEXT[] DEFAULT '{}',
    instructions TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    -- Add search optimization
    search_vector tsvector
);

-- ============================================================================
-- 3. INGREDIENT GROUPS TABLE (for recipe ingredients)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ingredient_groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    ingredients TEXT[] DEFAULT '{}',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- 4. RECIPE CATEGORIES ENUM (for consistency)
-- ============================================================================
-- Note: We'll use TEXT[] for flexibility, but this documents the expected categories
-- Categories: breakfast, snacks, lunch, appetizers, dinner, dessert, sauce, misc

-- ============================================================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON public.recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON public.recipes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_categories ON public.recipes USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_recipes_search_vector ON public.recipes USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_recipes_recipe_name ON public.recipes(recipe_name);
CREATE INDEX IF NOT EXISTS idx_ingredient_groups_recipe_id ON public.ingredient_groups(recipe_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_groups_sort_order ON public.ingredient_groups(recipe_id, sort_order);

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_groups ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Recipes policies
CREATE POLICY "Users can view their own recipes" ON public.recipes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recipes" ON public.recipes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipes" ON public.recipes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recipes" ON public.recipes
    FOR DELETE USING (auth.uid() = user_id);

-- Ingredient groups policies
CREATE POLICY "Users can view ingredient groups for their recipes" ON public.ingredient_groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.recipes 
            WHERE recipes.id = ingredient_groups.recipe_id 
            AND recipes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert ingredient groups for their recipes" ON public.ingredient_groups
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.recipes 
            WHERE recipes.id = ingredient_groups.recipe_id 
            AND recipes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update ingredient groups for their recipes" ON public.ingredient_groups
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.recipes 
            WHERE recipes.id = ingredient_groups.recipe_id 
            AND recipes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete ingredient groups for their recipes" ON public.ingredient_groups
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.recipes 
            WHERE recipes.id = ingredient_groups.recipe_id 
            AND recipes.user_id = auth.uid()
        )
    );

-- ============================================================================
-- 7. FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to handle profile creation when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update search vector for recipes
CREATE OR REPLACE FUNCTION public.update_recipe_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', 
        COALESCE(NEW.recipe_name, '') || ' ' || 
        COALESCE(array_to_string(NEW.categories, ' '), '') || ' ' || 
        COALESCE(array_to_string(NEW.instructions, ' '), '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER handle_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_recipes
    BEFORE UPDATE ON public.recipes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to update search vector
CREATE TRIGGER update_recipe_search_vector_trigger
    BEFORE INSERT OR UPDATE ON public.recipes
    FOR EACH ROW EXECUTE FUNCTION public.update_recipe_search_vector();

-- ============================================================================
-- 8. HELPER FUNCTIONS FOR THE APP
-- ============================================================================

-- Function to search recipes (supports full-text search)
CREATE OR REPLACE FUNCTION public.search_recipes(search_term TEXT, user_id UUID)
RETURNS TABLE (
    id UUID,
    recipe_name TEXT,
    categories TEXT[],
    instructions TEXT[],
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    ingredient_groups JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.recipe_name,
        r.categories,
        r.instructions,
        r.created_at,
        r.updated_at,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', ig.id,
                    'name', ig.name,
                    'ingredients', ig.ingredients,
                    'sort_order', ig.sort_order
                ) ORDER BY ig.sort_order
            ) FILTER (WHERE ig.id IS NOT NULL),
            '[]'::jsonb
        ) as ingredient_groups
    FROM public.recipes r
    LEFT JOIN public.ingredient_groups ig ON r.id = ig.recipe_id
    WHERE r.user_id = search_recipes.user_id
    AND (
        search_term IS NULL 
        OR search_term = ''
        OR r.search_vector @@ plainto_tsquery('english', search_term)
        OR r.recipe_name ILIKE '%' || search_term || '%'
        OR EXISTS (
            SELECT 1 FROM unnest(r.categories) as cat 
            WHERE cat ILIKE '%' || search_term || '%'
        )
    )
    GROUP BY r.id, r.recipe_name, r.categories, r.instructions, r.created_at, r.updated_at
    ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recipe with ingredients
CREATE OR REPLACE FUNCTION public.get_recipe_with_ingredients(recipe_id UUID)
RETURNS TABLE (
    id UUID,
    recipe_name TEXT,
    categories TEXT[],
    instructions TEXT[],
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    ingredient_groups JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.recipe_name,
        r.categories,
        r.instructions,
        r.created_at,
        r.updated_at,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', ig.id,
                    'name', ig.name,
                    'ingredients', ig.ingredients,
                    'sort_order', ig.sort_order
                ) ORDER BY ig.sort_order
            ) FILTER (WHERE ig.id IS NOT NULL),
            '[]'::jsonb
        ) as ingredient_groups
    FROM public.recipes r
    LEFT JOIN public.ingredient_groups ig ON r.id = ig.recipe_id
    WHERE r.id = recipe_id
    AND r.user_id = auth.uid()
    GROUP BY r.id, r.recipe_name, r.categories, r.instructions, r.created_at, r.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. VIEWS FOR EASY QUERYING
-- ============================================================================

-- View to get all recipes with their ingredient groups
CREATE OR REPLACE VIEW public.recipes_with_ingredients AS
SELECT 
    r.id,
    r.user_id,
    r.recipe_name,
    r.categories,
    r.instructions,
    r.created_at,
    r.updated_at,
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', ig.id,
                'name', ig.name,
                'ingredients', ig.ingredients,
                'sort_order', ig.sort_order
            ) ORDER BY ig.sort_order
        ) FILTER (WHERE ig.id IS NOT NULL),
        '[]'::jsonb
    ) as ingredient_groups
FROM public.recipes r
LEFT JOIN public.ingredient_groups ig ON r.id = ig.recipe_id
GROUP BY r.id, r.user_id, r.recipe_name, r.categories, r.instructions, r.created_at, r.updated_at;

-- ============================================================================
-- 10. SAMPLE DATA (OPTIONAL - REMOVE IN PRODUCTION)
-- ============================================================================

-- Uncomment below to insert sample data (useful for testing)
/*
-- Sample recipe (replace 'YOUR_USER_ID' with actual user ID)
INSERT INTO public.recipes (user_id, recipe_name, categories, instructions) 
VALUES (
    'YOUR_USER_ID'::uuid,
    'Chocolate Chip Cookies',
    ARRAY['dessert', 'snacks'],
    ARRAY[
        'Preheat oven to 375°F (190°C)',
        'Mix dry ingredients in a large bowl',
        'Cream butter and sugars in another bowl',
        'Beat in eggs and vanilla',
        'Combine wet and dry ingredients',
        'Fold in chocolate chips',
        'Drop spoonfuls onto baking sheet',
        'Bake for 9-11 minutes until golden brown'
    ]
);

-- Sample ingredient groups for the recipe
INSERT INTO public.ingredient_groups (recipe_id, name, ingredients, sort_order) 
VALUES 
    (
        (SELECT id FROM public.recipes WHERE recipe_name = 'Chocolate Chip Cookies' LIMIT 1),
        'Dry Ingredients',
        ARRAY['2 1/4 cups all-purpose flour', '1 tsp baking soda', '1 tsp salt'],
        1
    ),
    (
        (SELECT id FROM public.recipes WHERE recipe_name = 'Chocolate Chip Cookies' LIMIT 1),
        'Wet Ingredients',
        ARRAY['1 cup butter, softened', '3/4 cup granulated sugar', '3/4 cup brown sugar', '2 large eggs', '2 tsp vanilla extract'],
        2
    ),
    (
        (SELECT id FROM public.recipes WHERE recipe_name = 'Chocolate Chip Cookies' LIMIT 1),
        'Mix-ins',
        ARRAY['2 cups chocolate chips'],
        3
    );
*/

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- 
-- After running this script:
-- 1. Your authentication is ready to use
-- 2. Users can sign up and their profiles will be created automatically
-- 3. All recipes are private to each user (RLS enabled)
-- 4. Full-text search is available
-- 5. Database is optimized with proper indexes
-- 
-- Next steps for your app:
-- 1. Set your environment variables:
--    - NEXT_PUBLIC_SUPABASE_URL
--    - NEXT_PUBLIC_SUPABASE_ANON_KEY
--    - GEMINI_API_KEY (for AI parsing)
-- 
-- 2. Update your app to use Supabase instead of localStorage
-- 3. Test the authentication and recipe CRUD operations
-- 
-- ============================================================================ 
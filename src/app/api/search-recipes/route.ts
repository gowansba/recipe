
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { searchTerm, userId } = await request.json();

  if (!searchTerm || !userId) {
    return NextResponse.json({ error: 'Search term and user ID are required' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const { data, error } = await supabase.rpc('search_recipes', {
      search_term: searchTerm,
      user_id: userId,
    });

    if (error) {
      console.error('Error searching recipes:', error);
      return NextResponse.json({ error: 'Failed to search recipes' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('An unexpected error occurred:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

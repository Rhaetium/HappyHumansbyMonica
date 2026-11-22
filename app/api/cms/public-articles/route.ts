import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { liveFilter } from '@/lib/article-schedule';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ articles: [] });

  const { data } = await supabase
    .from('articles')
    .select('id, title, slug, excerpt, featured_image, category, published_at')
    .eq('published', true)
    .or(liveFilter())
    .order('published_at', { ascending: false })
    .limit(20);

  return NextResponse.json({ articles: data || [] });
}

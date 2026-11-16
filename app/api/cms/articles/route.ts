import { NextRequest, NextResponse, after } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCmsAuth } from '@/lib/cms-auth';
import { submitToIndexNow } from '@/lib/indexnow';

export const dynamic = 'force-dynamic';

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

function withoutMissingCols(payload: Record<string, unknown>, cols: string[]) {
  const result = { ...payload };
  for (const col of cols) delete result[col];
  return result;
}

export async function GET(req: NextRequest) {
  const authError = requireCmsAuth(req);
  if (authError) return authError;

  const sb = supabase();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? 'all';

  let query = sb
    .from('cms_blog_posts')
    .select('id, title, slug, category, excerpt, featured_image, published, published_at, created_at')
    .order('created_at', { ascending: false });

  if (status === 'published') query = query.eq('published', true);
  if (status === 'draft') query = query.eq('published', false);
  if (search) query = query.ilike('title', `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ articles: data ?? [] });
}

export async function POST(req: NextRequest) {
  const authError = requireCmsAuth(req);
  if (authError) return authError;

  const sb = supabase();
  const body = await req.json();
  const now = new Date().toISOString();

  const payload: Record<string, unknown> = {
    title: body.title,
    slug: body.slug,
    excerpt: body.excerpt ?? null,
    content: body.content ?? '',
    category: body.category ?? null,
    tags: body.tags ?? [],
    featured_image: body.featured_image ?? null,
    author: body.author ?? 'Monica Schneider',
    published: Boolean(body.published),
    published_at: body.published ? (body.published_at ?? now) : null,
    voice_notes: body.voice_notes ?? null,
    seo_title: body.seo_title ?? null,
    seo_description: body.seo_description ?? null,
    og_image: body.og_image ?? null,
    created_at: now,
    updated_at: now,
  };

  let { data, error } = await sb
    .from('cms_blog_posts')
    .insert(payload)
    .select()
    .single();

  // Graceful fallback: if seo columns don't exist yet, retry without them
  if (error?.message?.includes('seo_') || error?.message?.includes('og_image')) {
    ;({ data, error } = await sb
      .from('cms_blog_posts')
      .insert(withoutMissingCols(payload, ['seo_title', 'seo_description', 'og_image']))
      .select()
      .single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Article publié : on prévient Bing & co. (après la réponse, sans ralentir l'enregistrement)
  if (data?.published && data?.slug) after(() => submitToIndexNow([`/blog/${data.slug}`, '/blog']));
  return NextResponse.json({ article: data }, { status: 201 });
}

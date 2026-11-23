import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { justWentLive } from '@/lib/article-schedule'
import { submitToIndexNow } from '@/lib/indexnow'

export const dynamic = 'force-dynamic'

// Appelé chaque jour par Vercel Cron (vercel.json). Un article programmé passe en ligne tout seul à l'heure choisie
// (le site compare la date à l'heure courante), mais personne ne prévient alors Bing & co. : ici, on le fait pour les
// articles dont l'heure est arrivée depuis la dernière exécution, et on rafraîchit le blog et le plan du site.
// Sans danger si on l'appelle à la main : il ne fait que lire des articles publics et envoyer une notification.
// Si la variable CRON_SECRET existe (Vercel l'envoie alors dans l'en-tête Authorization), elle est exigée.
const WINDOW_HOURS = 26 // un peu plus que 24 h : aucun article ne tombe entre deux exécutions

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim()
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Non autorisé' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ ok: false, error: 'Supabase non configuré' }, { status: 503 })

  const now = new Date()
  const since = new Date(now.getTime() - WINDOW_HOURS * 3_600_000)
  const { data, error } = await createClient(url, key)
    .from('cms_blog_posts')
    .select('slug, published, published_at')
    .eq('published', true)
    .gt('published_at', since.toISOString())
    .lte('published_at', now.toISOString())
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 503 })

  const fresh = justWentLive((data ?? []) as { slug: string; published: boolean; published_at: string | null }[], since, now)
  if (fresh.length === 0) return NextResponse.json({ ok: true, newlyLive: [] })

  const paths = fresh.map(a => `/blog/${a.slug}`)
  for (const p of [...paths, '/blog', '/sitemap.xml']) revalidatePath(p)
  await submitToIndexNow([...paths, '/blog'])
  return NextResponse.json({ ok: true, newlyLive: fresh.map(a => a.slug) })
}

import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requireCmsAuth } from '@/lib/cms-auth'
import { pagePath } from '@/lib/page-seo'
import { draftPage, isDraftPage } from '@/lib/cms-drafts'
import { submitToIndexNow } from '@/lib/indexnow'

export const dynamic = 'force-dynamic'

// Pages du site qui ont une adresse publique (les textes communs « site », « footer »… n'en ont pas)
const INDEXABLE_PAGES = new Set([
  'home', 'a-propos', 'coaching', 'entreprises', 'happiness-design', 'sparring-partner',
  'relations', 'blog', 'faq', 'contact', 'booking', 'mentions-legales', 'politique-confidentialite',
])

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

/**
 * POST /api/cms/publish   body : { page, action?: 'publish' | 'discard', keys?: string[] }
 *
 *   publish (défaut) : recopie les champs du brouillon « draft:<page> » vers « <page> » (= mise en ligne),
 *                      puis supprime ces champs du brouillon
 *   discard          : supprime le brouillon sans rien publier
 *   keys             : limite l'opération à ces champs (sinon : tout le brouillon de la page)
 *
 * Réponse : { success, published | discarded : nombre de champs }
 */
export async function POST(req: NextRequest) {
  const supabase = getSupabaseClient()
  if (!supabase) return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 })
  const authError = requireCmsAuth(req)
  if (authError) return authError

  const body = await req.json().catch(() => ({}))
  const { page, action = 'publish', keys } = body as { page?: string; action?: string; keys?: string[] }
  if (!page || typeof page !== 'string' || isDraftPage(page)) {
    return NextResponse.json({ error: 'page requise (sans préfixe « draft: »)' }, { status: 400 })
  }
  if (action !== 'publish' && action !== 'discard') {
    return NextResponse.json({ error: 'action inconnue' }, { status: 400 })
  }

  let q = supabase.from('site_content').select('block_key, value').eq('page', draftPage(page))
  if (Array.isArray(keys) && keys.length) q = q.in('block_key', keys)
  const { data: drafts, error: readError } = await q
  if (readError) return NextResponse.json({ error: readError.message, code: readError.code }, { status: 500 })

  const rows = (drafts ?? []) as { block_key: string; value: string | null }[]
  if (rows.length === 0) {
    return NextResponse.json({ success: true, [action === 'publish' ? 'published' : 'discarded']: 0 })
  }
  const doomed = rows.map(r => r.block_key)

  if (action === 'publish') {
    const { error: upError } = await supabase
      .from('site_content')
      .upsert(rows.map(r => ({ page, block_key: r.block_key, value: r.value ?? '' })), { onConflict: 'page,block_key' })
    // Si la publication échoue, on ne touche PAS au brouillon : rien n'est perdu
    if (upError) return NextResponse.json({ error: `Publication impossible : ${upError.message}`, code: upError.code }, { status: 500 })
  }

  const { error: delError } = await supabase.from('site_content').delete().eq('page', draftPage(page)).in('block_key', doomed)

  if (action === 'publish' && doomed.some(k => k.startsWith('seo_'))) {
    try { revalidatePath(pagePath(page)) } catch { /* sans incidence : la page se régénère au plus tard dans 5 min */ }
  }
  // Page mise en ligne : on prévient Bing & co. après la réponse (la publication a réussi : sinon on est déjà sorti plus haut)
  if (action === 'publish' && INDEXABLE_PAGES.has(page)) after(() => submitToIndexNow([pagePath(page)]))

  return NextResponse.json({
    success: true,
    [action === 'publish' ? 'published' : 'discarded']: rows.length,
    // la publication a réussi mais le nettoyage du brouillon a échoué : le brouillon sera republié à l'identique, sans danger
    ...(delError ? { warning: `Brouillon non nettoyé : ${delError.message}` } : {}),
  })
}

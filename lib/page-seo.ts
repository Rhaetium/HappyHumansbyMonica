import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import { getKvSettings } from '@/lib/cms-settings-server'
import { BRAND_NAME, stripBrandSuffix } from '@/lib/site-seo'

/**
 * SEO par page, modifiable dans le CMS (page → section « Référencement Google ») :
 *   seo_title        titre de l'onglet et du résultat Google
 *   seo_description  extrait affiché sous le titre dans Google
 *   seo_image        image de partage (Facebook, LinkedIn, WhatsApp…)
 *
 * Les valeurs par défaut viennent de lib/cms-defaults/<page>.ts (les anciens textes des layout.tsx).
 * Si Supabase est indisponible, on retombe sur ces valeurs : le référencement ne casse jamais.
 *
 * Corrige aussi un défaut : toutes les pages héritaient de `canonical = page d'accueil` et de l'og:url
 * de l'accueil. Chaque page déclare maintenant sa propre URL canonique.
 */

const SEO_KEYS = ['seo_title', 'seo_description', 'seo_image'] as const
type SeoRows = Partial<Record<(typeof SEO_KEYS)[number], string>>

// cache() : une seule requête par rendu, même si layout + page demandent la même page
const getSeoRows = cache(async (page: string): Promise<SeoRows> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return {}
  try {
    const sb = createClient(url, key)
    const { data, error } = await sb.from('site_content').select('block_key, value').eq('page', page).in('block_key', [...SEO_KEYS])
    if (error || !data) return {}
    const rows: SeoRows = {}
    for (const r of data as { block_key: (typeof SEO_KEYS)[number]; value: string | null }[]) {
      const v = (r.value ?? '').trim()
      if (v) rows[r.block_key] = v
    }
    return rows
  } catch {
    return {}
  }
})

export function pagePath(page: string) {
  return page === 'home' ? '/' : `/${page}`
}

export async function pageMetadata(
  page: string,
  defaults: Record<string, string>,
  extra: Metadata = {},
): Promise<Metadata> {
  const [rows, kv] = await Promise.all([getSeoRows(page), getKvSettings()])
  // Le gabarit du site ajoute « | Happy Humans » : on retire une marque déjà présente en fin de titre (pas de doublon)
  const title = stripBrandSuffix(rows.seo_title || defaults.seo_title)
  const description = rows.seo_description || defaults.seo_description
  const image = rows.seo_image || defaults.seo_image || kv.og_image || '/og-default.jpg'
  const path = pagePath(page)
  const socialTitle = `${title} | ${BRAND_NAME}`

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: 'fr_FR',
      url: path,
      siteName: 'Happy Humans',
      title: socialTitle,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title: socialTitle, description, images: [image] },
    ...extra,
  }
}

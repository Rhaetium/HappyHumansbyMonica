// Identifiants Google Tag Manager et Google Analytics 4 : valeur saisie dans le CMS, sinon Vercel, sinon valeur d'origine.
// Fonctions pures, testées dans __tests__/lib/analytics-ids.test.ts. Ces identifiants ne sont pas des secrets :
// ils apparaissent de toute façon dans le code envoyé aux visiteurs.

const GTM_RE = /^GTM-[A-Z0-9]{4,10}$/
const GA_RE = /^G-[A-Z0-9]{6,14}$/

/** « gtm-abc123 » → « GTM-ABC123 ». Une valeur invalide donne '' (on ne charge jamais un identifiant douteux). */
export function cleanGtmId(value: string | null | undefined): string {
  const v = (value ?? '').trim().toUpperCase()
  return GTM_RE.test(v) ? v : ''
}

export function cleanGaId(value: string | null | undefined): string {
  const v = (value ?? '').trim().toUpperCase()
  return GA_RE.test(v) ? v : ''
}

export type AnalyticsSource = 'cms' | 'vercel' | 'default'
export type AnalyticsIds = {
  gtm: string
  ga: string
  gtmSource: AnalyticsSource
  gaSource: AnalyticsSource
}

/** Priorité : CMS (valide) > variable Vercel (valide) > valeur d'origine du code. */
export function resolveAnalyticsIds(
  kv: { gtm_id?: string; ga_id?: string },
  env: { gtm?: string; ga?: string },
  defaults: { gtm: string; ga: string },
): AnalyticsIds {
  const pick = (cms: string, vercel: string, def: string): [string, AnalyticsSource] => {
    if (cms) return [cms, 'cms']
    if (vercel) return [vercel, 'vercel']
    return [def, 'default']
  }
  const [gtm, gtmSource] = pick(cleanGtmId(kv.gtm_id), cleanGtmId(env.gtm), cleanGtmId(defaults.gtm))
  const [ga, gaSource] = pick(cleanGaId(kv.ga_id), cleanGaId(env.ga), cleanGaId(defaults.ga))
  return { gtm, ga, gtmSource, gaSource }
}

/** Identifiants d'origine du site (utilisés tant que rien n'est réglé dans l'admin ni sur Vercel). */
export const DEFAULT_GTM_ID = 'GTM-5LQ9GB72'
export const DEFAULT_GA_ID = 'G-ZWVFTSVVH3'

/**
 * Résolution complète pour le serveur : CMS > Vercel > identifiants d'origine.
 * Une variable Vercel DÉFINIE mais vide désactive la mesure (comportement d'origine) ; non définie, on garde l'identifiant d'origine.
 */
export function resolveFromEnvironment(
  kv: { gtm_id?: string; ga_id?: string },
  env: Record<string, string | undefined>,
): AnalyticsIds {
  return resolveAnalyticsIds(
    kv,
    { gtm: env.NEXT_PUBLIC_GTM_ID, ga: env.NEXT_PUBLIC_GA_ID },
    {
      gtm: env.NEXT_PUBLIC_GTM_ID === undefined ? DEFAULT_GTM_ID : '',
      ga: env.NEXT_PUBLIC_GA_ID === undefined ? DEFAULT_GA_ID : '',
    },
  )
}

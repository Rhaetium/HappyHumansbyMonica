import { getPageContent } from '@/lib/cms-content-server'
import { getKvSettings } from '@/lib/cms-settings-server'
import { pagePath } from '@/lib/page-seo'
import { safeJsonLd, webPageSchema, type WebPageKind } from '@/lib/json-ld'
import { SITE_URL } from '@/lib/site-url'

/**
 * Données structurées de la page (WebPage, AboutPage, ContactPage, CollectionPage), rendues côté serveur.
 * Elles reprennent le titre et la description SEO de la page, modifiables dans le CMS, et se rattachent au site et à
 * l'entreprise déclarés dans le layout.
 */
export default async function WebPageJsonLd({
  page,
  defaults,
  kind,
}: {
  page: string
  defaults: Record<string, string>
  kind?: WebPageKind
}) {
  const [content, kv] = await Promise.all([getPageContent(page, defaults), getKvSettings()])
  const path = pagePath(page)
  const schema = webPageSchema({
    name: content.seo_title,
    description: content.seo_description,
    url: `${SITE_URL}${path === '/' ? '' : path}`,
    siteUrl: SITE_URL,
    kind,
    inLanguage: kv.geo_default_locale || 'fr-FR',
  })
  if (!schema) return null
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
}

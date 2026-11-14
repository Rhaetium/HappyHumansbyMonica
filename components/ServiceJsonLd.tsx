import { getPageContent } from '@/lib/cms-content-server'
import { getKvSettings } from '@/lib/cms-settings-server'
import { pagePath } from '@/lib/page-seo'
import { safeJsonLd, serviceSchema } from '@/lib/json-ld'
import { DEFAULT_PERSON_NAME } from '@/lib/site-seo'
import { SITE_URL } from '@/lib/site-url'

/**
 * Données structurées « Service » d'une page de prestation, rendues côté serveur (donc lisibles par Google
 * dès le premier chargement). Elles reprennent le titre et la description SEO de la page, modifiables dans le CMS.
 */
export default async function ServiceJsonLd({ page, defaults }: { page: string; defaults: Record<string, string> }) {
  const [content, kv] = await Promise.all([getPageContent(page, defaults), getKvSettings()])
  const schema = serviceSchema({
    name: content.seo_title,
    description: content.seo_description,
    url: `${SITE_URL}${pagePath(page)}`,
    providerName: kv.geo_person_name || DEFAULT_PERSON_NAME,
  })
  if (!schema) return null
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
}

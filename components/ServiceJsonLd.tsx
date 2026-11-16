import { getPageContent } from '@/lib/cms-content-server'
import { getKvSettings } from '@/lib/cms-settings-server'
import { readList } from '@/lib/cms-lists'
import { pagePath } from '@/lib/page-seo'
import { safeJsonLd, serviceSchema, type OfferInput } from '@/lib/json-ld'
import { DEFAULT_PERSON_NAME } from '@/lib/site-seo'
import { SITE_URL } from '@/lib/site-url'

/**
 * Données structurées « Service » d'une page de prestation, rendues côté serveur (donc lisibles par Google
 * dès le premier chargement). Elles reprennent le titre et la description SEO de la page, modifiables dans le CMS.
 *
 * `offersList` : nom de la liste du CMS qui contient les formules et leurs prix (« coaching_programs »,
 * « entreprises_pricing »). Chaque formule est publiée avec son prix quand c'est un vrai prix (« 120 € », « Gratuit »),
 * sans prix pour « Sur devis ».
 */
export default async function ServiceJsonLd({
  page,
  defaults,
  offersList,
}: {
  page: string
  defaults: Record<string, string>
  offersList?: string
}) {
  const [content, kv] = await Promise.all([getPageContent(page, defaults), getKvSettings()])
  const offers: OfferInput[] = offersList
    ? readList(content, offersList).map(item => ({
        // les programmes ont un « label », les formules entreprises un « title »
        name: item.label || item.title,
        description: item.desc,
        price: item.price,
      }))
    : []
  const schema = serviceSchema({
    name: content.seo_title,
    description: content.seo_description,
    url: `${SITE_URL}${pagePath(page)}`,
    providerName: kv.geo_person_name || DEFAULT_PERSON_NAME,
    offers,
  })
  if (!schema) return null
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
}

import CmsServerContent from '@/components/CmsServerContent'
import { HOME_DEFAULTS } from '@/lib/cms-defaults/home'
import { FAQ_DEFAULTS, FAQ_ITEMS } from '@/lib/cms-defaults/faq'
import { getPageContent } from '@/lib/cms-content-server'
import { readList } from '@/lib/cms-lists'
import { faqPageSchema, plainText, safeJsonLd } from '@/lib/json-ld'
import HomeContent from './HomeContent'

export const revalidate = 300 // la page est régénérée au plus toutes les 5 min (+ immédiatement à chaque sauvegarde du CMS)

// Nombre de questions de la FAQ reprises sur l'accueil (les premières de la liste de admin → FAQ).
const HOME_FAQ_COUNT = 5

// Page d'accueil. Le contenu publié du CMS est lu sur le serveur (CmsServerContent) pour être présent dès le HTML
// envoyé aux robots ; l'affichage et l'édition en ligne restent dans HomeContent (composant client).
// L'extrait de FAQ vient de la page FAQ (mêmes questions, même source) : réponses lisibles par les moteurs de réponse IA.
export default async function Home() {
  const faqContent = await getPageContent('faq', FAQ_DEFAULTS)
  const faq = readList(faqContent, 'faq_questions', FAQ_ITEMS)
    .map(i => ({ q: plainText(i.q ?? ''), a: plainText(i.a ?? '') }))
    .filter(i => i.q && i.a)
    .slice(0, HOME_FAQ_COUNT)
  const schema = faqPageSchema(faq)
  return (
    <CmsServerContent pages={{ home: HOME_DEFAULTS }}>
      {schema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />}
      <HomeContent faq={faq} />
    </CmsServerContent>
  )
}

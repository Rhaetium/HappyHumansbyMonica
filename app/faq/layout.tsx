import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/page-seo'
import { FAQ_DEFAULTS, FAQ_ITEMS } from '@/lib/cms-defaults/faq'
import { getPageContent } from '@/lib/cms-content-server'
import { readList } from '@/lib/cms-lists'
import { faqPageSchema, safeJsonLd } from '@/lib/json-ld'
import CmsServerContent from '@/components/CmsServerContent'

export const revalidate = 300 // la page est régénérée au plus toutes les 5 min (+ immédiatement à chaque sauvegarde du CMS)

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('faq', FAQ_DEFAULTS)
}

// La page FAQ est un composant « client » : ses questions ne sont pas dans le HTML envoyé par le serveur.
// Les données structurées FAQPage sont donc produites ici, côté serveur, avec les mêmes questions que la page
// (liste modifiable dans le CMS, sinon les questions d'origine).
export default async function Layout({ children }: { children: React.ReactNode }) {
  const content = await getPageContent('faq', FAQ_DEFAULTS)
  const schema = faqPageSchema(readList(content, 'faq_questions', FAQ_ITEMS))
  return (
    <CmsServerContent pages={{ 'faq': FAQ_DEFAULTS }}>
      {schema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />}
      {children}
    </CmsServerContent>
  )
}

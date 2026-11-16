import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/page-seo'
import { FAQ_DEFAULTS, FAQ_ITEMS } from '@/lib/cms-defaults/faq'
import { getPageContent } from '@/lib/cms-content-server'
import { readList } from '@/lib/cms-lists'
export const revalidate = 300 // la page est régénérée au plus toutes les 5 min (+ immédiatement à chaque sauvegarde du CMS)
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('faq', FAQ_DEFAULTS)
}

// Données structurées FAQPage : Google et les assistants IA (GEO) reprennent directement ces questions/réponses.
// Source = la même liste que celle affichée par la page (CMS, sinon questions d'origine).
export default async function Layout({ children }: { children: React.ReactNode }) {
  const content = await getPageContent('faq', FAQ_DEFAULTS)
  const faqs = readList(content, 'faq_questions', FAQ_ITEMS).filter(f => (f.q ?? '').trim() && (f.a ?? '').trim())
  const faqLd = faqs.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        inLanguage: 'fr-FR',
        mainEntity: faqs.map(f => ({
          '@type': 'Question',
          name: f.q.trim(),
          acceptedAnswer: { '@type': 'Answer', text: f.a.trim() },
        })),
      }
    : null
  return (
    <>
      {faqLd && (
        <script
          type="application/ld+json"
          // « < » échappé : un texte saisi dans le CMS ne peut pas fermer la balise <script>
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, '\\u003c') }}
        />
      )}
      {children}
    </>
  )
}

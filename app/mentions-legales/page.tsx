import MentionsLegalesContent from './MentionsLegalesContent'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/page-seo'
import { MENTIONS_LEGALES_DEFAULTS } from '@/lib/cms-defaults/mentions-legales'
import CmsServerContent from '@/components/CmsServerContent'
export const revalidate = 300 // la page est régénérée au plus toutes les 5 min (+ immédiatement à chaque sauvegarde du CMS)
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('mentions-legales', MENTIONS_LEGALES_DEFAULTS)
}

export default function MentionsLegales() {
  return <CmsServerContent pages={{ 'mentions-legales': MENTIONS_LEGALES_DEFAULTS }}><MentionsLegalesContent /></CmsServerContent>
}

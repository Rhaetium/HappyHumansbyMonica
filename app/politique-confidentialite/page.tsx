import PolitiqueContent from './PolitiqueContent'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/page-seo'
import { POLITIQUE_CONFIDENTIALITE_DEFAULTS } from '@/lib/cms-defaults/politique-confidentialite'
import CmsServerContent from '@/components/CmsServerContent'
export const revalidate = 300 // la page est régénérée au plus toutes les 5 min (+ immédiatement à chaque sauvegarde du CMS)
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('politique-confidentialite', POLITIQUE_CONFIDENTIALITE_DEFAULTS)
}

export default function PolitiqueConfidentialite() {
  return <CmsServerContent pages={{ 'politique-confidentialite': POLITIQUE_CONFIDENTIALITE_DEFAULTS }}><PolitiqueContent /></CmsServerContent>
}

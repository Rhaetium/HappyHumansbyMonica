import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/page-seo'
import { RELATIONS_DEFAULTS } from '@/lib/cms-defaults/relations'
import CmsServerContent from '@/components/CmsServerContent'
export const revalidate = 300 // la page est régénérée au plus toutes les 5 min (+ immédiatement à chaque sauvegarde du CMS)
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('relations', RELATIONS_DEFAULTS)
}
export default function Layout({ children }: { children: React.ReactNode }) { return <CmsServerContent pages={{ 'relations': RELATIONS_DEFAULTS }}>{children}</CmsServerContent> }
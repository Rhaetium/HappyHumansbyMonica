import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/page-seo'
import { A_PROPOS_DEFAULTS } from '@/lib/cms-defaults/a-propos'
import CmsServerContent from '@/components/CmsServerContent'
export const revalidate = 300 // la page est régénérée au plus toutes les 5 min (+ immédiatement à chaque sauvegarde du CMS)
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('a-propos', A_PROPOS_DEFAULTS)
}
export default function Layout({ children }: { children: React.ReactNode }) { return <CmsServerContent pages={{ 'a-propos': A_PROPOS_DEFAULTS }}>{children}</CmsServerContent> }
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/page-seo'
import { CONTACT_DEFAULTS } from '@/lib/cms-defaults/contact'
import CmsServerContent from '@/components/CmsServerContent'
export const revalidate = 300 // la page est régénérée au plus toutes les 5 min (+ immédiatement à chaque sauvegarde du CMS)
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('contact', CONTACT_DEFAULTS)
}
export default function Layout({ children }: { children: React.ReactNode }) { return <CmsServerContent pages={{ 'contact': CONTACT_DEFAULTS }}>{children}</CmsServerContent> }
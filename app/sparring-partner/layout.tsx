import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/page-seo'
import { SPARRING_PARTNER_DEFAULTS } from '@/lib/cms-defaults/sparring-partner'
import ServiceJsonLd from '@/components/ServiceJsonLd'
import CmsServerContent from '@/components/CmsServerContent'
export const revalidate = 300 // la page est régénérée au plus toutes les 5 min (+ immédiatement à chaque sauvegarde du CMS)
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('sparring-partner', SPARRING_PARTNER_DEFAULTS)
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return <CmsServerContent pages={{ 'sparring-partner': SPARRING_PARTNER_DEFAULTS }}><ServiceJsonLd page="sparring-partner" defaults={SPARRING_PARTNER_DEFAULTS} />{children}</CmsServerContent>
}

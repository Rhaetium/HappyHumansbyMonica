import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/page-seo'
import { ENTREPRISES_DEFAULTS } from '@/lib/cms-defaults/entreprises'
import ServiceJsonLd from '@/components/ServiceJsonLd'
export const revalidate = 300 // la page est régénérée au plus toutes les 5 min (+ immédiatement à chaque sauvegarde du CMS)
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('entreprises', ENTREPRISES_DEFAULTS)
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return <><ServiceJsonLd page="entreprises" defaults={ENTREPRISES_DEFAULTS} />{children}</>
}
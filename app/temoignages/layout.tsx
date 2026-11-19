import type { Metadata } from 'next'
import { TEMOIGNAGES_TITLE, TEMOIGNAGES_DESCRIPTION } from '@/lib/temoignages-seo'
export const metadata: Metadata = {
  title: TEMOIGNAGES_TITLE,
  description: TEMOIGNAGES_DESCRIPTION,
  alternates: { canonical: '/temoignages' },
}
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</> }
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/page-seo'
import { BOOKING_DEFAULTS } from '@/lib/cms-defaults/booking'
import CmsServerContent from '@/components/CmsServerContent'
export const revalidate = 300 // la page est régénérée au plus toutes les 5 min (+ immédiatement à chaque sauvegarde du CMS)
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('booking', BOOKING_DEFAULTS)
}

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <CmsServerContent pages={{ 'booking': BOOKING_DEFAULTS }}>
      <link href="https://assets.calendly.com/assets/external/widget.css" rel="stylesheet" />
      {children}
    </CmsServerContent>
  )
}

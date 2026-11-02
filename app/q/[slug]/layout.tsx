import type { Metadata } from 'next'

// Questionnaires : destinés aux personnes qui scannent un QR code, pas au référencement.
export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
}

export default function QuestionnaireLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Témoignages — Happy Humans · Monica Schneider',
  description: "Ils ont travaillé avec Monica Schneider. Des parcours différents, une même expérience : retrouver de la clarté et avancer avec confiance.",
}
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</> }
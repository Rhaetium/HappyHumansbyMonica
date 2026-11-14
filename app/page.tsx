import CmsServerContent from '@/components/CmsServerContent'
import { HOME_DEFAULTS } from '@/lib/cms-defaults/home'
import HomeContent from './HomeContent'

export const revalidate = 300 // la page est régénérée au plus toutes les 5 min (+ immédiatement à chaque sauvegarde du CMS)

// Page d'accueil. Le contenu publié du CMS est lu sur le serveur (CmsServerContent) pour être présent dès le HTML
// envoyé aux robots ; l'affichage et l'édition en ligne restent dans HomeContent (composant client).
export default function Home() {
  return (
    <CmsServerContent pages={{ home: HOME_DEFAULTS }}>
      <HomeContent />
    </CmsServerContent>
  )
}

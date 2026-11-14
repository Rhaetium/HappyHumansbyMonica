import type { ReactNode } from 'react'
import { getPageContent } from '@/lib/cms-content-server'
import { CmsInitialContent } from '@/contexts/CmsInitialContent'

/**
 * Lit sur le serveur le contenu publié des pages données (textes par défaut remplacés par ceux du CMS) et le met à
 * disposition de useCmsContent dès le premier rendu. À placer dans le layout d'une page, ou autour de la page.
 * Si la base est indisponible, on retombe sur les textes par défaut : la page ne casse jamais.
 */
export default async function CmsServerContent({
  pages,
  children,
}: {
  /** { nom de la page: textes par défaut de la page } */
  pages: Record<string, Record<string, string>>
  children: ReactNode
}) {
  const entries = await Promise.all(
    Object.entries(pages).map(async ([page, defaults]) => [page, await getPageContent(page, defaults)] as const),
  )
  return <CmsInitialContent pages={Object.fromEntries(entries)}>{children}</CmsInitialContent>
}

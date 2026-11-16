'use client'
// Contenu publié du CMS lu par le SERVEUR et transmis aux composants « client » (useCmsContent).
//
// Pourquoi : un composant client est bien rendu une première fois sur le serveur, mais il ne connaît alors que les
// textes par défaut ; le contenu publié n'arrive qu'après un appel réseau dans le navigateur. Les robots qui ne
// lancent pas le JavaScript (la plupart des robots des IA, et la première lecture de Google) ne voyaient donc que
// les textes par défaut. Ici le serveur lit le contenu publié et l'injecte dès le premier rendu : le HTML envoyé
// contient les vrais textes, et le navigateur démarre avec les mêmes (aucune différence à l'hydratation).
import { createContext, useContext, useMemo, type ReactNode } from 'react'

type PagesContent = Record<string, Record<string, string>>

const CmsInitialContentContext = createContext<PagesContent>({})

export function CmsInitialContent({ pages, children }: { pages: PagesContent; children: ReactNode }) {
  const parent = useContext(CmsInitialContentContext)
  const value = useMemo(() => ({ ...parent, ...pages }), [parent, pages])
  return <CmsInitialContentContext.Provider value={value}>{children}</CmsInitialContentContext.Provider>
}

/** Contenu publié d'une page, tel que le serveur l'a lu (défauts + textes publiés), ou undefined s'il n'a pas été fourni. */
export function useInitialCmsContent(page: string): Record<string, string> | undefined {
  return useContext(CmsInitialContentContext)[page]
}

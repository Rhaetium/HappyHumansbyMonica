import { describe, expect, it } from 'vitest'
import { serpBreadcrumb, serpTitle, truncateForSerp } from '@/lib/seo-preview'

describe('serpTitle', () => {
  it('ajoute la marque comme le fait le site', () => {
    expect(serpTitle('Contact — Monica Schneider')).toBe('Contact — Monica Schneider | Happy Humans')
  })

  it('ne double pas une marque déjà en fin de titre', () => {
    expect(serpTitle('Questions fréquentes — Happy Humans')).toBe('Questions fréquentes | Happy Humans')
  })

  it('renvoie une chaîne vide sans titre (pas de « | Happy Humans » seul)', () => {
    expect(serpTitle('')).toBe('')
    expect(serpTitle('   ')).toBe('')
    expect(serpTitle(undefined)).toBe('')
  })
})

describe('truncateForSerp', () => {
  it('laisse un texte court intact et aplatit les retours à la ligne', () => {
    expect(truncateForSerp('Bonjour   le\nmonde', 60)).toBe('Bonjour le monde')
  })

  it('coupe un texte trop long avec « … » sans dépasser la limite', () => {
    const out = truncateForSerp('a'.repeat(100), 60)
    expect(out.length).toBe(60)
    expect(out.endsWith('…')).toBe(true)
  })

  it('un texte exactement à la limite n’est pas coupé', () => {
    expect(truncateForSerp('a'.repeat(60), 60)).toBe('a'.repeat(60))
  })
})

describe('serpBreadcrumb', () => {
  it('affiche le domaine puis le chemin séparés par « › »', () => {
    expect(serpBreadcrumb('https://happyhumans.fr', '/coaching')).toBe('happyhumans.fr › coaching')
    expect(serpBreadcrumb('https://happyhumans.fr/', '/blog/mon-article')).toBe('happyhumans.fr › blog › mon-article')
  })

  it('l’accueil n’affiche que le domaine', () => {
    expect(serpBreadcrumb('https://happyhumans.fr', '/')).toBe('happyhumans.fr')
  })
})

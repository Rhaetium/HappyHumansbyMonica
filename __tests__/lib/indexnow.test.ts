import { describe, expect, it } from 'vitest'
import { toAbsoluteUrls } from '@/lib/indexnow'

describe('toAbsoluteUrls', () => {
  const base = 'https://happyhumans.fr'

  it('transforme les chemins en adresses complètes', () => {
    expect(toAbsoluteUrls(['/blog/mon-article', '/blog'], base)).toEqual([
      'https://happyhumans.fr/blog/mon-article',
      'https://happyhumans.fr/blog',
    ])
  })

  it("l'accueil « / » devient l'adresse du site sans slash final", () => {
    expect(toAbsoluteUrls(['/'], base)).toEqual(['https://happyhumans.fr'])
  })

  it('accepte un chemin sans slash initial et laisse les adresses complètes intactes', () => {
    expect(toAbsoluteUrls(['faq', 'https://happyhumans.fr/coaching'], base)).toEqual([
      'https://happyhumans.fr/faq',
      'https://happyhumans.fr/coaching',
    ])
  })

  it('retire les doublons et les entrées vides', () => {
    expect(toAbsoluteUrls(['/faq', '/faq', '  ', ''], base)).toEqual(['https://happyhumans.fr/faq'])
  })
})

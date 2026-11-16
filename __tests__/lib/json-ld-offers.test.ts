import { describe, expect, it } from 'vitest'
import { parsePrice, serviceSchema } from '@/lib/json-ld'

describe('parsePrice', () => {
  it('reconnaît « Gratuit » et « Offert » comme un prix de 0', () => {
    expect(parsePrice('Gratuit')).toEqual({ price: 0, from: false })
    expect(parsePrice('offerte (1h)')).toEqual({ price: 0, from: false })
  })

  it('lit un prix en euros', () => {
    expect(parsePrice('120 €')).toEqual({ price: 120, from: false })
    expect(parsePrice('120€')).toEqual({ price: 120, from: false })
    expect(parsePrice('90 euros')).toEqual({ price: 90, from: false })
    expect(parsePrice('49,90 €')).toEqual({ price: 49.9, from: false })
  })

  it('lit les milliers français', () => {
    expect(parsePrice('1 200 €')).toEqual({ price: 1200, from: false })
    expect(parsePrice('1.200 €')).toEqual({ price: 1200, from: false })
  })

  it('repère « à partir de » comme un prix minimum', () => {
    expect(parsePrice('À partir de 300 €')).toEqual({ price: 300, from: true })
  })

  it('ne publie aucun prix quand il n’y en a pas de réel', () => {
    expect(parsePrice('Sur devis')).toBeNull()
    expect(parsePrice('Nous contacter')).toBeNull()
    expect(parsePrice('')).toBeNull()
    expect(parsePrice(undefined)).toBeNull()
  })
})

describe('serviceSchema avec formules', () => {
  const url = 'https://happyhumans.fr/coaching'

  it('publie les prix réels et laisse « Sur devis » sans prix', () => {
    const s = serviceSchema({
      name: 'Coaching',
      url,
      offers: [
        { name: 'Séance découverte', price: 'Gratuit' },
        { name: 'Séance individuelle', description: 'Un **espace** pour avancer', price: '120 €' },
        { name: 'Programme Prise de Poste', price: 'Sur devis' },
      ],
    })!
    const items = (s.hasOfferCatalog as { itemListElement: Record<string, unknown>[] }).itemListElement
    expect(items).toHaveLength(3)
    expect(items[0]).toMatchObject({ '@type': 'Offer', name: 'Séance découverte', price: 0, priceCurrency: 'EUR' })
    expect(items[1]).toMatchObject({ name: 'Séance individuelle', description: 'Un espace pour avancer', price: 120, priceCurrency: 'EUR' })
    expect(items[2]).not.toHaveProperty('price')
    expect(items[2]).not.toHaveProperty('priceCurrency')
  })

  it('n’ajoute pas de catalogue sans formule, ni de formule sans nom', () => {
    expect(serviceSchema({ name: 'Coaching', url })).not.toHaveProperty('hasOfferCatalog')
    expect(serviceSchema({ name: 'Coaching', url, offers: [{ name: '  ', price: '10 €' }] })).not.toHaveProperty('hasOfferCatalog')
  })

  it('utilise un prix minimum pour « à partir de »', () => {
    const s = serviceSchema({ name: 'Coaching', url, offers: [{ name: 'Pack', price: 'À partir de 300 €' }] })!
    const [offer] = (s.hasOfferCatalog as { itemListElement: Record<string, unknown>[] }).itemListElement
    expect(offer).toMatchObject({ priceSpecification: { minPrice: 300, priceCurrency: 'EUR' } })
    expect(offer).not.toHaveProperty('price')
  })
})

import { describe, it, expect } from 'vitest'
import { isCrossSiteWrite } from '@/lib/csrf'

const base = { method: 'POST', pathname: '/api/cms/content', origin: 'https://www.happyhumans.fr', host: 'www.happyhumans.fr' }

describe('isCrossSiteWrite', () => {
  it('accepte une écriture venue du site lui-même', () => {
    expect(isCrossSiteWrite(base)).toBe(false)
    expect(isCrossSiteWrite({ ...base, origin: 'https://happyhumans.fr' })).toBe(false) // avec ou sans www
  })

  it('refuse une écriture venue d’un autre site', () => {
    expect(isCrossSiteWrite({ ...base, origin: 'https://evil.example' })).toBe(true)
    expect(isCrossSiteWrite({ ...base, method: 'DELETE', origin: 'https://happyhumans.fr.evil.example' })).toBe(true)
    expect(isCrossSiteWrite({ ...base, origin: 'null' })).toBe(true)
  })

  it('ne touche ni aux lectures ni au reste du site', () => {
    expect(isCrossSiteWrite({ ...base, method: 'GET', origin: 'https://evil.example' })).toBe(false)
    expect(isCrossSiteWrite({ ...base, pathname: '/api/contact', origin: 'https://evil.example' })).toBe(false)
  })

  it('laisse passer une requête sans Origin (outil en ligne de commande, pas de cookie de navigateur)', () => {
    expect(isCrossSiteWrite({ ...base, origin: null })).toBe(false)
  })
})

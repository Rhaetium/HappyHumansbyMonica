import { describe, it, expect } from 'vitest'
import { checkPublicHttpsUrl, isPrivateIp } from '@/lib/safe-url'

describe('isPrivateIp', () => {
  it('repère les réseaux internes, le service de métadonnées et le bouclage', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.0.10', '172.16.0.1', '172.31.255.255', '169.254.169.254', '0.0.0.0', '100.64.0.1', '::1', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1', '[::1]']) {
      expect(isPrivateIp(ip), ip).toBe(true)
    }
  })
  it('laisse passer les adresses publiques', () => {
    for (const ip of ['8.8.8.8', '172.32.0.1', '151.101.1.1', '2606:4700::1111']) expect(isPrivateIp(ip), ip).toBe(false)
  })
})

describe('checkPublicHttpsUrl', () => {
  it('accepte une image sur un vrai site en https', () => {
    expect(checkPublicHttpsUrl('https://images.unsplash.com/photo-1?w=800').ok).toBe(true)
  })
  it('refuse http, identifiants, noms internes et IP privées', () => {
    for (const u of ['http://example.com/a.jpg', 'https://user:pw@example.com/a.jpg', 'https://localhost/a.jpg', 'https://intranet/a.jpg',
      'https://serveur.internal/a.jpg', 'https://127.0.0.1/a.jpg', 'https://169.254.169.254/latest/meta-data', 'https://[::1]/a.jpg', 'ftp://example.com/a', 'pas une adresse']) {
      expect(checkPublicHttpsUrl(u).ok, u).toBe(false)
    }
  })
})

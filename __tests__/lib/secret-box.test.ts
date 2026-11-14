import { describe, it, expect } from 'vitest'
import { encryptSecret, decryptSecret, secretBoxSecret } from '@/lib/secret-box'

const SECRET = 'un-secret-de-session-assez-long-1234567890'

describe('secret-box', () => {
  it('chiffre puis déchiffre à l’identique (accents compris)', () => {
    const plain = 'AIzaSyD-clé_très_secrète-é€'
    expect(decryptSecret(encryptSecret(plain, SECRET), SECRET)).toBe(plain)
  })

  it('le texte chiffré ne contient jamais la clé d’origine', () => {
    const blob = encryptSecret('gsk_ma_cle_en_clair', SECRET)
    expect(blob).not.toContain('gsk_ma_cle_en_clair')
    expect(blob.startsWith('v1.')).toBe(true)
  })

  it('deux chiffrements du même texte diffèrent (vecteur d’initialisation aléatoire)', () => {
    expect(encryptSecret('x'.repeat(20), SECRET)).not.toBe(encryptSecret('x'.repeat(20), SECRET))
  })

  it('un mauvais secret ne déchiffre pas (null, pas d’exception)', () => {
    expect(decryptSecret(encryptSecret('abc12345', SECRET), 'un-autre-secret-complet-123456')).toBeNull()
  })

  it('un contenu modifié est refusé', () => {
    const [v, iv, tag, data] = encryptSecret('abc12345', SECRET).split('.')
    const flipped = (data[0] === 'A' ? 'B' : 'A') + data.slice(1)
    expect(decryptSecret([v, iv, tag, flipped].join('.'), SECRET)).toBeNull()
  })

  it('une valeur qui n’est pas un secret chiffré renvoie null', () => {
    for (const junk of ['', 'texte en clair', 'v1.a.b', 'v2.a.b.c', 'v1....']) expect(decryptSecret(junk, SECRET)).toBeNull()
  })

  it('le secret vient de CMS_SESSION_SECRET, à défaut de CMS_PASSWORD', () => {
    expect(secretBoxSecret({ CMS_SESSION_SECRET: ' s1 ', CMS_PASSWORD: 'p' })).toBe('s1')
    expect(secretBoxSecret({ CMS_PASSWORD: 'p' })).toBe('p')
    expect(secretBoxSecret({})).toBeNull()
  })
})

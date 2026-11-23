import { describe, it, expect } from 'vitest'
import {
  base32Decode, base32Encode, consumeRecoveryCode, formatSecret, generateRecoveryCodes, generateTotpSecret,
  hashRecoveryCode, otpauthUri, totpAt, verifyTotp,
} from '@/lib/totp'

// Vecteurs officiels de la RFC 6238 (clé « 12345678901234567890 », SHA-1) : les 6 derniers chiffres du code à 8 chiffres.
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'))

describe('TOTP (RFC 6238)', () => {
  it('donne les codes officiels', () => {
    expect(totpAt(RFC_SECRET, 59_000)).toBe('287082')
    expect(totpAt(RFC_SECRET, 1_111_111_109_000)).toBe('081804')
    expect(totpAt(RFC_SECRET, 1_111_111_111_000)).toBe('050471')
    expect(totpAt(RFC_SECRET, 2_000_000_000_000)).toBe('279037')
  })
  it('base32 : aller-retour et rejet des caractères invalides', () => {
    const s = generateTotpSecret()
    expect(s).toMatch(/^[A-Z2-7]{32}$/)
    expect(base32Encode(base32Decode(s))).toBe(s)
    expect(() => base32Decode('abc1')).toThrow()
  })
  it('accepte le code de la période précédente et suivante, pas au-delà', () => {
    const now = 1_000_000_000_000
    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, now), now)).toBe(true)
    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, now - 30_000), now)).toBe(true)
    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, now + 30_000), now)).toBe(true)
    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, now - 90_000), now)).toBe(false)
  })
  it('refuse un format invalide, tolère les espaces', () => {
    const now = 59_000
    expect(verifyTotp(RFC_SECRET, '12345', now)).toBe(false)
    expect(verifyTotp(RFC_SECRET, 'abcdef', now)).toBe(false)
    expect(verifyTotp(RFC_SECRET, '287 082', now)).toBe(true)
  })
  it('lien otpauth et clé groupée', () => {
    const uri = otpauthUri('ABCDEFGH', 'monica')
    expect(uri.startsWith('otpauth://totp/Happy%20Humans%20CMS%3Amonica?secret=ABCDEFGH')).toBe(true)
    expect(formatSecret('ABCDEFGHIJKL')).toBe('ABCD EFGH IJKL')
  })
})

describe('codes de secours', () => {
  it('8 codes distincts, sans caractères ambigus', () => {
    const codes = generateRecoveryCodes()
    expect(new Set(codes).size).toBe(8)
    for (const c of codes) expect(c).toMatch(/^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/)
  })
  it('un code de secours ne marche qu’une fois, quelle que soit la saisie (casse, tiret)', () => {
    const codes = ['ABCDE-FGHJK', 'MNPQR-STUVW']
    const hashes = codes.map(c => hashRecoveryCode(c, 'secret'))
    const left = consumeRecoveryCode(hashes, 'abcde fghjk', 'secret')
    expect(left).toEqual([hashes[1]])
    expect(consumeRecoveryCode(left!, 'ABCDE-FGHJK', 'secret')).toBeNull()
    expect(consumeRecoveryCode(hashes, 'ZZZZZ-ZZZZZ', 'secret')).toBeNull()
    expect(consumeRecoveryCode(hashes, 'ABCDE-FGHJK', 'autre-secret')).toBeNull()
  })
})

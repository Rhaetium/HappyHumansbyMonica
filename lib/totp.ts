// Double authentification (TOTP, RFC 6238) : le code à 6 chiffres de l'application d'authentification (Google Authenticator,
// Microsoft Authenticator, Authy, 1Password…). Sans dépendance : node:crypto seulement. Logique pure, testée avec les
// vecteurs officiels de la RFC dans __tests__/lib/totp.test.ts.

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
export const STEP_SECONDS = 30
export const DIGITS = 6

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0, value = 0, out = ''
  for (const b of bytes) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5 }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(text: string): Buffer {
  const clean = text.toUpperCase().replace(/[\s=-]/g, '')
  let bits = 0, value = 0
  const out: number[] = []
  for (const ch of clean) {
    const i = B32.indexOf(ch)
    if (i === -1) throw new Error('Clé invalide')
    value = (value << 5) | i
    bits += 5
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8 }
  }
  return Buffer.from(out)
}

/** Nouvelle clé secrète (160 bits, en base 32 : celle que Monica saisit dans son application). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20))
}

/** Code à `DIGITS` chiffres pour un instant donné (millisecondes). */
export function totpAt(secretBase32: string, timeMs: number, digits = DIGITS): string {
  const counter = Math.floor(timeMs / 1000 / STEP_SECONDS)
  const msg = Buffer.alloc(8)
  msg.writeBigUInt64BE(BigInt(counter))
  const hmac = createHmac('sha1', base32Decode(secretBase32)).update(msg).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const bin = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3]
  return String(bin % 10 ** digits).padStart(digits, '0')
}

const safeEqual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

/** Vrai si le code est celui de l'instant, de la période précédente ou de la suivante (décalage d'horloge toléré). */
export function verifyTotp(secretBase32: string, code: string, timeMs = Date.now(), window = 1): boolean {
  const clean = code.replace(/\s/g, '')
  if (!/^\d{6}$/.test(clean)) return false
  let ok = false
  for (let w = -window; w <= window; w++) {
    if (safeEqual(totpAt(secretBase32, timeMs + w * STEP_SECONDS * 1000), clean)) ok = true // pas de sortie anticipée
  }
  return ok
}

/** Lien « otpauth » : ce que contient le QR code ; certaines applications l'acceptent collé tel quel. */
export function otpauthUri(secretBase32: string, account: string, issuer = 'Happy Humans CMS'): string {
  const label = encodeURIComponent(`${issuer}:${account}`)
  return `otpauth://totp/${label}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`
}

/** Clé affichée par groupes de 4 pour la recopier sans erreur. */
export const formatSecret = (secret: string) => secret.replace(/(.{4})/g, '$1 ').trim()

// ── Codes de secours : à utiliser une seule fois si le téléphone est perdu ──
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sans 0/O/1/I

export function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    const bytes = randomBytes(10)
    const raw = Array.from(bytes, b => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length]).join('')
    return `${raw.slice(0, 5)}-${raw.slice(5)}`
  })
}

export const normalizeRecoveryCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '')

/** Empreinte d'un code de secours (le code lui-même n'est jamais enregistré). */
export function hashRecoveryCode(code: string, secret: string): string {
  return createHmac('sha256', secret).update(normalizeRecoveryCode(code)).digest('hex')
}

/** Si `code` est un code de secours encore valide : renvoie la liste SANS ce code (usage unique), sinon null. */
export function consumeRecoveryCode(hashes: string[], code: string, secret: string): string[] | null {
  const h = hashRecoveryCode(code, secret)
  const index = hashes.findIndex(x => safeEqual(x, h))
  return index === -1 ? null : hashes.filter((_, i) => i !== index)
}

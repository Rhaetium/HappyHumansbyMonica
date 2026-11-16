// Chiffrement des clés d'API saisies dans le CMS (AES-256-GCM).
//
// Pourquoi : une clé enregistrée en base serait lisible par quiconque accède à la base ou à une sauvegarde.
// Chiffrée avec un secret qui, lui, ne vit que dans Vercel, elle ne sert à rien sans ce secret.
// Si le secret change (CMS_SESSION_SECRET), les clés enregistrées deviennent illisibles : il suffit de les ressaisir.
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

const SALT = 'happyhumans/secret-box/v1'
const VERSION = 'v1'
const keyCache = new Map<string, Buffer>()

function deriveKey(secret: string): Buffer {
  let key = keyCache.get(secret)
  if (!key) {
    key = scryptSync(secret, SALT, 32)
    keyCache.set(secret, key)
  }
  return key
}

const b64 = (b: Buffer) => b.toString('base64url')

/** Chiffre un texte. Le résultat (« v1.iv.tag.contenu ») ne révèle rien du texte d'origine. */
export function encryptSecret(plain: string, secret: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', deriveKey(secret), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return [VERSION, b64(iv), b64(cipher.getAuthTag()), b64(data)].join('.')
}

/** Déchiffre. Renvoie null si le secret est mauvais ou si le contenu a été modifié (jamais d'exception). */
export function decryptSecret(blob: string, secret: string): string | null {
  try {
    const [version, iv, tag, data] = blob.split('.')
    if (version !== VERSION || !iv || !tag || !data) return null
    const decipher = createDecipheriv('aes-256-gcm', deriveKey(secret), Buffer.from(iv, 'base64url'))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}

/** Secret de chiffrement : celui de la session admin (à défaut, le mot de passe admin). Null si aucun n'est défini. */
export function secretBoxSecret(env: Record<string, string | undefined> = process.env): string | null {
  return env.CMS_SESSION_SECRET?.trim() || env.CMS_PASSWORD?.trim() || null
}

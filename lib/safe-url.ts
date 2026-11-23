// Garde contre les requêtes vers l'intérieur (SSRF) : avant que le serveur télécharge une adresse donnée par un
// utilisateur (import d'image par lien), on vérifie qu'elle vise un vrai site public en https, jamais le serveur
// lui-même, un réseau privé ou le service de métadonnées du cloud (169.254.169.254).
// Logique pure, testée dans __tests__/lib/safe-url.test.ts. La résolution DNS se fait dans la route.

/** IPv4 en 4 nombres, ou null si ce n'en est pas une. */
function ipv4(host: string): number[] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (!m) return null
  const parts = m.slice(1).map(Number)
  return parts.every(n => n <= 255) ? parts : null
}

/** Adresse IP privée, locale, de lien local, réservée ou de diffusion (IPv4 ou IPv6). */
export function isPrivateIp(ip: string): boolean {
  const host = ip.replace(/^\[|\]$/g, '').toLowerCase()
  const v4 = ipv4(host)
  if (v4) {
    const [a, b] = v4
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // partage opérateur
      (a === 169 && b === 254) || // lien local + métadonnées cloud
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224 // multicast et réservé
    )
  }
  if (host.includes(':')) {
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(host) // IPv4 déguisée en IPv6
    if (mapped) return isPrivateIp(mapped[1])
    return host === '::' || host === '::1' || host.startsWith('fe80') || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('ff')
  }
  return false
}

export type UrlVerdict = { ok: true; url: URL } | { ok: false; reason: string }

/** Vérification sans réseau : https, pas d'identifiants, pas de nom interne, pas d'IP privée écrite en clair. */
export function checkPublicHttpsUrl(input: string): UrlVerdict {
  let url: URL
  try { url = new URL(input) } catch { return { ok: false, reason: 'Adresse invalide.' } }
  if (url.protocol !== 'https:') return { ok: false, reason: 'L’adresse doit commencer par https://.' }
  if (url.username || url.password) return { ok: false, reason: 'Adresse avec identifiants refusée.' }
  const host = url.hostname.toLowerCase()
  if (!host.includes('.') && !host.includes(':')) return { ok: false, reason: 'Nom de serveur interne refusé.' }
  if (/(^|\.)(localhost|local|internal|lan|home|corp)$/.test(host)) return { ok: false, reason: 'Nom de serveur interne refusé.' }
  if (isPrivateIp(host)) return { ok: false, reason: 'Adresse réseau interne refusée.' }
  return { ok: true, url }
}

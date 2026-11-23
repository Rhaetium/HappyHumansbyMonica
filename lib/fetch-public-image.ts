// Téléchargement d'une image distante sans jamais atteindre un serveur interne (SSRF) : https public seulement, DNS vérifié,
// redirections suivies à la main et revérifiées, taille limitée. Partagé par l'import d'image et la suggestion de texte alternatif.
import { lookup } from 'node:dns/promises';
import { checkPublicHttpsUrl, isPrivateIp } from '@/lib/safe-url';

const MAX_REDIRECTS = 3;

/** Télécharge une image distante sans jamais atteindre un serveur interne (SSRF). */
export async function fetchPublicImage(
  start: string,
  maxBytes: number,
): Promise<{ ok: true; buffer: Buffer } | { ok: false; error: string }> {
  let current = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const verdict = checkPublicHttpsUrl(current);
    if (!verdict.ok) return { ok: false, error: verdict.reason };
    try {
      // Le nom doit pointer vers des adresses publiques (un nom peut cacher une IP interne)
      const addresses = await lookup(verdict.url.hostname, { all: true });
      if (addresses.length === 0 || addresses.some(a => isPrivateIp(a.address))) {
        return { ok: false, error: 'Adresse réseau interne refusée.' };
      }
      const res = await fetch(verdict.url, { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
      if (res.status >= 300 && res.status < 400) {
        const next = res.headers.get('location');
        if (!next) break;
        current = new URL(next, verdict.url).toString();
        continue;
      }
      if (!res.ok) return { ok: false, error: 'Impossible de télécharger l\'image depuis cette URL' };
      const declared = Number(res.headers.get('content-length') || 0);
      if (declared > maxBytes) return { ok: false, error: 'Image trop volumineuse (max ' + Math.round(maxBytes / 1048576) + ' Mo)' };
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > maxBytes) return { ok: false, error: 'Image trop volumineuse (max ' + Math.round(maxBytes / 1048576) + ' Mo)' };
      return { ok: true, buffer };
    } catch {
      return { ok: false, error: 'Impossible de télécharger l\'image depuis cette URL' };
    }
  }
  return { ok: false, error: 'Trop de redirections.' };
}

import { NextRequest, NextResponse } from 'next/server';
import { requireCmsAuth } from '@/lib/cms-auth';
import { getKvSettings } from '@/lib/cms-settings-server';
import {
  CALENDLY_BASE_DEFAULT,
  CALENDLY_BASE_SETTING,
  calendlyBase,
} from '@/lib/calendly-config';
import {
  calendlyAvailabilityFromProfile,
  calendlyProfileApiUrl,
  calendlyProfileSlug,
  type CalendlyAvailability,
} from '@/lib/calendly-availability';
import { bookingHealthCheck, type HealthCheck } from '@/lib/cms-health';
import { extractVerificationToken, searchConsoleChecks, sitemapUrl } from '@/lib/search-console';
import { SITE_URL } from '@/lib/site-url';
import { loadConnectionEnv } from '@/lib/connections';
import { checkEnvironment, checkSupabase, toHealthChecks } from '@/lib/env-check';
import { geoChecks } from '@/lib/geo-checks';

/**
 * GET /api/cms/health — état des fonctions du site, pour le tableau de bord.
 *
 * Sert à faire remonter en haut du tableau de bord un problème qui empêche le site de rendre
 * service (aujourd'hui : la réservation en ligne), au lieu de le cacher dans les messages.
 * Réservé à l'administration : la réponse décrit la configuration interne du compte.
 */

async function readCalendlyAvailability(profileUrl: string): Promise<CalendlyAvailability> {
  const slug = calendlyProfileSlug(profileUrl);
  const apiUrl = calendlyProfileApiUrl(slug);
  if (!apiUrl) return 'unknown';
  try {
    const res = await fetch(apiUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });
    if (!res.ok) return 'unknown';
    return calendlyAvailabilityFromProfile(await res.json());
  } catch {
    // Réseau coupé, Calendly lent : on ne conclut pas à une panne (voir cms-health.ts).
    return 'unknown';
  }
}

/** Une adresse publique répond-elle, et son contenu contient-il ce qu'on attend ? */
async function readPublicPage(url: string, mustContain?: string): Promise<{ ok: boolean; contains: boolean }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000), cache: 'no-store' });
    if (!res.ok) return { ok: false, contains: false };
    if (!mustContain) return { ok: true, contains: true };
    return { ok: true, contains: (await res.text()).includes(mustContain) };
  } catch {
    return { ok: false, contains: false };
  }
}

// Le tableau de bord interroge cette route toutes les 2 minutes : les tests de la base Supabase
// (une dizaine de petites lectures) sont gardés 10 minutes en mémoire plutôt que refaits à chaque fois.
const CONFIG_TTL_MS = 10 * 60 * 1000;
let configCache: { at: number; checks: HealthCheck[] } | null = null;

async function readConfigChecks(): Promise<HealthCheck[]> {
  if (configCache && Date.now() - configCache.at < CONFIG_TTL_MS) return configCache.checks;
  const checks = toHealthChecks([...checkEnvironment({ ...process.env, ...(await loadConnectionEnv()) }), ...(await checkSupabase(process.env))]);
  configCache = { at: Date.now(), checks };
  return checks;
}

/** Texte d'une adresse publique, ou null si elle ne répond pas (réseau coupé, erreur) : on ne conclut alors à rien. */
async function readPublicText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000), cache: 'no-store' });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

// Même principe que ci-dessus : trois téléchargements du site public, gardés 10 minutes.
let geoCache: { at: number; checks: HealthCheck[] } | null = null;

async function readGeoChecks(): Promise<HealthCheck[]> {
  if (geoCache && Date.now() - geoCache.at < CONFIG_TTL_MS) return geoCache.checks;
  const [robotsTxt, llmsTxt, homeHtml] = await Promise.all([
    readPublicText(`${SITE_URL}/robots.txt`),
    readPublicText(`${SITE_URL}/llms.txt`),
    readPublicText(SITE_URL),
  ]);
  const checks = geoChecks({ robotsTxt, llmsTxt, homeHtml });
  geoCache = { at: Date.now(), checks };
  return checks;
}

export async function GET(req: NextRequest) {
  const authError = requireCmsAuth(req);
  if (authError) return authError;

  const kv = await getKvSettings();
  const profileUrl = calendlyBase(kv[CALENDLY_BASE_SETTING] || CALENDLY_BASE_DEFAULT);
  const slug = calendlyProfileSlug(profileUrl) || 'happyhumans-coaching';

  const [availability, sitemap, robots, configChecks, seoGeoChecks] = await Promise.all([
    readCalendlyAvailability(profileUrl),
    readPublicPage(sitemapUrl(SITE_URL)),
    readPublicPage(`${SITE_URL}/robots.txt`, 'sitemap'),
    readConfigChecks(),
    readGeoChecks(),
  ]);

  const checks: HealthCheck[] = [
    ...configChecks,
    ...seoGeoChecks,
    bookingHealthCheck({ availability, profileUrl, slug }),
    ...searchConsoleChecks({
      token: extractVerificationToken(kv.gsc_verification),
      sitemapOk: sitemap.ok,
      robotsOk: robots.ok,
      robotsHasSitemap: robots.contains,
      sitemapUrl: sitemapUrl(SITE_URL),
    }),
  ];

  return NextResponse.json({ checks, checkedAt: new Date().toISOString() });
}

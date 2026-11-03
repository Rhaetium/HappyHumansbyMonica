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

export async function GET(req: NextRequest) {
  const authError = requireCmsAuth(req);
  if (authError) return authError;

  const kv = await getKvSettings();
  const profileUrl = calendlyBase(kv[CALENDLY_BASE_SETTING] || CALENDLY_BASE_DEFAULT);
  const slug = calendlyProfileSlug(profileUrl) || 'happyhumans-coaching';
  const availability = await readCalendlyAvailability(profileUrl);

  const checks: HealthCheck[] = [
    bookingHealthCheck({ availability, profileUrl, slug }),
  ];

  return NextResponse.json({ checks, checkedAt: new Date().toISOString() });
}

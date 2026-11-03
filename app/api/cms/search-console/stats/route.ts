import { NextRequest, NextResponse } from 'next/server';
import { requireCmsAuth } from '@/lib/cms-auth';
import { getKvSettings } from '@/lib/cms-settings-server';
import {
  SearchConsoleApiError,
  fetchSearchConsoleStats,
  loadGscCredentials,
} from '@/lib/search-console-api';
import { SEARCH_CONSOLE_PROPERTY_DEFAULT } from '@/lib/search-console';

/**
 * GET /api/cms/search-console/stats — chiffres réels de Google Search Console.
 *
 * Réservé à l'administration : les requêtes de recherche des visiteurs sont des données internes.
 * La clé privée du compte de service ne quitte jamais le serveur.
 *
 * Réponses :
 *  - 200 `{ configured: false }` si les identifiants ne sont pas encore installés (état normal
 *    avant la configuration) — l'interface affiche alors la marche à suivre ;
 *  - 200 `{ configured: true, stats }` sinon ;
 *  - 502 avec `message` + `hint` si Google refuse (compte de service absent de la propriété, etc.).
 */

const ALLOWED_DAYS = [7, 28, 90];

export async function GET(req: NextRequest) {
  const authError = requireCmsAuth(req);
  if (authError) return authError;

  const credentials = loadGscCredentials();
  if (!credentials) {
    return NextResponse.json({ configured: false });
  }

  const kv = await getKvSettings();
  const siteUrl = (kv.gsc_property || SEARCH_CONSOLE_PROPERTY_DEFAULT).trim();
  const requested = Number(req.nextUrl.searchParams.get('days'));
  const days = ALLOWED_DAYS.includes(requested) ? requested : 28;

  try {
    const stats = await fetchSearchConsoleStats({ credentials, siteUrl, days });
    return NextResponse.json({ configured: true, siteUrl, stats });
  } catch (err) {
    if (err instanceof SearchConsoleApiError) {
      return NextResponse.json(
        { configured: true, error: err.message, hint: err.hint },
        { status: 502 },
      );
    }
    return NextResponse.json(
      {
        configured: true,
        error: 'Impossible de lire les statistiques pour le moment.',
        hint: 'Réessayez dans quelques minutes ; si cela dure, vérifiez les accès dans Search Console.',
      },
      { status: 502 },
    );
  }
}

import { MetadataRoute } from 'next';
import { getKvSettings } from '@/lib/cms-settings-server';
import { SITE_URL as BASE_URL } from '@/lib/site-url';
import { buildRobotsRules } from '@/lib/robots-rules';


// Pages pilotables depuis le CMS (Paramètres → Visibilité pages)
const TOGGLABLE_PAGES = [
  'home', 'a-propos', 'coaching', 'entreprises', 'happiness-design',
  'sparring-partner', 'relations', 'temoignages', 'booking', 'contact',
  'blog', 'faq',
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const kv = await getKvSettings();

  const disallow = ['/cms-admin', '/api/', '/dashboard', '/auth/', '/q/', '/maintenance', '/test-attachement'];
  for (const page of TOGGLABLE_PAGES) {
    if (kv[`page_${page}_indexable`] === 'false') {
      disallow.push(page === 'home' ? '/$' : `/${page}`);
    }
  }

  return {
    // Robots IA : réglables dans l'admin (Paramètres → Robots IA) ; autorisés tant que rien n'est changé.
    rules: buildRobotsRules(disallow, kv),
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}

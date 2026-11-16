import { MetadataRoute } from 'next';
import { getKvSettings } from '@/lib/cms-settings-server';
import { SITE_URL as BASE_URL } from '@/lib/site-url';


// Pages pilotables depuis le CMS (Paramètres → Visibilité pages)
const TOGGLABLE_PAGES = [
  'home', 'a-propos', 'coaching', 'entreprises', 'happiness-design',
  'sparring-partner', 'relations', 'temoignages', 'booking', 'contact',
  'blog', 'faq',
];

// GEO (visibilité dans les réponses des assistants IA) : on autorise explicitement les robots
// des moteurs de réponse. Pour les fermer, retirer le nom du robot de cette liste.
const AI_CRAWLERS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'Applebot-Extended',
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
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow,
      },
      // Un groupe dédié ne fusionne pas avec « * » : on y répète les interdictions.
      {
        userAgent: AI_CRAWLERS,
        allow: ['/', '/llms.txt'],
        disallow,
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}

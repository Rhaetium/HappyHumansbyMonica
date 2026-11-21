import { MetadataRoute } from 'next';
import { getKvSettings, isPageIndexable } from '@/lib/cms-settings-server';
import { getAllPosts } from '@/lib/blog-supabase';
import { getCustomPages } from '@/lib/custom-pages-server';
import { pageHref } from '@/lib/custom-pages';
import { SITE_URL as BASE_URL } from '@/lib/site-url';


type Freq = 'weekly' | 'monthly' | 'yearly';

// Toutes les pages publiques — la visibilité Google se pilote depuis
// le CMS (Paramètres → Visibilité pages)
const PAGES: { path: string; page: string; priority: number; freq: Freq }[] = [
  { path: '',                            page: 'home',                      priority: 1.0, freq: 'weekly' },
  { path: '/a-propos',                   page: 'a-propos',                  priority: 0.8, freq: 'monthly' },
  { path: '/coaching',                   page: 'coaching',                  priority: 0.9, freq: 'monthly' },
  { path: '/entreprises',                page: 'entreprises',               priority: 0.9, freq: 'monthly' },
  { path: '/happiness-design',           page: 'happiness-design',          priority: 0.9, freq: 'monthly' },
  { path: '/sparring-partner',           page: 'sparring-partner',          priority: 0.8, freq: 'monthly' },
  { path: '/relations',                  page: 'relations',                 priority: 0.8, freq: 'monthly' },
  { path: '/booking',                    page: 'booking',                   priority: 0.6, freq: 'monthly' },
  { path: '/contact',                    page: 'contact',                   priority: 0.6, freq: 'monthly' },
  { path: '/blog',                       page: 'blog',                      priority: 0.8, freq: 'weekly' },
  { path: '/faq',                        page: 'faq',                       priority: 0.6, freq: 'monthly' },
  { path: '/mentions-legales',           page: 'mentions-legales',          priority: 0.2, freq: 'yearly' },
  { path: '/politique-confidentialite',  page: 'politique-confidentialite', priority: 0.2, freq: 'yearly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const kv = await getKvSettings();

  const entries: MetadataRoute.Sitemap = PAGES
    .filter(p => isPageIndexable(kv, p.page))
    .map(p => ({
      url: `${BASE_URL}${p.path}`,
      // pas de lastModified : « maintenant » à chaque requête fait ignorer ce champ par Google
      changeFrequency: p.freq,
      priority: p.priority,
    }));

  // Articles de blog publiés
  if (isPageIndexable(kv, 'blog')) {
    try {
      const posts = await getAllPosts();
      for (const post of posts) {
        entries.push({
          url: `${BASE_URL}/blog/${post.slug}`,
          lastModified: new Date(post.updated_at ?? post.published_at ?? Date.now()),
          changeFrequency: 'monthly',
          priority: 0.6,
        });
      }
    } catch {
      // Blog indisponible → sitemap des pages statiques uniquement
    }
  }

  // Pages créées dans le CMS (admin → « 📄 Pages libres »), en ligne uniquement
  try {
    for (const page of await getCustomPages()) {
      if (!page.published) continue;
      entries.push({
        url: `${BASE_URL}${pageHref(page.slug)}`,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  } catch {
    // Pages libres indisponibles → sitemap sans elles
  }

  return entries;
}

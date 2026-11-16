// Fonctions utilitaires de l'admin du CMS (déplacées de app/cms-admin/page.tsx, sans changement)
import type { Article } from './types';

// ─── Helpers ─────────────────────────────────────────────────
export const fmt = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
export const slug = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Contenu d'une page tel qu'il est édité dans l'admin : « page__clé » → « clé ». */
export const pageContentOf = (edited: Record<string, string>, page: string): Record<string, string> =>
  Object.fromEntries(Object.entries(edited)
    .filter(([k]) => k.startsWith(`${page}__`))
    .map(([k, v]) => [k.slice(page.length + 2), v]));

export function normalizeArticleDraft(article: Partial<Article> | null | undefined) {
  return {
    id: article?.id ?? null,
    title: article?.title ?? '',
    slug: article?.slug ?? '',
    category: article?.category ?? '',
    excerpt: article?.excerpt ?? '',
    featured_image: article?.featured_image ?? '',
    content: article?.content ?? '',
    voice_notes: article?.voice_notes ?? '',
    seo_title: article?.seo_title ?? '',
    seo_description: article?.seo_description ?? '',
    og_image: article?.og_image ?? '',
    published: Boolean(article?.published),
  };
}

export function getArticleDraftSignature(article: Partial<Article> | null | undefined) {
  return JSON.stringify(normalizeArticleDraft(article));
}

export function getWordCount(content?: string) {
  if (!content) return 0;
  return content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
}

export function getReadTimeMinutes(content?: string) {
  const words = getWordCount(content);
  return words === 0 ? 0 : Math.max(1, Math.ceil(words / 200));
}

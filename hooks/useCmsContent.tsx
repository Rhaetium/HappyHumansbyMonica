'use client';
import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useOptionalInlineEdit } from '@/contexts/InlineEditContext';
import { useInitialCmsContent } from '@/contexts/CmsInitialContent';

const EditableField = dynamic(() => import('@/components/EditableField'), { ssr: false });

type CmsContent = Record<string, string>;

const memCache: Record<string, { data: CmsContent; ts: number }> = {};
const MEM_TTL = 5 * 60 * 1000;
const LS_TTL  = 30 * 1000;
// Copie de secours : servie si le fetch échoue (ex: Supabase en pause),
// même au-delà du TTL de fraîcheur
const LS_STALE_TTL = 30 * 24 * 60 * 60 * 1000;
const LS_PFX  = 'hh_cms_';

export function bustCmsCache(page: string) {
  delete memCache[page];
  if (typeof window !== 'undefined') {
    try { localStorage.removeItem(LS_PFX + page); } catch {}
  }
}

function lsGet(page: string, maxAge: number = LS_TTL): CmsContent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LS_PFX + page);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: CmsContent; ts: number };
    if (Date.now() - ts > maxAge) return null;
    return data;
  } catch { return null; }
}

function lsSet(page: string, data: CmsContent) {
  try { localStorage.setItem(LS_PFX + page, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

function getInitial(page: string, defaults: CmsContent): CmsContent {
  const mem = memCache[page];
  if (mem && Date.now() - mem.ts < MEM_TTL) return { ...defaults, ...mem.data };
  const ls = lsGet(page);
  if (ls) return { ...defaults, ...ls };
  return defaults;
}

// Retourne null si le contenu est indisponible (erreur réseau / base en pause)
// pour que l'appelant conserve son cache au lieu de l'écraser avec du vide.
//
// preview = true : demande aussi les BROUILLONS (le serveur ne les renvoie qu'aux sessions CMS authentifiées ;
// pour un visiteur ordinaire le paramètre est ignoré). Aperçu = jamais mis en cache.
async function fetchPageContent(page: string, preview = false): Promise<{ map: CmsContent; drafts: number } | null> {
  try {
    const res = await fetch(`/api/cms/public-content?page=${encodeURIComponent(page)}${preview ? '&preview=1' : ''}`, {
      headers: { 'Cache-Control': 'no-cache' },
      cache: preview ? 'no-store' : 'default',
    });
    if (!res.ok) return null;
    const { content: rows, drafts } = await res.json();
    const map: CmsContent = {};
    (rows || []).forEach((r: { block_key: string; value: string }) => {
      if (r.value) map[r.block_key] = r.value;
    });
    return { map, drafts: typeof drafts === 'number' ? drafts : 0 };
  } catch { return null; }
}

export type CmsResult = {
  content: CmsContent;
  /**
   * Returns an EditableField component when inline edit mode is active,
   * otherwise returns the plain text string.
   * Use this instead of `c.key` when you want inline editing support.
   */
  get: (key: string, defaultValue?: string, opts?: { multiline?: boolean }) => ReactNode;
} & CmsContent;

export function useCmsContent(page: string, defaults: CmsContent = {}): CmsResult {
  const defaultsRef = useRef(defaults);
  useEffect(() => {
    defaultsRef.current = defaults;
  });

  // Contenu publié lu par le serveur (voir contexts/CmsInitialContent) : s'il existe, il sert de départ, à la place
  // des caches du navigateur, pour que le premier rendu soit identique sur le serveur et dans le navigateur.
  const seeded = useInitialCmsContent(page);
  const [content, setContent] = useState<CmsContent>(() => (seeded ? { ...defaults, ...seeded } : getInitial(page, defaults)));
  const fetchedRef = useRef(false);

  // Aperçu des brouillons : par ?cms_preview=1 (aperçu de l'admin) ou pendant l'édition en ligne.
  // Calculé APRÈS le premier rendu (useEffect) pour ne jamais créer de différence serveur/client à l'hydratation.
  const edit = useOptionalInlineEdit();
  const reportDrafts = edit?.reportDrafts;
  const [urlPreview, setUrlPreview] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydratation : window.location côté client uniquement
    try { setUrlPreview(new URLSearchParams(window.location.search).get('cms_preview') === '1'); } catch { /* ignore */ }
  }, []);
  const preview = urlPreview || !!edit?.isEditing;
  const previewRef = useRef(false);

  const loadContent = useCallback(async () => {
    const res = await fetchPageContent(page, preview);
    if (res === null) {
      // Contenu indisponible (Supabase en pause, réseau…) : servir la copie
      // de secours locale plutôt que de retomber sur les défauts
      if (!preview) {
        const stale = lsGet(page, LS_STALE_TTL);
        if (stale) setContent({ ...defaultsRef.current, ...stale });
      }
      return;
    }
    // Un aperçu ne touche JAMAIS aux caches : il contient des brouillons, pas du contenu public
    if (!preview) {
      memCache[page] = { data: res.map, ts: Date.now() };
      lsSet(page, res.map);
    }
    setContent({ ...defaultsRef.current, ...res.map });
    if (preview && reportDrafts) reportDrafts(page, res.drafts);
  }, [page, preview, reportDrafts]);

  // Initial fetch
  useEffect(() => {
    if (fetchedRef.current) return;
    const mem = memCache[page];
    if (mem && Date.now() - mem.ts < MEM_TTL) return;
    fetchedRef.current = true;
    loadContent().catch(() => {});
  }, [page, loadContent]);

  // Entrée / sortie du mode aperçu : on recharge (brouillons <-> contenu publié)
  useEffect(() => {
    if (previewRef.current === preview) return;
    previewRef.current = preview;
    if (!preview) bustCmsCache(page);
    fetchedRef.current = true;
    loadContent().catch(() => {});
  }, [preview, page, loadContent]);

  // Re-fetch after a successful inline save (for the pages concerned)
  useEffect(() => {
    const onSaved = (e: Event) => {
      const detail = (e as CustomEvent<{ pages?: string[] }>).detail;
      const savedPages: string[] = detail?.pages ?? [];
      if (savedPages.includes(page) || savedPages.length === 0) {
        bustCmsCache(page);
        fetchedRef.current = false;
        loadContent().catch(() => {});
      }
    };
    window.addEventListener('inline-edit-saved', onSaved);
    window.addEventListener('inline-edit-published', onSaved);
    return () => {
      window.removeEventListener('inline-edit-saved', onSaved);
      window.removeEventListener('inline-edit-published', onSaved);
    };
  }, [page, loadContent]);

  const isEditing = !!edit?.isEditing;
  const pendingChanges = edit?.pendingChanges;
  const get = useCallback((key: string, defaultValue?: string, opts?: { multiline?: boolean }): ReactNode => {
    const val = content[key] ?? defaultValue ?? defaultsRef.current[key] ?? '';
    // Hors édition en ligne, un simple texte : rendu aussi sur le serveur, donc présent dans le HTML que lisent
    // Google et les robots des IA. (EditableField, chargé uniquement dans le navigateur, ne l'était pas : le
    // titre de l'accueil était vide dans le HTML brut.) Il ne reste nécessaire que pendant l'édition, ou tant
    // qu'une modification non enregistrée existe pour ce champ.
    if (!isEditing && pendingChanges?.[page]?.[key] === undefined) return <span>{val}</span>;
    return (
      <EditableField
        page={page}
        fieldKey={key}
        value={val}
        multiline={opts?.multiline}
      />
    );
  }, [content, page, isEditing, pendingChanges]);

  // Build the result object without mutating a potentially-frozen object.
  // Objet à prototype null : les clés CMS arbitraires (ex. "__proto__") ne doivent pas toucher Object.prototype.
  // eslint-disable-next-line react-hooks/refs -- faux positif : `content` est un state, pas une ref
  return Object.assign(Object.create(null), content, { get, content }) as CmsResult;
}

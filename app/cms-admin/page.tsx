'use client';
import React from 'react';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import EnhancedRichContent from '@/components/EnhancedRichContent';
import { bustCmsCache } from '@/hooks/useCmsContent';
import MediaLibrary from '@/components/MediaLibrary';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { uploadImage } from '@/lib/upload-client';
import CarouselEditor from '@/components/admin/CarouselEditor';
import CarouselGenerator from '@/components/admin/CarouselGenerator';
import BlogGenerator from '@/components/admin/BlogGenerator';
import { PAGE_DEFAULTS } from '@/lib/cms-page-defaults';
import { basePage, draftPage, isDraftPage, planDraftSave } from '@/lib/cms-drafts';
import { unreadVisitorCount, type MessageFilter } from '@/lib/cms-messages';
import { type HealthCheck } from '@/lib/cms-health';
import { buildContentIndex, fieldAnchor, labelParts, replacementStats, type ContentField, type ReplacementPlanItem } from '@/lib/cms-search';
import { PAGE_SECTIONS } from '@/lib/cms-sections';
import { readList } from '@/lib/cms-lists';
import { customSectionDefs, parseBlocks } from '@/lib/custom-sections';
import NavigationEditor from '@/components/cms/NavigationEditor';
import CustomSectionsEditor from '@/components/cms/CustomSectionsEditor';
import CustomPagesManager from '@/components/cms/CustomPagesManager';
import ContentOverview from '@/components/cms/ContentOverview';
import QuestionnairesAdmin from '@/components/cms/questionnaires/QuestionnairesAdmin';
import AiKeysPanel from '@/components/cms/AiKeysPanel';
import SearchConsoleStats from '@/components/cms/SearchConsoleStats';
import SeoPreview from '@/components/cms/SeoPreview';
import SeoHealth from '@/components/cms/SeoHealth';
import VisibilityTab from '@/components/cms/admin/VisibilityTab';
import ConnectionsTab from '@/components/cms/admin/ConnectionsTab';
import ArticleTemplatePanel from '@/components/cms/admin/ArticleTemplatePanel';
import { TAB_GROUPS, groupCount, groupForTab, tabsOfGroup } from '@/lib/admin-tab-groups';
import { actionableCount, auditSeo, type SeoIssue } from '@/lib/seo-audit';
import { serpTitle } from '@/lib/seo-preview';
import { SITE_URL } from '@/lib/site-url';
import type { Article, Setting, SiteContent, BookingSlot, BookingRequest, ContactMessage } from '@/components/cms/admin/types';
import { slug, pageContentOf, getArticleDraftSignature, getWordCount, getReadTimeMinutes } from '@/components/cms/admin/helpers';
import { lbl, inp, metaChip, previewPanel, previewFrame, previewImageFallback, previewBody } from '@/components/cms/admin/styles';
import { PAGES_CONFIG } from '@/components/cms/admin/config';
import ArticlesTab from '@/components/cms/admin/ArticlesTab';
import DashboardTab from '@/components/cms/admin/DashboardTab';
import SettingsTab from '@/components/cms/admin/SettingsTab';
import MessagesTab from '@/components/cms/admin/MessagesTab';
import BookingTab from '@/components/cms/admin/BookingTab';
import { SectionsEditor, ListEditor } from '@/components/cms/admin/StructureEditors';
import { SEO_TITLE_IDEAL, SEO_DESCRIPTION_IDEAL, SeoLengthHint } from '@/components/cms/admin/SeoLengthHint';
import { PageHistoryPanel } from '@/components/cms/admin/PageHistoryPanel';

// Numéro du dernier message affiché : un message récent n'est pas effacé par le minuteur d'un message plus ancien
let toastSeq = 0;

const RichEditor = dynamic(() => import('@/components/RichEditor'), { ssr: false });



export default function CMSAdmin() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState('');
  const [authErr, setAuthErr] = useState('');
  const [tab, setTab] = useState('dashboard');
  const [toast, setToast] = useState('');
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  // Santé de la base (Supabase peut être en pause sur le free tier)
  const [dbStatus, setDbStatus] = useState<'ok' | 'down' | 'checking'>('checking');
  const [healthChecks, setHealthChecks] = useState<HealthCheck[] | null>(null);
  // Recherche de champ dans l'onglet Pages
  const [fieldSearch, setFieldSearch] = useState('');
  // Champ à ouvrir et mettre en évidence, quand on arrive d'un résultat de l'onglet « 🔎 Contenu »
  const [revealField, setRevealField] = useState<{ page: string; key: string } | null>(null);
  const [highlightField, setHighlightField] = useState(false);
  // Historique + aperçu dans l'onglet Pages
  const [showHistory, setShowHistory] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  // Articles
  const [articles, setArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingArticle, setEditingArticle] = useState<Partial<Article> | null>(null);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [savingArticle, setSavingArticle] = useState(false);
  const [uploadingFeaturedImage, setUploadingFeaturedImage] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<string | null>(null);
  const [articleBaseline, setArticleBaseline] = useState(() => getArticleDraftSignature(null));
  const [showArticlePreview, setShowArticlePreview] = useState(false);

  // Messages contact
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [messageFilter, setMessageFilter] = useState<MessageFilter>('all');
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Booking (créneaux + demandes de réservation)
  const [bookingSlots, setBookingSlots] = useState<BookingSlot[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [savingSlot, setSavingSlot] = useState(false);
  const [newSlot, setNewSlot] = useState({ date: '', time: '10:00', type: 'coaching', notes: '' });

  // Paramètres + Contenu pages
  const [settings, setSettings] = useState<Setting[]>([]);
  const [siteContent, setSiteContent] = useState<SiteContent[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [settingsGroup, setSettingsGroup] = useState('general');
  const [activePage, setActivePage] = useState('home');
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({});
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const cleanHash = React.useRef('');
  // Brouillon / publication (voir lib/cms-drafts.ts)
  const [baseline, setBaseline] = useState<Record<string, string>>({}); // publié (ou défaut) : `${page}__${key}`
  const [drafts, setDrafts] = useState<Record<string, string>>({});     // brouillons enregistrés : `${page}__${key}`
  const [draftSupported, setDraftSupported] = useState(true);            // false si la base refuse les brouillons
  const [publishing, setPublishing] = useState(false);
  const cleanContent = React.useRef<Record<string, string>>({});          // contenu tel qu'enregistré (pour détecter les modifs non enregistrées)
  // Empreinte indépendante de l'ordre des clés
  const contentHash = (o: Record<string, string>) => JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]]));

  // Index de tous les textes du site (onglet « 🔎 Contenu ») : publiés + brouillons.
  // Reconstruit à chaque changement de contenu ; logique pure et testée dans lib/cms-search.ts.
  const contentIndex = React.useMemo(() => {
    const defs = Object.entries(PAGES_CONFIG).flatMap(([page, cfg]) =>
      cfg.sections.map(section => ({
        page,
        pageLabel: cfg.label,
        emoji: cfg.emoji,
        key: section.key,
        label: section.label,
        type: section.type,
      })));
    const rows = [
      ...siteContent.map(row => ({ page: row.page, block_key: row.block_key, value: row.value })),
      ...Object.entries(drafts).map(([id, value]) => {
        const cut = id.indexOf('__');
        return { page: draftPage(id.slice(0, cut)), block_key: id.slice(cut + 2), value };
      }),
    ];
    return buildContentIndex(defs, rows, PAGE_DEFAULTS);
  }, [siteContent, drafts]);

  // Contrôle du référencement (onglet « 🩺 Référencement ») : ce que Google voit = valeurs PUBLIÉES, page par page.
  // Logique pure et testée dans lib/seo-audit.ts.
  const seoAudit = React.useMemo(() => {
    const byPage = new Map<string, { label: string; values: Record<string, string> }>();
    for (const f of contentIndex) {
      if (f.key !== 'seo_title' && f.key !== 'seo_description' && f.key !== 'seo_image') continue;
      const entry = byPage.get(f.page) ?? { label: f.pageLabel, values: {} };
      entry.values[f.key] = f.publishedValue;
      byPage.set(f.page, entry);
    }
    const pages = [...byPage].map(([page, v]) => ({
      page,
      label: v.label,
      title: v.values.seo_title ?? '',
      description: v.values.seo_description ?? '',
      image: v.values.seo_image ?? '',
      indexable: editedSettings[`page_${page}_indexable`] !== 'false',
    }));
    return { issues: auditSeo(pages), pageCount: pages.length };
  }, [contentIndex, editedSettings]);

  const openSeoIssue = (issue: SeoIssue) => {
    if (issue.field === 'visibility') { handleTabChange('settings'); return; }
    const field = contentIndex.find(f => f.page === issue.page && f.key === issue.field);
    if (field) openContentField(field); else openContentPage(issue.page);
  };

  const isArticleDirty = getArticleDraftSignature(editingArticle) !== articleBaseline;
  const articleWordCount = getWordCount(editingArticle?.content);
  const articleReadTime = getReadTimeMinutes(editingArticle?.content);
  const articlePreviewHtml = sanitizeHtml(editingArticle?.content);

  const showToast = useCallback((msg: string, durationMs = 3500) => {
    const id = ++toastSeq;
    setToast(msg);
    setTimeout(() => { if (id === toastSeq) setToast(''); }, durationMs);
  }, []);
  // Envoi d'une image depuis un champ « fichier » : réduit la photo, envoie, et explique toujours le résultat
  const handleImageFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, onUrl: (url: string) => void) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    showToast('Envoi de l’image en cours…', 30000);
    try {
      onUrl(await uploadImage(file));
      showToast('Image envoyée ✓ — pensez à enregistrer.', 5000);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Envoi impossible. Réessayez.', 10000);
    } finally {
      input.value = '';
    }
  }, [showToast]);
  const handleUnauthorized = useCallback((res: Response, message = 'Session expirée. Merci de vous reconnecter.') => {
    if (res.status !== 401) return false;
    setAuthed(false);
    setPwd('');
    setAuthErr(message);
    showToast(message);
    return true;
  }, [showToast]);

  const resetArticleEditor = useCallback((nextTab = 'articles') => {
    setEditingArticle(null);
    setArticleBaseline(getArticleDraftSignature(null));
    setShowArticlePreview(false);
    setTab(nextTab);
  }, []);

  const confirmDiscardArticleChanges = useCallback(() => {
    if (!isArticleDirty) return true;
    return confirm('Tu as des modifications non sauvegardées. Les quitter ?');
  }, [isArticleDirty]);
  // ── Suivi dirty content/settings ────────────────────────
  useEffect(() => {
    if (!cleanHash.current) return; // pas encore chargé
    const cur = contentHash(editedContent) + '|' + JSON.stringify(editedSettings);
    setIsDirty(cur !== cleanHash.current);
  }, [editedContent, editedSettings]);

  // ── Confirmation avant de quitter ────────────────────────
  useEffect(() => {
    if (isDirty) {
      window.onbeforeunload = () => true;
    } else {
      window.onbeforeunload = null;
    }
    return () => { window.onbeforeunload = null; };
  }, [isDirty]);


  const openArticleEditor = useCallback((article?: Partial<Article>) => {
    if ((editingArticle || tab === 'new') && !confirmDiscardArticleChanges()) return;
    const draft = article ? { ...article } : {};
    setEditingArticle(draft);
    setArticleBaseline(getArticleDraftSignature(draft));
    setShowArticlePreview(false);
    setTab('new');
  }, [confirmDiscardArticleChanges, editingArticle, tab]);

  const closeArticleEditor = useCallback(() => {
    if (!confirmDiscardArticleChanges()) return false;
    resetArticleEditor();
    return true;
  }, [confirmDiscardArticleChanges, resetArticleEditor]);

  const handleTabChange = useCallback((nextTab: string) => {
    if (nextTab === 'new') {
      openArticleEditor({});
      return;
    }

    if (tab === 'new' && nextTab !== 'new' && !confirmDiscardArticleChanges()) {
      return;
    }

    setTab(nextTab);
  }, [confirmDiscardArticleChanges, openArticleEditor, tab]);

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const res = await fetch('/api/cms/auth');
        if (!active) return;
        setAuthed(res.ok);
      } catch {
        if (!active) return;
        setAuthed(false);
      } finally {
        if (active) setCheckingSession(false);
      }
    };

    checkSession();

    return () => {
      active = false;
    };
  }, []);

  // Auth
  const login = async () => {
    if (authLoading) return;
    setAuthErr('');
    setAuthLoading(true);
    try {
      const res = await fetch('/api/cms/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        // La session (cookie httpOnly signé) suffit pour toutes les routes, envois d'images compris :
        // le mot de passe n'est plus gardé en mémoire ni dans le navigateur.
        setAuthed(true);
        setPwd('');
      } else {
        setAuthErr(data.error || 'Mot de passe incorrect');
      }
    } catch {
      setAuthErr('Impossible de contacter le CMS pour le moment.');
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    await fetch('/api/cms/auth', { method: 'DELETE' }).catch(() => {});
    setAuthed(false);
    setPwd('');
    setAuthErr('');
    setShowMediaLibrary(false);
    resetArticleEditor();
  };

  // Les anciennes versions de l'admin gardaient le mot de passe en clair dans le navigateur : on l'efface.
  useEffect(() => {
    try { localStorage.removeItem('cms_password'); } catch { /* stockage indisponible */ }
  }, []);

  useEffect(() => {
    if (checkingSession || authed) return;
    fetch('/api/cms/auth', { method: 'DELETE' }).catch(() => {});
  }, [authed, checkingSession]);

  useEffect(() => {
    if (!isArticleDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isArticleDirty]);


  // Load articles
  const loadArticles = useCallback(async () => {
    setLoadingArticles(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/cms/articles?${params}`);
      if (handleUnauthorized(res)) return;
      const data = await res.json();
      setArticles(data.articles || []);
    } catch {
      showToast('Impossible de charger les articles.');
    } finally {
      setLoadingArticles(false);
    }
  }, [handleUnauthorized, search, showToast, statusFilter]);

  // Load booking slots
  const loadBookingSlots = useCallback(async () => {
    setLoadingSlots(true);
    try {
      const res = await fetch('/api/cms/booking-slots');
      if (handleUnauthorized(res)) return;
      const data = await res.json();
      setBookingSlots(data.slots || []);
    } catch {
      showToast('Impossible de charger les créneaux.');
    } finally {
      setLoadingSlots(false);
    }
  }, [handleUnauthorized, showToast]);

  // Load booking requests
  const loadBookingRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/cms/booking-requests');
      if (handleUnauthorized(res)) return;
      const data = await res.json();
      setBookingRequests(data.requests || []);
    } catch {
      showToast('Impossible de charger les demandes.');
    }
  }, [handleUnauthorized, showToast]);

  // Save new slot
  const saveNewSlot = async () => {
    if (!newSlot.date || !newSlot.time) {
      showToast("Veuillez remplir la date et l'heure");
      return;
    }
    setSavingSlot(true);
    try {
      const res = await fetch('/api/cms/booking-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSlot),
      });
      if (handleUnauthorized(res)) return;
      showToast('Créneau ajouté');
      setNewSlot({ date: '', time: '10:00', type: 'coaching', notes: '' });
      loadBookingSlots();
    } catch {
      showToast("Erreur: Impossible d'ajouter");
    } finally {
      setSavingSlot(false);
    }
  };

  // Delete slot
  const deleteSlot = async (id: string) => {
    if (!confirm('Supprimer ce créneau ?')) return;
    try {
      const res = await fetch(`/api/cms/booking-slots/${id}`, { method: 'DELETE' });
      if (handleUnauthorized(res)) return;
      showToast('Créneau supprimé');
      loadBookingSlots();
    } catch {
      showToast('Erreur: Impossible de supprimer');
    }
  };

  // Update request status
  const updateRequestStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/cms/booking-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (handleUnauthorized(res)) return;
      showToast('Statut mis à jour');
      loadBookingRequests();
    } catch {
      showToast('Erreur: Impossible de mettre à jour');
    }
  };

  // Load settings + content
  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const [sRes, cRes] = await Promise.all([
        fetch('/api/cms/settings'),
        fetch('/api/cms/content'),
      ]);
      if (handleUnauthorized(sRes) || handleUnauthorized(cRes)) return;
      const sData = await sRes.json();
      const cData = await cRes.json();
      setSettings(sData.settings || []);
      setSiteContent((cData.content || []).filter((c: SiteContent) => !isDraftPage(c.page)));
      const initS: Record<string, string> = {};
      (sData.settings || []).forEach((s: Setting) => { initS[s.key] = s.value || ''; });
      // Pré-remplir avec les defaults de chaque page
      const initC: Record<string, string> = {};
      Object.entries(PAGE_DEFAULTS).forEach(([page, defs]) => {
        Object.entries(defs).forEach(([key, val]) => {
          initC[`${page}__${key}`] = val;
        });
      });
      // Les valeurs DB (publiées) écrasent les defaults ; les brouillons (page « draft:<page> ») viennent par-dessus
      const loadedDrafts: Record<string, string> = {};
      (cData.content || []).forEach((c: SiteContent) => {
        if (isDraftPage(c.page)) loadedDrafts[`${basePage(c.page)}__${c.block_key}`] = c.value ?? '';
        else if (c.value) initC[`${c.page}__${c.block_key}`] = c.value;
      });
      const published = { ...initC };
      const withDrafts = { ...initC, ...loadedDrafts };
      setBaseline(published);
      setDrafts(loadedDrafts);
      setEditedSettings(initS);
      setEditedContent(withDrafts);
      cleanContent.current = withDrafts;
      setTimeout(() => { cleanHash.current = contentHash(withDrafts) + '|' + JSON.stringify(initS); setIsDirty(false); }, 50);
    } catch {
      showToast('Impossible de charger les contenus du CMS.');
    } finally {
      setLoadingSettings(false);
    }
  }, [handleUnauthorized, showToast]);

  const loadMessages = useCallback(async () => {
    setLoadingMessages(true);
    try {
      const res = await fetch('/api/cms/contact-messages');
      if (res.status === 401) { setAuthed(false); return; }
      const d = await res.json();
      setMessages(d.messages || []);
    } catch { showToast('Impossible de charger les messages.'); }
    finally { setLoadingMessages(false); }
  }, [showToast]);

  // Chargements par onglet : patterns de fetch standards (setState via callbacks async).
  // eslint-disable-next-line react-hooks/set-state-in-effect -- chargements cursor/onglet depuis l'API
  useEffect(() => { if (authed) loadArticles(); }, [authed, loadArticles]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- chargements cursor/onglet depuis l'API
  useEffect(() => { if (authed && tab === 'booking') { loadBookingSlots(); loadBookingRequests(); } }, [authed, tab, loadBookingSlots, loadBookingRequests]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- chargements cursor/onglet depuis l'API
  useEffect(() => { if (authed && (tab === 'settings' || tab === 'pages' || tab === 'fil-ariane' || tab === 'contenu' || tab === 'seo')) loadSettings(); }, [authed, tab, loadSettings]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- chargements cursor/onglet depuis l'API
  useEffect(() => { if (authed && (tab === 'messages' || tab === 'dashboard')) loadMessages(); }, [authed, tab, loadMessages]);

  // ── Rafraîchir l'aperçu après une sauvegarde réussie ──────
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- bump de clé d'aperçu après sauvegarde
    if (savedOk) setPreviewKey(k => k + 1);
  }, [savedOk]);

  // ── Surveillance de la base Supabase (pause free tier) ────
  useEffect(() => {
    if (!authed) return;
    let alive = true;
    const check = async () => {
      try {
        const r = await fetch('/api/keep-alive');
        if (alive) setDbStatus(r.ok ? 'ok' : 'down');
      } catch {
        if (alive) setDbStatus('down');
      }
    };
    check();
    const id = setInterval(check, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, [authed]);

  // ── Santé du site (réservation en ligne, etc.) ────────────
  // Chargée quand on ouvre le tableau de bord : un problème qui empêche le site de rendre
  // service doit se voir en haut, sans devoir fouiller l'onglet Messages.
  useEffect(() => {
    if (!authed || tab !== 'dashboard') return;
    let alive = true;
    const check = async () => {
      try {
        const r = await fetch('/api/cms/health');
        if (r.status === 401) { if (alive) setAuthed(false); return; }
        const d = await r.json();
        if (alive) setHealthChecks(Array.isArray(d.checks) ? d.checks : []);
      } catch {
        if (alive) setHealthChecks([]);
      }
    };
    check();
    const id = setInterval(check, 120_000);
    return () => { alive = false; clearInterval(id); };
  }, [authed, tab]);

  // Save settings
  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const promises: Promise<Response>[] = [];
      settings.forEach(s => {
        const newVal = editedSettings[s.key];
        if (newVal !== undefined && newVal !== s.value) {
          promises.push(fetch('/api/cms/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: s.key, value: newVal }),
          }));
        }
      });

      if (promises.length === 0) {
        showToast('Aucune modification à enregistrer.');
        return;
      }

      const responses = await Promise.all(promises);
      if (responses.some(res => handleUnauthorized(res))) return;
      showToast('✅ Paramètres sauvegardés !');
      cleanHash.current = contentHash(editedContent) + '|' + JSON.stringify(editedSettings); setIsDirty(false); setSavedOk(true); setTimeout(() => setSavedOk(false), 2000);
      loadSettings();
    } catch {
      showToast('Impossible de sauvegarder les paramètres.');
    } finally {
      setSavingSettings(false);
    }
  };

  // ── Brouillon / publication ─────────────────────────────────
  // Principe : « Enregistrer » écrit un BROUILLON (invisible du site public) ; « Publier » le met en ligne.
  // Seuls les champs réellement modifiés sont écrits : on n'enregistre plus jamais les textes par défaut en base.
  const jsonHeaders = { 'Content-Type': 'application/json' };
  const sliceOf = (pageKey: string) => {
    const config = PAGES_CONFIG[pageKey];
    const keys = config ? config.sections.map(sec => sec.key) : [];
    const pick = (src: Record<string, string>) => Object.fromEntries(keys.map(k => [k, src[`${pageKey}__${k}`]]));
    const saved: Record<string, string> = {};
    for (const k of keys) { const dk = `${pageKey}__${k}`; if (dk in drafts) saved[k] = drafts[dk]; }
    return { config, keys, edited: pick(editedContent), base: pick(baseline), saved };
  };
  const pageStatus = (pageKey: string) => {
    const { keys, edited, base, saved } = sliceOf(pageKey);
    const plan = planDraftSave(keys, edited, base, saved);
    return { unsaved: plan.save.length + plan.reset.length, draftN: Object.keys(saved).length };
  };
  const draftCountOf = (pageKey: string) => Object.keys(drafts).filter(k => k.startsWith(`${pageKey}__`)).length;
  const markClean = (changes: Record<string, string>) => {
    cleanContent.current = { ...cleanContent.current, ...changes };
    cleanHash.current = contentHash(cleanContent.current) + '|' + JSON.stringify(editedSettings);
    setIsDirty(contentHash(editedContent) + '|' + JSON.stringify(editedSettings) !== cleanHash.current);
  };
  const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

  const saveDraft = async (pageKey: string, opts: { quiet?: boolean } = {}): Promise<{ ok: boolean; draftKeys: string[] }> => {
    const { config, keys, edited, base, saved } = sliceOf(pageKey);
    const currentDraftKeys = Object.keys(saved);
    if (!config) return { ok: false, draftKeys: currentDraftKeys };
    const plan = planDraftSave(keys, edited, base, saved);
    if (!plan.save.length && !plan.reset.length) {
      if (!opts.quiet) showToast('Aucune modification à enregistrer.');
      return { ok: true, draftKeys: currentDraftKeys };
    }
    // Repli : la base de données refuse les brouillons -> écriture directe, après confirmation explicite
    if (!draftSupported && !confirm(`Les brouillons ne sont pas disponibles sur cette base de données.\n\nCette sauvegarde va mettre ${plan.save.length} modification${plural(plan.save.length, '', 's')} EN LIGNE immédiatement. Continuer ?`)) {
      return { ok: false, draftKeys: currentDraftKeys };
    }
    setSavingSettings(true);
    try {
      const calls = [
        ...plan.save.map(fld => fetch('/api/cms/content', { method: 'PUT', headers: jsonHeaders, body: JSON.stringify({ page: pageKey, block_key: fld.key, value: fld.value, draft: draftSupported }) })),
        ...(draftSupported ? plan.reset.map(k => fetch('/api/cms/content', { method: 'PUT', headers: jsonHeaders, body: JSON.stringify({ page: pageKey, block_key: k, draft: true, reset: true }) })) : []),
      ];
      const responses = await Promise.all(calls);
      if (responses.some(res => handleUnauthorized(res))) return { ok: false, draftKeys: currentDraftKeys };
      const failed = responses.filter(r => !r.ok);
      if (failed.length > 0) {
        const errBody = await failed[0].json().catch(() => ({}));
        if (errBody.draftUnsupported) {
          setDraftSupported(false);
          showToast('⚠️ Les brouillons ne sont pas disponibles sur cette base : cliquez de nouveau pour mettre en ligne directement.');
        } else {
          showToast(`❌ Erreur ${failed[0].status}: ${errBody.error || 'Impossible de sauvegarder'}`);
        }
        return { ok: false, draftKeys: currentDraftKeys };
      }
      const persisted: Record<string, string> = {};
      for (const fld of plan.save) persisted[`${pageKey}__${fld.key}`] = fld.value;
      for (const k of plan.reset) persisted[`${pageKey}__${k}`] = base[k] ?? '';
      if (draftSupported) {
        setDrafts(prev => {
          const next = { ...prev };
          for (const fld of plan.save) next[`${pageKey}__${fld.key}`] = fld.value;
          for (const k of plan.reset) delete next[`${pageKey}__${k}`];
          return next;
        });
      } else {
        setBaseline(prev => ({ ...prev, ...persisted }));
        // persisted est indexé « page__clé » ; l'index du contenu attend la clé seule.
        indexPublished(pageKey, Object.fromEntries(
          Object.entries(persisted).map(([id, value]) => [id.slice(pageKey.length + 2), value]),
        ));
        bustCmsCache(pageKey);
      }
      markClean(persisted);
      setSavedOk(true); setTimeout(() => setSavedOk(false), 2000);
      if (!opts.quiet) {
        const n = plan.save.length + plan.reset.length;
        showToast(draftSupported
          ? `📝 ${n} modification${plural(n, '', 's')} enregistrée${plural(n, '', 's')} en brouillon — pas encore en ligne`
          : `✅ ${n} modification${plural(n, '', 's')} mise${plural(n, '', 's')} en ligne`);
      }
      const after = [...currentDraftKeys.filter(k => !plan.reset.includes(k)), ...plan.save.map(fld => fld.key).filter(k => !currentDraftKeys.includes(k))];
      return { ok: true, draftKeys: draftSupported ? after : [] };
    } catch {
      showToast('Impossible de sauvegarder cette page.');
      return { ok: false, draftKeys: currentDraftKeys };
    } finally {
      setSavingSettings(false);
    }
  };

  // Met à jour l'index « 🔎 Contenu » après une mise en ligne (sinon les compteurs attendraient un rechargement).
  const indexPublished = (pageKey: string, values: Record<string, string>) => {
    setSiteContent(prev => {
      const next = prev.filter(row => !(row.page === pageKey && row.block_key in values));
      for (const [block_key, value] of Object.entries(values)) {
        next.push({ id: 0, page: pageKey, block_key, value, label: '', type: '' });
      }
      return next;
    });
  };

  const publishPage = async (pageKey: string) => {
    const config = PAGES_CONFIG[pageKey];
    if (!config || publishing || savingSettings) return;
    const { ok, draftKeys } = await saveDraft(pageKey, { quiet: true });
    if (!ok) return;
    if (!draftSupported) { showToast('✅ Modifications mises en ligne (publication directe).'); return; }
    if (draftKeys.length === 0) { showToast('Rien à publier : tout est déjà en ligne.'); return; }
    const n = draftKeys.length;
    if (!confirm(`Publier ${n} modification${plural(n, '', 's')} sur « ${config.label} » ?\n\nElles seront visibles par tous les visiteurs.`)) {
      showToast('📝 Enregistré en brouillon, pas encore publié.');
      return;
    }
    setPublishing(true);
    try {
      const res = await fetch('/api/cms/publish', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ page: pageKey }) });
      if (handleUnauthorized(res)) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showToast(`❌ Publication impossible : ${data.error || res.status}`); return; }
      const nowLive: Record<string, string> = {};
      const nowLiveBlocks: Record<string, string> = {};
      for (const k of draftKeys) {
        const value = editedContent[`${pageKey}__${k}`] ?? '';
        nowLive[`${pageKey}__${k}`] = value;
        nowLiveBlocks[k] = value;
      }
      setBaseline(prev => ({ ...prev, ...nowLive }));
      indexPublished(pageKey, nowLiveBlocks);
      setDrafts(prev => { const next = { ...prev }; for (const k of draftKeys) delete next[`${pageKey}__${k}`]; return next; });
      bustCmsCache(pageKey);
      setSavedOk(true); setTimeout(() => setSavedOk(false), 2000);
      showToast(`🚀 ${data.published ?? n} modification${plural(n, '', 's')} publiée${plural(n, '', 's')} — en ligne !`);
    } catch {
      showToast('Impossible de publier : erreur réseau.');
    } finally {
      setPublishing(false);
    }
  };

  const discardDraft = async (pageKey: string) => {
    const { config, saved, base } = sliceOf(pageKey);
    const draftKeys = Object.keys(saved);
    if (!config || draftKeys.length === 0 || publishing) return;
    const n = draftKeys.length;
    if (!confirm(`Abandonner ${n} modification${plural(n, '', 's')} en brouillon sur « ${config.label} » ?\n\nLe site en ligne n'est pas modifié. Ces brouillons seront supprimés.`)) return;
    setPublishing(true);
    try {
      const res = await fetch('/api/cms/publish', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ page: pageKey, action: 'discard' }) });
      if (handleUnauthorized(res)) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showToast(`❌ Impossible d'abandonner : ${data.error || res.status}`); return; }
      const reverted: Record<string, string> = {};
      for (const k of draftKeys) reverted[`${pageKey}__${k}`] = base[k] ?? '';
      setDrafts(prev => { const next = { ...prev }; for (const k of draftKeys) delete next[`${pageKey}__${k}`]; return next; });
      setEditedContent(prev => ({ ...prev, ...reverted }));
      cleanContent.current = { ...cleanContent.current, ...reverted };
      cleanHash.current = contentHash({ ...editedContent, ...reverted }) + '|' + JSON.stringify(editedSettings);
      setIsDirty(false);
      setPreviewKey(k => k + 1);
      showToast(`↩ ${n} brouillon${plural(n, '', 's')} abandonné${plural(n, '', 's')} — le site en ligne n'a pas changé`);
    } catch {
      showToast("Impossible d'abandonner le brouillon : erreur réseau.");
    } finally {
      setPublishing(false);
    }
  };

// ── Onglet « 🔎 Contenu » : ouvrir un texte précis, ou rétablir son original ──
  // L'index et la recherche vivent dans lib/cms-search.ts ; ici on ne fait que naviguer et écrire.
  const openContentField = (field: ContentField) => {
    handleTabChange('pages');
    setActivePage(field.page);
    setFieldSearch('');
    setRevealField({ page: field.page, key: field.key });
    setHighlightField(true);
  };

  const openContentPage = (page: string) => {
    handleTabChange('pages');
    setActivePage(page);
    setFieldSearch('');
    setRevealField(null);
  };

  const resetContentField = async (field: ContentField) => {
    const ok = confirm(`Rétablir l'original de « ${field.shortLabel} » (${field.pageLabel}) ?\n\nVotre version personnalisée sera retirée du site et le texte d'origine s'affichera à la place.`);
    if (!ok) return;
    try {
      // Une valeur vide en base n'écrase rien : le site retombe sur le texte d'origine (lib/cms-defaults).
      const res = await fetch('/api/cms/content', {
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify({ page: field.page, block_key: field.key, value: '' }),
      });
      if (handleUnauthorized(res)) return;
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(`❌ ${data.error || "Impossible de rétablir l'original"}`);
        return;
      }
      const id = `${field.page}__${field.key}`;
      setSiteContent(prev => prev.filter(row => !(row.page === field.page && row.block_key === field.key)));
      setBaseline(prev => ({ ...prev, [id]: field.defaultValue }));
      setEditedContent(prev => ({ ...prev, [id]: field.defaultValue }));
      setDrafts(prev => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      markClean({ [id]: field.defaultValue });
      bustCmsCache(field.page);
      showToast("✅ Texte d'origine rétabli.");
    } catch {
      showToast('Impossible de rétablir le texte : erreur réseau.');
    }
  };

// ── Remplacer un mot dans plusieurs textes (onglet « 🔎 Contenu ») ──
  // Tout part en brouillon : le site en ligne ne change pas avant « Publier ».
  const replaceInContent = async (plan: ReplacementPlanItem[]) => {
    if (!plan.length) return;
    // Ne jamais écraser une saisie non enregistrée : on demande de l'enregistrer d'abord.
    const unsaved = plan.filter(item => {
      const id = `${item.field.page}__${item.field.key}`;
      const saved = drafts[id] ?? baseline[id] ?? item.field.defaultValue;
      return (editedContent[id] ?? '') !== saved;
    });
    if (unsaved.length > 0) {
      showToast(`⚠️ ${unsaved.length} texte${plural(unsaved.length, '', 's')} de ce remplacement a des modifications non enregistrées — enregistrez-les d'abord (onglet Pages).`);
      return;
    }
    // `plan.length` = champs écrits ; `summary.fields` = textes touchés (une carte de liste en compte plusieurs)
    const summary = replacementStats(plan);
    const ok = confirm(`Remplacer dans ${summary.fields} texte${plural(summary.fields, '', 's')} sur ${summary.pages} page${plural(summary.pages, '', 's')} ?\n\nLes changements sont enregistrés en brouillon : le site en ligne ne change pas tant que vous ne cliquez pas sur « Publier ».`);
    if (!ok) return;
    setSavingSettings(true);
    try {
      const responses = await Promise.all(plan.map(item => fetch('/api/cms/content', {
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify({ page: item.field.page, block_key: item.field.key, value: item.after, draft: true }),
      })));
      if (responses.some(res => handleUnauthorized(res))) return;
      const failed = responses.find(res => !res.ok);
      if (failed) {
        const data = await failed.json().catch(() => ({}));
        showToast(`❌ ${data.draftUnsupported ? 'Cette base ne gère pas les brouillons.' : (data.error || 'Remplacement impossible')}`);
        return;
      }
      const changes: Record<string, string> = {};
      for (const item of plan) changes[`${item.field.page}__${item.field.key}`] = item.after;
      setDrafts(prev => ({ ...prev, ...changes }));
      setEditedContent(prev => ({ ...prev, ...changes }));
      markClean(changes);
      for (const page of new Set(plan.map(item => item.field.page))) bustCmsCache(page);
      showToast(`📝 ${summary.fields} texte${plural(summary.fields, '', 's')} remplacé${plural(summary.fields, '', 's')} en brouillon — rien n'est en ligne avant « Publier ».`);
    } catch {
      showToast('Remplacement impossible : erreur réseau.');
    } finally {
      setSavingSettings(false);
    }
  };

  // ── Arrivée depuis « 🔎 Contenu » : défiler jusqu'au champ et le surligner un instant ──
  useEffect(() => {
    if (tab !== 'pages' || !revealField || revealField.page !== activePage) return;
    const id = window.setTimeout(() => {
      const el = document.getElementById(fieldAnchor(revealField.page, revealField.key));
      if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.querySelector<HTMLElement>('input, textarea, select, button')?.focus({ preventScroll: true });
    }, 150);
    return () => window.clearTimeout(id);
  }, [tab, revealField, activePage, loadingSettings]);

  useEffect(() => {
    if (!highlightField) return;
    const id = window.setTimeout(() => {
      setHighlightField(false);
    }, 3000);
    return () => window.clearTimeout(id);
  }, [highlightField]);

  // ── Raccourci Cmd+S / Ctrl+S (après saveDraft/saveSettings pour respecter l'ordre de déclaration) ──

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (!isDirty || savingSettings) return;
        if (tab === 'pages') void saveDraft(activePage);
        else if (tab === 'fil-ariane') void saveDraft('fil-ariane');
        else if (tab === 'settings') void saveSettings();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- saveDraft/saveSettings recréées à chaque rendu, le listener doit rester frais
  }, [isDirty, savingSettings, tab, activePage]);

  // Save article
  const saveArticle = useCallback(async () => {
    if (!editingArticle) return;
    if (savingArticle) return;
    if (!editingArticle.title?.trim()) {
      showToast('Le titre est obligatoire avant d’enregistrer.');
      return;
    }

    const isNew = !editingArticle.id;
    const payload = {
      ...editingArticle,
      slug: editingArticle.slug || slug(editingArticle.title || ''),
      published_at: editingArticle.published && !editingArticle.published_at
        ? new Date().toISOString() : editingArticle.published_at,
    };
    const url = isNew ? '/api/cms/articles' : `/api/cms/articles/${editingArticle.id}`;
    const method = isNew ? 'POST' : 'PUT';
    setSavingArticle(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (handleUnauthorized(res)) return;
      if (res.ok) {
        showToast(isNew ? '✅ Article créé !' : '✅ Article mis à jour !');
        setArticleBaseline(getArticleDraftSignature(payload));
        resetArticleEditor();
        loadArticles();
      } else {
        const d = await res.json();
        showToast(`❌ Erreur : ${d.error}`);
      }
    } catch {
      showToast('Impossible de sauvegarder cet article.');
    } finally {
      setSavingArticle(false);
    }
  }, [editingArticle, handleUnauthorized, loadArticles, resetArticleEditor, savingArticle, showToast]);

  useEffect(() => {
    if (tab !== 'new') return;

    const handleSaveShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return;
      event.preventDefault();
      void saveArticle();
    };

    window.addEventListener('keydown', handleSaveShortcut);
    return () => window.removeEventListener('keydown', handleSaveShortcut);
  }, [saveArticle, tab]);

  const togglePublish = async (a: Article) => {
    try {
      const res = await fetch(`/api/cms/articles/${a.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          published: !a.published,
          published_at: !a.published ? new Date().toISOString() : a.published_at,
        }),
      });
      if (handleUnauthorized(res)) return;
      if (res.ok) { showToast(!a.published ? '✅ Publié !' : '📦 Repassé en brouillon'); loadArticles(); }
    } catch {
      showToast('Impossible de mettre à jour le statut de publication.');
    }
  };

  const duplicateArticle = async (a: Article) => {
    try {
      // Récupère le contenu complet avant de dupliquer
      const res = await fetch(`/api/cms/articles/${a.id}`);
      if (handleUnauthorized(res)) return;
      const { article } = await res.json();
      if (!article) { showToast('Impossible de charger cet article.'); return; }
      openArticleEditor({
        ...article,
        id: undefined,
        title: `${article.title} (copie)`,
        slug: `${article.slug}-copie`,
        published: false,
        published_at: undefined,
      });
      showToast('📄 Copie créée — pensez à l’enregistrer !');
    } catch {
      showToast('Impossible de dupliquer cet article.');
    }
  };

  const deleteArticle = async (id: number) => {
    if (!confirm('Supprimer cet article ?')) return;
    try {
      const res = await fetch(`/api/cms/articles/${id}`, { method: 'DELETE' });
      if (handleUnauthorized(res)) return;
      if (res.ok) { showToast('🗑ï¸ Article supprimé'); loadArticles(); }
    } catch {
      showToast('Impossible de supprimer cet article.');
    }
  };

  const uploadFeaturedImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const input = e.target;
    setUploadingFeaturedImage(true);
    try {
      const url = await uploadImage(file, '/api/cms/media-upload', { folder: 'articles' });
      setEditingArticle(prev => prev ? { ...prev, featured_image: url } : prev);
      showToast('Image envoyée ✓');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Impossible d’envoyer cette image.', 10000);
    } finally {
      setUploadingFeaturedImage(false);
      input.value = '';
    }
  };

  // ─── Login ────────────────────────────────────────────────
  if (checkingSession) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f3ef' }}>
      <div style={{ background: 'white', padding: '2.5rem', borderRadius: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,.1)', width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>...</div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#2d5f54' }}>Happy Humans CMS</h1>
        <p style={{ color: '#888', fontSize: '.9rem' }}>Verification de la session...</p>
      </div>
    </div>
  );

  if (!authed) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f3ef' }}>
      <div style={{ background: 'white', padding: '2.5rem', borderRadius: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,.1)', width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>🌿</div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#2d5f54' }}>Happy Humans CMS</h1>
          <p style={{ color: '#888', fontSize: '.9rem' }}>Accès réservé</p>
        </div>
        <input type="password" placeholder="Mot de passe" value={pwd}
          onChange={e => setPwd(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          style={{ width: '100%', padding: '.75rem 1rem', border: '1.5px solid #ddd', borderRadius: '.5rem', fontSize: '1rem', marginBottom: '.75rem', outline: 'none' }}
        />
        {authErr && <p style={{ color: '#c0392b', fontSize: '.85rem', marginBottom: '.75rem' }}>{authErr}</p>}
        <button onClick={login} disabled={authLoading}
          style={{ width: '100%', padding: '.8rem', background: '#2d5f54', color: 'white', border: 'none', borderRadius: '.5rem', fontWeight: 700, fontSize: '1rem', cursor: authLoading ? 'wait' : 'pointer', opacity: authLoading ? .7 : 1 }}
        >{authLoading ? 'Connexion…' : 'Entrer'}</button>
      </div>
    </div>
  );

  // ─── CMS ──────────────────────────────────────────────────
  const TABS = [
    { id: 'dashboard', label: '🏠 Tableau de bord', count: null },
    { id: 'articles', label: '📝 Articles', count: articles.length },
    { id: 'new',      label: '✏️ Nouvel article', count: null },
    { id: 'pages',    label: '🗂️ Pages', count: null },
    { id: 'contenu',  label: '🔎 Contenu', count: contentIndex.filter(f => f.isPending).length || null },
    { id: 'visibilite', label: '🔍 Visibilité SEO & IA', count: null },
    { id: 'seo',      label: '🩺 Référencement', count: actionableCount(seoAudit.issues) || null },
    { id: 'stats-google', label: '📊 Statistiques Google', count: null },
    { id: 'menu',         label: '🧭 Menu', count: null },
    { id: 'fil-ariane',   label: '🔗 Fil d’Ariane', count: null },
    { id: 'custom-pages', label: '📄 Pages libres', count: null },
    { id: 'questionnaires', label: '📋 Questionnaires', count: null },
    { id: 'ia', label: '🤖 IA', count: null },
    { id: 'connexions', label: '🔌 Connexions', count: null },
    { id: 'media',    label: '🖼️ Médiathèque', count: null },
    { id: 'booking',  label: '📅 Réservations', count: null },
    { id: 'messages', label: '💬 Messages', count: unreadVisitorCount(messages) || null },
    { id: 'settings', label: '⚙️ Paramètres', count: null },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ef', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#2d5f54', color: 'white', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 2px 12px rgba(0,0,0,.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🌿</span>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '.03em' }}>Happy Humans CMS</span>
          <span style={{ background: 'rgba(255,255,255,.18)', fontSize: '.72rem', padding: '.2rem .6rem', borderRadius: '9999px', fontWeight: 600 }}>Supabase</span>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          <button
            onClick={async () => {
              const res = await fetch('/api/cms/generate-edit-token');
              if (!res.ok) return;
              const data = await res.json();
              if (data.token) {
                window.open(`/?cms_edit_token=${encodeURIComponent(data.token)}`, '_blank');
              }
            }}
            style={{ background: 'rgba(255,255,255,.22)', border: '1px solid rgba(255,255,255,.35)', color: 'white', padding: '.4rem .9rem', borderRadius: '.4rem', cursor: 'pointer', fontSize: '.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '.35rem' }}
            title="Ouvrir le site en mode édition inline"
          >
            ✏️ Éditer le site
          </button>
          <button onClick={logout} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: 'white', padding: '.4rem .9rem', borderRadius: '.4rem', cursor: 'pointer', fontSize: '.85rem' }}>Déconnexion</button>
        </div>
      </div>

      {/* Alerte base de données indisponible (Supabase en pause) */}
      {dbStatus === 'down' && (
        <div style={{ background: '#7f1d1d', color: 'white', padding: '.85rem 2rem', display: 'flex', alignItems: 'center', gap: '.75rem', fontSize: '.9rem', fontWeight: 600 }}>
          <span style={{ fontSize: '1.2rem' }}>🚨</span>
          <div>
            Base de données indisponible — vos modifications <u>ne seront pas enregistrées</u>.
            <span style={{ fontWeight: 400, opacity: .85 }}> Le projet Supabase est probablement en pause : ouvrez le dashboard Supabase et cliquez « Restore project », puis attendez quelques minutes.</span>
          </div>
          <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer"
            style={{ marginLeft: 'auto', flexShrink: 0, background: 'white', color: '#7f1d1d', padding: '.4rem .9rem', borderRadius: '.4rem', textDecoration: 'none', fontSize: '.82rem', fontWeight: 700 }}>
            Ouvrir Supabase →
          </a>
        </div>
      )}

      {/* Bannière modifications non sauvegardées */}
      {isDirty && (
        <div style={{ background: '#fff8e1', borderBottom: '1px solid #f0c040', padding: '.6rem 2rem', display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem', color: '#7a5c00', fontWeight: 600 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          {tab === 'pages' || tab === 'fil-ariane' || tab === 'custom-pages' || tab === 'menu'
            ? 'Modifications non enregistrées — « Enregistrer le brouillon » (bouton flottant ou Ctrl+S). Rien n’est en ligne tant que vous ne publiez pas.'
            : 'Modifications non sauvegardées — utilisez le bouton flottant ou Ctrl+S pour sauvegarder'}
        </div>
      )}

      {/* Bouton flottant sticky */}
      {(tab === 'pages' || tab === 'settings' || tab === 'fil-ariane') && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 100,
          display: isDirty || savedOk ? 'block' : 'none',
          transition: 'opacity .2s',
        }}>
          <button
            onClick={() => { if (tab === 'pages') saveDraft(activePage); else if (tab === 'fil-ariane') saveDraft('fil-ariane'); else saveSettings(); }}
            disabled={savingSettings || !isDirty}
            style={{
              display: 'flex', alignItems: 'center', gap: '.5rem',
              padding: '14px 28px', borderRadius: '9999px',
              background: savedOk ? '#1a5c35' : '#2d5f54', color: 'white',
              border: 'none', cursor: savingSettings ? 'wait' : 'pointer',
              fontSize: '15px', fontWeight: 600,
              boxShadow: '0 4px 16px rgba(0,0,0,.18)',
              opacity: savingSettings ? .8 : 1,
              transition: 'background .2s, transform .1s',
            }}
            onMouseEnter={e => { if (!savingSettings) (e.currentTarget as HTMLButtonElement).style.background = savedOk ? '#1a5c35' : '#1e4a40'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = savedOk ? '#1a5c35' : '#2d5f54'; }}
          >
            {savingSettings ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                Enregistrement…
              </>
            ) : savedOk ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {tab === 'pages' || tab === 'fil-ariane' ? 'Enregistré !' : 'Sauvegardé !'}
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                {tab === 'pages' || tab === 'fil-ariane' ? (draftSupported ? 'Enregistrer le brouillon' : 'Enregistrer') : 'Sauvegarder'}
              </>
            )}
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', top: '5rem', right: '1.5rem', background: '#1a1a1a', color: 'white', padding: '.8rem 1.4rem', borderRadius: '.6rem', zIndex: 100, fontSize: '.9rem', boxShadow: '0 4px 16px rgba(0,0,0,.2)' }}>{toast}</div>
      )}

      {showMediaLibrary && (
        <MediaLibrary
          onClose={() => setShowMediaLibrary(false)}
          onSelect={(url) => {
            setEditingArticle(prev => prev ? { ...prev, featured_image: url } : prev);
            if (mediaPickerTarget) {
              setEditedContent((prev: Record<string,string>) => ({ ...prev, [mediaPickerTarget]: url }));
              setMediaPickerTarget(null);
              setTab('pages');
              showToast('✅ Image sélectionnée !');
            } else {
              showToast('✅ Image sélectionnée depuis la médiathèque !');
            }
          }}
        />
      )}

      {/* Onglets : une ligne de thèmes, puis les onglets du thème ouvert */}
      {(() => {
        const activeGroup = groupForTab(tab);
        const groupTabs = tabsOfGroup(activeGroup, TABS);
        const badge = (n: number) => (
          <span style={{ background: '#f0e8e4', color: '#2d5f54', borderRadius: '9999px', padding: '.1rem .55rem', fontSize: '.75rem', fontWeight: 700 }}>{n}</span>
        );
        return (
          <div style={{ background: 'white', borderBottom: '1.5px solid #e8e3dc' }}>
            <div role="tablist" aria-label="Thèmes de l’administration" style={{ padding: '0 2rem', display: 'flex', gap: '.25rem', flexWrap: 'wrap', borderBottom: groupTabs.length > 1 ? '1px solid #f0ece6' : 'none' }}>
              {TAB_GROUPS.map(g => {
                const active = g.id === activeGroup.id;
                const n = groupCount(g, TABS);
                return (
                  <button key={g.id} role="tab" aria-selected={active}
                    onClick={() => { if (!active) handleTabChange(g.tabs[0]); }}
                    style={{
                      padding: '.85rem 1.2rem', border: 'none', background: 'none', cursor: 'pointer',
                      fontWeight: active ? 700 : 500, color: active ? '#2d5f54' : '#666',
                      borderBottom: active ? '2.5px solid #2d5f54' : '2.5px solid transparent',
                      fontSize: '.95rem', display: 'flex', alignItems: 'center', gap: '.4rem', whiteSpace: 'nowrap',
                    }}
                  >
                    {g.label}
                    {n > 0 && badge(n)}
                  </button>
                );
              })}
            </div>
            {groupTabs.length > 1 && (
              <div role="tablist" aria-label={`Onglets : ${activeGroup.label}`} style={{ padding: '.35rem 2rem', display: 'flex', gap: '.25rem', flexWrap: 'wrap', background: '#faf8f5' }}>
                {groupTabs.map(t => (
                  <button key={t.id} role="tab" aria-selected={tab === t.id}
                    onClick={() => handleTabChange(t.id)}
                    style={{
                      padding: '.4rem .9rem', border: 'none', cursor: 'pointer', borderRadius: '9999px',
                      background: tab === t.id ? '#2d5f54' : 'transparent', color: tab === t.id ? 'white' : '#555',
                      fontWeight: tab === t.id ? 700 : 500, fontSize: '.85rem', display: 'flex', alignItems: 'center', gap: '.4rem', whiteSpace: 'nowrap',
                    }}
                  >
                    {t.label}
                    {t.count !== null && t.count > 0 && (
                      <span style={{ background: tab === t.id ? 'rgba(255,255,255,.25)' : '#f0e8e4', color: tab === t.id ? 'white' : '#2d5f54', borderRadius: '9999px', padding: '.05rem .5rem', fontSize: '.72rem', fontWeight: 700 }}>{t.count}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      <div style={{ maxWidth: 1100, margin: '2rem auto', padding: '0 1.5rem' }}>

        {tab === 'dashboard' && <DashboardTab healthChecks={healthChecks} articles={articles} setMessageFilter={setMessageFilter} handleTabChange={handleTabChange} messages={messages} dbStatus={dbStatus} openArticleEditor={openArticleEditor} />}

        {tab === 'articles' && <ArticlesTab search={search} setSearch={setSearch} loadArticles={loadArticles} statusFilter={statusFilter} setStatusFilter={setStatusFilter} openArticleEditor={openArticleEditor} loadingArticles={loadingArticles} articles={articles} duplicateArticle={duplicateArticle} togglePublish={togglePublish} deleteArticle={deleteArticle} />}

        {/* ── Ã‰DITEUR ARTICLE ── */}
        {tab === 'new' && (
          <div style={{ background: 'white', borderRadius: '1rem', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,.07)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2d5f54' }}>{editingArticle?.id ? `✏️ Modifier : ${editingArticle.title}` : '✏️ Nouvel article'}</h2>
              <button onClick={closeArticleEditor} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.3rem' }}>✕</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button
                onClick={() => setShowArticlePreview(prev => !prev)}
                style={{ padding: '.5rem .95rem', border: '1px solid #ddd', borderRadius: '.5rem', background: 'white', color: '#2d5f54', cursor: 'pointer', fontSize: '.82rem', fontWeight: 700 }}
              >
                {showArticlePreview ? "Masquer l'aperçu" : 'Aperçu live'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>Titre *</label>
                <input value={editingArticle?.title || ''}
                  onChange={e => setEditingArticle(p => ({ ...p, title: e.target.value, slug: slug(e.target.value) }))}
                  style={inp} placeholder="Titre de l'article" />
              </div>
              <div>
                <label style={lbl}>Slug (URL)</label>
                <input value={editingArticle?.slug || ''}
                  onChange={e => setEditingArticle(p => ({ ...p, slug: e.target.value }))}
                  style={inp} placeholder="slug-auto-genere" />
              </div>
              <div>
                <label style={lbl}>Catégorie</label>
                <select value={editingArticle?.category || ''}
                  onChange={e => setEditingArticle(p => ({ ...p, category: e.target.value }))}
                  style={inp}
                >
                  <option value="">— Choisir —</option>
                  <option value="Coaching">Coaching</option>
                  <option value="Leadership">Leadership</option>
                  <option value="Bonheur">Bonheur & Bien-être</option>
                  <option value="Relations">Relations</option>
                  <option value="Entreprises">Entreprises</option>
                  <option value="Happiness Design">Happiness Design</option>
                  <option value="Réflexions">Réflexions</option>
                  <option value="Outils">Outils & Méthodes</option>
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>Image à la une</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '.75rem' }}>
                  <button onClick={() => setShowMediaLibrary(true)}
                    style={{ padding: '.6rem 1.1rem', background: '#2d5f54', color: 'white', border: 'none', borderRadius: '.5rem', cursor: 'pointer', fontSize: '.85rem', fontWeight: 600 }}
                  >🖼️ Médiathèque Supabase</button>
                  <span style={{ color: '#aaa', fontSize: '.82rem' }}>ou</span>
                  <label style={{ padding: '.6rem 1rem', background: uploadingFeaturedImage ? '#8aa8a9' : '#01696f', color: 'white', borderRadius: '.5rem', cursor: uploadingFeaturedImage ? 'wait' : 'pointer', fontSize: '.85rem', fontWeight: 600 }}>
                    {uploadingFeaturedImage ? '⏳ Upload…' : '⬆️ Upload direct'}
                    <input type="file" accept="image/*" onChange={uploadFeaturedImage} style={{ display: 'none' }} disabled={uploadingFeaturedImage} />
                  </label>
                </div>
                {editingArticle?.featured_image ? (
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }}>
                      <img src={editingArticle.featured_image} alt="" style={{ height: 80, borderRadius: '.5rem', objectFit: 'cover' }} />
                      <button onClick={() => setEditingArticle(p => ({ ...p, featured_image: '' }))}
                        style={{ position: 'absolute', top: -6, right: -6, background: '#c0392b', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: '.7rem' }}>✕</button>
                    </div>
                    <input value={editingArticle.featured_image}
                      onChange={e => setEditingArticle(p => ({ ...p, featured_image: e.target.value }))}
                      style={{ ...inp, flex: 1, fontSize: '.82rem' }} placeholder="URL de l'image" />
                  </div>
                ) : (
                  <input value=""
                    onChange={e => setEditingArticle(p => ({ ...p, featured_image: e.target.value }))}
                    style={{ ...inp, fontSize: '.82rem' }} placeholder="Ou coller une URL directement" />
                )}
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>Extrait</label>
                <textarea value={editingArticle?.excerpt || ''}
                  onChange={e => setEditingArticle(p => ({ ...p, excerpt: e.target.value }))}
                  style={{ ...inp, height: 80, resize: 'vertical' }}
                  placeholder="Résumé accrocheur pour les cards du blog…" />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <div style={{ border: '1px solid #ece3d8', borderRadius: '1rem', background: '#faf6f1', padding: '1rem 1.1rem', marginBottom: '1rem' }}>
                  <p style={{ margin: 0, fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#8a7a70' }}>
                    Guide de rédaction Monica
                  </p>
                  <ul style={{ margin: '.75rem 0 0', paddingLeft: '1.1rem', color: '#6d625a', fontSize: '.88rem', lineHeight: 1.7 }}>
                    <li>Ouverture : une anecdote client, une question déstabilisante ou un constat concret.</li>
                    <li>Corps : une idée centrale par section, avec un outil ou une perspective coaching.</li>
                    <li>Détail signature : ce que Monica a observé en séance, la formule qui fait mouche.</li>
                    <li>Fin : une invitation à l'action douce — réflexion, contact ou séance découverte.</li>
                  </ul>
                </div>
                <label style={lbl}>Note d'angle / fil conducteur</label>
                <textarea value={editingArticle?.voice_notes || ''}
                  onChange={e => setEditingArticle(p => ({ ...p, voice_notes: e.target.value }))}
                  style={{ ...inp, height: 96, resize: 'vertical' }}
                  placeholder="Angle personnel, anecdote de séance, citation qui inspire l'article, ou note brouillon…" />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <ArticleTemplatePanel
                  title={editingArticle?.title || ''}
                  slug={editingArticle?.slug || ''}
                  content={editingArticle?.content || ''}
                  description={editingArticle?.seo_description || ''}
                  onChangeContent={html => setEditingArticle(p => ({ ...p, content: html }))}
                />
                <label style={lbl}>Contenu</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!editingArticle?.title && !editingArticle?.content) {
                        alert('Veuillez entrer un titre ou un theme pour generer le contenu');
                        return;
                      }
                      try {
                        const topic = editingArticle?.title || editingArticle?.content?.slice(0, 50) || 'voyages';
                        const res = await fetch('/api/ai/generate', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ topic, platform: 'instagram' })
                        });
                        const data = await res.json();
                        if (data.success && data.content) {
                          setEditingArticle(p => ({ ...p, content: (p?.content || '') + '<p>' + data.content + '</p>' }));
                        } else {
                          alert('Erreur: ' + (data.error || data.message || 'Impossible de generer le contenu'));
                        }
                      } catch (err) {
                        alert('Erreur de connexion: Ollama nest peut-etre pas actif');
                      }
                    }}
                    style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    ✨ Generer avec IA
                  </button>
                </div>
                <RichEditor value={editingArticle?.content || ''}
                  onChange={html => setEditingArticle(p => ({ ...p, content: html }))}
                  placeholder="Commence à écrire ton article ici…" />
              </div>
              {/* SEO Panel */}
              <div style={{ gridColumn: '1/-1', border: '1.5px solid #e8e3dc', borderRadius: '1rem', padding: '1.25rem 1.5rem', background: '#fafaf8' }}>
                <p style={{ margin: '0 0 1rem', fontSize: '.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#2d5f54' }}>🔍 SEO — Référencement Google</p>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={lbl}>Titre SEO (optionnel — remplace le titre dans Google)</label>
                    <input value={editingArticle?.seo_title ?? ''}
                      onChange={e => setEditingArticle(p => ({ ...p, seo_title: e.target.value }))}
                      style={inp} placeholder={`${editingArticle?.title || 'Titre de l\'article'} | Happy Humans`}
                      maxLength={70} />
                    <p style={{ margin: '.3rem 0 0', fontSize: '.75rem', color: (editingArticle?.seo_title?.length ?? 0) > 60 ? '#dc2626' : '#aaa' }}>
                      {editingArticle?.seo_title?.length ?? 0}/70 caractères · idéal : 50–60
                    </p>
                  </div>
                  <div>
                    <label style={lbl}>Description SEO (optionnel — affiché sous le titre dans Google)</label>
                    <textarea value={editingArticle?.seo_description ?? ''}
                      onChange={e => setEditingArticle(p => ({ ...p, seo_description: e.target.value }))}
                      style={{ ...inp, height: 72, resize: 'vertical' }}
                      placeholder={editingArticle?.excerpt ?? 'Description courte et engageante pour les résultats de recherche…'}
                      maxLength={160} />
                    <p style={{ margin: '.3rem 0 0', fontSize: '.75rem', color: (editingArticle?.seo_description?.length ?? 0) > 150 ? '#dc2626' : '#aaa' }}>
                      {editingArticle?.seo_description?.length ?? 0}/160 caractères · idéal : 120–155
                    </p>
                  </div>
                  <div>
                    <label style={lbl}>Image Open Graph / réseaux sociaux (laissez vide = image à la une)</label>
                    <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
                      <input value={editingArticle?.og_image ?? ''}
                        onChange={e => setEditingArticle(p => ({ ...p, og_image: e.target.value }))}
                        style={{ ...inp, flex: 1 }} placeholder="URL image 1200×630px pour Facebook, LinkedIn…" />
                      {(editingArticle?.og_image || editingArticle?.featured_image) && (
                        <img src={editingArticle?.og_image || editingArticle?.featured_image || ''} alt="" style={{ width: 60, height: 38, objectFit: 'cover', borderRadius: '.4rem', border: '1px solid #ddd', flexShrink: 0 }} />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer', fontWeight: 600, color: '#444', fontSize: '.9rem' }}>
                  <input type="checkbox" checked={!!editingArticle?.published}
                    onChange={e => setEditingArticle(p => ({ ...p, published: e.target.checked }))}
                    style={{ width: 18, height: 18 }} />
                  Publier immédiatement
                </label>
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
                <span style={metaChip}>URL: /blog/{editingArticle?.slug || slug(editingArticle?.title || '') || 'nouvel-article'}</span>
                <span style={metaChip}>{articleWordCount} mots</span>
                <span style={metaChip}>{articleReadTime} min de lecture</span>
                <span style={metaChip}>Cmd/Ctrl+S pour enregistrer</span>
                {isArticleDirty && <span style={{ ...metaChip, background: '#fff4db', color: '#8a5a00' }}>Brouillon non sauvegardé</span>}
              </div>
            </div>
            {showArticlePreview && (
              <div style={previewPanel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '.78rem', color: '#8a7a70', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>Preview</p>
                    <h3 style={{ margin: '.2rem 0 0', fontSize: '1.1rem', color: '#2d5f54' }}>Aperçu public de l&apos;article</h3>
                  </div>
                  <span style={{ ...metaChip, background: '#e8f5f2', color: '#01696f' }}>HTML sanitizé comme sur le site</span>
                </div>
                <div style={previewFrame}>
                  {editingArticle?.featured_image ? (
                    <img src={editingArticle.featured_image} alt="" style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: '.9rem', marginBottom: '1.5rem' }} />
                  ) : (
                    <div style={previewImageFallback}>Ajoute une image à la une pour prévisualiser le hero</div>
                  )}
                  <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {editingArticle?.category && <span style={metaChip}>{editingArticle.category}</span>}
                    <span style={metaChip}>{editingArticle?.published ? 'Publication immédiate' : 'Brouillon'}</span>
                    <span style={metaChip}>/blog/{editingArticle?.slug || slug(editingArticle?.title || '') || 'nouvel-article'}</span>
                  </div>
                  <h1 style={{ margin: 0, fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', lineHeight: 1.1, color: '#1f1a17' }}>
                    {editingArticle?.title || 'Titre de l’article'}
                  </h1>
                  <p style={{ margin: '1rem 0 1.5rem', color: '#6d625a', fontSize: '1rem', lineHeight: 1.7 }}>
                    {editingArticle?.excerpt || 'Ton extrait apparaîtra ici pour donner envie d’ouvrir l’article.'}
                  </p>
                  {editingArticle?.voice_notes && (
                    <div style={{ margin: '0 0 1.5rem', padding: '1rem 1.1rem', background: '#f6f1eb', border: '1px solid #ece3d8', borderRadius: '1rem' }}>
                      <p style={{ margin: 0, fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#8a7a70' }}>
                        Détail terrain
                      </p>
                      <p style={{ margin: '.4rem 0 0', color: '#6d625a', lineHeight: 1.7 }}>
                        {editingArticle.voice_notes}
                      </p>
                    </div>
                  )}
                  {articlePreviewHtml ? (
                    <EnhancedRichContent html={articlePreviewHtml} style={previewBody} />
                  ) : (
                    <p style={{ margin: 0, color: '#8a7a70', lineHeight: 1.7 }}>
                      Commence à écrire dans l’éditeur pour voir le rendu du contenu ici.
                    </p>
                  )}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.75rem', justifyContent: 'flex-end' }}>
              <button onClick={closeArticleEditor}
                style={{ padding: '.7rem 1.5rem', border: '1.5px solid #ddd', borderRadius: '.5rem', background: 'white', cursor: 'pointer', fontSize: '.9rem' }}>Annuler</button>
              <button onClick={saveArticle} disabled={savingArticle}
                style={{ padding: '.7rem 2rem', background: '#2d5f54', color: 'white', border: 'none', borderRadius: '.5rem', fontWeight: 700, cursor: savingArticle ? 'wait' : 'pointer', fontSize: '.9rem', opacity: savingArticle ? .75 : 1 }}>{savingArticle ? '⏳ Enregistrement…' : '💾 Enregistrer'}</button>
            </div>
          </div>
        )}

        {/* ── MENU ── */}
        {tab === 'menu' && (
          <div style={{ maxWidth: 860, margin: '0 auto', background: 'white', borderRadius: '1rem', padding: '2rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#2d5f54', margin: '0 0 .35rem' }}>🧭 Menu du site</h2>
            <p style={{ margin: '0 0 1.25rem', fontSize: '.85rem', color: '#7a7a7a', lineHeight: 1.5 }}>
              Renommez les liens, changez leur adresse, masquez-les, ajoutez-en, et déplacez-les par glisser-déposer.
              L’enregistrement est immédiat sur le site (pas de brouillon).
            </p>
            <NavigationEditor />
          </div>
        )}

        {/* ── FIL D'ARIANE ── */}
        {tab === 'fil-ariane' && (() => {
          const fields = (PAGES_CONFIG['fil-ariane']?.sections ?? []).filter(sec => sec.key !== 'bc_enabled');
          const enabledKey = 'fil-ariane__bc_enabled';
          const enabled = (editedContent[enabledKey] ?? PAGE_DEFAULTS['fil-ariane']?.bc_enabled ?? '1') !== '0';
          const st = pageStatus('fil-ariane');
          const busy = savingSettings || publishing;
          return (
            <div style={{ maxWidth: 860, margin: '0 auto', background: 'white', borderRadius: '1rem', padding: '2rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#2d5f54', margin: '0 0 .35rem' }}>🔗 Fil d’Ariane</h2>
              <p style={{ margin: '0 0 1.25rem', fontSize: '.85rem', color: '#7a7a7a', lineHeight: 1.5 }}>
                Le petit chemin affiché sous le menu (« Accueil › Coaching individuel »). Il apparaît sur toutes les pages
                sauf l’accueil. L’adresse de chaque maillon est automatique : vous ne réglez ici que le texte affiché.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '.9rem', padding: '.85rem 1rem', borderRadius: '.6rem', border: `1.5px solid ${enabled ? '#bbf7d0' : '#e8e4df'}`, background: enabled ? '#f0fdf4' : '#faf9f7', marginBottom: '1.5rem' }}>
                <button type="button" role="switch" aria-checked={enabled}
                  onClick={() => setEditedContent(prev => ({ ...prev, [enabledKey]: enabled ? '0' : '1' }))}
                  title={enabled ? 'Masquer le fil d’Ariane' : 'Afficher le fil d’Ariane'}
                  style={{ flexShrink: 0, width: 50, height: 28, borderRadius: 9999, border: 'none', cursor: 'pointer', background: enabled ? '#16a34a' : '#d1d5db', position: 'relative', transition: 'background .2s' }}>
                  <span style={{ position: 'absolute', top: 3, left: enabled ? 25 : 3, width: 22, height: 22, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .2s', display: 'block' }} />
                </button>
                <div>
                  <p style={{ margin: 0, fontSize: '.9rem', fontWeight: 700, color: enabled ? '#166534' : '#44403c' }}>
                    {enabled ? 'Fil d’Ariane affiché' : 'Fil d’Ariane masqué'}
                  </p>
                  <p style={{ margin: '.2rem 0 0', fontSize: '.8rem', color: '#7a7a7a' }}>
                    {enabled ? 'Visible sur toutes les pages, sauf l’accueil.' : 'Aucun visiteur ne le voit, sur aucune page.'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {fields.map(sec => {
                  const key = `fil-ariane__${sec.key}`;
                  const modified = (editedContent[key] ?? '') !== (baseline[key] ?? '');
                  return (
                    <div key={sec.key}>
                      <label style={lbl} htmlFor={`bc-${sec.key}`}>{sec.label.replace(/^Libellés — /, '').replace(/^Affichage — /, '')}</label>
                      <input
                        id={`bc-${sec.key}`}
                        value={editedContent[key] ?? ''}
                        onChange={e => setEditedContent(prev => ({ ...prev, [key]: e.target.value }))}
                        style={inp}
                      />
                      {modified && <span style={{ fontSize: '.72rem', color: '#c2410c' }}>● modifié</span>}
                    </div>
                  );
                })}
              </div>

              {!draftSupported ? (
                <p style={{ margin: '0 0 1rem', padding: '.55rem .8rem', borderRadius: '.5rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '.82rem', fontWeight: 600 }}>
                  ⚠️ Les brouillons ne sont pas disponibles sur cette base : « Enregistrer » met directement en ligne.
                </p>
              ) : st.draftN > 0 ? (
                <p style={{ margin: '0 0 1rem', padding: '.55rem .8rem', borderRadius: '.5rem', background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontSize: '.82rem', fontWeight: 600 }}>
                  📝 Brouillon : {st.draftN} modification{st.draftN > 1 ? 's' : ''} pas encore en ligne. Cliquez sur « Publier ».
                </p>
              ) : (
                <p style={{ margin: '0 0 1rem', padding: '.55rem .8rem', borderRadius: '.5rem', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: '.82rem', fontWeight: 600 }}>
                  ✓ Tout est en ligne — aucune modification en attente.
                </p>
              )}

              <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', justifyContent: 'flex-end', borderTop: '1.5px solid #ece8e2', paddingTop: '1rem' }}>
                {draftSupported && st.draftN > 0 && (
                  <button onClick={() => discardDraft('fil-ariane')} disabled={busy}
                    style={{ padding: '.45rem .9rem', background: 'white', color: '#b91c1c', border: '1.5px solid #fecaca', borderRadius: '.5rem', fontWeight: 600, cursor: busy ? 'default' : 'pointer', fontSize: '.85rem', opacity: busy ? .6 : 1 }}>
                    ↩ Abandonner
                  </button>
                )}
                <button onClick={() => saveDraft('fil-ariane')} disabled={busy || st.unsaved === 0}
                  style={{ padding: '.65rem 1.4rem', background: 'white', color: '#2d5f54', border: '1.5px solid #2d5f54', borderRadius: '.5rem', fontWeight: 700, cursor: busy || st.unsaved === 0 ? 'default' : 'pointer', fontSize: '.88rem', opacity: busy || st.unsaved === 0 ? .5 : 1 }}>
                  {savingSettings ? '⏳ Enregistrement…' : draftSupported ? '💾 Enregistrer le brouillon' : '💾 Enregistrer'}
                </button>
                {draftSupported && (
                  <button onClick={() => publishPage('fil-ariane')} disabled={busy || (st.unsaved === 0 && st.draftN === 0)}
                    style={{ padding: '.65rem 1.5rem', background: '#c2410c', color: 'white', border: 'none', borderRadius: '.5rem', fontWeight: 700, cursor: busy || (st.unsaved === 0 && st.draftN === 0) ? 'default' : 'pointer', fontSize: '.88rem', opacity: busy || (st.unsaved === 0 && st.draftN === 0) ? .45 : 1 }}>
                    {publishing ? '⏳ Publication…' : '🚀 Publier'}
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── PAGES LIBRES ── */}
        {tab === 'questionnaires' && <QuestionnairesAdmin />}

        {tab === 'ia' && <AiKeysPanel />}

        {tab === 'custom-pages' && (
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <CustomPagesManager />
          </div>
        )}

        {/* ── PAGES ── */}
        {tab === 'contenu' && (
          loadingSettings ? (
            <p style={{ textAlign: 'center', color: '#888', padding: '3rem' }}>Chargement du contenu…</p>
          ) : (
            <ContentOverview
              fields={contentIndex}
              onOpen={openContentField}
              onOpenPage={openContentPage}
              onPublish={publishPage}
              onReset={resetContentField}
              onReplace={replaceInContent}
              busy={savingSettings || publishing}
            />
          )
        )}

        {tab === 'seo' && (
          loadingSettings ? (
            <p style={{ textAlign: 'center', color: '#888', padding: '3rem' }}>Contrôle du référencement…</p>
          ) : (
            <SeoHealth issues={seoAudit.issues} pageCount={seoAudit.pageCount} onOpen={openSeoIssue} />
          )
        )}

        {tab === 'visibilite' && <VisibilityTab onGoto={setTab} />}
        {tab === 'connexions' && <ConnectionsTab />}
        {tab === 'stats-google' && <SearchConsoleStats />}

        {tab === 'pages' && (
          <div>
            {loadingSettings ? <p style={{ textAlign: 'center', color: '#888', padding: '3rem' }}>Chargement…</p> : (
              <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.5rem', alignItems: 'start' }}>

                {/* Sidebar pages */}
                <div style={{ background: 'white', borderRadius: '1rem', padding: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                  <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.75rem', padding: '0 .5rem' }}>Pages du site</p>
                  {Object.entries(PAGES_CONFIG).map(([key, cfg]) => (
                    <button key={key} onClick={() => { setActivePage(key); setFieldSearch(''); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '.5rem', width: '100%', textAlign: 'left', padding: '.6rem .75rem', borderRadius: '.5rem', border: 'none', cursor: 'pointer', fontSize: '.88rem', fontWeight: activePage === key ? 700 : 400, background: activePage === key ? '#f0e8e4' : 'transparent', color: activePage === key ? '#2d5f54' : '#555', marginBottom: '.2rem' }}
                    >
                      <span>{cfg.emoji}</span> {cfg.label}
                      {draftCountOf(key) > 0 && (
                        <span title={`${draftCountOf(key)} modification(s) en brouillon, pas encore en ligne`}
                          style={{ marginLeft: 'auto', background: '#fb923c', color: '#431407', borderRadius: '999px', fontSize: '.68rem', fontWeight: 700, padding: '.05rem .45rem' }}>
                          {draftCountOf(key)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Éditeur de page */}
                <div style={{ background: 'white', borderRadius: '1rem', padding: '2rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                  {activePage === 'navigation' ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#2d5f54' }}>
                          🧭 Navigation
                        </h2>
                      </div>
                      <NavigationEditor />
                    </div>
                  ) : (
                    (() => {
                      const config = PAGES_CONFIG[activePage];
                      if (!config) return null;
                      const pagePath = activePage === 'home' ? '/' : `/${activePage}`;
                      const st = pageStatus(activePage);
                      const busy = savingSettings || publishing;
                      return (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '.75rem', flexWrap: 'wrap' }}>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#2d5f54', margin: 0 }}>
                              {config.emoji} {config.label}
                            </h2>
                            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              <button onClick={() => setShowPreview(p => !p)}
                                style={{ padding: '.45rem .9rem', background: showPreview ? '#e8f5f2' : 'white', color: '#01696f', border: '1.5px solid #b8ddd6', borderRadius: '.5rem', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600 }}>
                                👁 Aperçu
                              </button>
                              <button onClick={() => setShowHistory(h => !h)}
                                style={{ padding: '.45rem .9rem', background: showHistory ? '#fff7ed' : 'white', color: '#c2410c', border: '1.5px solid #fed7aa', borderRadius: '.5rem', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600 }}>
                                🕘 Historique
                              </button>
                              <a
                                href={pagePath}
                                target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: '.82rem', color: '#01696f', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '.3rem' }}
                                title="La page telle que la voient les visiteurs"
                              >
                                🔗 Voir en ligne
                              </a>
                              <a
                                href={`${pagePath}${pagePath.includes('?') ? '&' : '?'}cms_preview=1`}
                                target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: '.82rem', color: '#c2410c', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '.3rem' }}
                                title="La page avec vos brouillons (visible seulement quand vous êtes connecté)"
                              >
                                👁 Voir le brouillon
                              </a>
                              {draftSupported && st.draftN > 0 && (
                                <button
                                  onClick={() => discardDraft(activePage)}
                                  disabled={busy}
                                  style={{ padding: '.45rem .9rem', background: 'white', color: '#b91c1c', border: '1.5px solid #fecaca', borderRadius: '.5rem', fontWeight: 600, cursor: 'pointer', fontSize: '.8rem', opacity: busy ? .6 : 1 }}
                                  title="Supprimer les brouillons de cette page (le site en ligne n'est pas modifié)"
                                >
                                  ↩ Abandonner
                                </button>
                              )}
                              <button
                                onClick={() => saveDraft(activePage)}
                                disabled={busy || st.unsaved === 0}
                                style={{ padding: '.45rem 1.1rem', background: 'white', color: '#2d5f54', border: '1.5px solid #2d5f54', borderRadius: '.5rem', fontWeight: 700, cursor: busy || st.unsaved === 0 ? 'default' : 'pointer', fontSize: '.85rem', opacity: busy || st.unsaved === 0 ? .5 : 1 }}
                                title={draftSupported ? "Enregistrer en brouillon (rien n'est mis en ligne)" : 'Enregistrer (mise en ligne directe)'}
                              >
                                {savingSettings ? '⏳ Enregistrement…' : draftSupported ? '💾 Enregistrer le brouillon' : '💾 Enregistrer'}
                              </button>
                              {draftSupported && (
                                <button
                                  onClick={() => publishPage(activePage)}
                                  disabled={busy || (st.unsaved === 0 && st.draftN === 0)}
                                  style={{ padding: '.45rem 1.25rem', background: '#c2410c', color: 'white', border: 'none', borderRadius: '.5rem', fontWeight: 700, cursor: busy || (st.unsaved === 0 && st.draftN === 0) ? 'default' : 'pointer', fontSize: '.85rem', opacity: busy || (st.unsaved === 0 && st.draftN === 0) ? .45 : 1 }}
                                  title="Mettre les modifications en ligne"
                                >
                                  {publishing ? '⏳ Publication…' : '🚀 Publier'}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* État : brouillon / en ligne */}
                          {!draftSupported ? (
                            <p style={{ margin: '0 0 1rem', padding: '.55rem .8rem', borderRadius: '.5rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '.82rem', fontWeight: 600 }}>
                              ⚠️ Les brouillons ne sont pas disponibles sur cette base de données : « Enregistrer » met directement en ligne.
                            </p>
                          ) : st.unsaved > 0 ? (
                            <p style={{ margin: '0 0 1rem', padding: '.55rem .8rem', borderRadius: '.5rem', background: '#fff8e1', border: '1px solid #f0c040', color: '#7a5c00', fontSize: '.82rem', fontWeight: 600 }}>
                              ✏️ {st.unsaved} modification{st.unsaved > 1 ? 's' : ''} non enregistrée{st.unsaved > 1 ? 's' : ''}
                              {st.draftN > 0 ? ` · ${st.draftN} déjà en brouillon` : ''} — le site en ligne n’est pas modifié.
                            </p>
                          ) : st.draftN > 0 ? (
                            <p style={{ margin: '0 0 1rem', padding: '.55rem .8rem', borderRadius: '.5rem', background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontSize: '.82rem', fontWeight: 600 }}>
                              📝 Brouillon : {st.draftN} modification{st.draftN > 1 ? 's' : ''} pas encore en ligne. Cliquez sur « Publier » pour les mettre en ligne.
                            </p>
                          ) : (
                            <p style={{ margin: '0 0 1rem', padding: '.55rem .8rem', borderRadius: '.5rem', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: '.82rem', fontWeight: 600 }}>
                              ✓ Tout est en ligne — aucune modification en attente.
                            </p>
                          )}

                          {showHistory && (
                            <PageHistoryPanel
                              page={activePage}
                              onRestored={() => {
                                bustCmsCache(activePage);
                                // eslint-disable-next-line react-hooks/refs -- faux positif : callback de restauration, pas de lecture pendant le rendu
                                loadSettings();
                                setPreviewKey(k => k + 1);
                                showToast('✅ Valeur restaurée !');
                              }}
                            />
                          )}

                          {showPreview && (
                            <div style={{ marginBottom: '1.5rem', border: '1.5px solid #ece8e2', borderRadius: '.75rem', overflow: 'hidden' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.5rem .9rem', background: '#faf8f5', borderBottom: '1px solid #ece8e2' }}>
                                <span style={{ fontSize: '.78rem', fontWeight: 700, color: '#888' }}>👁 Aperçu du brouillon — {pagePath}</span>
                                <button onClick={() => setPreviewKey(k => k + 1)}
                                  style={{ background: 'none', border: 'none', color: '#01696f', cursor: 'pointer', fontSize: '.78rem', fontWeight: 600 }}>
                                  🔄 Rafraîchir
                                </button>
                              </div>
                              <iframe key={previewKey} src={`${pagePath}${pagePath.includes('?') ? '&' : '?'}cms_preview=1`} title={`Aperçu ${config.label}`}
                                style={{ width: '100%', height: 560, border: 'none', display: 'block', background: 'white' }} />
                            </div>
                          )}

                          {/* Aide à la saisie */}
                          <p style={{ fontSize: '.8rem', color: '#7a7a7a', background: '#faf8f5', border: '1px solid #ece8e2', borderRadius: '.5rem', padding: '.55rem .8rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                            💡 Dans les textes longs : <code>**gras**</code>, <code>*italique*</code> et <code>[texte du lien](https://…)</code> sont reconnus.
                            Pour masquer un texte, saisissez un simple espace. Vos modifications restent en brouillon tant que vous ne cliquez pas sur « Publier ».
                          </p>

                          {/* Recherche de champ */}
                          <input
                            value={fieldSearch}
                            onChange={e => setFieldSearch(e.target.value)}
                            placeholder="🔍 Rechercher un champ (ex : tarif, titre, étape 3…)"
                            style={{ ...inp, marginBottom: '1.25rem' }}
                          />

                          {(() => {
                            const q = fieldSearch.trim().toLowerCase();
                            const visibleSections = config.sections.filter(s =>
                              !q ||
                              s.label.toLowerCase().includes(q) ||
                              s.key.toLowerCase().includes(q) ||
                              (editedContent[`${activePage}__${s.key}`] ?? '').toLowerCase().includes(q)
                            );
                            if (visibleSections.length === 0) {
                              return <p style={{ color: '#aaa', textAlign: 'center', padding: '2rem' }}>Aucun champ ne correspond à « {fieldSearch} »</p>;
                            }
                            // Groupe à ouvrir quand on arrive d'un résultat de « 🔎 Contenu »
                            const revealedKey = revealField && revealField.page === activePage ? revealField.key : null;
                            const revealedSection = revealedKey ? config.sections.find(sec => sec.key === revealedKey) : undefined;
                            const revealGroup = revealedSection ? labelParts(revealedSection.label).group : null;
                            // Regrouper par préfixe de label (avant le « — »)
                            const groups: { name: string; sections: typeof visibleSections }[] = [];
                            for (const s of visibleSections) {
                              const name = labelParts(s.label).group;
                              const existing = groups.find(g => g.name === name);
                              if (existing) existing.sections.push(s);
                              else groups.push({ name, sections: [s] });
                            }
                            const searching = q.length > 0;
                            return groups.map(group => (
                              <details key={group.name} open={searching || groups.length <= 3 || group.name === 'Structure' || group.name === revealGroup || undefined}
                                style={{ marginBottom: '.85rem', border: '1.5px solid #ece8e2', borderRadius: '.75rem', background: '#fdfcfa' }}>
                                <summary style={{ padding: '.8rem 1.1rem', cursor: 'pointer', fontWeight: 700, fontSize: '.92rem', color: '#2d5f54', userSelect: 'none' }}>
                                  {group.name} <span style={{ fontWeight: 400, color: '#aaa', fontSize: '.8rem' }}>· {group.sections.length} champ{group.sections.length > 1 ? 's' : ''}</span>
                                </summary>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '.25rem 1.1rem 1.25rem' }}>
                                  {group.sections.map(section => {
                                    const key = `${activePage}__${section.key}`;
                                    const shortLabel = section.label.includes('—')
                                      ? section.label.split('—').slice(1).join('—').trim()
                                      : section.label;
                                    // Id stable : permet au <label> de désigner son champ (lecteur d'écran) et de
                                    // cibler le bon champ depuis les tests.
                                    const fieldId = `f-${activePage}-${section.key}`;
                                    const labelled = section.type === 'text' || section.type === 'textarea' || section.type === 'richtext';
                                    return (
                                      <div
                                        key={key}
                                        id={fieldAnchor(activePage, section.key)}
                                        style={{
                                          scrollMarginTop: '6rem',
                                          ...(highlightField && revealedKey === section.key
                                            ? { outline: '2px solid #c9a96e', outlineOffset: '.5rem', borderRadius: '.5rem' }
                                            : {}),
                                        }}
                                      >
                                        <label style={lbl} htmlFor={labelled ? fieldId : undefined}>
                                          {shortLabel}
                                          {(editedContent[key] ?? '') !== (baseline[key] ?? '') && (
                                            <span style={{ marginLeft: '.5rem', fontSize: '.68rem', fontWeight: 700, color: '#c2410c', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '999px', padding: '.02rem .45rem', textTransform: 'none', letterSpacing: 0 }}>
                                              ● modifié
                                            </span>
                                          )}
                                        </label>
                                        {section.type === 'sections' ? (
                                          <SectionsEditor
                                            defs={[...(PAGE_SECTIONS[activePage] || []), ...customSectionDefs(parseBlocks(editedContent['custom_sections'] ?? ''))]}
                                            value={editedContent[key] ?? ''}
                                            onChange={v => setEditedContent(prev => ({ ...prev, [key]: v }))}
                                          />
                                        ) : section.type === 'list' ? (
                                          <ListEditor
                                            defKey={section.key}
                                            initialItems={readList(pageContentOf(editedContent, activePage), section.key)}
                                            value={editedContent[key] ?? ''}
                                            onChange={v => setEditedContent(prev => ({ ...prev, [key]: v }))}
                                          />
                                        ) : section.type === 'custom-sections' ? (
                                          <CustomSectionsEditor
                                            value={editedContent[key] ?? ''}
                                            onChange={v => setEditedContent(prev => ({ ...prev, [key]: v }))}
                                          />
                                        ) : section.type === 'image' ? (
                                          <div>
                                            {editedContent[key] && (
                                              <div style={{ position: 'relative', marginBottom: '.5rem', display: 'inline-block' }}>
                                                <img src={editedContent[key]} alt={section.label} style={{ maxWidth: '100%', maxHeight: 200, borderRadius: '.5rem', border: '1px solid #ddd' }} />
                                                <button onClick={() => setEditedContent(prev => ({ ...prev, [key]: '' }))} style={{ position: 'absolute', top: -8, right: -8, background: '#c0392b', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: '.8rem' }}>✕</button>
                                              </div>
                                            )}
                                            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                                              <button onClick={() => { setMediaPickerTarget(key); setTab('media'); }} style={{ padding: '.5rem 1rem', background: '#01696f', color: 'white', border: 'none', borderRadius: '.4rem', cursor: 'pointer', fontSize: '.85rem' }}>🖼️ Choisir dans la médiathèque</button>
                                              <label style={{ padding: '.5rem 1rem', background: '#2d5f54', color: 'white', borderRadius: '.4rem', cursor: 'pointer', fontSize: '.85rem' }}>
                                                ⬆️ Upload
                                                <input type="file" accept="image/*" style={{ display: 'none' }}
                                                  onChange={e => handleImageFile(e, url => setEditedContent(prev => ({ ...prev, [key]: url })))} />
                                              </label>
                                              <input aria-label={`${section.label} — adresse de l'image (URL)`} value={editedContent[key] ?? ''} onChange={e => setEditedContent(prev => ({ ...prev, [key]: e.target.value }))} style={{ ...inp, flex: 1, minWidth: 200 }} placeholder="Ou coller une URL d'image..." />
                                            </div>
                                          </div>
                                        ) : section.type === 'richtext' ? (
                                          <textarea
                                            id={fieldId}
                                            value={editedContent[key] ?? ''}
                                            onChange={e => setEditedContent(prev => ({ ...prev, [key]: e.target.value }))}
                                            style={{ ...inp, height: 180, resize: 'vertical', fontFamily: 'monospace', fontSize: '.85rem' }}
                                            placeholder={section.label}
                                          />
                                        ) : section.type === 'textarea' ? (
                                          <textarea
                                            id={fieldId}
                                            value={editedContent[key] ?? ''}
                                            onChange={e => setEditedContent(prev => ({ ...prev, [key]: e.target.value }))}
                                            style={{ ...inp, height: 110, resize: 'vertical' }}
                                            placeholder={section.label}
                                          />
                                        ) : (
                                          <input
                                            id={fieldId}
                                            value={editedContent[key] ?? ''}
                                            onChange={e => setEditedContent(prev => ({ ...prev, [key]: e.target.value }))}
                                            style={inp}
                                            placeholder={section.label}
                                          />
                                        )}
                                        {section.key === 'seo_title' && (
                                          // Le site ajoute « | Happy Humans » au titre : on compte ce que Google affiche vraiment
                                          <SeoLengthHint value={serpTitle(editedContent[key] ?? '')} ideal={SEO_TITLE_IDEAL} note="avec « | Happy Humans »" />
                                        )}
                                        {section.key === 'seo_description' && (
                                          <>
                                            <SeoLengthHint value={editedContent[key] ?? ''} ideal={SEO_DESCRIPTION_IDEAL} />
                                            <SeoPreview
                                              title={editedContent[`${activePage}__seo_title`] ?? ''}
                                              description={editedContent[key] ?? ''}
                                              siteUrl={SITE_URL}
                                              path={activePage === 'home' ? '/' : `/${activePage}`}
                                            />
                                          </>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </details>
                            ));
                          })()}

                          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '.6rem', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => saveDraft(activePage)}
                              disabled={busy || st.unsaved === 0}
                              style={{ padding: '.75rem 1.6rem', background: 'white', color: '#2d5f54', border: '1.5px solid #2d5f54', borderRadius: '.5rem', fontWeight: 700, cursor: busy || st.unsaved === 0 ? 'default' : 'pointer', fontSize: '.95rem', opacity: busy || st.unsaved === 0 ? .5 : 1 }}
                            >
                              {savingSettings ? '⏳ Enregistrement…' : draftSupported ? '💾 Enregistrer le brouillon' : '💾 Enregistrer'}
                            </button>
                            {draftSupported && (
                              <button
                                onClick={() => publishPage(activePage)}
                                disabled={busy || (st.unsaved === 0 && st.draftN === 0)}
                                style={{ padding: '.75rem 2rem', background: '#c2410c', color: 'white', border: 'none', borderRadius: '.5rem', fontWeight: 700, cursor: busy || (st.unsaved === 0 && st.draftN === 0) ? 'default' : 'pointer', fontSize: '.95rem', opacity: busy || (st.unsaved === 0 && st.draftN === 0) ? .45 : 1 }}
                              >
                                {publishing ? '⏳ Publication…' : '🚀 Publier'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MÃ‰DIATHÃˆQUE ── */}
        {tab === 'media' && (
          <div style={{ background: 'white', borderRadius: '1rem', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,.07)', minHeight: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2d5f54' }}>🖼️ Médiathèque</h2>
              <p style={{ fontSize: '.85rem', color: '#888' }}>Supabase Storage</p>
            </div>
            <div style={{ background: '#faf8f5', borderRadius: '.75rem', padding: '2rem', textAlign: 'center', border: '2px dashed #e8e3dc' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>☁️</div>
              <p style={{ color: '#555', marginBottom: '1.25rem', lineHeight: 1.6 }}>Toutes tes images sont stockées sur <strong>Supabase Storage</strong>.</p>
              <button onClick={() => setShowMediaLibrary(true)}
                style={{ padding: '.8rem 1.75rem', background: '#2d5f54', color: 'white', border: 'none', borderRadius: '.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '.95rem' }}
              >🖼️ Ouvrir la médiathèque</button>
            </div>
          </div>
        )}


        {tab === 'booking' && <BookingTab bookingSlots={bookingSlots} bookingRequests={bookingRequests} loadingSlots={loadingSlots} savingSlot={savingSlot} newSlot={newSlot} setNewSlot={setNewSlot} loadBookingSlots={loadBookingSlots} saveNewSlot={saveNewSlot} deleteSlot={deleteSlot} updateRequestStatus={updateRequestStatus} />}

        {/* ── CAROUSEL ── */}
        {tab === 'carousel' && (
          <div className="space-y-6">
            <CarouselGenerator />
            <CarouselEditor />
          </div>
        )}

        {/* ── BLOG IA ── */}
        {tab === 'blog' && (
          <BlogGenerator
            onGenerated={(data) => {
              setEditingArticle({
                title: data.title,
                slug: data.suggestedSlug,
                excerpt: data.excerpt,
                content: data.content,
                voice_notes: '',
                featured_image: '',
                category: 'Voyage',
                published: false,
              });
              showToast('✅ Article généré ! Edite-le puis enregistre.');
              setTab('new');
            }}
          />
        )}


        {tab === 'messages' && <MessagesTab messages={messages} setMessages={setMessages} loadingMessages={loadingMessages} messageFilter={messageFilter} setMessageFilter={setMessageFilter} loadMessages={loadMessages} />}
        {tab === 'settings' && <SettingsTab loadingSettings={loadingSettings} settingsGroup={settingsGroup} setSettingsGroup={setSettingsGroup} settings={settings} editedSettings={editedSettings} setEditedSettings={setEditedSettings} handleImageFile={handleImageFile} saveSettings={saveSettings} savingSettings={savingSettings} />}

      </div>
    </div>
  );
}




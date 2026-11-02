'use client';
import React from 'react';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import EnhancedRichContent from '@/components/EnhancedRichContent';
import { bustCmsCache } from '@/hooks/useCmsContent';
import MediaLibrary from '@/components/MediaLibrary';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { uploadImage } from '@/lib/upload-client';
import SiteLogo, { logoPx, resolveLogo } from '@/components/SiteLogo';
import CarouselEditor from '@/components/admin/CarouselEditor';
import CarouselGenerator from '@/components/admin/CarouselGenerator';
import BlogGenerator from '@/components/admin/BlogGenerator';
import { PAGE_DEFAULTS } from '@/lib/cms-page-defaults';
import { basePage, draftPage, isDraftPage, planDraftSave } from '@/lib/cms-drafts';
import { buildContentIndex, fieldAnchor, labelParts, replacementStats, type ContentField, type ReplacementPlanItem } from '@/lib/cms-search';
import { PAGE_SECTIONS, parseLayout, fullOrder, serializeLayout, moveSection, toggleSection, type SectionDef, type SectionsLayout } from '@/lib/cms-sections';
import { LIST_DEFS, parseItems, readList, serializeList, blankItem, moveListItem, setListItemField, duplicateListItem, removeListItem, type ListItem } from '@/lib/cms-lists';
import { THEMES } from '@/components/DynamicTheme';
import { FONT_CHOICES } from '@/lib/themes';
import { customSectionDefs, parseBlocks } from '@/lib/custom-sections';
import { THEME_PACKS, DEFAULT_PACK_ID } from '@/lib/theme-packs';
import NavigationEditor from '@/components/cms/NavigationEditor';
import CustomSectionsEditor from '@/components/cms/CustomSectionsEditor';
import CustomPagesManager from '@/components/cms/CustomPagesManager';
import ContentOverview from '@/components/cms/ContentOverview';
import QuestionnairesAdmin from '@/components/cms/questionnaires/QuestionnairesAdmin';

// Numéro du dernier message affiché : un message récent n'est pas effacé par le minuteur d'un message plus ancien
let toastSeq = 0;

const RichEditor = dynamic(() => import('@/components/RichEditor'), { ssr: false });

// ─── Types ───────────────────────────────────────────────────
type Article = {
  id: number; title: string; slug: string; category: string;
  published: boolean; published_at: string; created_at: string;
  excerpt: string; featured_image: string; content?: string; voice_notes?: string;
  seo_title?: string; seo_description?: string; og_image?: string;
};

type Setting = { id: number; key: string; value: string; label: string; group_name: string; type?: string; };
type SiteContent = { id: number; page: string; block_key: string; value: string; label: string; type: string; };

type BookingSlot = {
  id: string; slot_date: string; slot_time: string;
  slot_type: 'coaching' | 'discovery' | 'enterprise';
  duration_minutes: number; status: 'available' | 'booked' | 'cancelled';
  notes: string | null; created_at: string;
};

type BookingRequest = {
  id: string; slot_id: string; client_name: string; client_email: string;
  client_phone: string | null; message: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string; booking_slots?: BookingSlot;
};

type ContactMessage = {
  id: string; name: string; email: string; message: string;
  type: string; status: 'unread' | 'read' | 'replied';
  created_at: string;
};

// ─── Helpers ─────────────────────────────────────────────────
const fmt = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const slug = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Contenu d'une page tel qu'il est édité dans l'admin : « page__clé » → « clé ». */
const pageContentOf = (edited: Record<string, string>, page: string): Record<string, string> =>
  Object.fromEntries(Object.entries(edited)
    .filter(([k]) => k.startsWith(`${page}__`))
    .map(([k, v]) => [k.slice(page.length + 2), v]));

function normalizeArticleDraft(article: Partial<Article> | null | undefined) {
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

function getArticleDraftSignature(article: Partial<Article> | null | undefined) {
  return JSON.stringify(normalizeArticleDraft(article));
}

function getWordCount(content?: string) {
  if (!content) return 0;
  return content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
}

function getReadTimeMinutes(content?: string) {
  const words = getWordCount(content);
  return words === 0 ? 0 : Math.max(1, Math.ceil(words / 200));
}

// ─── Config pages CMS ─────────────────────────────────────────
// ── Éditeur de structure : ordre et affichage des sections d'une page ─────────────
// (logique pure et testée : lib/cms-sections.ts). Les sections verrouillées (🔒) restent en place.
function SectionsEditor({ defs, value, onChange }: { defs: SectionDef[]; value: string; onChange: (v: string) => void }) {
  const layout = parseLayout(value);
  const order = fullOrder(defs, layout);
  const hidden = new Set(layout.hidden);
  const byId = new Map(defs.map(d => [d.id, d]));
  const apply = (l: SectionsLayout) => onChange(serializeLayout(defs, l));
  const isPinned = (id: string) => !!byId.get(id)?.pin;
  const arrow: React.CSSProperties = { width: 30, height: 30, borderRadius: '.4rem', border: '1px solid #d6d3d1', background: 'white', color: '#44403c', fontSize: '.85rem', cursor: 'pointer' };
  if (defs.length === 0) return <p style={{ color: '#888', fontSize: '.85rem' }}>Aucune section réordonnable sur cette page.</p>;
  return (
    <div>
      <p style={{ fontSize: '.8rem', color: '#7a7a7a', margin: '0 0 .75rem', lineHeight: 1.5 }}>
        ▲ ▼ pour changer l’ordre, 👁 pour masquer ou afficher une section. Les sections 🔒 restent à leur place.
        Cliquez ensuite sur « Enregistrer le brouillon », vérifiez l’aperçu, puis « Publier ».
      </p>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
        {order.map((id, i) => {
          const def = byId.get(id)!;
          const pinned = isPinned(id);
          const off = hidden.has(id);
          const canUp = !pinned && i > 0 && !isPinned(order[i - 1]);
          const canDown = !pinned && i < order.length - 1 && !isPinned(order[i + 1]);
          return (
            <li key={id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.5rem .75rem', border: '1.5px solid #ece8e2', borderRadius: '.6rem', background: off ? '#f5f5f4' : 'white', opacity: off ? .65 : 1 }}>
              <span style={{ width: 22, color: '#a8a29e', fontSize: '.8rem', fontWeight: 700 }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: '.9rem', fontWeight: 600, color: '#292524', textDecoration: off ? 'line-through' : 'none' }}>
                {def.label}
                {pinned && <span title="Section fixe : elle ne peut être ni déplacée ni masquée" style={{ marginLeft: '.5rem', fontWeight: 400, fontSize: '.75rem', color: '#78716c' }}>🔒 {def.pin === 'start' ? 'toujours en haut' : 'toujours en bas'}</span>}
                {off && <span style={{ marginLeft: '.5rem', fontWeight: 600, fontSize: '.72rem', color: '#a16207' }}>masquée</span>}
              </span>
              <button type="button" aria-label={`Monter « ${def.label} »`} disabled={!canUp} onClick={() => apply(moveSection(defs, layout, id, -1))} style={{ ...arrow, opacity: canUp ? 1 : .3, cursor: canUp ? 'pointer' : 'default' }}>▲</button>
              <button type="button" aria-label={`Descendre « ${def.label} »`} disabled={!canDown} onClick={() => apply(moveSection(defs, layout, id, 1))} style={{ ...arrow, opacity: canDown ? 1 : .3, cursor: canDown ? 'pointer' : 'default' }}>▼</button>
              <button type="button" aria-label={off ? `Afficher « ${def.label} »` : `Masquer « ${def.label} »`} disabled={pinned} onClick={() => apply(toggleSection(defs, layout, id))} style={{ ...arrow, opacity: pinned ? .3 : 1, cursor: pinned ? 'default' : 'pointer' }}>{off ? '🚫' : '👁'}</button>
            </li>
          );
        })}
      </ol>
      {value.trim() !== '' && (
        <button type="button" onClick={() => onChange('')} style={{ marginTop: '.75rem', background: 'none', border: 'none', color: '#01696f', cursor: 'pointer', fontSize: '.82rem', fontWeight: 600 }}>
          ↺ Rétablir l’ordre d’origine
        </button>
      )}
    </div>
  );
}

// ── Éditeur de liste : ajouter, retirer et réordonner les éléments (FAQ, programmes, témoignages…) ──
// La logique pure (lecture des anciens emplacements numérotés, sérialisation) vit dans lib/cms-lists.ts.
function ListEditor({ defKey, initialItems, value, onChange }: { defKey: string; initialItems: ListItem[]; value: string; onChange: (v: string) => void }) {
  const def = LIST_DEFS[defKey];
  if (!def) return <p style={{ color: '#b91c1c', fontSize: '.85rem' }}>Liste inconnue : {defKey}</p>;
  const items = parseItems(value) ?? initialItems;
  const apply = (next: ListItem[]) => onChange(serializeList(next));
  const arrow: React.CSSProperties = { width: 30, height: 30, borderRadius: '.4rem', border: '1px solid #d6d3d1', background: 'white', color: '#44403c', fontSize: '.85rem', cursor: 'pointer' };
  return (
    <div>
      <p style={{ fontSize: '.8rem', color: '#7a7a7a', margin: '0 0 .75rem', lineHeight: 1.5 }}>
        {def.label} — {items.length} élément{items.length > 1 ? 's' : ''}. Ajoutez, retirez ou déplacez les lignes : le site suit cet ordre.
        Enregistrez le brouillon, vérifiez l’aperçu, puis publiez.
      </p>
      {items.length === 0 && (
        <p style={{ fontSize: '.85rem', color: '#a8a29e', background: '#faf8f5', border: '1px dashed #e8e3dc', borderRadius: '.5rem', padding: '.9rem', margin: '0 0 .75rem' }}>
          Aucun élément : cette partie du site n’affichera rien tant que vous n’en ajoutez pas.
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        {items.map((item, i) => (
          <div key={i} style={{ border: '1.5px solid #ece8e2', borderRadius: '.75rem', background: 'white', padding: '.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.7rem' }}>
              <strong style={{ flex: 1, fontSize: '.85rem', color: '#2d5f54' }}>{def.itemLabel.charAt(0).toUpperCase() + def.itemLabel.slice(1)} {i + 1}</strong>
              <button type="button" aria-label={`Monter « ${def.itemLabel} ${i + 1} »`} disabled={i === 0} onClick={() => apply(moveListItem(items, i, -1))} style={{ ...arrow, opacity: i === 0 ? .3 : 1, cursor: i === 0 ? 'default' : 'pointer' }}>▲</button>
              <button type="button" aria-label={`Descendre « ${def.itemLabel} ${i + 1} »`} disabled={i === items.length - 1} onClick={() => apply(moveListItem(items, i, 1))} style={{ ...arrow, opacity: i === items.length - 1 ? .3 : 1, cursor: i === items.length - 1 ? 'default' : 'pointer' }}>▼</button>
              <button type="button" aria-label={`Dupliquer « ${def.itemLabel} ${i + 1} »`} title="Dupliquer" onClick={() => apply(duplicateListItem(items, i))} style={arrow}>📋</button>
              <button type="button" aria-label={`Supprimer « ${def.itemLabel} ${i + 1} »`} title="Supprimer" onClick={() => apply(removeListItem(items, i))} style={{ ...arrow, color: '#b91c1c', borderColor: '#fecaca' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
              {def.fields.map(f => {
                const id = `list-${defKey}-${i}-${f.key}`;
                const common = { id, value: item[f.key] ?? '', 'aria-label': `${def.itemLabel} ${i + 1} — ${f.label}` };
                return (
                  <div key={f.key}>
                    <label htmlFor={id} style={lbl}>{f.label}</label>
                    {f.type === 'select' ? (
                      <select {...common} onChange={e => apply(setListItemField(items, i, f.key, e.target.value))} style={inp}>
                        {(f.options ?? []).map((opt, oi) => <option key={opt} value={opt}>{f.optionLabels?.[oi] ?? opt}</option>)}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea {...common} onChange={e => apply(setListItemField(items, i, f.key, e.target.value))}
                        rows={f.lines ? 4 : 3} style={{ ...inp, height: 'auto', minHeight: f.lines ? 84 : 68, resize: 'vertical', lineHeight: 1.5 }} />
                    ) : (
                      <input {...common} onChange={e => apply(setListItemField(items, i, f.key, e.target.value))} style={inp} />
                    )}
                    {f.hint && <p style={{ fontSize: '.75rem', color: '#a8a29e', margin: '.25rem 0 0' }}>{f.hint}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '.75rem' }}>
        <button type="button" onClick={() => apply([...items, blankItem(def)])}
          style={{ padding: '.5rem 1rem', background: '#2d5f54', color: 'white', border: 'none', borderRadius: '.45rem', cursor: 'pointer', fontSize: '.85rem', fontWeight: 600 }}>
          + {def.addLabel}
        </button>
        {value.trim() !== '' && (
          <button type="button" onClick={() => onChange('')}
            style={{ background: 'none', border: 'none', color: '#01696f', cursor: 'pointer', fontSize: '.82rem', fontWeight: 600 }}>
            ↺ Rétablir la liste d’origine
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Champs modifiables de chaque page ───────────────────────
// L'éditeur de blocs personnalisés vit dans components/cms/CustomSectionsEditor.tsx.
const PAGES_CONFIG: Record<string, { label: string; emoji: string; sections: { key: string; label: string; type: 'text' | 'textarea' | 'image' | 'richtext' | 'select' | 'sections' | 'custom-sections' | 'list'; options?: string[]; optionLabels?: string[] }[] }> = {
  // ── Ordre du panneau gauche ──────────────────────────────────
  // 1. Accueil
  'home': {
    label: 'Accueil',
    emoji: '🏠',
    sections: [
      { key: 'home_card_coaching_title', label: 'Cartes « Explorez les thématiques » — Coaching individuel : titre', type: 'text' },
      { key: 'home_card_coaching_desc', label: 'Cartes « Explorez les thématiques » — Coaching individuel : texte', type: 'textarea' },
      { key: 'home_card_organisations_title', label: 'Cartes « Explorez les thématiques » — Entreprises : titre', type: 'text' },
      { key: 'home_card_organisations_desc', label: 'Cartes « Explorez les thématiques » — Entreprises : texte', type: 'textarea' },
      { key: 'home_card_hd_title', label: 'Cartes « Explorez les thématiques » — Happiness Design : titre', type: 'text' },
      { key: 'home_card_hd_desc', label: 'Cartes « Explorez les thématiques » — Happiness Design : texte', type: 'textarea' },
      { key: 'home_card_relations_title', label: 'Cartes « Explorez les thématiques » — Relations & Attachement : titre', type: 'text' },
      { key: 'home_card_relations_desc', label: 'Cartes « Explorez les thématiques » — Relations & Attachement : texte', type: 'textarea' },
      { key: 'contact_email_label', label: 'Contact — Mention « Ou directement par email : »', type: 'text' },
      { key: 'sections_layout', label: 'Structure — Ordre et affichage des sections', type: 'sections' },
      { key: 'custom_sections', label: 'Blocs personnalisés — ajouter des sections', type: 'custom-sections' },
      { key: 'hero_image', label: 'Hero — Photo de fond', type: 'image' },
      { key: 'hero_badge',            label: 'Hero — Badge (ex: Monica Schneider · Executive Coach)',  type: 'text' },
      { key: 'hero_title',            label: 'Hero — Titre principal',                                type: 'text' },
      { key: 'hero_subtitle',         label: 'Hero — Sous-titre / certifications',                   type: 'textarea' },
      { key: 'hero_cta_primary',      label: 'Hero — Bouton principal',                              type: 'text' },
      { key: 'hero_cta_contact',      label: 'Hero — Bouton contact',                                type: 'text' },
      { key: 'services_badge',        label: 'Services — Badge section',                             type: 'text' },
      { key: 'services_title',        label: 'Services — Titre section',                             type: 'text' },
      { key: 'services_b2c_title',    label: 'Services — Particuliers : Titre',                      type: 'text' },
      { key: 'services_b2c_text',     label: 'Services — Particuliers : Texte',                      type: 'textarea' },
      { key: 'services_b2c_cta',      label: 'Services — Particuliers : Bouton',                     type: 'text' },
      { key: 'services_b2b_title',    label: 'Services — Entreprises : Titre',                     type: 'text' },
      { key: 'services_b2b_text',     label: 'Services — Entreprises : Texte',                      type: 'textarea' },
      { key: 'services_b2b_cta',      label: 'Services — Entreprises : Bouton',                    type: 'text' },
      { key: 'cards_section_badge',   label: 'Cartes — Badge section',                              type: 'text' },
      { key: 'cards_section_title',  label: 'Cartes — Titre section',                               type: 'text' },
      { key: 'cards_link_label',     label: 'Cartes — Label lien "Découvrir"',                      type: 'text' },
      { key: 'home_card_order_1', label: 'Ordre — Position 1', type: 'select',
        options: ['coaching', 'organisations', 'happiness-design', 'relations'],
        optionLabels: ['⭐ Coaching', '🏢 Entreprises', '☀️ Happiness Design', '💚 Relations'] },
      { key: 'home_card_order_2', label: 'Ordre — Position 2', type: 'select',
        options: ['coaching', 'organisations', 'happiness-design', 'relations'],
        optionLabels: ['⭐ Coaching', '🏢 Entreprises', '☀️ Happiness Design', '💚 Relations'] },
      { key: 'home_card_order_3', label: 'Ordre — Position 3', type: 'select',
        options: ['coaching', 'organisations', 'happiness-design', 'relations'],
        optionLabels: ['⭐ Coaching', '🏢 Entreprises', '☀️ Happiness Design', '💚 Relations'] },
      { key: 'home_card_order_4', label: 'Ordre — Position 4', type: 'select',
        options: ['coaching', 'organisations', 'happiness-design', 'relations'],
        optionLabels: ['⭐ Coaching', '🏢 Entreprises', '☀️ Happiness Design', '💚 Relations'] },
      { key: 'booking_badge',        label: 'Booking — Badge',                                       type: 'text' },
      { key: 'booking_modal_title',  label: 'Booking modal — Titre',                                type: 'text' },
      { key: 'booking_modal_subtitle', label: 'Booking modal — Sous-titre',                         type: 'textarea' },
      { key: 'contact_section_badge',   label: 'Contact — Badge section',                            type: 'text' },
      { key: 'contact_section_title',  label: 'Contact — Titre section',                            type: 'text' },
      { key: 'contact_section_subtitle', label: 'Contact — Sous-titre section',                    type: 'text' },
      { key: 'form_success_title',   label: 'Formulaire — Titre succès',                           type: 'text' },
      { key: 'form_success_body',    label: 'Formulaire — Corps succès',                           type: 'text' },
      { key: 'form_sending',         label: 'Formulaire — Texte envoi',                            type: 'text' },
      { key: 'form_submit',          label: 'Formulaire — Bouton envoi',                           type: 'text' },
      { key: 'booking_widget_title', label: 'Réservation — Titre « Choisissez votre créneau »', type: 'text' },
      { key: 'booking_widget_subtitle', label: 'Réservation — Sous-titre « Séance découverte offerte (1h) ou programme de… »', type: 'text' },
      { key: 't_bureau_elegant_avec_lumiere', label: 'Section 1 · Clarté, confiance et relations… — Texte alternatif image « Bureau élégant avec lumière naturelle, ambiance coaching professionnel »', type: 'text' },
      { key: 't_seance_decouverte', label: 'Section 2 · Choisissez votre créneau — Texte « Séance découverte »', type: 'text' },
      { key: 't_gratuite_1h_sans_engagement', label: 'Section 2 · Choisissez votre créneau — Texte « gratuite · 1h · sans engagement »', type: 'text' },
      { key: 't_reserver_maintenant', label: 'Section 2 · Choisissez votre créneau — Texte « Réserver maintenant »', type: 'text' },
      { key: 't_confidentiel', label: 'Section 2 · Choisissez votre créneau — Texte « Confidentiel »', type: 'text' },
      { key: 't_sans_engagement', label: 'Section 2 · Choisissez votre créneau — Texte « Sans engagement »', type: 'text' },
      { key: 't_reponse_48h', label: 'Section 2 · Choisissez votre créneau — Texte « Réponse 48h »', type: 'text' },
      { key: 't_nom', label: 'Section 3 · Une question ? Écrivez-moi — Libellé « Nom * »', type: 'text' },
      { key: 't_votre_nom', label: 'Section 3 · Une question ? Écrivez-moi — Texte indicatif « Votre nom »', type: 'text' },
      { key: 't_email', label: 'Section 3 · Une question ? Écrivez-moi — Libellé « Email * »', type: 'text' },
      { key: 't_votre_email_com', label: 'Section 3 · Une question ? Écrivez-moi — Texte indicatif « votre@email.com »', type: 'text' },
      { key: 't_message', label: 'Section 3 · Une question ? Écrivez-moi — Libellé « Message * »', type: 'text' },
      { key: 't_votre_question_ou_demande', label: 'Section 3 · Une question ? Écrivez-moi — Texte indicatif « Votre question ou demande… »', type: 'text' },
      { key: 't_reserver_via_calendly', label: 'Textes de la page — Lien « Réserver via Calendly → »', type: 'text' },
    ],
  },
  // 2. À propos
  'a-propos': {
    label: 'À propos',
    emoji: '👋',
    sections: [
      { key: 'sections_layout', label: 'Structure — Ordre et affichage des sections', type: 'sections' },
      { key: 'custom_sections', label: 'Blocs personnalisés — ajouter des sections', type: 'custom-sections' },
      { key: 'hero_image',        label: 'Photo principale (hero)',         type: 'image' },
      { key: 'hero_badge',        label: 'Badge hero',                     type: 'text' },
      { key: 'page_title',        label: 'Titre de la page',               type: 'text' },
      { key: 'intro_text',        label: "Texte d'introduction",           type: 'richtext' },
      { key: 'photo',             label: 'Photo Monica',                   type: 'image' },
      { key: 'coaching_label',    label: 'Section coaching — Label',       type: 'text' },
      { key: 'coaching_cta',      label: 'Section coaching — CTA',         type: 'text' },
      { key: 'mentoring_label',   label: 'Section mentoring — Label',      type: 'text' },
      { key: 'mentoring_text',    label: 'Section mentoring — Texte',      type: 'richtext' },
      { key: 'mentoring_cta',      label: 'Section mentoring — CTA',       type: 'text' },
      { key: 'acc_badge',         label: 'Section accompagnement — Badge', type: 'text' },
      { key: 'acc_title',         label: 'Section accompagnement — Titre', type: 'text' },
      { key: 'acc_subtitle',      label: 'Section accompagnement — Sous-titre', type: 'text' },
      { key: 'hd_badge',          label: 'Section HD — Badge',             type: 'text' },
      { key: 'hd_text',           label: 'Section HD — Texte',             type: 'textarea' },
      { key: 'hd_cta',            label: 'Section HD — CTA',               type: 'text' },
      { key: 'footer_cta_title',  label: 'Footer CTA — Titre',             type: 'text' },
      { key: 'footer_cta_coaching', label: 'Footer CTA — Coaching',        type: 'text' },
      { key: 'footer_cta_booking',  label: 'Footer CTA — Réservation',     type: 'text' },
      { key: 'parcours_badge', label: 'Parcours — Badge « Parcours »', type: 'text' },
      { key: 'parcours_title', label: 'Parcours — Titre « Le parcours »', type: 'text' },
      { key: 'parcours_subtitle', label: 'Parcours — Sous-titre « Deviens qui tu es »', type: 'text' },
      { key: 'bio_p1', label: 'Bio — Paragraphe 1', type: 'textarea' },
      { key: 'bio_p2', label: 'Bio — Paragraphe 2', type: 'textarea' },
      { key: 'bio_p3', label: 'Bio — Paragraphe 3', type: 'textarea' },
      { key: 'bio_p4', label: 'Bio — Paragraphe 4', type: 'textarea' },
      { key: 'bio_p5', label: 'Bio — Paragraphe 5', type: 'textarea' },
      { key: 'bio_p6', label: 'Bio — Paragraphe 6', type: 'textarea' },
      { key: 'bio_p7', label: 'Bio — Paragraphe 7', type: 'textarea' },
      { key: 'bio_p8', label: 'Bio — Paragraphe 8', type: 'textarea' },
      { key: 'coaching_text', label: 'Coaching — Texte « Le coaching est une danse entre le… »', type: 'textarea' },
      { key: 't_monica_schneider_executive_coach', label: 'Section 1 · Leadership coaching en profondeur — Texte alternatif image « Monica Schneider — Executive Coach »', type: 'text' },
      { key: 't_monica_schneider', label: 'Section 2 · Le parcours — Texte alternatif image « Monica Schneider »', type: 'text' },
      { key: 't_ms', label: 'Section 2 · Le parcours — Texte « MS »', type: 'text' },
      { key: 't_monica_schneider_2', label: 'Section 2 · Le parcours — Texte « Monica Schneider »', type: 'text' },
      { key: 'seo_title', label: 'Référencement Google — Titre (onglet du navigateur et résultat Google)', type: 'text' },
      { key: 'seo_description', label: 'Référencement Google — Description (l’extrait sous le titre dans Google)', type: 'textarea' },
      { key: 'seo_image', label: 'Référencement Google — Image de partage (Facebook, LinkedIn, WhatsApp…)', type: 'image' },
    ],
  },
  // 3. Coaching
  'coaching': {
    label: 'Coaching',
    emoji: '⭐',
    sections: [
      { key: 'sections_layout', label: 'Structure — Ordre et affichage des sections', type: 'sections' },
      { key: 'custom_sections', label: 'Blocs personnalisés — ajouter des sections', type: 'custom-sections' },
      { key: 'hero_image',          label: 'Image hero',                    type: 'image' },
      { key: 'hero_badge',          label: 'Hero — Badge',                  type: 'text' },
      { key: 'hero_title',          label: 'Hero — Titre',                  type: 'text' },
      { key: 'hero_subtitle',       label: 'Hero — Sous-titre',             type: 'textarea' },
      { key: 'hero_cta_primary',    label: 'Hero — CTA principal',          type: 'text' },
      { key: 'hero_cta_contact',    label: 'Hero — CTA contact',            type: 'text' },
      { key: 'coaching_b2c_badge',  label: 'Coaching B2C — Badge',          type: 'text' },
      { key: 'coaching_b2c_image',  label: 'Coaching individuel — Image',   type: 'image' },
      { key: 'coaching_b2c_title',  label: 'Coaching individuel — Titre',   type: 'text' },
      { key: 'coaching_b2c_text',   label: 'Coaching individuel — Texte',   type: 'richtext' },
      { key: 'coaching_b2c_cta_link', label: 'Coaching B2C — CTA lien',    type: 'text' },
      { key: 'coaching_b2b_badge',  label: 'Coaching B2B — Badge',         type: 'text' },
      { key: 'coaching_b2b_image',  label: 'Coaching entreprises — Image',   type: 'image' },
      { key: 'coaching_b2b_title',  label: 'Coaching entreprises — Titre',  type: 'text' },
      { key: 'coaching_b2b_text',   label: 'Coaching entreprises — Texte', type: 'richtext' },
      { key: 'coaching_b2b_cta_link', label: 'Coaching B2B — CTA lien',    type: 'text' },
      { key: 'programs_badge',      label: 'Tarifs — Badge',               type: 'text' },
      { key: 'programs_title',      label: 'Tarifs — Titre',               type: 'text' },
      { key: 'coaching_programs', label: 'Programmes — Cartes (ajouter, retirer, réordonner)', type: 'list' },
      { key: 'tunnel_title',              label: 'Tunnel rapide — Titre',       type: 'text' },
      { key: 'tunnel_cta_primary',       label: 'Tunnel rapide — Bouton principal', type: 'text' },
      { key: 'tunnel_cta_secondary',     label: 'Tunnel rapide — Bouton secondaire',type: 'text' },
      { key: 'tunnel_reassurance',      label: 'Tunnel rapide — Réassurance', type: 'text' },
      { key: 'coaching_testimonials', label: 'Témoignages — Cartes (ajouter, retirer, réordonner)', type: 'list' },
      { key: 'form_cta_title',          label: 'Formulaire CTA — Titre',      type: 'textarea' },
      { key: 'form_cta_button',        label: 'Formulaire CTA — Bouton',     type: 'text' },
      { key: 'cta_title', label: 'Appel à l’action — Titre « Prêt·e à commencer ? »', type: 'text' },
      { key: 'testimonial_section_title', label: 'Témoignages — Titre « Ils témoignent »', type: 'text' },
      { key: 'testimonial_section_desc', label: 'Témoignages — Description « Des parcours différents, une même expérience :… »', type: 'text' },
      { key: 'testimonial_note', label: 'Témoignages — Note « * Prénom modifié »', type: 'text' },
      { key: 't_bureau_elegant_ambiance_coaching', label: 'Section 1 · Il y a des… — Texte alternatif image « Bureau élégant, ambiance coaching professionnel »', type: 'text' },
      { key: 't_coaching_individuel_introspection_', label: 'Section 2 · Coaching individuel — Texte alternatif image « Coaching individuel — introspection et clarté »', type: 'text' },
      { key: 't_coaching_d_equipe_et', label: 'Section 3 · Pour les entreprises — Texte alternatif image « Coaching d’équipe et leadership organisationnel »', type: 'text' },
      { key: 'seo_title', label: 'Référencement Google — Titre (onglet du navigateur et résultat Google)', type: 'text' },
      { key: 'seo_description', label: 'Référencement Google — Description (l’extrait sous le titre dans Google)', type: 'textarea' },
      { key: 'seo_image', label: 'Référencement Google — Image de partage (Facebook, LinkedIn, WhatsApp…)', type: 'image' },
    ],
  },
  // 4. Sparring Partner
  'entreprises': {
    label: 'Entreprises',
    emoji: '🏢',
    sections: [
      { key: 'sections_layout', label: 'Structure — Ordre et affichage des sections', type: 'sections' },
      { key: 'custom_sections', label: 'Blocs personnalisés — ajouter des sections', type: 'custom-sections' },
      { key: 'hero_image',   label: 'Hero — Image',                  type: 'image' },
      { key: 'hero_badge',   label: 'Hero — Badge',                  type: 'text' },
      { key: 'page_title',   label: 'Hero — Titre',                  type: 'text' },
      { key: 'intro_text',   label: 'Hero — Introduction',           type: 'textarea' },
      { key: 'section_image',label: 'Offres — Image',                type: 'image' },
      { key: 'offres_badge', label: 'Offres — Badge',                type: 'text' },
      { key: 'section_title',label: 'Offres — Titre',                type: 'text' },
      { key: 'section_text', label: 'Offres — Texte (une ligne vide entre les paragraphes)', type: 'richtext' },
      { key: 'offres_cta',   label: 'Offres — Texte du lien',        type: 'text' },
      { key: 'domains_badge',     label: 'Domaines — Badge',         type: 'text' },
      { key: 'domains_title',     label: 'Domaines — Titre',         type: 'text' },
      { key: 'domains_subtitle',  label: 'Domaines — Sous-titre',    type: 'textarea' },
      { key: 'entreprises_domains', label: 'Domaines — Cartes (ajouter, retirer, réordonner)', type: 'list' },
      { key: 'flash_badge',       label: 'Coaching Flash — Badge',                       type: 'text' },
      { key: 'flash_title',       label: 'Coaching Flash — Titre (retour à la ligne possible)', type: 'textarea' },
      { key: 'flash_desc',        label: 'Coaching Flash — Description',                 type: 'textarea' },
      { key: 'flash_features',    label: 'Coaching Flash — Liste (un élément par ligne)', type: 'textarea' },
      { key: 'flash_format',      label: 'Coaching Flash — Format',                      type: 'text' },
      { key: 'flash_rythme',      label: 'Coaching Flash — Rythme',                      type: 'text' },
      { key: 'flash_tarif',       label: 'Coaching Flash — Tarif',                       type: 'text' },
      { key: 'flash_cta_link',    label: 'Coaching Flash — Texte du lien',               type: 'text' },
      { key: 'sparring_badge',    label: 'Sparring — Badge',                             type: 'text' },
      { key: 'sparring_title',    label: 'Sparring — Titre',                             type: 'text' },
      { key: 'sparring_desc',     label: 'Sparring — Description',                       type: 'textarea' },
      { key: 'sparring_features', label: 'Sparring — Liste (un élément par ligne)',      type: 'textarea' },
      { key: 'sparring_cta_link', label: 'Sparring — Texte du bouton',                   type: 'text' },
      { key: 'cta_title',         label: 'Bandeau contact — Titre',  type: 'text' },
      { key: 'cta_button',        label: 'Bandeau contact — Bouton', type: 'text' },
      { key: 'pricing_badge',     label: 'Tarifs — Badge',           type: 'text' },
      { key: 'pricing_title',     label: 'Tarifs — Titre',           type: 'text' },
      { key: 'pricing_subtitle',  label: 'Tarifs — Sous-titre',      type: 'textarea' },
      { key: 'entreprises_pricing', label: 'Tarifs — Cartes (ajouter, retirer, réordonner)', type: 'list' },
      { key: 'diff_badge',       label: 'Différenciation — Badge',                                 type: 'text' },
      { key: 'diff_title',       label: 'Différenciation — Titre',                                 type: 'text' },
      { key: 'diff_text',        label: 'Différenciation — Texte (une ligne vide entre les paragraphes)', type: 'richtext' },
      { key: 'diff_cta_link',    label: 'Différenciation — Texte du lien',                         type: 'text' },
      { key: 'temoignage_dorothee_text',   label: 'Témoignage — Citation', type: 'textarea' },
      { key: 'temoignage_dorothee_author', label: 'Témoignage — Auteur',   type: 'text' },
      { key: 'temoignage_dorothee_role',   label: 'Témoignage — Fonction', type: 'text' },
      { key: 't_entreprises', label: 'Section 1 · Remettre de l’alignement et… — Texte alternatif image « Entreprises »', type: 'text' },
      { key: 't_reunion_d_equipe_et', label: 'Section 2 · Ce que je propose — Texte alternatif image « Réunion d’équipe et leadership en entreprise »', type: 'text' },
      { key: 't_format', label: 'Section 3 · Coaching Flash Prise de… — Texte « Format »', type: 'text' },
      { key: 't_rythme', label: 'Section 3 · Coaching Flash Prise de… — Texte « Rythme »', type: 'text' },
      { key: 't_tarif', label: 'Section 3 · Coaching Flash Prise de… — Texte « Tarif »', type: 'text' },
      { key: 't_prenom_modifie', label: 'Bas de page — Texte « * Prénom modifié »', type: 'text' },
      { key: 'seo_title', label: 'Référencement Google — Titre (onglet du navigateur et résultat Google)', type: 'text' },
      { key: 'seo_description', label: 'Référencement Google — Description (l’extrait sous le titre dans Google)', type: 'textarea' },
      { key: 'seo_image', label: 'Référencement Google — Image de partage (Facebook, LinkedIn, WhatsApp…)', type: 'image' },
    ],
  },
  // 6. Happiness Design
  'happiness-design': {
    label: 'Happiness Design',
    emoji: '☀️',
    sections: [
      { key: 'sections_layout', label: 'Structure — Ordre et affichage des sections', type: 'sections' },
      { key: 'custom_sections', label: 'Blocs personnalisés — ajouter des sections', type: 'custom-sections' },
      { key: 'hero_image', label: 'Hero — Photo de fond', type: 'image' },
      { key: 'hero_badge',    label: 'Hero — Badge',               type: 'text' },
      { key: 'page_title',    label: 'Hero — Titre principal (H1)', type: 'text' },
      { key: 'page_subtitle', label: 'Hero — Sous-titre',          type: 'textarea' },
      { key: 'intro_text',    label: 'Hero — Texte intro',         type: 'textarea' },
      { key: 'hero_cta',      label: 'Hero — Bouton CTA',          type: 'text' },
      { key: 'pourqui_badge',   label: 'Pour qui — Badge',          type: 'text' },
      { key: 'pourqui_title',   label: 'Pour qui — Titre',          type: 'text' },
      { key: 'pourqui_1_title', label: 'Pour qui 1 — Titre',        type: 'text' },
      { key: 'pourqui_1_desc',  label: 'Pour qui 1 — Description',  type: 'textarea' },
      { key: 'pourqui_2_title', label: 'Pour qui 2 — Titre',        type: 'text' },
      { key: 'pourqui_2_desc',  label: 'Pour qui 2 — Description',  type: 'textarea' },
      { key: 'pourqui_3_title', label: 'Pour qui 3 — Titre',        type: 'text' },
      { key: 'pourqui_3_desc',  label: 'Pour qui 3 — Description',  type: 'textarea' },
      { key: 'program_badge', label: 'Programme — Badge',           type: 'text' },
      { key: 'program_title', label: 'Programme — Titre',           type: 'text' },
      { key: 'program_followups_note', label: 'Programme — Note sous les étapes (ex: + bonus…)', type: 'text' },
      { key: 'step_01_title', label: 'Étape 01 — Titre', type: 'text' },
      { key: 'step_01_desc',  label: 'Étape 01 — Description', type: 'textarea' },
      { key: 'step_02_title', label: 'Étape 02 — Titre', type: 'text' },
      { key: 'step_02_desc',  label: 'Étape 02 — Description', type: 'textarea' },
      { key: 'step_03_title', label: 'Étape 03 — Titre', type: 'text' },
      { key: 'step_03_desc',  label: 'Étape 03 — Description', type: 'textarea' },
      { key: 'step_04_title', label: 'Étape 04 — Titre', type: 'text' },
      { key: 'step_04_desc',  label: 'Étape 04 — Description', type: 'textarea' },
      { key: 'step_05_title', label: 'Étape 05 — Titre', type: 'text' },
      { key: 'step_05_desc',  label: 'Étape 05 — Description', type: 'textarea' },
      { key: 'step_06_title', label: 'Étape 06 — Titre', type: 'text' },
      { key: 'step_06_desc',  label: 'Étape 06 — Description', type: 'textarea' },
      { key: 'step_07_title', label: 'Étape 07 — Titre', type: 'text' },
      { key: 'step_07_desc',  label: 'Étape 07 — Description', type: 'textarea' },
      { key: 'step_08_title', label: 'Étape 08 — Titre', type: 'text' },
      { key: 'step_08_desc',  label: 'Étape 08 — Description', type: 'textarea' },
      { key: 'step_09_title', label: 'Étape 09 — Titre', type: 'text' },
      { key: 'step_09_desc',  label: 'Étape 09 — Description', type: 'textarea' },
      { key: 'step_10_title', label: 'Étape 10 — Titre', type: 'text' },
      { key: 'step_10_desc',  label: 'Étape 10 — Description', type: 'textarea' },
      { key: 'step_11_title', label: 'Étape 11 — Titre', type: 'text' },
      { key: 'step_11_desc',  label: 'Étape 11 — Description', type: 'textarea' },
      { key: 'step_12_title', label: 'Étape 12 — Titre', type: 'text' },
      { key: 'step_12_desc',  label: 'Étape 12 — Description', type: 'textarea' },
      { key: 'tools_badge',              label: 'Outils — Badge',                         type: 'text' },
      { key: 'tools_title',              label: 'Outils — Titre',                         type: 'text' },
      { key: 'tools_intro_1',            label: 'Outils — Intro paragraphe 1',            type: 'textarea' },
      { key: 'tools_intro_2',            label: 'Outils — Intro paragraphe 2',            type: 'textarea' },
      { key: 'tools_origin_label',       label: 'Outils — Label encadré "Origine"',      type: 'text' },
      { key: 'tools_origin_text',        label: 'Outils — Texte origine',                type: 'textarea' },
      { key: 'tools_conclusions_label',  label: 'Outils — Label conclusions',            type: 'text' },
      { key: 'tools_conclusion_1',       label: 'Outils — Conclusion 1',                 type: 'textarea' },
      { key: 'tools_conclusion_2',       label: 'Outils — Conclusion 2',                 type: 'textarea' },
      { key: 'tools_claim',              label: 'Outils — Claim (phrase différenciante)', type: 'textarea' },
      { key: 'outil_label',              label: 'Les 7 outils — Petit label devant le numéro (ex: « Outil »)', type: 'text' },
      { key: 'outil_1_title', label: 'Outil 1 — Titre', type: 'text' },
      { key: 'outil_1_desc',  label: 'Outil 1 — Description', type: 'textarea' },
      { key: 'outil_1_alt',   label: 'Outil 1 — Texte alternatif de l’image (accessibilité)', type: 'text' },
      { key: 'outil_2_title', label: 'Outil 2 — Titre', type: 'text' },
      { key: 'outil_2_desc',  label: 'Outil 2 — Description', type: 'textarea' },
      { key: 'outil_2_alt',   label: 'Outil 2 — Texte alternatif de l’image (accessibilité)', type: 'text' },
      { key: 'outil_3_title', label: 'Outil 3 — Titre', type: 'text' },
      { key: 'outil_3_desc',  label: 'Outil 3 — Description', type: 'textarea' },
      { key: 'outil_3_alt',   label: 'Outil 3 — Texte alternatif de l’image (accessibilité)', type: 'text' },
      { key: 'outil_4_title', label: 'Outil 4 — Titre', type: 'text' },
      { key: 'outil_4_desc',  label: 'Outil 4 — Description', type: 'textarea' },
      { key: 'outil_4_alt',   label: 'Outil 4 — Texte alternatif de l’image (accessibilité)', type: 'text' },
      { key: 'outil_5_title', label: 'Outil 5 — Titre', type: 'text' },
      { key: 'outil_5_desc',  label: 'Outil 5 — Description', type: 'textarea' },
      { key: 'outil_5_alt',   label: 'Outil 5 — Texte alternatif de l’image (accessibilité)', type: 'text' },
      { key: 'outil_6_title', label: 'Outil 6 — Titre', type: 'text' },
      { key: 'outil_6_desc',  label: 'Outil 6 — Description', type: 'textarea' },
      { key: 'outil_6_alt',   label: 'Outil 6 — Texte alternatif de l’image (accessibilité)', type: 'text' },
      { key: 'outil_7_title', label: 'Outil 7 — Titre', type: 'text' },
      { key: 'outil_7_desc',  label: 'Outil 7 — Description', type: 'textarea' },
      { key: 'outil_7_alt',   label: 'Outil 7 — Texte alternatif de l’image (accessibilité)', type: 'text' },
      { key: 'pricing_badge',    label: 'Tarifs — Badge',            type: 'text' },
      { key: 'pricing_title',    label: 'Tarifs — Titre',            type: 'text' },
      { key: 'format_label',     label: 'Prog complet — Label Format',  type: 'text' },
      { key: 'format_value',     label: 'Prog complet — Format',       type: 'text' },
      { key: 'duration_label',   label: 'Prog complet — Label Durée',  type: 'text' },
      { key: 'duration_value',   label: 'Prog complet — Durée',        type: 'text' },
      { key: 'rhythm_label',     label: 'Prog complet — Label Rythme', type: 'text' },
      { key: 'rhythm_value',     label: 'Prog complet — Rythme',       type: 'text' },
      { key: 'price_label',      label: 'Prog complet — Label Tarif',  type: 'text' },
      { key: 'price_value',      label: 'Prog complet — Tarif',        type: 'text' },
      { key: 'cta_label',        label: 'Prog complet — Bouton devis', type: 'text' },
      { key: 'program_complete_features', label: 'Prog complet — Liste bullet (1 item/ligne)', type: 'textarea' },
      { key: 'discovery_label',    label: 'Découverte — Label',         type: 'text' },
      { key: 'discovery_price',    label: 'Découverte — Prix',          type: 'text' },
      { key: 'discovery_unit',     label: 'Découverte — Unité',         type: 'text' },
      { key: 'discovery_features', label: 'Découverte — Bullets (1 item/ligne)', type: 'textarea' },
      { key: 'discovery_cta',      label: 'Découverte — CTA',           type: 'text' },
      { key: 'cta_title',    label: 'CTA final — Titre',     type: 'text' },
      { key: 'cta_subtitle', label: 'CTA final — Sous-titre', type: 'textarea' },
      { key: 'cta_button',   label: 'CTA final — Bouton',    type: 'text' },
      { key: 't_lumiere_doree_symbolisant_la', label: 'Section 1 · Happiness Design — Texte alternatif image « Lumière dorée symbolisant la transformation et le bonheur »', type: 'text' },
      { key: 't_par_happy_humans', label: 'Section 1 · Happiness Design — Texte « — par Happy Humans »', type: 'text' },
      { key: 'seo_title', label: 'Référencement Google — Titre (onglet du navigateur et résultat Google)', type: 'text' },
      { key: 'seo_description', label: 'Référencement Google — Description (l’extrait sous le titre dans Google)', type: 'textarea' },
      { key: 'seo_image', label: 'Référencement Google — Image de partage (Facebook, LinkedIn, WhatsApp…)', type: 'image' },
    ],
  },
  // 7. Relations
  'relations': {
    label: 'Relations & Attachement',
    emoji: '💚',
    sections: [
      { key: 'sections_layout', label: 'Structure — Ordre et affichage des sections', type: 'sections' },
      { key: 'custom_sections', label: 'Blocs personnalisés — ajouter des sections', type: 'custom-sections' },
      { key: 'hero_image', label: 'Photo de fond du haut de page', type: 'image' },
      { key: 'hero_badge',          label: 'Badge intro',                         type: 'text' },
      { key: 'hero_title',          label: 'Titre principal',                     type: 'text' },
      { key: 'hero_description',    label: 'Description intro',                   type: 'textarea' },
      { key: 'hero_cta_primary',    label: 'CTA primaire hero',                  type: 'text' },
      { key: 'hero_cta_secondary',  label: 'CTA secondaire hero',                type: 'text' },
      { key: 'quiz_badge',          label: 'Quiz — Badge',                       type: 'text' },
      { key: 'styles_badge',        label: 'Styles — Badge',                     type: 'text' },
      { key: 'styles_title',        label: 'Styles — Titre',                     type: 'text' },
      { key: 'styles_subtitle',    label: 'Styles — Sous-titre',                 type: 'textarea' },
      { key: 'manifestations_badge',          label: 'Manifestations — Badge',           type: 'text' },
      { key: 'manifestations_title',          label: 'Manifestations — Titre',           type: 'text' },
      { key: 'manifestations_subtitle',       label: 'Manifestations — Sous-titre',     type: 'textarea' },
      { key: 'manifestations_anxious_title',   label: 'Manifestations — Titre anxieux',   type: 'text' },
      { key: 'manifestations_anxious_desc',    label: 'Manifestations — Desc anxieux',   type: 'textarea' },
      { key: 'manifestations_avoidant_title', label: 'Manifestations — Titre évitant',   type: 'text' },
      { key: 'manifestations_avoidant_desc',  label: 'Manifestations — Desc évitant',   type: 'textarea' },
      { key: 'manifestations_goodnews_text',  label: 'Manifestations — Bonne nouvelle', type: 'textarea' },
      { key: 'healing_badge',       label: 'Guérison — Badge',                  type: 'text' },
      { key: 'healing_title',       label: 'Guérison — Titre',                  type: 'text' },
      { key: 'healing_subtitle',    label: 'Guérison — Sous-titre',            type: 'textarea' },
      { key: 'healing_step1_title', label: 'Guérison étape 1 — Titre',         type: 'text' },
      { key: 'healing_step1_desc',  label: 'Guérison étape 1 — Description',   type: 'textarea' },
      { key: 'healing_step2_title', label: 'Guérison étape 2 — Titre',         type: 'text' },
      { key: 'healing_step2_desc',  label: 'Guérison étape 2 — Description',   type: 'textarea' },
      { key: 'healing_step3_title', label: 'Guérison étape 3 — Titre',         type: 'text' },
      { key: 'healing_step3_desc',  label: 'Guérison étape 3 — Description',   type: 'textarea' },
      { key: 'comm_badge',          label: 'Communication — Badge',            type: 'text' },
      { key: 'comm_title',          label: 'Communication — Titre',            type: 'text' },
      { key: 'comm_subtitle',       label: 'Communication — Sous-titre',       type: 'textarea' },
      { key: 'work_section_badge',    label: 'Travail — Badge',                type: 'text' },
      { key: 'work_section_title',    label: 'Travail — Titre',                type: 'text' },
      { key: 'work_section_desc',     label: 'Travail — Description',          type: 'textarea' },
      { key: 'work_section_cta',      label: 'Travail — CTA',                  type: 'text' },
      { key: 'work_secure_label',    label: 'Travail — Label sécure',         type: 'text' },
      { key: 'work_secure_desc',     label: 'Travail — Desc sécure',          type: 'text' },
      { key: 'work_anxious_label',   label: 'Travail — Label anxieux',         type: 'text' },
      { key: 'work_anxious_desc',    label: 'Travail — Desc anxieux',         type: 'text' },
      { key: 'work_avoidant_label',  label: 'Travail — Label évitant',         type: 'text' },
      { key: 'work_avoidant_desc',   label: 'Travail — Desc évitant',         type: 'text' },
      { key: 'steps_badge',         label: 'Étapes — Badge',                    type: 'text' },
      { key: 'steps_title',         label: 'Étapes — Titre',                  type: 'text' },
      { key: 'step1_title',         label: 'Étape 1 — Titre',                 type: 'text' },
      { key: 'step1_desc',          label: 'Étape 1 — Description',           type: 'textarea' },
      { key: 'step2_title',         label: 'Étape 2 — Titre',                 type: 'text' },
      { key: 'step2_desc',          label: 'Étape 2 — Description',           type: 'textarea' },
      { key: 'step3_title',         label: 'Étape 3 — Titre',                 type: 'text' },
      { key: 'step3_desc',          label: 'Étape 3 — Description',           type: 'textarea' },
      { key: 'multiculture_badge',             label: 'Multiculture — Badge',            type: 'text' },
      { key: 'multiculture_title',             label: 'Multiculture — Titre',            type: 'text' },
      { key: 'multiculture_subtitle',          label: 'Multiculture — Sous-titre',       type: 'textarea' },
      { key: 'multiculture_entreprise_title',  label: 'Multiculture — Titre entreprise', type: 'text' },
      { key: 'multiculture_mc_title',          label: 'Multiculture — Titre MC',        type: 'text' },
      { key: 'multiculture_mc_desc',            label: 'Multiculture — Desc MC',          type: 'textarea' },
      { key: 'multiculture_note',               label: 'Multiculture — Note',             type: 'textarea' },
      { key: 'multiculture_cta',                label: 'Multiculture — CTA',             type: 'text' },
      { key: 'booking_badge',       label: 'Booking — Badge',                  type: 'text' },
      { key: 'booking_title',       label: 'Booking — Titre',                  type: 'text' },
      { key: 'booking_subtitle',    label: 'Booking — Sous-titre',            type: 'textarea' },
      { key: 'booking_cta_button',  label: 'Booking — Bouton CTA',            type: 'text' },
      { key: 'theory_badge',        label: 'Théorie — Badge',                 type: 'text' },
      { key: 'theory_title',        label: 'Théorie — Titre',                 type: 'text' },
      { key: 'theory_subtitle',     label: 'Théorie — Sous-titre',            type: 'textarea' },
      { key: 'theory_modal_cta',    label: 'Théorie modal — CTA',            type: 'text' },
      { key: 'footer_site_name',    label: 'Footer — Nom du site',            type: 'text' },
      { key: 'footer_copyright',    label: 'Footer — Copyright',              type: 'text' },
      { key: 'comm_rule1_title', label: 'Règle 1 — Titre', type: 'text' },
      { key: 'comm_rule1_desc', label: 'Règle 1 — Description', type: 'text' },
      { key: 'comm_rule1_example', label: 'Règle 1 — Exemple', type: 'text' },
      { key: 'comm_rule2_title', label: 'Règle 2 — Titre', type: 'text' },
      { key: 'comm_rule2_desc', label: 'Règle 2 — Description', type: 'text' },
      { key: 'comm_rule2_example', label: 'Règle 2 — Exemple', type: 'text' },
      { key: 'comm_rule3_title', label: 'Règle 3 — Titre', type: 'text' },
      { key: 'comm_rule3_desc', label: 'Règle 3 — Description', type: 'text' },
      { key: 'comm_rule3_example', label: 'Règle 3 — Exemple', type: 'text' },
      { key: 't_connexion_humaine_mains_tendues', label: 'Section 1 — Texte alternatif image « Connexion humaine, mains tendues symbolisant le lien entre… »', type: 'text' },
      { key: 't_bonne_nouvelle', label: 'Section 2 · La danse Anxieux–Évitant — Texte « Bonne nouvelle : »', type: 'text' },
      { key: 't_secure', label: 'Section 3 — Texte « Sécure : »', type: 'text' },
      { key: 't_anxieux', label: 'Section 3 — Texte « Anxieux : »', type: 'text' },
      { key: 't_evitant', label: 'Section 3 — Texte « Évitant : »', type: 'text' },
      { key: 't_decouvrir', label: 'Section 4 · Les fondements théoriques — Texte « Découvrir → »', type: 'text' },
      { key: 't_mentions_legales', label: 'Bas de page — Lien « Mentions légales »', type: 'text' },
      { key: 't_confidentialite', label: 'Bas de page — Lien « Confidentialité »', type: 'text' },
      { key: 't_attached', label: 'Textes de la page — Texte « ATTACHED »', type: 'text' },
      { key: 't_comprendre_son_style_d', label: 'Textes de la page — Texte « Comprendre son style d’attachement »', type: 'text' },
      { key: 't_le_livre_attached_applique', label: 'Textes de la page — Texte « Le livre ATTACHED applique la théorie de l’attachement,… » — format : **gras** *italique* [lien](adresse)', type: 'textarea' },
      { key: 't_le_style_secure_permet', label: 'Textes de la page — Texte « Le style sécure permet une intimité confiante et… »', type: 'text' },
      { key: 't_le_style_anxieux_genere', label: 'Textes de la page — Texte « Le style anxieux génère une peur constante de… »', type: 'text' },
      { key: 't_le_style_evitant_pousse', label: 'Textes de la page — Texte « Le style évitant pousse à fuir la proximité,… »', type: 'textarea' },
      { key: 't_le_livre_propose_des', label: 'Textes de la page — Texte « Le livre propose des tests pour identifier son… »', type: 'textarea' },
      { key: 't_comment_ces_styles_se', label: 'Textes de la page — Sous-titre « Comment ces styles se forment dans l’enfance »', type: 'text' },
      { key: 't_selon_bowlby_le_nourrisson', label: 'Textes de la page — Texte « Selon Bowlby, le nourrisson a un besoin biologique… »', type: 'textarea' },
      { key: 't_si_le_parent_est', label: 'Textes de la page — Texte « Si le parent est globalement disponible et réconfortant,… » — format : **gras** *italique* [lien](adresse)', type: 'textarea' },
      { key: 't_si_les_reponses_du', label: 'Textes de la page — Texte « Si les réponses du parent sont incohérentes —… » — format : **gras** *italique* [lien](adresse)', type: 'textarea' },
      { key: 't_si_le_parent_est_2', label: 'Textes de la page — Texte « Si le parent est régulièrement distant, peu expressif… » — format : **gras** *italique* [lien](adresse)', type: 'textarea' },
      { key: 't_ces_modeles_formes_avant', label: 'Textes de la page — Texte « Ces modèles, formés avant l’âge de deux ans,… »', type: 'text' },
      { key: 't_carl_rogers', label: 'Textes de la page — Texte « Carl Rogers »', type: 'text' },
      { key: 't_deconstruire_l_amour_conditionnel', label: 'Textes de la page — Texte « Déconstruire l’amour conditionnel pour enfin s’aimer »', type: 'text' },
      { key: 't_le_concept_de_carl', label: 'Textes de la page — Sous-titre « Le concept de Carl Rogers sur l’amour inconditionnel »', type: 'text' },
      { key: 't_l_idee_de_carl', label: 'Textes de la page — Texte « L’idée de Carl Rogers repose sur son concept… »', type: 'textarea' },
      { key: 't_rogers_pensait_que_la', label: 'Textes de la page — Texte « Rogers pensait que la plupart d’entre nous grandissons… »', type: 'textarea' },
      { key: 't_le_probleme_c_est', label: 'Textes de la page — Texte « Le problème, c’est que lorsque nous n’avons pas… »', type: 'textarea' },
      { key: 't_pour_rogers_une_vraie', label: 'Textes de la page — Texte « Pour Rogers, une vraie intimité exige la **congruence**… » — format : **gras** *italique* [lien](adresse)', type: 'textarea' },
      { key: 't_comment_faire_la_paix', label: 'Textes de la page — Sous-titre « Comment faire la paix avec soi-même selon Rogers »', type: 'text' },
      { key: 't_rogers_ne_voyait_pas', label: 'Textes de la page — Texte « Rogers ne voyait pas cela comme une technique… »', type: 'textarea' },
      { key: 't_abandonner_les_conditions_de', label: 'Textes de la page — Texte « **Abandonner les « conditions de valeur »**. Remarquez… » — format : **gras** *italique* [lien](adresse)', type: 'textarea' },
      { key: 't_faire_confiance_a_sa', label: 'Textes de la page — Texte « **Faire confiance à sa propre expérience** plus qu’au… » — format : **gras** *italique* [lien](adresse)', type: 'textarea' },
      { key: 't_pratiquer_le_regard_positif', label: 'Textes de la page — Texte « **Pratiquer le regard positif inconditionnel envers soi-même**. La… » — format : **gras** *italique* [lien](adresse)', type: 'textarea' },
      { key: 't_chercher_des_environnements_ou', label: 'Textes de la page — Texte « **Chercher des environnements où l’on peut être congruent**.… » — format : **gras** *italique* [lien](adresse)', type: 'textarea' },
      { key: 't_c_est_moins_une', label: 'Textes de la page — Texte « C’est moins une liste de tâches qu’une pratique… »', type: 'text' },
      { key: 't_erich_fromm', label: 'Textes de la page — Texte « Erich Fromm »', type: 'text' },
      { key: 't_se_preparer_a_l', label: 'Textes de la page — Texte « Se préparer à l’amour mature »', type: 'text' },
      { key: 't_erich_fromm_dans_l', label: 'Textes de la page — Texte « Erich Fromm, dans *L’art d’aimer*, soutenait que la… » — format : **gras** *italique* [lien](adresse)', type: 'textarea' },
      { key: 't_amour_immature', label: 'Textes de la page — Sous-titre « Amour immature »', type: 'text' },
      { key: 't_je_t_aime_parce', label: 'Textes de la page — Texte « « Je t’aime parce que j’ai besoin de… »', type: 'text' },
      { key: 't_il_est_enracine_dans', label: 'Textes de la page — Texte « Il est enraciné dans la dépendance — vous… »', type: 'textarea' },
      { key: 't_amour_mature', label: 'Textes de la page — Sous-titre « Amour mature »', type: 'text' },
      { key: 't_j_ai_besoin_de', label: 'Textes de la page — Texte « « J’ai besoin de toi parce que je… »', type: 'text' },
      { key: 't_ici_l_amour_est', label: 'Textes de la page — Texte « Ici, l’amour est une capacité active — fondée… »', type: 'textarea' },
      { key: 't_pour_fromm_c_est', label: 'Textes de la page — Texte « **Pour Fromm,** c’est pourquoi « trouver la bonne… » — format : **gras** *italique* [lien](adresse)', type: 'textarea' },
      { key: 't_secure_2', label: 'Textes de la page — Libellé « Sécure »', type: 'text' },
      { key: 't_a_l_aise_avec', label: 'Textes de la page — Texte « À l’aise avec l’intimité et l’indépendance. Communique ses… »', type: 'textarea' },
      { key: 't_anxieux_2', label: 'Textes de la page — Libellé « Anxieux »', type: 'text' },
      { key: 't_peur_du_rejet_et', label: 'Textes de la page — Texte « Peur du rejet et de l’abandon. Grand besoin… »', type: 'textarea' },
      { key: 't_evitant_2', label: 'Textes de la page — Libellé « Évitant »', type: 'text' },
      { key: 't_a_appris_a_minimiser', label: 'Textes de la page — Texte « A appris à minimiser ses besoins émotionnels pour… »', type: 'textarea' },
      { key: 't_desorganise', label: 'Textes de la page — Libellé « Désorganisé »', type: 'text' },
      { key: 't_conflit_interne_entre_le', label: 'Textes de la page — Texte « Conflit interne entre le besoin désespéré de proximité… »', type: 'textarea' },
      { key: 'seo_title', label: 'Référencement Google — Titre (onglet du navigateur et résultat Google)', type: 'text' },
      { key: 'seo_description', label: 'Référencement Google — Description (l’extrait sous le titre dans Google)', type: 'textarea' },
      { key: 'seo_image', label: 'Référencement Google — Image de partage (Facebook, LinkedIn, WhatsApp…)', type: 'image' },
    ],
  },
  // 9. Réservation
  'booking': {
    label: 'Réservation',
    emoji: '📅',
    sections: [
      { key: 'display_problem', label: 'Textes de la page — Mention « Problème d’affichage ? » (sous le calendrier)', type: 'text' },
      { key: 'hero_badge',           label: 'Badge hero',                          type: 'text' },
      { key: 'hero_title',           label: 'Titre hero',                          type: 'text' },
      { key: 'hero_subtitle',        label: 'Sous-titre hero',                     type: 'textarea' },
      { key: 'reassurance_1_title',  label: 'Réassurance 1 — Titre',              type: 'text' },
      { key: 'reassurance_1_desc',   label: 'Réassurance 1 — Description',        type: 'textarea' },
      { key: 'reassurance_2_title',  label: 'Réassurance 2 — Titre',              type: 'text' },
      { key: 'reassurance_2_desc',   label: 'Réassurance 2 — Description',        type: 'textarea' },
      { key: 'reassurance_3_title',  label: 'Réassurance 3 — Titre',              type: 'text' },
      { key: 'reassurance_3_desc',   label: 'Réassurance 3 — Description',        type: 'textarea' },
      { key: 'footer_note',          label: 'Note footer',                         type: 'textarea' },
      { key: 'email_booking_text',   label: 'Texte email booking',                 type: 'text' },
      { key: 't_chargement_du_calendrier', label: 'Section 1 — Texte « Chargement du calendrier… »', type: 'text' },
      { key: 't_ouvrir_calendly_directement', label: 'Section 1 — Lien « Ouvrir Calendly directement → »', type: 'text' },
      { key: 'service_label_coaching', label: 'Agenda — Pastille service « Coaching individuel »', type: 'text' },
      { key: 'service_label_happiness_design', label: 'Agenda — Pastille service « Programme Happiness Design »', type: 'text' },
      { key: 'service_label_sparring_partner', label: 'Agenda — Pastille service « Sparring Partner »', type: 'text' },
      { key: 'service_label_entreprises', label: 'Agenda — Pastille service « Coaching entreprises »', type: 'text' },
      { key: 'service_label_relations', label: 'Agenda — Pastille service « Coaching Relations »', type: 'text' },
      { key: 't_vous_preferez_reserver_par', label: 'Section 2 — Texte « Vous préférez réserver par email ? »', type: 'text' },
      { key: 'seo_title', label: 'Référencement Google — Titre (onglet du navigateur et résultat Google)', type: 'text' },
      { key: 'seo_description', label: 'Référencement Google — Description (l’extrait sous le titre dans Google)', type: 'textarea' },
      { key: 'seo_image', label: 'Référencement Google — Image de partage (Facebook, LinkedIn, WhatsApp…)', type: 'image' },
    ],
  },
  // 10. Contact
  'contact': {
    label: 'Contact',
    emoji: '📧',
    sections: [
      { key: 'hero_image',        label: 'Image hero',               type: 'image' },
      { key: 'hero_badge',        label: 'Badge hero',               type: 'text' },
      { key: 'page_title',        label: 'Titre de la page',         type: 'text' },
      { key: 'intro_text',        label: "Texte d'introduction",     type: 'textarea' },
      { key: 'form_name_label',   label: 'Formulaire — Label Nom',   type: 'text' },
      { key: 'form_email_label',  label: 'Formulaire — Label Email', type: 'text' },
      { key: 'form_subject_label', label: 'Formulaire — Label Sujet', type: 'text' },
      { key: 'form_message_label', label: 'Formulaire — Label Message', type: 'text' },
      { key: 'form_submit_label', label: 'Formulaire — Bouton Envoyer', type: 'text' },
      { key: 'success_title',     label: 'Message succès — Titre',   type: 'text' },
      { key: 'success_text',      label: 'Message succès — Texte',   type: 'textarea' },
      { key: 'photo', label: 'Photo — photo', type: 'image' },
      { key: 't_espace_d_echange_calme', label: 'Section 1 · Parlons de ce qui… — Texte alternatif image « Espace d’échange calme et chaleureux »', type: 'text' },
      { key: 't_votre_nom', label: 'Section 2 · Message envoyé ! — Texte indicatif « Votre nom »', type: 'text' },
      { key: 't_votre_email_com', label: 'Section 2 · Message envoyé ! — Texte indicatif « votre@email.com »', type: 'text' },
      { key: 't_type_de_demande', label: 'Section 2 · Message envoyé ! — Libellé « Type de demande »', type: 'text' },
      { key: 't_selectionnez', label: 'Section 2 · Message envoyé ! — Option « Sélectionnez... »', type: 'text' },
      { key: 't_coaching_individuel', label: 'Section 2 · Message envoyé ! — Option « Coaching individuel »', type: 'text' },
      { key: 't_coaching_accompagnement_entreprise', label: 'Section 2 · Message envoyé ! — Option « Coaching & accompagnement entreprises »', type: 'text' },
      { key: 't_accompagnement_relations', label: 'Section 2 · Message envoyé ! — Option « Accompagnement Relations »', type: 'text' },
      { key: 't_conference_formation', label: 'Section 2 · Message envoyé ! — Option « Conférence / Formation »', type: 'text' },
      { key: 't_autre_question', label: 'Section 2 · Message envoyé ! — Option « Autre question »', type: 'text' },
      { key: 't_objet_de_votre_message', label: 'Section 2 · Message envoyé ! — Texte indicatif « Objet de votre message »', type: 'text' },
      { key: 't_decrivez_votre_situation_ou', label: 'Section 2 · Message envoyé ! — Texte indicatif « Décrivez votre situation ou votre question… »', type: 'text' },
      { key: 't_monica_schneider', label: 'Section 2 · Message envoyé ! — Texte alternatif image « Monica Schneider »', type: 'text' },
      { key: 't_ms', label: 'Section 2 · Message envoyé ! — Texte « MS »', type: 'text' },
      { key: 't_monica_schneider_2', label: 'Section 2 · Message envoyé ! — Texte « Monica Schneider »', type: 'text' },
      { key: 't_executive_coach_philosophical_coun', label: 'Section 2 · Message envoyé ! — Texte « Executive Coach · Philosophical Counselling »', type: 'text' },
      { key: 't_francais_anglais_et_roumain', label: 'Section 2 · Message envoyé ! — Texte « Français, anglais et roumain »', type: 'text' },
      { key: 't_reponse_sous_48h', label: 'Section 2 · Message envoyé ! — Texte « Réponse sous 48h »', type: 'text' },
      { key: 'seo_title', label: 'Référencement Google — Titre (onglet du navigateur et résultat Google)', type: 'text' },
      { key: 'seo_description', label: 'Référencement Google — Description (l’extrait sous le titre dans Google)', type: 'textarea' },
      { key: 'seo_image', label: 'Référencement Google — Image de partage (Facebook, LinkedIn, WhatsApp…)', type: 'image' },
    ],
  },
  // 11. Fil d'Ariane (onglet dédié) — libellés des maillons et affichage général
  'fil-ariane': {
    label: 'Fil d’Ariane',
    emoji: '🔗',
    sections: [
      { key: 'bc_enabled', label: 'Affichage — Afficher le fil d’Ariane sur le site (1 = oui, 0 = non)', type: 'text' },
      { key: 'bc_home_label', label: 'Libellés — Premier maillon « Accueil »', type: 'text' },
      { key: 'bc_a_propos', label: 'Libellés — Page « Monica » (/a-propos)', type: 'text' },
      { key: 'bc_coaching', label: 'Libellés — Page « Coaching individuel » (/coaching)', type: 'text' },
      { key: 'bc_entreprises', label: 'Libellés — Page « Entreprises » (/entreprises)', type: 'text' },
      { key: 'bc_happiness_design', label: 'Libellés — Page « Happiness Design » (/happiness-design)', type: 'text' },
      { key: 'bc_relations', label: 'Libellés — Page « Relations » (/relations)', type: 'text' },
      { key: 'bc_sparring_partner', label: 'Libellés — Page « Sparring Partner » (/sparring-partner)', type: 'text' },
      { key: 'bc_booking', label: 'Libellés — Page « Réserver une séance » (/booking)', type: 'text' },
      { key: 'bc_contact', label: 'Libellés — Page « Contact » (/contact)', type: 'text' },
      { key: 'bc_blog', label: 'Libellés — Page « Ressources » (/blog)', type: 'text' },
      { key: 'bc_faq', label: 'Libellés — Page « FAQ » (/faq)', type: 'text' },
      { key: 'bc_merci', label: 'Libellés — Page « Merci » (/merci)', type: 'text' },
      { key: 'bc_mentions_legales', label: 'Libellés — Page « Mentions légales » (/mentions-legales)', type: 'text' },
      { key: 'bc_politique_confidentialite', label: 'Libellés — Page « Confidentialité » (/politique-confidentialite)', type: 'text' },
      { key: 'bc_temoignages', label: 'Libellés — Page « Témoignages » (/temoignages)', type: 'text' },
      { key: 'bc_test_attachement', label: 'Libellés — Page « Test d’attachement » (/test-attachement)', type: 'text' },
    ],
  },
  // 11. Footer
  'footer': {
    label: 'Footer',
    emoji: '🦶',
    sections: [
      { key: 'site_name',     label: 'Nom du site',                        type: 'text' },
      { key: 'tagline',       label: 'Tagline (ex: philo-coaching)',        type: 'text' },
      { key: 'description',   label: 'Description courte',                  type: 'textarea' },
      { key: 'description_2',label: 'Description longue',                  type: 'textarea' },
      { key: 'linkedin_url',  label: 'URL LinkedIn',                        type: 'text' },
      { key: 'service_1',     label: 'Service 1',                           type: 'text' },
      { key: 'service_2',     label: 'Service 2',                           type: 'text' },
      { key: 'service_3',     label: 'Service 3',                           type: 'text' },
      { key: 'service_4',     label: 'Service 4',                           type: 'text' },
      { key: 'service_5',     label: 'Service 5',                           type: 'text' },
      { key: 'copyright',     label: 'Texte copyright',                     type: 'text' },
      { key: 'photos_label', label: 'Photos — Libellé « Photos : »', type: 'text' },
      { key: 'footer_nav_title', label: 'Pied de page — Lien « Navigation »', type: 'text' },
      { key: 'footer_nav_home', label: 'Pied de page — Lien « Accueil »', type: 'text' },
      { key: 'footer_nav_coaching', label: 'Pied de page — Lien « Coaching individuel »', type: 'text' },
      { key: 'footer_nav_hd', label: 'Pied de page — Lien « Happiness Design »', type: 'text' },
      { key: 'footer_nav_sparring', label: 'Pied de page — Lien « Sparring Partner »', type: 'text' },
      { key: 'footer_nav_entreprises', label: 'Pied de page — Lien « Entreprises »', type: 'text' },
      { key: 'footer_nav_relations', label: 'Pied de page — Lien « Relations »', type: 'text' },
      { key: 'footer_nav_contact', label: 'Pied de page — Lien « Contact »', type: 'text' },
      { key: 'footer_nav_blog', label: 'Pied de page — Lien « Ressources »', type: 'text' },
      { key: 'footer_nav_faq', label: 'Pied de page — Lien « FAQ »', type: 'text' },
      { key: 'footer_services_title', label: 'Pied de page — Titre « Services »', type: 'text' },
      { key: 't_linkedin', label: 'Bas de page — Lien « LinkedIn → »', type: 'text' },
      { key: 't_unsplash', label: 'Bas de page — Lien « Unsplash »', type: 'text' },
      { key: 't_mentions_legales', label: 'Bas de page — Lien « Mentions légales »', type: 'text' },
      { key: 't_confidentialite', label: 'Bas de page — Lien « Confidentialité »', type: 'text' },
    ],
  },
  // 12. Sparring Partner
  'sparring-partner': {
    label: 'Sparring Partner',
    emoji: '🥊',
    sections: [
      { key: 'sections_layout', label: 'Structure — Ordre et affichage des sections', type: 'sections' },
      { key: 'custom_sections', label: 'Blocs personnalisés — ajouter des sections', type: 'custom-sections' },
      { key: 'hero_image', label: 'Hero — Photo de fond', type: 'image' },
      { key: 'hero_badge',          label: 'Hero — Badge',                                  type: 'text' },
      { key: 'hero_title',          label: 'Hero — Titre principal',                        type: 'text' },
      { key: 'hero_desc',           label: 'Hero — Sous-titre / description',               type: 'textarea' },
      { key: 'hero_cta_primary',    label: 'Hero — Bouton réservation',                     type: 'text' },
      { key: 'hero_cta_secondary',  label: 'Hero — Bouton question',                        type: 'text' },
      { key: 'section_badge',       label: 'Cas d\'usage — Badge',                          type: 'text' },
      { key: 'section_title',       label: 'Cas d\'usage — Titre section',                  type: 'text' },
      { key: 'sparring_use_cases', label: 'Cas d\'usage — Cartes (ajouter, retirer, réordonner)', type: 'list' },
      { key: 'why_section_badge',   label: 'Profil Monica — Badge',                        type: 'text' },
      { key: 'why_section_title',   label: 'Profil Monica — Titre',                        type: 'text' },
      { key: 'experience_items',    label: 'Expérience Monica (1 item par ligne)',          type: 'textarea' },
      { key: 'cta_title',           label: 'CTA final — Titre',                            type: 'text' },
      { key: 'cta_desc',            label: 'CTA final — Sous-titre',                       type: 'textarea' },
      { key: 'cta_primary',         label: 'CTA final — Bouton réservation',               type: 'text' },
      { key: 'cta_secondary',       label: 'CTA final — Bouton contact',                   type: 'text' },
      { key: 't_discussion_strategique', label: 'Section 1 · Un regard extérieur stratégique… — Texte alternatif image « Discussion stratégique »', type: 'text' },
      { key: 'seo_title', label: 'Référencement Google — Titre (onglet du navigateur et résultat Google)', type: 'text' },
      { key: 'seo_description', label: 'Référencement Google — Description (l’extrait sous le titre dans Google)', type: 'textarea' },
      { key: 'seo_image', label: 'Référencement Google — Image de partage (Facebook, LinkedIn, WhatsApp…)', type: 'image' },
    ],
  },
  // 13. FAQ
  'faq': {
    label: 'FAQ',
    emoji: '❓',
    sections: [
      { key: 'hero_image', label: 'Photo de fond du haut de page', type: 'image' },
      { key: 'page_title',    label: 'Titre de la page',                      type: 'text' },
      { key: 'page_subtitle',label: 'Sous-titre de la page',                  type: 'textarea' },
      { key: 'cta_title',    label: 'Section CTA — Titre',                    type: 'text' },
      { key: 'cta_text',     label: 'Section CTA — Texte',                    type: 'textarea' },
      { key: 't_espace_calme_pour_reflechir', label: 'Section 1 · Ce qu’on nous demande… — Texte alternatif image « Espace calme pour réfléchir »', type: 'text' },
      { key: 't_faq', label: 'Section 1 · Ce qu’on nous demande… — Texte « FAQ »', type: 'text' },
      { key: 't_ecrire_a_monica', label: 'Section 2 · Une autre question ? — Lien « Écrire à Monica → »', type: 'text' },
      { key: 't_reserver_une_seance', label: 'Section 2 · Une autre question ? — Lien « Réserver une séance »', type: 'text' },
      { key: 'faq_questions', label: 'Questions — Liste modifiable (ajouter, retirer, réordonner)', type: 'list' },
      { key: 'seo_title', label: 'Référencement Google — Titre (onglet du navigateur et résultat Google)', type: 'text' },
      { key: 'seo_description', label: 'Référencement Google — Description (l’extrait sous le titre dans Google)', type: 'textarea' },
      { key: 'seo_image', label: 'Référencement Google — Image de partage (Facebook, LinkedIn, WhatsApp…)', type: 'image' },
    ],
  },
  // 13. Blog
  'blog': {
    label: 'Blog',
    emoji: '📝',
    sections: [
      { key: 'article_related_badge', label: 'Article — Petit titre du bloc « articles liés »', type: 'text' },
      { key: 'article_related_title', label: 'Article — Titre du bloc « articles liés »', type: 'text' },
      { key: 'article_related_text', label: 'Article — Texte du bloc « articles liés »', type: 'textarea' },
      { key: 'article_back', label: 'Article — Lien « Retour » (en haut et en bas de l’article)', type: 'text' },
      { key: 'article_default_description', label: 'Article — Description Google par défaut (si l’article n’a ni extrait ni description SEO)', type: 'textarea' },
      { key: 'article_read_time', label: 'Article — Mention « min de lecture »', type: 'text' },
      { key: 'article_opening', label: 'Article — Titre de l’encadré d’introduction', type: 'text' },
      { key: 'article_unfinished', label: 'Article — Message quand le texte est vide', type: 'textarea' },
      { key: 'article_detail', label: 'Article — Titre de l’encadré de notes', type: 'text' },
      { key: 'article_tags', label: 'Article — Titre « Tags »', type: 'text' },
      { key: 'cat_all_label', label: 'Liste — Filtre « tous les articles »', type: 'text' },
      { key: 'cat_1_label', label: 'Liste — Catégorie « Carnets Voyage » : libellé', type: 'text' },
      { key: 'cat_2_label', label: 'Liste — Catégorie « Découvertes Locales » : libellé', type: 'text' },
      { key: 'cat_3_label', label: 'Liste — Catégorie « Guides Pratiques » : libellé', type: 'text' },
      { key: 'cat_1_eyebrow', label: 'Liste — Petit titre de la section « Carnets »', type: 'text' },
      { key: 'cat_2_eyebrow', label: 'Liste — Petit titre de la section « Pépites locales »', type: 'text' },
      { key: 'cat_3_eyebrow', label: 'Liste — Petit titre de la section « Guides »', type: 'text' },
      { key: 'article_singular', label: 'Liste — Mot « article » (singulier)', type: 'text' },
      { key: 'article_plural', label: 'Liste — Mot « articles » (pluriel)', type: 'text' },
      { key: 'search_for', label: 'Liste — Mot « pour » (3 articles pour « mot recherché »)', type: 'text' },
      { key: 'read_more', label: 'Liste — Lien en bas d’une carte d’article', type: 'text' },
      { key: 'hero_image', label: 'Photo de fond du haut de page', type: 'image' },
      { key: 'hero_badge',    label: 'Badge hero',                    type: 'text' },
      { key: 'hero_title',    label: 'Titre principal',               type: 'textarea' },
      { key: 'hero_subtitle', label: 'Sous-titre',                    type: 'textarea' },
      { key: 'featured_label',label: 'Label "À lire d\'abord"',       type: 'text' },
      { key: 'featured_title',label: 'Titre "À lire d\'abord"',       type: 'text' },
      { key: 'empty_title',   label: 'Recherche vide — Titre',        type: 'text' },
      { key: 'empty_text',    label: 'Recherche vide — Texte',        type: 'textarea' },
      { key: 'empty_action',  label: 'Recherche vide — Bouton',       type: 'text' },
      { key: 'carnets_title', label: 'Section Carnets — Titre',       type: 'text' },
      { key: 'carnets_desc',  label: 'Section Carnets — Description', type: 'textarea' },
      { key: 'pepites_title', label: 'Section Pépites — Titre',       type: 'text' },
      { key: 'pepites_desc',  label: 'Section Pépites — Description', type: 'textarea' },
      { key: 'guides_title',  label: 'Section Guides — Titre',        type: 'text' },
      { key: 'guides_desc',   label: 'Section Guides — Description',  type: 'textarea' },
      { key: 't_ecriture_et_reflexion', label: 'Section 1 — Texte alternatif image « Écriture et réflexion »', type: 'text' },
      { key: 't_lire_le_carnet', label: 'Section 2 — Texte « Lire le carnet → »', type: 'text' },
      { key: 't_rechercher_un_carnet_un', label: 'Section 3 — Texte indicatif « Rechercher un carnet, un lieu, un détail »', type: 'text' },
      { key: 't_effacer', label: 'Section 3 — Bouton « Effacer »', type: 'text' },
      { key: 'seo_title', label: 'Référencement Google — Titre (onglet du navigateur et résultat Google)', type: 'text' },
      { key: 'seo_description', label: 'Référencement Google — Description (l’extrait sous le titre dans Google)', type: 'textarea' },
      { key: 'seo_image', label: 'Référencement Google — Image de partage (Facebook, LinkedIn, WhatsApp…)', type: 'image' },
    ],
  },
  'mentions-legales': {
    label: 'Mentions légales',
    emoji: '⚖️',
    sections: [
      { key: 'contact_intro', label: 'Textes de la page — Phrase d’introduction de l’adresse e-mail (en bas de page)', type: 'textarea' },
      { key: 't_cadre_legal', label: 'Textes de la page — Texte « Cadre légal »', type: 'text' },
      { key: 't_mentions_legales', label: 'Textes de la page — Titre principal « Mentions légales »', type: 'text' },
      { key: 't_derniere_mise_a_jour', label: 'Textes de la page — Texte « Dernière mise à jour : juin 2026 »', type: 'text' },
      { key: 't_identite_de_l_editeur', label: 'Section 1 · Identité de l’éditeur — Titre de section « Identité de l’éditeur »', type: 'text' },
      { key: 't_nom_commercial_happy_humans', label: 'Section 1 · Identité de l’éditeur — Texte « **Nom commercial :** Happy Humans » — format : **gras** *italique* [lien](adresse)', type: 'textarea' },
      { key: 't_responsable_monica_schneider', label: 'Section 1 · Identité de l’éditeur — Texte « **Responsable :** Monica Schneider » — format : **gras** *italique* [lien](adresse)', type: 'textarea' },
      { key: 't_activite_philo_coaching_executive', label: 'Section 1 · Identité de l’éditeur — Texte « **Activité :** Philo-coaching, executive coaching, philosophical counselling, sparring… » — format : **gras** *italique* [lien](adresse)', type: 'textarea' },
      { key: 't_email', label: 'Section 1 · Identité de l’éditeur — Texte « Email : »', type: 'text' },
      { key: 't_happyhumans_coaching_gmail_com', label: 'Section 1 · Identité de l’éditeur — Lien « happyhumans.coaching@gmail.com »', type: 'text' },
      { key: 't_site', label: 'Section 1 · Identité de l’éditeur — Texte « Site : »', type: 'text' },
      { key: 't_happyhumans_vercel_app', label: 'Section 1 · Identité de l’éditeur — Lien « happyhumans.vercel.app »', type: 'text' },
      { key: 't_hebergeur', label: 'Section 2 · Hébergeur — Titre de section « Hébergeur »', type: 'text' },
      { key: 't_societe_vercel_inc', label: 'Section 2 · Hébergeur — Texte « **Société :** Vercel Inc. » — format : **gras** *italique* [lien](adresse)', type: 'textarea' },
      { key: 't_adresse_340_pine_street', label: 'Section 2 · Hébergeur — Texte « **Adresse :** 340 Pine Street Suite 701, San… » — format : **gras** *italique* [lien](adresse)', type: 'textarea' },
      { key: 't_site_2', label: 'Section 2 · Hébergeur — Texte « Site : »', type: 'text' },
      { key: 't_vercel_com', label: 'Section 2 · Hébergeur — Lien « vercel.com »', type: 'text' },
      { key: 't_base_de_donnees', label: 'Section 3 · Base de données — Titre de section « Base de données »', type: 'text' },
      { key: 't_service_supabase_supabase_inc', label: 'Section 3 · Base de données — Texte « **Service :** Supabase (Supabase Inc.) » — format : **gras** *italique* [lien](adresse)', type: 'textarea' },
      { key: 't_site_3', label: 'Section 3 · Base de données — Texte « Site : »', type: 'text' },
      { key: 't_supabase_com', label: 'Section 3 · Base de données — Lien « supabase.com »', type: 'text' },
      { key: 't_propriete_intellectuelle', label: 'Section 4 · Propriété intellectuelle — Titre de section « Propriété intellectuelle »', type: 'text' },
      { key: 't_l_ensemble_des_contenus', label: 'Section 4 · Propriété intellectuelle — Texte « L’ensemble des contenus présents sur ce site (textes,… »', type: 'textarea' },
      { key: 't_credits_photo_happy_humans', label: 'Section 4 · Propriété intellectuelle — Texte « Crédits photo : Happy Humans et banques d’images… »', type: 'text' },
      { key: 't_limitation_de_responsabilite', label: 'Section 5 · Limitation de responsabilité — Titre de section « Limitation de responsabilité »', type: 'text' },
      { key: 't_happy_humans_s_efforce', label: 'Section 5 · Limitation de responsabilité — Texte « Happy Humans s’efforce de fournir des informations fiables… »', type: 'textarea' },
      { key: 't_contact', label: 'Section 6 · Contact — Titre de section « Contact »', type: 'text' },
      { key: 't_happyhumans_coaching_gmail_com_2', label: 'Section 6 · Contact — Lien « happyhumans.coaching@gmail.com »', type: 'text' },
      { key: 't_2026_happy_humans_monica', label: 'Section 7 — Texte « © 2026 Happy Humans — Monica Schneider. Tous… »', type: 'text' },
      { key: 'seo_title', label: 'Référencement Google — Titre (onglet du navigateur et résultat Google)', type: 'text' },
      { key: 'seo_description', label: 'Référencement Google — Description (l’extrait sous le titre dans Google)', type: 'textarea' },
      { key: 'seo_image', label: 'Référencement Google — Image de partage (Facebook, LinkedIn, WhatsApp…)', type: 'image' },
    ],
  },
  'politique-confidentialite': {
    label: 'Politique de confidentialité',
    emoji: '🔒',
    sections: [
      { key: 'email_label', label: 'Textes de la page — Mot « Email : »', type: 'text' },
      { key: 'rights_intro', label: 'Textes de la page — Phrase d’introduction de l’adresse e-mail (en bas de page)', type: 'textarea' },
      { key: 't_donnees_personnelles', label: 'Textes de la page — Texte « Données personnelles »', type: 'text' },
      { key: 't_politique_de_confidentialite', label: 'Textes de la page — Titre principal « Politique de confidentialité »', type: 'text' },
      { key: 't_derniere_mise_a_jour', label: 'Textes de la page — Texte « Dernière mise à jour : juin 2026 »', type: 'text' },
      { key: 't_responsable_du_traitement', label: 'Section 1 · Responsable du traitement — Titre de section « Responsable du traitement »', type: 'text' },
      { key: 't_happy_humans_monica_schneider', label: 'Section 1 · Responsable du traitement — Texte « Happy Humans — Monica Schneider »', type: 'text' },
      { key: 't_happyhumans_coaching_gmail_com', label: 'Section 1 · Responsable du traitement — Lien « happyhumans.coaching@gmail.com »', type: 'text' },
      { key: 't_donnees_collectees', label: 'Section 2 · Données collectées — Titre de section « Données collectées »', type: 'text' },
      { key: 't_nous_collectons_uniquement_les', label: 'Section 2 · Données collectées — Texte « Nous collectons uniquement les données que vous nous… »', type: 'text' },
      { key: 't_nom_et_adresse_email', label: 'Section 2 · Données collectées — Élément de liste « Nom et adresse email (formulaire de contact) »', type: 'text' },
      { key: 't_nom_email_type_de', label: 'Section 2 · Données collectées — Élément de liste « Nom, email, type de séance, créneau choisi (formulaire… »', type: 'text' },
      { key: 't_resultats_du_test_de', label: 'Section 2 · Données collectées — Élément de liste « Résultats du test de style d’attachement (anonymes) »', type: 'text' },
      { key: 't_finalites_du_traitement', label: 'Section 3 · Finalités du traitement — Titre de section « Finalités du traitement »', type: 'text' },
      { key: 't_repondre_a_vos_demandes', label: 'Section 3 · Finalités du traitement — Élément de liste « Répondre à vos demandes de contact ou de… »', type: 'text' },
      { key: 't_organiser_et_assurer_le', label: 'Section 3 · Finalités du traitement — Élément de liste « Organiser et assurer le suivi des séances de… »', type: 'text' },
      { key: 't_respecter_les_obligations_legales', label: 'Section 3 · Finalités du traitement — Élément de liste « Respecter les obligations légales applicables »', type: 'text' },
      { key: 't_duree_de_conservation', label: 'Section 4 · Durée de conservation — Titre de section « Durée de conservation »', type: 'text' },
      { key: 't_2_ans_maximum_pour', label: 'Section 4 · Durée de conservation — Texte « 2 ans maximum pour les données de contact… »', type: 'text' },
      { key: 't_les_resultats_anonymes_du', label: 'Section 4 · Durée de conservation — Texte « Les résultats anonymes du test d’attachement ne sont… »', type: 'text' },
      { key: 't_hebergement_et_sous_traitants', label: 'Section 5 · Hébergement et sous-traitants — Titre de section « Hébergement et sous-traitants »', type: 'text' },
      { key: 't_les_donnees_peuvent_etre', label: 'Section 5 · Hébergement et sous-traitants — Texte « Les données peuvent être traitées par des prestataires… » — format : **gras** *italique* [lien](adresse)', type: 'textarea' },
      { key: 't_cookies', label: 'Section 6 · Cookies — Titre de section « Cookies »', type: 'text' },
      { key: 't_pas_de_cookies_tiers', label: 'Section 6 · Cookies — Texte « Pas de cookies tiers. »', type: 'text' },
      { key: 't_pas_de_publicite', label: 'Section 6 · Cookies — Texte « Pas de publicité. »', type: 'text' },
      { key: 't_pas_de_partage_avec', label: 'Section 6 · Cookies — Texte « Pas de partage avec des tiers. »', type: 'text' },
      { key: 't_les_cookies_strictement_necessaire', label: 'Section 6 · Cookies — Texte « Les cookies strictement nécessaires au fonctionnement du site… »', type: 'text' },
      { key: 't_vos_droits_rgpd', label: 'Section 7 · Vos droits (RGPD) — Titre de section « Vos droits (RGPD) »', type: 'text' },
      { key: 't_conformement_au_rgpd_vous', label: 'Section 7 · Vos droits (RGPD) — Texte « Conformément au RGPD, vous pouvez demander : »', type: 'text' },
      { key: 't_l_acces_a_vos', label: 'Section 7 · Vos droits (RGPD) — Élément de liste « L’accès à vos données personnelles »', type: 'text' },
      { key: 't_la_rectification_de_donnees', label: 'Section 7 · Vos droits (RGPD) — Élément de liste « La rectification de données inexactes »', type: 'text' },
      { key: 't_l_effacement_de_vos', label: 'Section 7 · Vos droits (RGPD) — Élément de liste « L’effacement de vos données »', type: 'text' },
      { key: 't_la_limitation_ou_l', label: 'Section 7 · Vos droits (RGPD) — Élément de liste « La limitation ou l’opposition à certains traitements »', type: 'text' },
      { key: 't_happyhumans_coaching_gmail_com_2', label: 'Section 7 · Vos droits (RGPD) — Lien « happyhumans.coaching@gmail.com »', type: 'text' },
      { key: 't_2026_happy_humans_monica', label: 'Section 8 — Texte « © 2026 Happy Humans — Monica Schneider. Tous… »', type: 'text' },
      { key: 'seo_title', label: 'Référencement Google — Titre (onglet du navigateur et résultat Google)', type: 'text' },
      { key: 'seo_description', label: 'Référencement Google — Description (l’extrait sous le titre dans Google)', type: 'textarea' },
      { key: 'seo_image', label: 'Référencement Google — Image de partage (Facebook, LinkedIn, WhatsApp…)', type: 'image' },
    ],
  },
  'site': {
    label: 'Textes communs (cookies, newsletter, partage, 404…)',
    emoji: '🧩',
    sections: [
      { key: 'cookie_title', label: 'Bandeau cookies — Titre', type: 'text' },
      { key: 'cookie_text', label: 'Bandeau cookies — Message', type: 'textarea' },
      { key: 'cookie_details', label: 'Bandeau cookies — Mot « Détails : »', type: 'text' },
      { key: 'cookie_privacy_link', label: 'Bandeau cookies — Lien « Politique de confidentialité »', type: 'text' },
      { key: 'cookie_and', label: 'Bandeau cookies — Mot « et »', type: 'text' },
      { key: 'cookie_legal_link', label: 'Bandeau cookies — Lien « Mentions légales »', type: 'text' },
      { key: 'cookie_refuse', label: 'Bandeau cookies — Bouton « Refuser »', type: 'text' },
      { key: 'cookie_accept', label: 'Bandeau cookies — Bouton « Accepter »', type: 'text' },
      { key: 'newsletter_badge', label: 'Newsletter — Petit titre (au-dessus du titre)', type: 'text' },
      { key: 'newsletter_title', label: 'Newsletter — Titre (grand encadré)', type: 'text' },
      { key: 'newsletter_title_short', label: 'Newsletter — Titre (encadré dans un article)', type: 'text' },
      { key: 'newsletter_text', label: 'Newsletter — Texte', type: 'textarea' },
      { key: 'newsletter_placeholder', label: 'Newsletter — Exemple dans le champ e-mail', type: 'text' },
      { key: 'newsletter_button', label: 'Newsletter — Bouton « Je m’abonne »', type: 'text' },
      { key: 'newsletter_button_loading', label: 'Newsletter — Bouton pendant l’envoi', type: 'text' },
      { key: 'newsletter_success', label: 'Newsletter — Message de confirmation', type: 'text' },
      { key: 'newsletter_success_hint', label: 'Newsletter — Message sous la confirmation', type: 'text' },
      { key: 'newsletter_error_invalid', label: 'Newsletter — Erreur « adresse invalide »', type: 'text' },
      { key: 'newsletter_error_generic', label: 'Newsletter — Erreur générale', type: 'text' },
      { key: 'newsletter_error_network', label: 'Newsletter — Erreur de connexion', type: 'text' },
      { key: 'newsletter_footnote', label: 'Newsletter — Mention sous le formulaire', type: 'text' },
      { key: 'share_label', label: 'Partage — Mot « Partager »', type: 'text' },
      { key: 'share_on', label: 'Partage — Début de l’aide vocale « Partager sur … »', type: 'text' },
      { key: 'share_pinterest', label: 'Partage — Bouton Pinterest', type: 'text' },
      { key: 'share_whatsapp', label: 'Partage — Bouton WhatsApp', type: 'text' },
      { key: 'share_copy', label: 'Partage — Bouton « Copier le lien »', type: 'text' },
      { key: 'share_copied', label: 'Partage — Message après la copie', type: 'text' },
      { key: 'share_copy_aria', label: 'Partage — Aide vocale du bouton « Copier le lien »', type: 'text' },
      { key: 'notfound_badge', label: 'Page introuvable — Petit titre', type: 'text' },
      { key: 'notfound_title', label: 'Page introuvable — Titre', type: 'text' },
      { key: 'notfound_text', label: 'Page introuvable — Texte', type: 'textarea' },
      { key: 'notfound_home', label: 'Page introuvable — Bouton « Retour à l’accueil »', type: 'text' },
      { key: 'notfound_contact', label: 'Page introuvable — Bouton « Prendre contact »', type: 'text' },
      { key: 'notfound_link_coaching', label: 'Page introuvable — Lien « Coaching »', type: 'text' },
      { key: 'notfound_link_relations', label: 'Page introuvable — Lien « Relations »', type: 'text' },
      { key: 'notfound_link_happiness', label: 'Page introuvable — Lien « Happiness Design »', type: 'text' },
      { key: 'notfound_link_booking', label: 'Page introuvable — Lien « Réserver une séance »', type: 'text' },
      { key: 'maintenance_title', label: 'Maintenance — Titre', type: 'text' },
      { key: 'maintenance_text', label: 'Maintenance — Texte (ligne 1)', type: 'textarea' },
      { key: 'maintenance_text2', label: 'Maintenance — Texte (ligne 2)', type: 'text' },
      { key: 'maintenance_help', label: 'Maintenance — Phrase avant l’adresse e-mail', type: 'text' },
      { key: 'maintenance_email', label: 'Maintenance — Adresse e-mail affichée', type: 'text' },
    ],
  },
  'test-attachement': {
    label: 'Test d’attachement',
    emoji: '🧪',
    sections: [
      { key: 'back_link', label: 'Page — Lien de retour (en haut)', type: 'text' },
      { key: 'page_title_sr', label: 'Page — Titre principal (lu par les moteurs de recherche, invisible à l’écran)', type: 'text' },
      { key: 'intro_title', label: 'Introduction — Titre', type: 'text' },
      { key: 'intro_text', label: 'Introduction — Texte', type: 'textarea' },
      { key: 'pill_time', label: 'Introduction — Étiquette « durée »', type: 'text' },
      { key: 'pill_questions', label: 'Introduction — Étiquette « nombre de questions »', type: 'text' },
      { key: 'pill_results', label: 'Introduction — Étiquette « résultats »', type: 'text' },
      { key: 'intro_note', label: 'Introduction — Remarque', type: 'textarea' },
      { key: 'start_button', label: 'Introduction — Bouton « commencer »', type: 'text' },
      { key: 'question_word', label: 'Questions — Mot « Question » (Question 3 sur 16)', type: 'text' },
      { key: 'question_of', label: 'Questions — Mot « sur » (Question 3 sur 16)', type: 'text' },
      { key: 'scale_legend', label: 'Questions — Légende de l’échelle de réponse', type: 'text' },
      { key: 'prev_button', label: 'Questions — Bouton « précédent »', type: 'text' },
      { key: 'next_button', label: 'Questions — Bouton « suivant »', type: 'text' },
      { key: 'finish_button', label: 'Questions — Bouton de la dernière question', type: 'text' },
      { key: 'question_1', label: 'Questions — Question 1 (anxiété)', type: 'textarea' },
      { key: 'question_2', label: 'Questions — Question 2 (anxiété)', type: 'textarea' },
      { key: 'question_3', label: 'Questions — Question 3 (anxiété)', type: 'textarea' },
      { key: 'question_4', label: 'Questions — Question 4 (anxiété)', type: 'textarea' },
      { key: 'question_5', label: 'Questions — Question 5 (anxiété)', type: 'textarea' },
      { key: 'question_6', label: 'Questions — Question 6 (anxiété)', type: 'textarea' },
      { key: 'question_7', label: 'Questions — Question 7 (anxiété)', type: 'textarea' },
      { key: 'question_8', label: 'Questions — Question 8 (anxiété)', type: 'textarea' },
      { key: 'question_9', label: 'Questions — Question 9 (évitement)', type: 'textarea' },
      { key: 'question_10', label: 'Questions — Question 10 (évitement)', type: 'textarea' },
      { key: 'question_11', label: 'Questions — Question 11 (évitement)', type: 'textarea' },
      { key: 'question_12', label: 'Questions — Question 12 (évitement)', type: 'textarea' },
      { key: 'question_13', label: 'Questions — Question 13 (évitement)', type: 'textarea' },
      { key: 'question_14', label: 'Questions — Question 14 (évitement)', type: 'textarea' },
      { key: 'question_15', label: 'Questions — Question 15 (évitement)', type: 'textarea' },
      { key: 'question_16', label: 'Questions — Question 16 (évitement)', type: 'textarea' },
      { key: 'scores_title', label: 'Résultats — Titre « scores »', type: 'text' },
      { key: 'score_anxiety_label', label: 'Résultats — Barre « anxiété »', type: 'text' },
      { key: 'score_avoidance_label', label: 'Résultats — Barre « évitement »', type: 'text' },
      { key: 'strengths_title', label: 'Résultats — Titre « forces »', type: 'text' },
      { key: 'challenges_title', label: 'Résultats — Titre « vigilance »', type: 'text' },
      { key: 'growth_title', label: 'Résultats — Titre « croissance »', type: 'text' },
      { key: 'note_label', label: 'Résultats — Mot d’introduction de l’avertissement', type: 'text' },
      { key: 'disclaimer', label: 'Résultats — Avertissement (outil de découverte, pas un diagnostic)', type: 'textarea' },
      { key: 'cta_title', label: 'Résultats — Encadré de réservation : titre', type: 'text' },
      { key: 'cta_text_before', label: 'Résultats — Encadré de réservation : texte (début)', type: 'text' },
      { key: 'cta_text_strong', label: 'Résultats — Encadré de réservation : texte (partie en gras)', type: 'text' },
      { key: 'cta_text_after', label: 'Résultats — Encadré de réservation : texte (fin)', type: 'text' },
      { key: 'cta_button', label: 'Résultats — Encadré de réservation : bouton', type: 'text' },
      { key: 'restart_button', label: 'Résultats — Bouton « recommencer »', type: 'text' },
      { key: 'likert_1', label: 'Questions — Libellé de réponse 1 sur 5', type: 'text' },
      { key: 'likert_2', label: 'Questions — Libellé de réponse 2 sur 5', type: 'text' },
      { key: 'likert_3', label: 'Questions — Libellé de réponse 3 sur 5', type: 'text' },
      { key: 'likert_4', label: 'Questions — Libellé de réponse 4 sur 5', type: 'text' },
      { key: 'likert_5', label: 'Questions — Libellé de réponse 5 sur 5', type: 'text' },
      { key: 'copy_intro', label: 'Résultats — Texte copié : début de phrase', type: 'text' },
      { key: 'copy_anxiety', label: 'Résultats — Texte copié : mot « Anxiété »', type: 'text' },
      { key: 'copy_avoidance', label: 'Résultats — Texte copié : mot « Évitement »', type: 'text' },
      { key: 'copy_button', label: 'Résultats — Bouton « copier »', type: 'text' },
      { key: 'secure_title', label: 'Profil sécure — Titre', type: 'text' },
      { key: 'secure_summary', label: 'Profil sécure — Description', type: 'textarea' },
      { key: 'secure_strengths', label: 'Profil sécure — Forces (une par ligne)', type: 'textarea' },
      { key: 'secure_challenges', label: 'Profil sécure — Points de vigilance (un par ligne)', type: 'textarea' },
      { key: 'secure_growth', label: 'Profil sécure — Pistes de croissance (une par ligne)', type: 'textarea' },
      { key: 'anxious_title', label: 'Profil anxieux — Titre', type: 'text' },
      { key: 'anxious_summary', label: 'Profil anxieux — Description', type: 'textarea' },
      { key: 'anxious_strengths', label: 'Profil anxieux — Forces (une par ligne)', type: 'textarea' },
      { key: 'anxious_challenges', label: 'Profil anxieux — Points de vigilance (un par ligne)', type: 'textarea' },
      { key: 'anxious_growth', label: 'Profil anxieux — Pistes de croissance (une par ligne)', type: 'textarea' },
      { key: 'avoidant_title', label: 'Profil évitant — Titre', type: 'text' },
      { key: 'avoidant_summary', label: 'Profil évitant — Description', type: 'textarea' },
      { key: 'avoidant_strengths', label: 'Profil évitant — Forces (une par ligne)', type: 'textarea' },
      { key: 'avoidant_challenges', label: 'Profil évitant — Points de vigilance (un par ligne)', type: 'textarea' },
      { key: 'avoidant_growth', label: 'Profil évitant — Pistes de croissance (une par ligne)', type: 'textarea' },
      { key: 'disorganized_title', label: 'Profil craintif-évitant — Titre', type: 'text' },
      { key: 'disorganized_summary', label: 'Profil craintif-évitant — Description', type: 'textarea' },
      { key: 'disorganized_strengths', label: 'Profil craintif-évitant — Forces (une par ligne)', type: 'textarea' },
      { key: 'disorganized_challenges', label: 'Profil craintif-évitant — Points de vigilance (un par ligne)', type: 'textarea' },
      { key: 'disorganized_growth', label: 'Profil craintif-évitant — Pistes de croissance (une par ligne)', type: 'textarea' },
      { key: 'seo_title', label: 'Référencement Google — Titre (onglet du navigateur et résultat Google)', type: 'text' },
      { key: 'seo_description', label: 'Référencement Google — Description (l’extrait sous le titre dans Google)', type: 'textarea' },
      { key: 'seo_image', label: 'Référencement Google — Image de partage (Facebook, LinkedIn, WhatsApp…)', type: 'image' },
    ],
  },
  'compte': {
    label: 'Espace client',
    emoji: '🔐',
    sections: [
      { key: 'compte_badge', label: 'Bandeau « Espace client » (haut des 3 pages)', type: 'text' },
      { key: 'login_title', label: 'Connexion — Titre', type: 'text' },
      { key: 'login_subtitle', label: 'Connexion — Sous-titre', type: 'textarea' },
      { key: 'login_email_label', label: 'Formulaire — Label du champ email', type: 'text' },
      { key: 'login_email_placeholder', label: 'Formulaire — Exemple dans le champ email', type: 'text' },
      { key: 'login_password_label', label: 'Formulaire — Label du champ mot de passe', type: 'text' },
      { key: 'login_password_placeholder', label: 'Connexion — Exemple dans le champ mot de passe', type: 'text' },
      { key: 'login_submit', label: 'Connexion — Bouton', type: 'text' },
      { key: 'login_submitting', label: 'Connexion — Bouton pendant la connexion', type: 'text' },
      { key: 'login_no_account', label: 'Connexion — Phrase « Pas encore de compte ? »', type: 'text' },
      { key: 'login_create_link', label: 'Connexion — Lien vers l’inscription', type: 'text' },
      { key: 'login_error_unavailable', label: 'Connexion — Message si Supabase manque', type: 'textarea' },
      { key: 'login_not_configured', label: 'Encart « Supabase non configuré » (connexion et inscription)', type: 'textarea' },
      { key: 'register_title', label: 'Inscription — Titre', type: 'text' },
      { key: 'register_subtitle', label: 'Inscription — Sous-titre', type: 'textarea' },
      { key: 'register_password_placeholder', label: 'Inscription — Exemple dans le champ mot de passe', type: 'text' },
      { key: 'register_confirm_label', label: 'Inscription — Label « Confirmer le mot de passe »', type: 'text' },
      { key: 'register_confirm_placeholder', label: 'Inscription — Exemple dans le champ confirmation', type: 'text' },
      { key: 'register_submit', label: 'Inscription — Bouton', type: 'text' },
      { key: 'register_submitting', label: 'Inscription — Bouton pendant la création', type: 'text' },
      { key: 'register_success', label: 'Inscription — Message de succès', type: 'textarea' },
      { key: 'register_error_unavailable', label: 'Inscription — Message si Supabase manque', type: 'textarea' },
      { key: 'register_error_short_password', label: 'Inscription — Erreur mot de passe trop court', type: 'textarea' },
      { key: 'register_error_mismatch', label: 'Inscription — Erreur mots de passe différents', type: 'textarea' },
      { key: 'register_have_account', label: 'Inscription — Phrase « Déjà inscrit ? »', type: 'text' },
      { key: 'register_login_link', label: 'Inscription — Lien vers la connexion', type: 'text' },
      { key: 'dash_welcome', label: 'Espace client — Titre « Bienvenue » (le prénom est ajouté automatiquement)', type: 'text' },
      { key: 'dash_subtitle', label: 'Espace client — Sous-titre', type: 'textarea' },
      { key: 'dash_signout', label: 'Espace client — Bouton déconnexion', type: 'text' },
      { key: 'dash_resources_title', label: 'Espace client — Titre « Tes ressources »', type: 'text' },
      { key: 'dash_test_title', label: 'Espace client — Carte test d’attachement : titre', type: 'text' },
      { key: 'dash_test_text', label: 'Espace client — Carte test d’attachement : texte', type: 'textarea' },
      { key: 'dash_test_cta', label: 'Espace client — Carte test d’attachement : lien', type: 'text' },
      { key: 'dash_relations_title', label: 'Espace client — Carte Relations : titre', type: 'text' },
      { key: 'dash_relations_text', label: 'Espace client — Carte Relations : texte', type: 'textarea' },
      { key: 'dash_relations_cta', label: 'Espace client — Carte Relations : lien', type: 'text' },
      { key: 'dash_next_title', label: 'Espace client — Bloc « Continuer ton parcours » : titre', type: 'text' },
      { key: 'dash_next_text', label: 'Espace client — Bloc « Continuer ton parcours » : texte', type: 'textarea' },
      { key: 'dash_contact_cta', label: 'Espace client — Bouton « Contacter Monica »', type: 'text' },
      { key: 'dash_coaching_cta', label: 'Espace client — Bouton « Découvrir le coaching »', type: 'text' },
      { key: 'dash_help_text', label: 'Espace client — Phrase avant l’adresse email', type: 'text' },
      { key: 'dash_email', label: 'Espace client — Adresse email de contact', type: 'text' },
    ],
  },
  'merci': {
    label: 'Page « Merci »',
    emoji: '🙏',
    sections: [
      { key: 't_message_recu', label: 'Textes de la page — Texte « Message reçu »', type: 'text' },
      { key: 't_merci_pour_votre_message', label: 'Textes de la page — Titre principal « Merci pour votre message. »', type: 'text' },
      { key: 't_monica_vous_repondra_personnelleme', label: 'Textes de la page — Texte « Monica vous répondra personnellement **sous 48h** à l’adresse… » — format : **gras** *italique* [lien](adresse)', type: 'textarea' },
      { key: 't_en_attendant_vous_pouvez', label: 'Textes de la page — Texte « En attendant, vous pouvez explorer les ressources sur… »', type: 'text' },
      { key: 't_explorer_les_relations', label: 'Textes de la page — Lien « Explorer les relations »', type: 'text' },
      { key: 't_reserver_une_seance', label: 'Textes de la page — Lien « Réserver une séance »', type: 'text' },
      { key: 't_pas_de_reponse_recue', label: 'Textes de la page — Texte « Pas de réponse reçue ? »', type: 'text' },
      { key: 't_verifiez_votre_dossier_spam', label: 'Textes de la page — Texte « Vérifiez votre dossier spam ou écrivez directement à… » — format : **gras** *italique* [lien](adresse)', type: 'textarea' },
    ],
  },
};

// Réglages déjà gérés par le panneau « Logo » (aperçu, curseurs, boutons) : non répétés dans la liste générique
const BRANDING_PANEL_KEYS = ['logo_url', 'logo_size', 'logo_shape', 'logo_position', 'logo_footer_size'];

const SETTINGS_GROUPS: Record<string, { label: string; emoji: string }> = {
  theme:      { label: 'Thème & Couleurs',  emoji: '🎨' },
  branding:   { label: 'Logo & Identité',   emoji: '🖼' },
  general:    { label: 'Général',           emoji: '🌍' },
  booking:    { label: 'Réservation (Calendly)', emoji: '📅' },
  social:     { label: 'Réseaux sociaux',   emoji: '📱' },
  emails:     { label: 'Emails automatiques', emoji: '📧' },
  seo:        { label: 'SEO global',        emoji: '🔍' },
  geo:        { label: 'Géo & Business',    emoji: '📍' },
  visibility: { label: 'Visibilité pages',  emoji: '👁️' },
  footer:     { label: 'Footer',            emoji: '📄' },
};

// ─── Maintenance Mode Toggle ──────────────────────────────────
function MaintenanceModeToggle() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/cms/maintenance')
      .then(r => r.json())
      .then(d => setEnabled(Boolean(d.enabled)))
      .catch(() => setEnabled(false))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/cms/maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      if (res.ok) {
        setEnabled(!enabled);
      }
    } catch {
      // silent fail
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div style={{ marginBottom: '2rem', padding: '1.25rem', background: enabled ? '#fff7ed' : '#f9fafb', border: `2px solid ${enabled ? '#f97316' : '#e5e7eb'}`, borderRadius: '.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: enabled ? '#c2410c' : '#374151', margin: '0 0 .35rem' }}>
            ⚠️ Mode maintenance
          </h3>
          <p style={{ fontSize: '.82rem', color: '#6b7280', margin: 0 }}>
            Affiche une page &quot;en maintenance&quot; à tous les visiteurs (sauf Monica connectée au CMS)
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={saving}
          style={{
            position: 'relative',
            width: 56,
            height: 30,
            borderRadius: 9999,
            border: 'none',
            cursor: 'pointer',
            background: enabled ? '#f97316' : '#d1d5db',
            transition: 'background .2s',
            flexShrink: 0,
            opacity: saving ? .7 : 1,
          }}
          title={enabled ? 'Désactiver le mode maintenance' : 'Activer le mode maintenance'}
        >
          <div style={{
            position: 'absolute',
            top: 3,
            left: enabled ? 29 : 3,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,.2)',
            transition: 'left .2s',
          }} />
        </button>
      </div>
      {enabled && (
        <div style={{ marginTop: '.75rem', padding: '.5rem .75rem', background: '#fff', borderRadius: '.4rem', border: '1px solid #fed7aa' }}>
          <p style={{ fontSize: '.8rem', color: '#c2410c', margin: 0 }}>
            ⚠️ Le site affiche actuellement une page de maintenance aux visiteurs non-connectés.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Historique des modifications d'une page ──────────────────
function PageHistoryPanel({ page, onRestored }: { page: string; onRestored?: () => void }) {
  const [rows, setRows] = useState<{ id: number; block_key: string; old_value: string | null; new_value: string | null; changed_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cms/history?page=${encodeURIComponent(page)}`);
      const d = await res.json().catch(() => ({}));
      if (res.status === 501) { setNotice(d.message || 'Historique non activé.'); setRows([]); }
      else if (!res.ok) { setNotice(d.error || 'Erreur de chargement.'); setRows([]); }
      else { setRows(d.history || []); setNotice(''); }
    } catch { setNotice("Impossible de charger l'historique."); }
    finally { setLoading(false); }
  }, [page]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement de l'historique depuis l'API
  useEffect(() => { load(); }, [load]);

  const restore = async (id: number) => {
    if (!confirm('Restaurer cette ancienne valeur ? La valeur actuelle sera remplacée (et journalisée).')) return;
    setRestoringId(id);
    try {
      const res = await fetch('/api/cms/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) { await load(); onRestored?.(); }
    } finally { setRestoringId(null); }
  };

  const trunc = (v: string | null, n = 70) => {
    if (!v) return '∅ (vide)';
    return v.length > n ? v.slice(0, n) + '…' : v;
  };

  return (
    <div style={{ marginBottom: '1.5rem', border: '1.5px solid #ece8e2', borderRadius: '.75rem', background: '#fdfcfa', padding: '1rem 1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
        <p style={{ margin: 0, fontSize: '.85rem', fontWeight: 700, color: '#2d5f54' }}>🕘 Historique des modifications</p>
        <button onClick={load} disabled={loading}
          style={{ background: 'none', border: 'none', color: '#01696f', cursor: 'pointer', fontSize: '.78rem', fontWeight: 600 }}>
          {loading ? '⏳' : '🔄 Actualiser'}
        </button>
      </div>
      {notice && <p style={{ fontSize: '.82rem', color: '#b45309', margin: 0, padding: '.75rem', background: '#fffbeb', borderRadius: '.5rem' }}>{notice}</p>}
      {!notice && !loading && rows.length === 0 && (
        <p style={{ fontSize: '.82rem', color: '#aaa', margin: 0 }}>Aucune modification enregistrée pour cette page.</p>
      )}
      {rows.length > 0 && (
        <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
          {rows.map(r => (
            <div key={r.id} style={{ display: 'flex', gap: '.75rem', alignItems: 'center', padding: '.55rem .75rem', background: 'white', borderRadius: '.5rem', border: '1px solid #f0ece7', fontSize: '.8rem' }}>
              <span style={{ color: '#bbb', flexShrink: 0, fontSize: '.72rem', width: 105 }}>
                {new Date(r.changed_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
              <code style={{ color: '#2d5f54', fontWeight: 600, flexShrink: 0, fontSize: '.75rem' }}>{r.block_key}</code>
              <span style={{ color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                <span style={{ textDecoration: 'line-through', opacity: .7 }}>{trunc(r.old_value, 40)}</span>
                {' → '}
                <span style={{ color: '#333' }}>{trunc(r.new_value, 40)}</span>
              </span>
              <button onClick={() => restore(r.id)} disabled={restoringId === r.id}
                style={{ flexShrink: 0, padding: '.25rem .7rem', background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', borderRadius: '.4rem', cursor: 'pointer', fontSize: '.72rem', fontWeight: 600 }}>
                {restoringId === r.id ? '⏳' : '↩ Restaurer'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────
function BulkSlotCreator({ onCreated }: { onCreated: () => void }) {
  const [days, setDays] = React.useState<number[]>([1,2,3,4,5])
  const [startH, setStartH] = React.useState(9)
  const [endH, setEndH]   = React.useState(17)
  const [type, setType]   = React.useState('discovery')
  const [weeks, setWeeks] = React.useState(4)
  const [startDate, setStartDate] = React.useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = React.useState(false)
  const [result, setResult]   = React.useState('')

  const toggleDay = (d: number) => setDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d].sort())
  const DAY_LABELS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

  const create = async () => {
    setLoading(true); setResult('')
    const res = await fetch('/api/cms/booking-slots-bulk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days_of_week: days, start_hour: startH, end_hour: endH, slot_type: type, duration: 45, weeks, start_date: startDate })
    })
    const d = await res.json()
    setResult(d.message || d.error || 'Terminé')
    setLoading(false)
    if (res.ok) onCreated()
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
      <div>
        <label style={{ display:'block', fontSize:'.8rem', fontWeight:600, color:'#555', marginBottom:'.4rem' }}>Jours de la semaine</label>
        <div style={{ display:'flex', gap:'.3rem', flexWrap:'wrap' }}>
          {DAY_LABELS.map((l,i) => (
            <button key={i} onClick={() => toggleDay(i+1)} style={{ padding:'.3rem .6rem', borderRadius:'.4rem', border:'1.5px solid', fontSize:'.78rem', fontWeight:600, cursor:'pointer', background:days.includes(i+1) ? '#2d5f54' : 'white', color:days.includes(i+1) ? 'white' : '#555', borderColor:days.includes(i+1) ? '#2d5f54' : '#ddd' }}>{l}</button>
          ))}
        </div>
      </div>
      <div>
        <label style={{ display:'block', fontSize:'.8rem', fontWeight:600, color:'#555', marginBottom:'.4rem' }}>De (heure)</label>
        <select value={startH} onChange={e => setStartH(+e.target.value)} style={{ width:'100%', padding:'.5rem .75rem', border:'1.5px solid #e0dbd5', borderRadius:'.5rem', fontSize:'.88rem' }}>
          {Array.from({length:12}, (_,i)=>i+7).map(h => <option key={h} value={h}>{h}:00</option>)}
        </select>
      </div>
      <div>
        <label style={{ display:'block', fontSize:'.8rem', fontWeight:600, color:'#555', marginBottom:'.4rem' }}>À (heure)</label>
        <select value={endH} onChange={e => setEndH(+e.target.value)} style={{ width:'100%', padding:'.5rem .75rem', border:'1.5px solid #e0dbd5', borderRadius:'.5rem', fontSize:'.88rem' }}>
          {Array.from({length:12}, (_,i)=>i+9).map(h => <option key={h} value={h}>{h}:00</option>)}
        </select>
      </div>
      <div>
        <label style={{ display:'block', fontSize:'.8rem', fontWeight:600, color:'#555', marginBottom:'.4rem' }}>Type de séance</label>
        <select value={type} onChange={e => setType(e.target.value)} style={{ width:'100%', padding:'.5rem .75rem', border:'1.5px solid #e0dbd5', borderRadius:'.5rem', fontSize:'.88rem' }}>
          <option value="discovery">Découverte (gratuit)</option>
          <option value="coaching">Coaching (120€)</option>
          <option value="enterprise">Entreprise</option>
        </select>
      </div>
      <div>
        <label style={{ display:'block', fontSize:'.8rem', fontWeight:600, color:'#555', marginBottom:'.4rem' }}>Nb semaines</label>
        <select value={weeks} onChange={e => setWeeks(+e.target.value)} style={{ width:'100%', padding:'.5rem .75rem', border:'1.5px solid #e0dbd5', borderRadius:'.5rem', fontSize:'.88rem' }}>
          {[1,2,4,6,8,12].map(w => <option key={w} value={w}>{w} semaine{w>1?'s':''}</option>)}
        </select>
      </div>
      <div>
        <label style={{ display:'block', fontSize:'.8rem', fontWeight:600, color:'#555', marginBottom:'.4rem' }}>À partir du</label>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width:'100%', padding:'.5rem .75rem', border:'1.5px solid #e0dbd5', borderRadius:'.5rem', fontSize:'.88rem' }} />
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'.5rem' }}>
        <button onClick={create} disabled={loading || !days.length} style={{ padding:'.65rem 1rem', background:'#2d5f54', color:'white', border:'none', borderRadius:'.5rem', fontWeight:700, cursor:'pointer', fontSize:'.88rem', opacity:loading?0.7:1 }}>
          {loading ? 'Création…' : '+ Créer les créneaux'}
        </button>
        {result && <p style={{ fontSize:'.78rem', color:result.includes('Erreur') ? '#dc2626' : '#2d5f54', fontWeight:600 }}>{result}</p>}
      </div>
    </div>
  )
}
export default function CMSAdmin() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState('');
  const [apiPwd, setApiPwd] = useState(''); // Kept for API calls
  const [authErr, setAuthErr] = useState('');
  const [tab, setTab] = useState('dashboard');
  const [toast, setToast] = useState('');
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  // Santé de la base (Supabase peut être en pause sur le free tier)
  const [dbStatus, setDbStatus] = useState<'ok' | 'down' | 'checking'>('checking');
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
    setApiPwd('');
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
        setAuthed(true);
        setPwd('');
        setApiPwd(pwd); // Keep for API calls
        // Store password for API auth (used by upload endpoints)
        if (typeof window !== 'undefined') {
          localStorage.setItem('cms_password', pwd);
        }
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
    setApiPwd('');
    setAuthErr('');
    setShowMediaLibrary(false);
    resetArticleEditor();
    // Clear stored password
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cms_password');
    }
  };

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
  useEffect(() => { if (authed && (tab === 'settings' || tab === 'pages' || tab === 'fil-ariane' || tab === 'contenu')) loadSettings(); }, [authed, tab, loadSettings]);
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
    { id: 'menu',         label: '🧭 Menu', count: null },
    { id: 'fil-ariane',   label: '🔗 Fil d’Ariane', count: null },
    { id: 'custom-pages', label: '📄 Pages libres', count: null },
    { id: 'questionnaires', label: '📋 Questionnaires', count: null },
    { id: 'media',    label: '🖼️ Médiathèque', count: null },
    { id: 'booking',  label: '📅 Réservations', count: null },
    { id: 'messages', label: '💬 Messages', count: messages.filter(m => m.status === 'unread').length || null },
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

      {/* Tabs */}
      <div style={{ background: 'white', borderBottom: '1.5px solid #e8e3dc', padding: '0 2rem', display: 'flex', gap: '.25rem', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id}
            onClick={() => handleTabChange(t.id)}
            style={{
              padding: '.85rem 1.2rem', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? '#2d5f54' : '#666',
              borderBottom: tab === t.id ? '2.5px solid #2d5f54' : '2.5px solid transparent',
              fontSize: '.9rem', display: 'flex', alignItems: 'center', gap: '.4rem', whiteSpace: 'nowrap',
            }}
          >
            {t.label}
            {t.count !== null && t.count > 0 && (
              <span style={{ background: '#f0e8e4', color: '#2d5f54', borderRadius: '9999px', padding: '.1rem .55rem', fontSize: '.75rem', fontWeight: 700 }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 1100, margin: '2rem auto', padding: '0 1.5rem' }}>

        {/* ── TABLEAU DE BORD ── */}
        {tab === 'dashboard' && (
          <div>
            {/* Salutation */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e3a34', margin: 0, fontFamily: 'Georgia, serif' }}>
                Bonjour Monica 👋
              </h1>
              <p style={{ color: '#888', fontSize: '.9rem', margin: '.3rem 0 0' }}>
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Cartes stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 .4rem' }}>Articles publiés</p>
                <p style={{ fontSize: '2rem', fontWeight: 700, color: '#2d5f54', margin: 0 }}>{articles.filter(a => a.published).length}</p>
              </div>
              <div style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 .4rem' }}>Brouillons</p>
                <p style={{ fontSize: '2rem', fontWeight: 700, color: '#c9a96e', margin: 0 }}>{articles.filter(a => !a.published).length}</p>
              </div>
              <div style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', cursor: 'pointer' }} onClick={() => handleTabChange('messages')}>
                <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 .4rem' }}>Messages non lus</p>
                <p style={{ fontSize: '2rem', fontWeight: 700, color: messages.filter(m => m.status === 'unread').length > 0 ? '#dc2626' : '#2d5f54', margin: 0 }}>{messages.filter(m => m.status === 'unread').length}</p>
              </div>
              <div style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 .4rem' }}>Base de données</p>
                <p style={{ fontSize: '1.05rem', fontWeight: 700, margin: '.4rem 0 0', color: dbStatus === 'ok' ? '#16a34a' : dbStatus === 'down' ? '#dc2626' : '#888', display: 'flex', alignItems: 'center', gap: '.45rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: dbStatus === 'ok' ? '#16a34a' : dbStatus === 'down' ? '#dc2626' : '#d1d5db', display: 'inline-block' }} />
                  {dbStatus === 'ok' ? 'En ligne' : dbStatus === 'down' ? 'Hors ligne !' : 'Vérification…'}
                </p>
              </div>
            </div>

            {/* Actions rapides */}
            <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem 2rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 1rem' }}>Actions rapides</p>
              <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
                <button
                  onClick={async () => {
                    const res = await fetch('/api/cms/generate-edit-token');
                    if (!res.ok) return;
                    const data = await res.json();
                    if (data.token) window.open(`/?cms_edit_token=${encodeURIComponent(data.token)}`, '_blank');
                  }}
                  style={{ padding: '.7rem 1.4rem', background: '#2d5f54', color: 'white', border: 'none', borderRadius: '.6rem', cursor: 'pointer', fontSize: '.9rem', fontWeight: 600 }}>
                  ✏️ Éditer le site en direct
                </button>
                <button onClick={() => openArticleEditor({})}
                  style={{ padding: '.7rem 1.4rem', background: '#01696f', color: 'white', border: 'none', borderRadius: '.6rem', cursor: 'pointer', fontSize: '.9rem', fontWeight: 600 }}>
                  📝 Écrire un article
                </button>
                <button onClick={() => handleTabChange('pages')}
                  style={{ padding: '.7rem 1.4rem', background: 'white', color: '#2d5f54', border: '1.5px solid #2d5f54', borderRadius: '.6rem', cursor: 'pointer', fontSize: '.9rem', fontWeight: 600 }}>
                  🗂️ Modifier une page
                </button>
                <a href="/" target="_blank" rel="noopener noreferrer"
                  style={{ padding: '.7rem 1.4rem', background: 'white', color: '#555', border: '1.5px solid #ddd', borderRadius: '.6rem', textDecoration: 'none', fontSize: '.9rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>
                  🔗 Voir le site
                </a>
              </div>
            </div>

            {/* Deux colonnes : derniers articles + derniers messages */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem 2rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.06em', margin: 0 }}>Derniers articles</p>
                  <button onClick={() => handleTabChange('articles')} style={{ background: 'none', border: 'none', color: '#01696f', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600 }}>Tout voir →</button>
                </div>
                {articles.slice(0, 4).map(a => (
                  <div key={a.id} onClick={() => openArticleEditor(a)}
                    style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.6rem 0', borderBottom: '1px solid #f3f0eb', cursor: 'pointer' }}>
                    <span style={{ fontSize: '.75rem' }}>{a.published ? '✅' : '📦'}</span>
                    <span style={{ fontSize: '.88rem', color: '#333', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
                    <span style={{ fontSize: '.75rem', color: '#bbb', flexShrink: 0 }}>{fmt(a.created_at)}</span>
                  </div>
                ))}
                {articles.length === 0 && <p style={{ color: '#bbb', fontSize: '.85rem' }}>Aucun article pour le moment.</p>}
              </div>
              <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem 2rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.06em', margin: 0 }}>Derniers messages</p>
                  <button onClick={() => handleTabChange('messages')} style={{ background: 'none', border: 'none', color: '#01696f', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600 }}>Tout voir →</button>
                </div>
                {messages.slice(0, 4).map(m => (
                  <div key={m.id} style={{ padding: '.6rem 0', borderBottom: '1px solid #f3f0eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                      {m.status === 'unread' && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#dc2626', flexShrink: 0 }} />}
                      <span style={{ fontSize: '.85rem', fontWeight: 600, color: '#333' }}>{m.name}</span>
                      <span style={{ fontSize: '.72rem', color: '#bbb', marginLeft: 'auto' }}>{fmt(m.created_at)}</span>
                    </div>
                    <p style={{ fontSize: '.8rem', color: '#888', margin: '.25rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.message}</p>
                  </div>
                ))}
                {messages.length === 0 && <p style={{ color: '#bbb', fontSize: '.85rem' }}>Aucun message.</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── ARTICLES ── */}
        {tab === 'articles' && (
          <div>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input placeholder="Rechercher un article..." value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadArticles()}
                style={{ padding: '.6rem 1rem', border: '1.5px solid #ddd', borderRadius: '.5rem', flex: 1, minWidth: 200, fontSize: '.9rem' }}
              />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '.6rem .9rem', border: '1.5px solid #ddd', borderRadius: '.5rem', fontSize: '.9rem' }}
              >
                <option value="all">Tous</option>
                <option value="published">Publiés</option>
                <option value="draft">Brouillons</option>
              </select>
              <button onClick={loadArticles} style={{ padding: '.6rem 1.2rem', background: '#2d5f54', color: 'white', border: 'none', borderRadius: '.5rem', cursor: 'pointer', fontSize: '.9rem' }}>🔍</button>
              <button onClick={() => openArticleEditor({})} style={{ padding: '.6rem 1.2rem', background: '#01696f', color: 'white', border: 'none', borderRadius: '.5rem', cursor: 'pointer', fontSize: '.9rem' }}>+ Nouvel article</button>
            </div>
            {loadingArticles ? <p style={{ textAlign: 'center', color: '#888', padding: '3rem' }}>Chargement…</p>
              : articles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#aaa' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                  <p>Aucun article trouvé</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                  {articles.map(a => (
                    <div key={a.id} style={{ background: 'white', borderRadius: '.75rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', flexWrap: 'wrap' }}>
                      {a.featured_image && <img src={a.featured_image} alt="" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: '.4rem', flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontWeight: 600, fontSize: '1rem', color: '#1a1a1a', marginBottom: '.2rem' }}>{a.title}</div>
                        <div style={{ fontSize: '.8rem', color: '#888', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                          <span>{a.category || '—'}</span>
                          <span>{fmt(a.created_at)}</span>
                        </div>
                      </div>
                      <span style={{ padding: '.3rem .8rem', borderRadius: '9999px', fontSize: '.78rem', fontWeight: 600, background: a.published ? '#d4edda' : '#fff3cd', color: a.published ? '#155724' : '#856404' }}>
                        {a.published ? '✅ Publié' : '📦 Brouillon'}
                      </span>
                      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                        {a.published && (
                          <a href={`/blog/${a.slug}`} target="_blank" rel="noopener noreferrer"
                            style={{ padding: '.35rem .8rem', border: '1px solid #b8ddd6', borderRadius: '.4rem', background: '#f0faf8', color: '#01696f', textDecoration: 'none', fontSize: '.82rem' }}>👁 Voir</a>
                        )}
                        <button onClick={() => openArticleEditor(a)} style={{ padding: '.35rem .8rem', border: '1px solid #ddd', borderRadius: '.4rem', background: 'white', cursor: 'pointer', fontSize: '.82rem' }}>✏️ Éditer</button>
                        <button onClick={() => duplicateArticle(a)} style={{ padding: '.35rem .8rem', border: '1px solid #ddd', borderRadius: '.4rem', background: 'white', cursor: 'pointer', fontSize: '.82rem' }}>⧉ Dupliquer</button>
                        <button onClick={() => togglePublish(a)} style={{ padding: '.35rem .8rem', border: '1px solid #ddd', borderRadius: '.4rem', background: 'white', cursor: 'pointer', fontSize: '.82rem' }}>{a.published ? '📦 Dépublier' : '🚀 Publier'}</button>
                        <button onClick={() => deleteArticle(a.id)} style={{ padding: '.35rem .8rem', border: '1px solid #fcc', borderRadius: '.4rem', background: '#fff5f5', color: '#c0392b', cursor: 'pointer', fontSize: '.82rem' }}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}

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


        {/* ── BOOKING ── */}
        {tab === 'booking' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Création en masse */}
            <div style={{ gridColumn: '1 / -1', background: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,.07)', marginBottom: '-.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2d5f54', marginBottom: '1rem' }}>🗓 Créneaux récurrents — Ajout en masse</h2>
              <BulkSlotCreator onCreated={loadBookingSlots} />
            </div>
            {/* Add slot */}
            <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,.07)' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2d5f54', marginBottom: '1rem' }}>📅 Ajouter un créneau</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                <div>
                  <label style={lbl}>Date</label>
                  <input type="date" value={newSlot.date}
                    onChange={e => setNewSlot(p => ({...p, date: e.target.value}))}
                    style={inp} min={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label style={lbl}>Heure</label>
                  <select value={newSlot.time}
                    onChange={e => setNewSlot(p => ({...p, time: e.target.value}))}
                    style={inp}>
                    <option value="09:00">09:00</option>
                    <option value="10:00">10:00</option>
                    <option value="11:00">11:00</option>
                    <option value="14:00">14:00</option>
                    <option value="15:00">15:00</option>
                    <option value="16:00">16:00</option>
                    <option value="17:00">17:00</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Type</label>
                  <select value={newSlot.type}
                    onChange={e => setNewSlot(p => ({...p, type: e.target.value}))}
                    style={inp}>
                    <option value="coaching">Coaching (60 min)</option>
                    <option value="discovery">Découverte (30 min)</option>
                    <option value="enterprise">Entreprise</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Notes</label>
                  <input type="text" value={newSlot.notes}
                    onChange={e => setNewSlot(p => ({...p, notes: e.target.value}))}
                    style={inp} placeholder="En ligne, présentiel..." />
                </div>
                <button onClick={saveNewSlot} disabled={savingSlot}
                  style={{ padding: '.75rem', background: '#2d5f54', color: 'white', border: 'none', borderRadius: '.5rem', fontWeight: 700, cursor: 'pointer' }}>
                  {savingSlot ? 'Ajout...' : '+ Ajouter le créneau'}
                </button>
              </div>
            </div>
            {/* Slots list */}
            <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,.07)', maxHeight: 600, overflow: 'auto' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2d5f54', marginBottom: '1rem' }}>
                📆 Créneaux ({bookingSlots.length})
              </h2>
              {loadingSlots ? (
                <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>Chargement...</p>
              ) : bookingSlots.length === 0 ? (
                <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>Aucun créneau</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                  {bookingSlots.map(slot => (
                    <div key={slot.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.75rem', background: '#faf9f7', borderRadius: '.5rem', border: '1px solid #e8e4df' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#333' }}>{slot.slot_date} à {slot.slot_time}</div>
                        <div style={{ fontSize: '.8rem', color: '#666' }}>{slot.slot_type} · {slot.duration_minutes} min</div>
                      </div>
                      <button onClick={() => deleteSlot(slot.id)}
                        style={{ padding: '.3rem .6rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '.3rem', cursor: 'pointer', fontSize: '.8rem' }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Requests */}
            <div style={{ gridColumn: '1 / -1', background: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,.07)' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2d5f54', marginBottom: '1rem' }}>
                📋 Demandes ({bookingRequests.length})
              </h2>
              {bookingRequests.length === 0 ? (
                <p style={{ color: '#888', textAlign: 'center', padding: '1rem' }}>Aucune demande</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                  {bookingRequests.map(req => (
                    <div key={req.id} style={{ padding: '1rem', background: '#faf9f7', borderRadius: '.75rem', border: '1px solid #e8e4df' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
                        <strong>{req.client_name}</strong>
                        <span style={{ color: '#888' }}>{req.client_email}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '.5rem', marginTop: '.75rem' }}>
                        <button onClick={() => updateRequestStatus(req.id, 'confirmed')}
                          style={{ padding: '.4rem .8rem', background: '#166534', color: 'white', border: 'none', borderRadius: '.4rem', cursor: 'pointer' }}>
                          ✅ Confirmer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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


        {/* ── MESSAGES ── */}
        {tab === 'messages' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#2d5f54' }}>💬 Messages reçus</h2>
              <button onClick={loadMessages} style={{ padding: '.45rem 1rem', background: '#f5f0eb', border: 'none', borderRadius: '.5rem', cursor: 'pointer', fontSize: '.85rem', color: '#555' }}>↻ Actualiser</button>
            </div>
            {loadingMessages ? (
              <p style={{ textAlign: 'center', color: '#888', padding: '3rem' }}>Chargement…</p>
            ) : messages.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#aaa', padding: '3rem' }}>Aucun message pour le moment.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                {messages.map(m => (
                  <div key={m.id} style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', borderLeft: m.status === 'unread' ? '4px solid #2d5f54' : '4px solid #e0dbd5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '.95rem', color: '#1a1a1a', marginBottom: '.2rem' }}>{m.name} <span style={{ fontWeight: 400, color: '#888' }}>— {m.email}</span></p>
                        <p style={{ fontSize: '.8rem', color: '#aaa', marginBottom: '.75rem' }}>{fmt(m.created_at)}</p>
                        <p style={{ fontSize: '.9rem', color: '#444', whiteSpace: 'pre-wrap' }}>{m.message}</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem', flexShrink: 0 }}>
                        {m.status !== 'read' && (
                          <button onClick={async () => {
                            await fetch(`/api/cms/contact-messages/${m.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-cms-token': localStorage.getItem('cms_token') || '' }, body: JSON.stringify({ status: 'read' }) });
                            setMessages(prev => prev.map(x => x.id === m.id ? { ...x, status: 'read' } : x));
                          }} style={{ padding: '.35rem .75rem', background: '#2d5f54', color: 'white', border: 'none', borderRadius: '.4rem', cursor: 'pointer', fontSize: '.78rem', fontWeight: 600 }}>
                            ✓ Marquer lu
                          </button>
                        )}
                        <button onClick={async () => {
                          if (!confirm('Supprimer ce message ?')) return;
                          await fetch(`/api/cms/contact-messages/${m.id}`, { method: 'DELETE', headers: { 'x-cms-token': localStorage.getItem('cms_token') || '' } });
                          setMessages(prev => prev.filter(x => x.id !== m.id));
                        }} style={{ padding: '.35rem .75rem', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '.4rem', cursor: 'pointer', fontSize: '.78rem', fontWeight: 600 }}>
                          🗑 Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* ── PARAMÃˆTRES ── */}
        {tab === 'settings' && (
          <div>
            {loadingSettings ? <p style={{ textAlign: 'center', color: '#888', padding: '3rem' }}>Chargement…</p> : (
              <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.5rem', alignItems: 'start' }}>

                {/* Sidebar settings */}
                <div style={{ background: 'white', borderRadius: '1rem', padding: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                  <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.75rem', padding: '0 .5rem' }}>Paramètres globaux</p>
                  {Object.entries(SETTINGS_GROUPS).map(([key, cfg]) => (
                    <button key={key} onClick={() => setSettingsGroup(key)}
                      style={{ display: 'flex', alignItems: 'center', gap: '.5rem', width: '100%', textAlign: 'left', padding: '.6rem .75rem', borderRadius: '.5rem', border: 'none', cursor: 'pointer', fontSize: '.88rem', fontWeight: settingsGroup === key ? 700 : 400, background: settingsGroup === key ? '#f0e8e4' : 'transparent', color: settingsGroup === key ? '#2d5f54' : '#555', marginBottom: '.2rem' }}
                    >
                      <span>{cfg.emoji}</span> {cfg.label}
                    </button>
                  ))}
                </div>

                {/* Panel settings */}
                <div style={{ background: 'white', borderRadius: '1rem', padding: '2rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                  {/* ── MAINTENANCE MODE ── */}
                  <MaintenanceModeToggle />
                  
                  {(() => {
                    const groupItems = settings.filter(s => s.group_name === settingsGroup);
                    const groupCfg = SETTINGS_GROUPS[settingsGroup];
                    return (
                      <div>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2d5f54', marginBottom: '1.5rem' }}>
                          {groupCfg?.emoji} {groupCfg?.label}
                        </h2>
                        {/* ── BRANDING PANEL ── */}
                        {settingsGroup === 'branding' && (
                          <div style={{ marginBottom: '2rem' }}>
                            {/* Prévisualisation live */}
                            <div style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem', background: 'white', borderRadius: '.75rem', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <div style={{ width: 260, background: '#fff', borderBottom: '1px solid #f0ece8', borderRadius: '.5rem .5rem 0 0', padding: '.6rem 1rem', display: 'flex', alignItems: 'center', gap: '.75rem', justifyContent: (editedSettings['logo_position'] || 'left') === 'center' ? 'center' : 'flex-start' }}>
                                <SiteLogo url={resolveLogo(editedSettings).url} size={resolveLogo(editedSettings).size} shape={resolveLogo(editedSettings).shape} />
                                <div>
                                  {resolveLogo(editedSettings).showName && <p style={{ fontWeight: 700, fontSize: '.9rem', color: '#1a1a1a', margin: 0, fontFamily: 'Georgia, serif' }}>{editedSettings['site_name'] || 'Happy Humans'}</p>}
                                  {editedSettings['tagline'] && <p style={{ fontSize: '.7rem', color: '#c9a96e', margin: 0, fontStyle: 'italic' }}>{editedSettings['tagline']}</p>}
                                </div>
                              </div>
                              <p style={{ fontSize: '.78rem', color: '#aaa', margin: 0 }}>← Prévisualisation header</p>
                            </div>

                            {/* Upload logo */}
                            <div style={{ marginBottom: '1.25rem' }}>
                              <label style={lbl}>Logo (image)</label>
                              <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <label style={{ padding: '.5rem 1rem', background: '#2d5f54', color: 'white', borderRadius: '.4rem', cursor: 'pointer', fontSize: '.85rem', display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}>
                                  ⬆ Upload logo
                                  <input type="file" accept="image/*" style={{ display: 'none' }}
                                    onChange={e => handleImageFile(e, url => setEditedSettings(p => ({ ...p, logo_url: url })))} />
                                </label>
                                <input type="text" value={editedSettings['logo_url'] || ''} placeholder="Ou coller une URL d'image"
                                  onChange={e => setEditedSettings(p => ({ ...p, logo_url: e.target.value }))}
                                  style={{ ...inp, flex: 1, minWidth: 200 }} />
                                {editedSettings['logo_url'] && (
                                  <button onClick={() => setEditedSettings(p => ({ ...p, logo_url: '' }))}
                                    style={{ padding: '.4rem .6rem', background: '#fee2e2', border: 'none', borderRadius: '.3rem', cursor: 'pointer', fontSize: '.8rem', color: '#dc2626' }}>✕</button>
                                )}
                              </div>
                            </div>

                            {/* Taille du logo */}
                            <div style={{ marginBottom: '1.25rem' }}>
                              <label style={lbl}>Taille du logo — {logoPx(editedSettings['logo_size'], 52)}px</label>
                              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '.75rem', color: '#aaa' }}>24px</span>
                                <input type="range" min="24" max="64" step="4"
                                  value={logoPx(editedSettings['logo_size'], 52)}
                                  onChange={e => setEditedSettings(p => ({ ...p, logo_size: e.target.value }))}
                                  style={{ flex: 1, accentColor: '#2d5f54' }} />
                                <span style={{ fontSize: '.75rem', color: '#aaa' }}>64px</span>
                                {/* Tailles prédéfinies */}
                                {[['XS', '28'], ['S', '36'], ['M', '44'], ['L', '56'], ['XL', '64']].map(([label, val]) => (
                                  <button key={val} onClick={() => setEditedSettings(p => ({ ...p, logo_size: val }))}
                                    style={{ padding: '.2rem .5rem', fontSize: '.72rem', border: `1px solid ${editedSettings['logo_size'] === val ? '#2d5f54' : '#ddd'}`, borderRadius: '.3rem', cursor: 'pointer', background: editedSettings['logo_size'] === val ? '#2d5f54' : 'white', color: editedSettings['logo_size'] === val ? 'white' : '#555' }}>
                                    {label}
                                  </button>
                                ))}
                              </div>

                            {/* Taille logo footer */}
                            <div style={{ marginBottom: '1.25rem' }}>
                              <label style={lbl}>Taille logo footer — {editedSettings['logo_footer_size'] || 36}px</label>
                              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '.75rem', color: '#aaa' }}>20px</span>
                                <input type="range" min="20" max="72" step="4"
                                  value={Number(editedSettings['logo_footer_size'] || 36)}
                                  onChange={e => setEditedSettings(p => ({ ...p, logo_footer_size: e.target.value }))}
                                  style={{ flex: 1, accentColor: '#2d5f54' }} />
                                <span style={{ fontSize: '.75rem', color: '#aaa' }}>72px</span>
                                {[['S', '24'], ['M', '36'], ['L', '48']].map(([label, val]) => (
                                  <button key={val} onClick={() => setEditedSettings(p => ({ ...p, logo_footer_size: val }))}
                                    style={{ padding: '.2rem .5rem', fontSize: '.72rem', border: `1px solid ${editedSettings['logo_footer_size'] === val ? '#2d5f54' : '#ddd'}`, borderRadius: '.3rem', cursor: 'pointer', background: editedSettings['logo_footer_size'] === val ? '#2d5f54' : 'white', color: editedSettings['logo_footer_size'] === val ? 'white' : '#555' }}>
                                    {label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Position du logo */}
                            <div style={{ marginBottom: '1.25rem' }}>
                              <label style={lbl}>Position dans le header</label>
                              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                                {[['Gauche', 'left'], ['Centré', 'center']].map(([label, val]) => (
                                  <button key={val} onClick={() => setEditedSettings(p => ({ ...p, logo_position: val }))}
                                    style={{ padding: '.45rem 1.1rem', fontSize: '.82rem', fontWeight: 600, border: `1.5px solid ${(editedSettings['logo_position'] || 'left') === val ? '#2d5f54' : '#ddd'}`, borderRadius: '.5rem', cursor: 'pointer', background: (editedSettings['logo_position'] || 'left') === val ? '#2d5f54' : 'white', color: (editedSettings['logo_position'] || 'left') === val ? 'white' : '#555', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                                    {val === 'left'
                                      ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><line x1="14" y1="6" x2="21" y2="6"/></svg>{label}</>
                                      : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="8" y2="6"/><rect x="9" y="3" width="6" height="6" rx="1"/><line x1="16" y1="6" x2="21" y2="6"/></svg>{label}</>
                                    }
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Forme du logo */}
                            <div style={{ marginBottom: '1.25rem' }}>
                              <label style={lbl}>Forme du logo</label>
                              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                                {[['Cercle', 'circle'], ['Arrondi', 'rounded'], ['Sans découpe', 'square']].map(([label, val]) => {
                                  const active = (editedSettings['logo_shape'] || 'circle') === val;
                                  const size = 32;
                                  const radius = val === 'circle' ? '50%' : val === 'rounded' ? '6px' : '2px';
                                  return (
                                    <button key={val} onClick={() => setEditedSettings(p => ({ ...p, logo_shape: val }))}
                                      style={{ padding: '.45rem 1rem', fontSize: '.82rem', fontWeight: 600, border: `1.5px solid ${active ? '#2d5f54' : '#ddd'}`, borderRadius: '.5rem', cursor: 'pointer', background: active ? '#2d5f54' : 'white', color: active ? 'white' : '#555', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                                      <div style={{ width: size, height: size, borderRadius: radius, background: active ? 'rgba(255,255,255,.3)' : '#e8e4df', border: `1px solid ${active ? 'rgba(255,255,255,.4)' : '#ccc'}`, flexShrink: 0 }} />
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            </div>
                          </div>
                        )}

                        {/* ── THEME PICKER ── */}
                        {settingsGroup === 'theme' && (
                          <div style={{ marginBottom: '2rem' }}>
                            <p style={{ fontSize: '.85rem', color: '#888', marginBottom: '1rem' }}>Choisissez un thème visuel pour tout le site. Cliquez pour appliquer instantanément.</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                              {Object.entries(THEMES).map(([key, theme]) => {
                                const isActive = (editedSettings['theme_preset'] || 'forest') === key;
                                return (
                                  <button key={key} onClick={() => setEditedSettings(p => ({ ...p, theme_preset: key }))}
                                    style={{ border: isActive ? `3px solid ${theme.primary}` : '2px solid #e5e7eb', borderRadius: '.75rem', padding: '1rem .75rem', cursor: 'pointer', background: theme.bg, textAlign: 'center', transition: 'all .15s', boxShadow: isActive ? `0 0 0 2px ${theme.primary}33` : 'none' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '.5rem' }}>
                                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: theme.primary }} />
                                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: theme.accent }} />
                                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: theme.dark }} />
                                    </div>
                                    <p style={{ fontWeight: isActive ? 700 : 500, fontSize: '.82rem', color: theme.text, margin: 0 }}>{theme.label}</p>
                                    {isActive && <p style={{ fontSize: '.7rem', color: theme.primary, margin: '2px 0 0', fontWeight: 600 }}>✓ Actif</p>}
                                  </button>
                                );
                              })}
                            </div>
                            {/* ── PACK D'ILLUSTRATIONS ── */}
                            <div style={{ marginBottom: '1.5rem' }}>
                              <label style={lbl}>Pack d'illustrations (galerie des 7 outils, lead magnet…)</label>
                              <select value={editedSettings['illustration_pack'] || DEFAULT_PACK_ID}
                                onChange={e => setEditedSettings(p => ({ ...p, illustration_pack: e.target.value }))}
                                style={{ ...inp, maxWidth: 360 }}>
                                {Object.values(THEME_PACKS).map(pack => (
                                  <option key={pack.id} value={pack.id}>{pack.label} — {pack.description}</option>
                                ))}
                              </select>
                            </div>
                            <div style={{ borderTop: '1px solid #f0ece8', paddingTop: '1.5rem' }}>
                              <p style={{ fontSize: '.82rem', fontWeight: 600, color: '#555', marginBottom: '1rem' }}>Couleurs personnalisées (optionnel — surcharge le thème)</p>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                {[
                                  { key: 'theme_primary', label: 'Couleur principale' },
                                  { key: 'theme_accent',  label: 'Couleur accent' },
                                  { key: 'theme_dark',    label: 'Couleur sombre (nav/footer)' },
                                  { key: 'theme_light',   label: 'Couleur claire (variante)' },
                                  { key: 'theme_bg',      label: 'Couleur fond' },
                                  { key: 'theme_text',    label: 'Couleur texte' },
                                ].map(({ key, label }) => (
                                  <div key={key}>
                                    <label style={lbl}>{label}</label>
                                    <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                                      <input type="color" value={editedSettings[key] || '#2d5f54'}
                                        onChange={e => setEditedSettings(p => ({ ...p, [key]: e.target.value }))}
                                        style={{ width: 40, height: 36, border: 'none', borderRadius: '.3rem', cursor: 'pointer', padding: 2 }} />
                                      <input type="text" value={editedSettings[key] || ''}
                                        onChange={e => setEditedSettings(p => ({ ...p, [key]: e.target.value }))}
                                        placeholder="ex: #2d5f54"
                                        style={{ ...inp, flex: 1 }} />
                                      {editedSettings[key] && (
                                        <button onClick={() => setEditedSettings(p => { const n = {...p}; delete n[key]; return n; })}
                                          style={{ padding: '.3rem .5rem', background: '#fee2e2', border: 'none', borderRadius: '.3rem', cursor: 'pointer', fontSize: '.75rem', color: '#dc2626' }}>
                                          ✕
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <button onClick={() => setEditedSettings(p => {
                                const n = {...p};
                                delete n['theme_primary']; delete n['theme_accent'];
                                delete n['theme_dark']; delete n['theme_light'];
                                delete n['theme_bg']; delete n['theme_text'];
                                return n;
                              })} style={{ marginTop: '1rem', padding: '.4rem .9rem', background: '#f5f0eb', border: 'none', borderRadius: '.4rem', cursor: 'pointer', fontSize: '.8rem', color: '#666' }}>
                                Réinitialiser les couleurs personnalisées
                              </button>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.25rem' }}>
                                {[
                                  { key: 'theme_font_heading', label: 'Police des titres' },
                                  { key: 'theme_font_body', label: 'Police du texte courant' },
                                ].map(({ key, label }) => (
                                  <div key={key}>
                                    <label style={lbl}>{label}</label>
                                    <select value={editedSettings[key] || ''}
                                      onChange={e => setEditedSettings(p => ({ ...p, [key]: e.target.value }))}
                                      style={inp}>
                                      <option value="">— Police du preset —</option>
                                      {FONT_CHOICES.map(f => (
                                        <option key={f.id} value={f.id}>{f.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                ))}
                              </div>

                            {/* Position du logo */}
                            <div style={{ marginBottom: '1.25rem' }}>
                              <label style={lbl}>Position dans le header</label>
                              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                                {[['Gauche', 'left'], ['Centré', 'center']].map(([label, val]) => (
                                  <button key={val} onClick={() => setEditedSettings(p => ({ ...p, logo_position: val }))}
                                    style={{ padding: '.45rem 1.1rem', fontSize: '.82rem', fontWeight: 600, border: `1.5px solid ${(editedSettings['logo_position'] || 'left') === val ? '#2d5f54' : '#ddd'}`, borderRadius: '.5rem', cursor: 'pointer', background: (editedSettings['logo_position'] || 'left') === val ? '#2d5f54' : 'white', color: (editedSettings['logo_position'] || 'left') === val ? 'white' : '#555', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                                    {val === 'left'
                                      ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><line x1="14" y1="6" x2="21" y2="6"/></svg>{label}</>
                                      : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="8" y2="6"/><rect x="9" y="3" width="6" height="6" rx="1"/><line x1="16" y1="6" x2="21" y2="6"/></svg>{label}</>
                                    }
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Forme du logo */}
                            <div style={{ marginBottom: '1.25rem' }}>
                              <label style={lbl}>Forme du logo</label>
                              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                                {[['Cercle', 'circle'], ['Arrondi', 'rounded'], ['Carré', 'square']].map(([label, val]) => {
                                  const active = (editedSettings['logo_shape'] || 'circle') === val;
                                  const size = 32;
                                  const radius = val === 'circle' ? '50%' : val === 'rounded' ? '6px' : '2px';
                                  return (
                                    <button key={val} onClick={() => setEditedSettings(p => ({ ...p, logo_shape: val }))}
                                      style={{ padding: '.45rem 1rem', fontSize: '.82rem', fontWeight: 600, border: `1.5px solid ${active ? '#2d5f54' : '#ddd'}`, borderRadius: '.5rem', cursor: 'pointer', background: active ? '#2d5f54' : 'white', color: active ? 'white' : '#555', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                                      <div style={{ width: size, height: size, borderRadius: radius, background: active ? 'rgba(255,255,255,.3)' : '#e8e4df', border: `1px solid ${active ? 'rgba(255,255,255,.4)' : '#ccc'}`, flexShrink: 0 }} />
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            </div>
                          </div>
                        )}
                        {/* ── VISIBILITÉ — toggles ── */}
                        {settingsGroup === 'visibility' && (
                          <div style={{ marginBottom: '1.5rem' }}>
                            <p style={{ fontSize: '.82rem', color: '#888', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                              Contrôlez si chaque page est indexée par Google (robots meta). La navigation et le footer se gèrent dans l&apos;onglet <strong>Pages → Navigation</strong>.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '.75rem' }}>
                              {groupItems.map(s => {
                                const isOn = (editedSettings[s.key] ?? 'true') !== 'false';
                                return (
                                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.75rem 1rem', background: '#faf9f7', borderRadius: '.65rem', border: '1.5px solid #ece8e2' }}>
                                    <span style={{ fontSize: '.88rem', color: '#444', fontWeight: 500 }}>{s.label}</span>
                                    <button
                                      onClick={() => setEditedSettings(prev => ({ ...prev, [s.key]: isOn ? 'false' : 'true' }))}
                                      style={{
                                        position: 'relative', width: 46, height: 26, borderRadius: 9999,
                                        border: 'none', cursor: 'pointer', flexShrink: 0,
                                        background: isOn ? '#2d5f54' : '#d1d5db', transition: 'background .18s',
                                      }}
                                      title={isOn ? 'Indexé — cliquer pour désindexer' : 'Non indexé — cliquer pour indexer'}
                                    >
                                      <div style={{
                                        position: 'absolute', top: 3, left: isOn ? 23 : 3,
                                        width: 20, height: 20, borderRadius: '50%', background: 'white',
                                        boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .18s',
                                      }} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                          {settingsGroup !== 'visibility' && groupItems.filter(s => !(settingsGroup === 'branding' && BRANDING_PANEL_KEYS.includes(s.key))).map(s => {
                            const field = s as { key: string; label: string; type: string; options?: string[]; optionLabels?: string[] };
                            return (
                            <div key={s.key}>
                              <label style={lbl} htmlFor={`set-${s.key}`}>{s.label}</label>
                              {field.type === 'image' ? (
                                <div>
                                  {editedSettings[s.key] && (
                                    <div style={{ marginBottom: '.5rem' }}>
                                      <img src={editedSettings[s.key]} alt="Logo" style={{ maxHeight: 80, maxWidth: 300, objectFit: 'contain', borderRadius: '.4rem', border: '1px solid #eee', padding: '.5rem', background: '#fafafa' }} />
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <label style={{ padding: '.5rem 1rem', background: '#2d5f54', color: 'white', borderRadius: '.4rem', cursor: 'pointer', fontSize: '.85rem' }}>
                                      ⬆️ Choisir une image
                                      <input type="file" accept="image/*" style={{ display: 'none' }}
                                        onChange={e => handleImageFile(e, url => setEditedSettings(prev => ({ ...prev, [s.key]: url })))} />
                                    </label>
                                    <input id={`set-${s.key}`} value={editedSettings[s.key] || ''} onChange={e => setEditedSettings(prev => ({ ...prev, [s.key]: e.target.value }))} style={{ ...inp, flex: 1 }} placeholder="Ou coller une URL..." />
                                    {editedSettings[s.key] && <button onClick={() => setEditedSettings(prev => ({ ...prev, [s.key]: '' }))} style={{ padding: '.5rem .8rem', background: '#fee', color: '#c0392b', border: '1px solid #fcc', borderRadius: '.4rem', cursor: 'pointer', fontSize: '.85rem' }}>✕ Supprimer</button>}
                                  </div>
                                </div>
                              ) : field.type === 'textarea' ? (
                                <textarea id={`set-${s.key}`} value={editedSettings[s.key] || ''} onChange={e => setEditedSettings(prev => ({ ...prev, [s.key]: e.target.value }))} style={{ ...inp, height: 100, resize: 'vertical' }} placeholder={s.label} />
                              ) : field.type === 'select' && field.options ? (
                                <select
                                  id={`set-${s.key}`}
                                  value={editedSettings[s.key] || field.options[0]}
                                  onChange={e => setEditedSettings(prev => ({ ...prev, [s.key]: e.target.value }))}
                                  style={{ ...inp, cursor: 'pointer' }}
                                >
                                  {field.options.map((opt: string, i: number) => (
                                    <option key={opt} value={opt}>{field.optionLabels?.[i] || opt}</option>
                                  ))}
                                </select>
                              ) : (
                                <input id={`set-${s.key}`} value={editedSettings[s.key] || ''}
                                  onChange={e => setEditedSettings(prev => ({ ...prev, [s.key]: e.target.value }))}
                                  style={inp} placeholder={s.label} />
                              )}
                            </div>
                            );
                          })}
                          {settingsGroup !== 'visibility' && groupItems.length === 0 && (
                            <p style={{ color: '#aaa', fontSize: '.9rem', textAlign: 'center', padding: '2rem' }}>Aucun paramètre dans ce groupe.</p>
                          )}
                        </div>
                        <button onClick={saveSettings} disabled={savingSettings}
                          style={{ marginTop: '1.75rem', padding: '.7rem 2rem', background: '#2d5f54', color: 'white', border: 'none', borderRadius: '.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '.9rem', opacity: savingSettings ? .7 : 1 }}
                        >{savingSettings ? '⏳ Sauvegarde…' : '💾 Sauvegarder'}</button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

const lbl: React.CSSProperties = {
  display: 'block', fontWeight: 600, fontSize: '.85rem', color: '#555', marginBottom: '.35rem',
};
const inp: React.CSSProperties = {
  width: '100%', padding: '.65rem .9rem',
  border: '1.5px solid #e0dbd5', borderRadius: '.5rem',
  fontSize: '.9rem', outline: 'none', background: '#faf9f7', color: '#1a1a1a',
};
const metaChip: React.CSSProperties = {
  padding: '.35rem .65rem',
  borderRadius: '9999px',
  background: '#f0e8e4',
  color: '#2d5f54',
  fontSize: '.76rem',
  fontWeight: 600,
};
const previewPanel: React.CSSProperties = {
  marginTop: '1.75rem',
  padding: '1.25rem',
  borderRadius: '1rem',
  background: '#f8f4ef',
  border: '1px solid #ece3d8',
};
const previewFrame: React.CSSProperties = {
  background: 'white',
  borderRadius: '1rem',
  padding: '1.5rem',
  boxShadow: '0 1px 4px rgba(0,0,0,.05)',
};
const previewImageFallback: React.CSSProperties = {
  minHeight: 220,
  marginBottom: '1.5rem',
  borderRadius: '.9rem',
  background: 'linear-gradient(135deg, #f2e8dc 0%, #d9ebe6 100%)',
  color: '#6d625a',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '1.5rem',
  fontWeight: 600,
};
const previewBody: React.CSSProperties = {
  color: '#302925',
  lineHeight: 1.8,
  fontSize: '1rem',
};



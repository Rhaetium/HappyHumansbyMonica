'use client'

import React from 'react'
import {
  BLOCK_TEMPLATES, blankBlock, duplicateBlock, moveBlock, parseBlocks, removeBlock,
  serializeBlocks, updateBlock,
  type CustomBlock, type CustomBlockType,
} from '@/lib/custom-sections'
import { BG_OPTIONS, SPACE_OPTIONS, normalizeAnchor, normalizeStyle, videoEmbedUrl, type BlockBg, type BlockSpace, type BlockStyle } from '@/lib/block-options'

/**
 * Éditeur de blocs personnalisés (« ajouter des sections ») d'une page.
 * Partagé par l'admin des pages (clé `custom_sections`) et par l'admin des
 * pages libres (blocs d'une page entière).
 */
const lbl: React.CSSProperties = {
  display: 'block', fontWeight: 600, fontSize: '.85rem', color: '#555', marginBottom: '.35rem',
}
const inp: React.CSSProperties = {
  width: '100%', padding: '.65rem .9rem',
  border: '1.5px solid #e0dbd5', borderRadius: '.5rem',
  fontSize: '.9rem', outline: 'none', background: '#faf9f7', color: '#1a1a1a',
}

export default function CustomSectionsEditor({ value, onChange, hint }: { value: string; onChange: (v: string) => void; hint?: string }) {
  const blocks = parseBlocks(value);
  const apply = (next: CustomBlock[]) => onChange(serializeBlocks(next));
  const set = (id: string, patch: Partial<CustomBlock>) => apply(updateBlock(blocks, id, patch));
  // Réglages avancés : fusionne le changement, retire ce qui est par défaut (voir lib/block-options.ts)
  const setStyle = (b: CustomBlock, patch: Partial<BlockStyle>) =>
    set(b.id, { style: normalizeStyle({ ...b.style, ...patch }) });
  const smallBtn: React.CSSProperties = { width: 28, height: 28, borderRadius: '.4rem', border: '1px solid #d6d3d1', background: 'white', color: '#44403c', fontSize: '.8rem', cursor: 'pointer' };
  const T = (label: string, val: string | undefined, onV: (v: string) => void, placeholder = '') => (
    <div style={{ marginBottom: '.5rem' }}>
      <label style={{ ...lbl, fontSize: '.78rem' }}>{label}</label>
      <input value={val ?? ''} onChange={e => onV(e.target.value)} placeholder={placeholder} style={{ ...inp, padding: '.5rem .7rem', fontSize: '.85rem' }} />
    </div>
  );
  const TA = (label: string, val: string | undefined, onV: (v: string) => void) => (
    <div style={{ marginBottom: '.5rem' }}>
      <label style={{ ...lbl, fontSize: '.78rem' }}>{label}</label>
      <textarea value={val ?? ''} onChange={e => onV(e.target.value)} style={{ ...inp, padding: '.5rem .7rem', fontSize: '.85rem', height: 80, resize: 'vertical' }} />
    </div>
  );
  return (
    <div>
      <p style={{ fontSize: '.8rem', color: '#7a7a7a', margin: '0 0 .75rem', lineHeight: 1.5 }}>
        {hint ?? `Ajoutez des sections (texte, image, vidéo, cartes, témoignages, FAQ, chiffres clés, boutons…), déplacez-les avec ▲ ▼, copiez-les avec ⧉, et réglez leur fond, leur espacement ou leur ancre dans « ⚙️ Réglages avancés ».
        Elles s'affichent juste avant l'appel à l'action final. Enregistrez le brouillon puis publiez.`}
      </p>
      {blocks.length === 0 && <p style={{ fontSize: '.82rem', color: '#a8a29e', margin: '0 0 .75rem' }}>Aucun bloc pour le moment.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', marginBottom: '.9rem' }}>
        {blocks.map((b, i) => {
          const tpl = BLOCK_TEMPLATES.find(t => t.type === b.type);
          return (
            <div key={b.id} style={{ border: '1.5px solid #ece8e2', borderRadius: '.6rem', padding: '.7rem .8rem', background: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.6rem' }}>
                <span style={{ fontSize: '.75rem', fontWeight: 700, color: '#a8a29e' }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: '.85rem', fontWeight: 600 }}>
                  {tpl ? `${tpl.emoji} ${tpl.label}` : b.type}
                  {'badge' in b && b.badge ? ` — ${b.badge}` : ''}
                  {'title' in b && b.title ? ` — ${(b.title as string).slice(0, 40)}` : ''}
                </span>
                <button type="button" aria-label="Monter" onClick={() => apply(moveBlock(blocks, b.id, -1))} style={smallBtn}>▲</button>
                <button type="button" aria-label="Descendre" onClick={() => apply(moveBlock(blocks, b.id, 1))} style={smallBtn}>▼</button>
                <button type="button" aria-label="Dupliquer ce bloc" title="Dupliquer" onClick={() => apply(duplicateBlock(blocks, b.id))} style={smallBtn}>⧉</button>
                <button type="button" aria-label="Supprimer" onClick={() => { if (confirm('Supprimer ce bloc ?')) apply(removeBlock(blocks, b.id)); }} style={{ ...smallBtn, color: '#dc2626' }}>✕</button>
              </div>
              {b.type === 'split' && (
                <>
                  {T('Badge (petit sur-titre)', b.badge, v => set(b.id, { badge: v }))}
                  {T('Titre', b.title, v => set(b.id, { title: v }))}
                  {TA('Texte', b.text, v => set(b.id, { text: v }))}
                  {T("Image (URL — via la médiathèque ou collée)", b.image, v => set(b.id, { image: v }), 'https://…')}
                  {T("Texte alternatif de l'image", b.imageAlt, v => set(b.id, { imageAlt: v }))}
                  {T('Bouton (libellé, vide = sans bouton)', b.ctaLabel, v => set(b.id, { ctaLabel: v }))}
                  {T('Bouton (lien)', b.ctaHref, v => set(b.id, { ctaHref: v }), '/contact')}
                  <div style={{ marginBottom: '.5rem' }}>
                    <label style={{ ...lbl, fontSize: '.78rem' }}>Disposition texte / image</label>
                    <select value={b.layout} onChange={e => set(b.id, { layout: e.target.value as 'image-right' | 'image-left' })} style={{ ...inp, padding: '.5rem .7rem', fontSize: '.85rem' }}>
                      <option value="image-right">Texte à gauche, image à droite</option>
                      <option value="image-left">Image à gauche, texte à droite</option>
                    </select>
                  </div>
                </>
              )}
              {b.type === 'texte' && (
                <>
                  {T('Badge (petit sur-titre)', b.badge, v => set(b.id, { badge: v }))}
                  {T('Titre (vide = sans titre)', b.title, v => set(b.id, { title: v }))}
                  {TA('Texte', b.text, v => set(b.id, { text: v }))}
                  <div style={{ marginBottom: '.5rem' }}>
                    <label style={{ ...lbl, fontSize: '.78rem' }}>Alignement</label>
                    <select value={b.align} onChange={e => set(b.id, { align: e.target.value as 'left' | 'center' })} style={{ ...inp, padding: '.5rem .7rem', fontSize: '.85rem' }}>
                      <option value="left">À gauche</option>
                      <option value="center">Centré</option>
                    </select>
                  </div>
                </>
              )}
              {b.type === 'image' && (
                <>
                  {T("Image (URL — via la médiathèque ou collée)", b.image, v => set(b.id, { image: v }), 'https://…')}
                  {T("Texte alternatif", b.alt, v => set(b.id, { alt: v }))}
                  {T('Légende (vide = sans légende)', b.caption, v => set(b.id, { caption: v }))}
                </>
              )}
              {b.type === 'cta' && (
                <>
                  {T('Titre', b.title, v => set(b.id, { title: v }))}
                  {TA('Texte (vide = sans texte)', b.text, v => set(b.id, { text: v }))}
                  {T('Bouton', b.button, v => set(b.id, { button: v }))}
                  {T('Lien du bouton', b.href, v => set(b.id, { href: v }), '/contact')}
                </>
              )}
              {b.type === 'faq' && (
                <>
                  {T('Badge (petit sur-titre)', b.badge, v => set(b.id, { badge: v }))}
                  {T('Titre (vide = sans titre)', b.title, v => set(b.id, { title: v }))}
                  {(Array.isArray(b.items) ? b.items : []).map((it, qi) => {
                    const setItem = (patch: Partial<{ q: string; a: string }>) =>
                      set(b.id, { items: (b.items ?? []).map((x, xi) => (xi === qi ? { ...x, ...patch } : x)) });
                    return (
                      <div key={qi} style={{ border: '1px dashed #d6d3d1', borderRadius: '.5rem', padding: '.55rem .65rem', marginBottom: '.5rem' }}>
                        {T(`Question ${qi + 1}`, it.q, v => setItem({ q: v }))}
                        {TA('Réponse', it.a, v => setItem({ a: v }))}
                        <button type="button" onClick={() => set(b.id, { items: (b.items ?? []).filter((_, xi) => xi !== qi) })}
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '.78rem' }}>Retirer cette question</button>
                      </div>
                    );
                  })}
                  <button type="button" onClick={() => set(b.id, { items: [...(b.items ?? []), { q: '', a: '' }] })}
                    style={{ padding: '.35rem .75rem', border: '1.5px solid #2d5f54', background: 'white', color: '#2d5f54', borderRadius: '.5rem', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600 }}>+ Ajouter une question</button>
                  <p style={{ fontSize: '.74rem', color: '#7a7a7a', margin: '.5rem 0 0', lineHeight: 1.4 }}>
                    Les questions sont déclarées à Google et aux assistants IA. Une seule FAQ par page est idéale ; une question sans réponse n&apos;est pas affichée.
                  </p>
                </>
              )}
              {b.type === 'liste' && (
                <>
                  {T('Badge (petit sur-titre)', b.badge, v => set(b.id, { badge: v }))}
                  {T('Titre (vide = sans titre)', b.title, v => set(b.id, { title: v }))}
                  {TA('Points (un par ligne)', b.text, v => set(b.id, { text: v }))}
                </>
              )}
              {b.type === 'chiffres' && (
                <>
                  {T('Titre (vide = sans titre)', b.title, v => set(b.id, { title: v }))}
                  {TA("Chiffres (un par ligne : « valeur | libellé »)", b.text, v => set(b.id, { text: v }))}
                  <p style={{ fontSize: '.74rem', color: '#7a7a7a', margin: '0', lineHeight: 1.4 }}>Exemple : « 10 ans | d&apos;expérience en marketing international ». N&apos;indiquez que des chiffres réels.</p>
                </>
              )}
              {b.type === 'citation' && (
                <>
                  {TA('Citation', b.quote, v => set(b.id, { quote: v }))}
                  {T('Auteur (vide = anonyme)', b.author, v => set(b.id, { author: v }))}
                </>
              )}
              {b.type === 'cartes' && (
                <>
                  {T('Badge (petit sur-titre)', b.badge, v => set(b.id, { badge: v }))}
                  {T('Titre (vide = sans titre)', b.title, v => set(b.id, { title: v }))}
                  {TA('Cartes (une par ligne : « emoji | titre | texte »)', b.text, v => set(b.id, { text: v }))}
                  <p style={{ fontSize: '.74rem', color: '#7a7a7a', margin: 0, lineHeight: 1.4 }}>Exemple : « 🌱 | Écoute | Un espace pour dire ce qui compte ». L&apos;emoji est facultatif : « Titre | Texte » fonctionne aussi.</p>
                </>
              )}
              {b.type === 'temoignages' && (
                <>
                  {T('Titre (vide = sans titre)', b.title, v => set(b.id, { title: v }))}
                  {TA('Témoignages (un par ligne : « texte | prénom, rôle »)', b.text, v => set(b.id, { text: v }))}
                  <p style={{ fontSize: '.74rem', color: '#7a7a7a', margin: 0, lineHeight: 1.4 }}>Seuls de vrais témoignages, avec l&apos;accord de la personne.</p>
                </>
              )}
              {b.type === 'video' && (
                <>
                  {T('Adresse de la vidéo (YouTube ou Vimeo)', b.url, v => set(b.id, { url: v }), 'https://www.youtube.com/watch?v=…')}
                  {T('Titre (vide = sans titre)', b.title, v => set(b.id, { title: v }))}
                  {T('Légende (vide = sans légende)', b.caption, v => set(b.id, { caption: v }))}
                  {b.url.trim() && !videoEmbedUrl(b.url) && (
                    <p role="alert" style={{ fontSize: '.78rem', color: '#b42318', margin: 0 }}>Adresse non reconnue : collez un lien https:// de YouTube ou Vimeo. La vidéo ne s&apos;affiche pas tant qu&apos;il est invalide.</p>
                  )}
                </>
              )}
              {b.type === 'bouton' && (
                <>
                  {T('Texte du bouton', b.label, v => set(b.id, { label: v }))}
                  {T('Lien du bouton', b.href, v => set(b.id, { href: v }), '/contact')}
                  <div style={{ marginBottom: '.5rem' }}>
                    <label style={{ ...lbl, fontSize: '.78rem' }}>Alignement</label>
                    <select value={b.align} onChange={e => set(b.id, { align: e.target.value as 'left' | 'center' })} style={{ ...inp, padding: '.5rem .7rem', fontSize: '.85rem' }}>
                      <option value="center">Centré</option>
                      <option value="left">À gauche</option>
                    </select>
                  </div>
                </>
              )}
              {b.type === 'espace' && (
                <div style={{ marginBottom: '.5rem' }}>
                  <label style={{ ...lbl, fontSize: '.78rem' }}>Hauteur de l&apos;espace</label>
                  <select value={b.size} onChange={e => set(b.id, { size: e.target.value as 'petit' | 'moyen' | 'grand' })} style={{ ...inp, padding: '.5rem .7rem', fontSize: '.85rem' }}>
                    <option value="petit">Petit</option>
                    <option value="moyen">Moyen</option>
                    <option value="grand">Grand</option>
                  </select>
                </div>
              )}
              <details style={{ marginTop: '.6rem', borderTop: '1px dashed #e0dbd5', paddingTop: '.5rem' }}>
                <summary style={{ cursor: 'pointer', fontSize: '.78rem', fontWeight: 600, color: '#2d5f54' }}>
                  ⚙️ Réglages avancés{b.style ? ' (personnalisés)' : ''}
                </summary>
                <div style={{ display: 'grid', gap: '.5rem', marginTop: '.6rem' }}>
                  <div>
                    <label style={{ ...lbl, fontSize: '.78rem' }}>Fond du bloc</label>
                    <select value={b.style?.bg ?? 'auto'} onChange={e => setStyle(b, { bg: e.target.value as BlockBg })} style={{ ...inp, padding: '.5rem .7rem', fontSize: '.85rem' }}>
                      {BG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ ...lbl, fontSize: '.78rem' }}>Espacement autour du contenu</label>
                    <select value={b.style?.space ?? 'normal'} onChange={e => setStyle(b, { space: e.target.value as BlockSpace })} style={{ ...inp, padding: '.5rem .7rem', fontSize: '.85rem' }}>
                      {SPACE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: '.5rem' }}>
                    <label style={{ ...lbl, fontSize: '.78rem' }}>Ancre (lien direct vers ce bloc)</label>
                    {/* Champ libre, nettoyé à la sortie : « Mes Tarifs » devient « mes-tarifs » */}
                    <input key={b.style?.anchor ?? ''} defaultValue={b.style?.anchor ?? ''} placeholder="ex. tarifs"
                      onBlur={e => setStyle(b, { anchor: e.target.value })}
                      style={{ ...inp, padding: '.5rem .7rem', fontSize: '.85rem' }} />
                  </div>
                  {b.style?.anchor && <p style={{ fontSize: '.74rem', color: '#7a7a7a', margin: '-.2rem 0 0' }}>Lien à utiliser : <code>#{normalizeAnchor(b.style.anchor)}</code> (ex. dans le menu ou un bouton).</p>}
                  <label style={{ display: 'flex', gap: '.5rem', alignItems: 'center', fontSize: '.82rem' }}>
                    <input type="checkbox" checked={!!b.style?.hideMobile} onChange={e => setStyle(b, { hideMobile: e.target.checked })} /> Masquer sur téléphone
                  </label>
                  <label style={{ display: 'flex', gap: '.5rem', alignItems: 'center', fontSize: '.82rem' }}>
                    <input type="checkbox" checked={!!b.style?.hideDesktop} onChange={e => setStyle(b, { hideDesktop: e.target.checked })} /> Masquer sur ordinateur
                  </label>
                </div>
              </details>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        {BLOCK_TEMPLATES.map(t => (
          <button key={t.type} type="button"
            onClick={() => apply([...blocks, blankBlock(t.type as CustomBlockType)])}
            style={{ padding: '.45rem .9rem', background: '#2d5f54', color: 'white', border: 'none', borderRadius: '.5rem', cursor: 'pointer', fontSize: '.82rem', fontWeight: 600 }}>
            + {t.emoji} {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

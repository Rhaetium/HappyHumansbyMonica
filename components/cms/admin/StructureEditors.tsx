'use client';

import React from 'react';
import { parseLayout, fullOrder, serializeLayout, moveSection, toggleSection, type SectionDef, type SectionsLayout } from '@/lib/cms-sections';
import { LIST_DEFS, parseItems, serializeList, blankItem, moveListItem, setListItemField, duplicateListItem, removeListItem, type ListItem } from '@/lib/cms-lists';
import { lbl, inp } from '@/components/cms/admin/styles';

// ─── Config pages CMS ─────────────────────────────────────────
// ── Éditeur de structure : ordre et affichage des sections d'une page ─────────────
// (logique pure et testée : lib/cms-sections.ts). Les sections verrouillées (🔒) restent en place.
export function SectionsEditor({ defs, value, onChange }: { defs: SectionDef[]; value: string; onChange: (v: string) => void }) {
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
export function ListEditor({ defKey, initialItems, value, onChange }: { defKey: string; initialItems: ListItem[]; value: string; onChange: (v: string) => void }) {
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


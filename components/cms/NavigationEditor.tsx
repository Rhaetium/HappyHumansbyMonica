'use client';

import React, { useEffect, useState } from 'react';
import { DEFAULT_NAV, NAV_UPDATED_EVENT, type NavItem } from '@/hooks/useCmsNavigation';
import { bustCmsCache } from '@/hooks/useCmsContent';
import {
  addNavItem, addSubItem, cloneNav, moveItem, moveItemBy, moveSubItem, moveSubItemBy,
  removeNavItem, removeSubItem, updateNavItem, updateSubItem,
} from '@/lib/cms-nav';

const inp: React.CSSProperties = {
  width: '100%', padding: '.55rem .8rem', border: '1.5px solid #e0dbd5', borderRadius: '.5rem',
  fontSize: '.9rem', outline: 'none', background: '#faf9f7', color: '#1a1a1a',
};
const smallBtn: React.CSSProperties = {
  padding: '.3rem .55rem', background: 'white', border: '1px solid #ddd', borderRadius: '.4rem',
  cursor: 'pointer', fontSize: '.8rem', color: '#555',
};

/**
 * Éditeur du menu du site : renommer, changer l'adresse, masquer/afficher, ajouter, supprimer et RÉORDONNER par
 * glisser-déposer. Utilisé par l'admin (Pages → Navigation) et par le mode « Éditer le site » (bouton « Menu »).
 * Sans menu enregistré, il part du menu d'origine du site (avant, la liste restait vide et rien n'était modifiable).
 */
export default function NavigationEditor({ onSaved }: { onSaved?: () => void }) {
  const [nav, setNav] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  // Verrou d'ordre : quand il est actif, glisser-déposer ne réordonne plus le menu
  const [locked, setLocked] = useState(false);
  const [lockDirty, setLockDirty] = useState(false);
  const [dragSrc, setDragSrc] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [dragSrcSub, setDragSrcSub] = useState<{ parentId: string; idx: number } | null>(null);
  const [dragOverSub, setDragOverSub] = useState<{ parentId: string; idx: number } | null>(null);

  useEffect(() => {
    fetch('/api/cms/navigation', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : { nav: null }))
      .then(d => {
        setNav(Array.isArray(d.nav) && d.nav.length > 0 ? d.nav : cloneNav(DEFAULT_NAV));
        setLocked(Boolean(d.locked));
      })
      .catch(() => { setNav(cloneNav(DEFAULT_NAV)); setError('Menu enregistré illisible : le menu d’origine est affiché.'); })
      .finally(() => setLoading(false));
  }, []);

  const change = (fn: (items: NavItem[]) => NavItem[]) => { setNav(fn); setDirty(true); setSaved(false); };

  const onItemDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (!locked && dragSrc !== null) change(items => moveItem(items, dragSrc, dropIdx));
    setDragSrc(null); setDragOver(null);
  };
  const onSubDrop = (e: React.DragEvent, parentId: string, dropIdx: number) => {
    e.preventDefault();
    if (!locked && dragSrcSub && dragSrcSub.parentId === parentId) change(items => moveSubItem(items, parentId, dragSrcSub.idx, dropIdx));
    setDragSrcSub(null); setDragOverSub(null);
  };
  const toggleLock = () => { setLocked(l => !l); setLockDirty(true); setSaved(false); };

  const saveNav = async () => {
    setSaving(true); setError(null); setSaved(false);
    try {
      const res = await fetch('/api/cms/navigation', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nav, locked }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(res.status === 401 ? 'Session expirée : reconnectez-vous à l’administration puis réessayez.' : data.error || `Erreur ${res.status}`);
      }
      bustCmsCache('navigation');
      window.dispatchEvent(new Event(NAV_UPDATED_EVENT));
      setSaved(true); setDirty(false); setLockDirty(false);
      onSaved?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>Chargement du menu…</p>;

  const eye = (visible: boolean) => (visible ? '👁️' : '🚫');

  return (
    <div>
      {error && (
        <div style={{ padding: '.7rem 1rem', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '.5rem', color: '#dc2626', fontSize: '.88rem', marginBottom: '1rem' }}>
          ❌ {error}
        </div>
      )}
      {saved && (
        <div style={{ padding: '.7rem 1rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '.5rem', color: '#047857', fontSize: '.88rem', marginBottom: '1rem' }}>
          ✅ Menu enregistré : il apparaît sur le site dans quelques secondes.
        </div>
      )}
      <p style={{ fontSize: '.85rem', color: '#666', marginBottom: '1rem', lineHeight: 1.5 }}>
        <strong>Glissez ⠿</strong> pour changer l’ordre · modifiez le nom et l’adresse de chaque lien · 👁️ masque ou affiche un lien · ➕ ajoute un lien.
        Pensez à <strong>enregistrer</strong> en bas.
      </p>

      {/* Verrou d'ordre : protège la disposition du menu contre un glisser-déposer accidentel */}
      <div style={{ display: 'flex', gap: '.9rem', alignItems: 'flex-start', padding: '.85rem 1rem', marginBottom: '1.25rem', borderRadius: '.6rem', border: `1.5px solid ${locked ? '#fcd34d' : '#e8e4df'}`, background: locked ? '#fffbeb' : '#faf9f7' }}>
        <button
          type="button"
          role="switch"
          aria-checked={locked}
          onClick={toggleLock}
          title={locked ? 'Déverrouiller : l’ordre pourra de nouveau être modifié' : 'Verrouiller : l’ordre ne pourra plus être déplacé'}
          style={{ flexShrink: 0, width: 46, height: 26, borderRadius: 9999, border: 'none', cursor: 'pointer', background: locked ? '#d97706' : '#d1d5db', position: 'relative', transition: 'background .2s', marginTop: 2 }}
        >
          <span style={{ position: 'absolute', top: 3, left: locked ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .2s', display: 'block' }} />
        </button>
        <div>
          <p style={{ margin: 0, fontSize: '.88rem', fontWeight: 700, color: locked ? '#92400e' : '#44403c' }}>
            {locked ? '🔒 Ordre du menu verrouillé' : '🔓 Ordre du menu libre'}
          </p>
          <p style={{ margin: '.2rem 0 0', fontSize: '.8rem', color: '#7a7a7a', lineHeight: 1.45 }}>
            {locked
              ? 'Le glisser-déposer est désactivé : les liens ne peuvent plus être déplacés par erreur. Vous pouvez toujours renommer, masquer, ajouter ou supprimer un lien.'
              : 'Déplacez les liens avec ▲ ▼ (ou par glisser-déposer sur ordinateur). Activez le verrou une fois le menu en place pour le protéger.'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '1rem' }}>
        {nav.map((item, idx) => (
          <div key={item.id}>
            {dragOver === idx && dragSrc !== null && dragSrc !== idx && <div style={{ height: 3, background: '#2d5f54', borderRadius: 2, margin: '2px .5rem' }} />}
            <div
              draggable={!locked}
              onDragStart={e => { if (locked) { e.preventDefault(); return; } setDragSrc(idx); e.dataTransfer.effectAllowed = 'move'; }}
              onDragOver={e => { if (locked) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(idx); }}
              onDrop={e => onItemDrop(e, idx)}
              onDragEnd={() => { setDragSrc(null); setDragOver(null); }}
              style={{ background: '#faf9f7', border: dragOver === idx ? '2px solid #2d5f54' : '1px solid #e8e4df', borderRadius: '.75rem', padding: '.8rem', margin: '.25rem 0', opacity: dragSrc === idx ? 0.4 : 1 }}
            >
              <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ cursor: locked ? 'not-allowed' : 'grab', padding: '.35rem .25rem', color: locked ? '#d6d3d1' : '#999', fontSize: '1.1rem', lineHeight: 1, userSelect: 'none' }} title={locked ? 'Ordre verrouillé : déverrouillez pour déplacer ce lien' : 'Glisser pour changer l’ordre'}>⠿</span>
                <button type="button" aria-label="Monter ce lien" title="Monter" disabled={locked || idx === 0}
                  onClick={() => change(items => moveItemBy(items, idx, -1))}
                  style={{ ...smallBtn, opacity: locked || idx === 0 ? 0.35 : 1, cursor: locked || idx === 0 ? 'not-allowed' : 'pointer' }}>▲</button>
                <button type="button" aria-label="Descendre ce lien" title="Descendre" disabled={locked || idx === nav.length - 1}
                  onClick={() => change(items => moveItemBy(items, idx, 1))}
                  style={{ ...smallBtn, opacity: locked || idx === nav.length - 1 ? 0.35 : 1, cursor: locked || idx === nav.length - 1 ? 'not-allowed' : 'pointer' }}>▼</button>
                <button type="button" onClick={() => change(items => updateNavItem(items, item.id, { visible: !item.visible }))}
                  title={item.visible ? 'Visible : cliquer pour masquer' : 'Masqué : cliquer pour afficher'}
                  style={{ ...smallBtn, background: item.visible ? '#ecfdf5' : '#fef2f2', borderColor: item.visible ? '#6ee7b7' : '#fca5a5' }}>
                  {eye(item.visible)}
                </button>
                <input value={item.label} onChange={e => change(items => updateNavItem(items, item.id, { label: e.target.value }))}
                  placeholder="Nom du lien (ex. Entreprises)" aria-label="Nom du lien" style={{ ...inp, flex: '1 1 150px', minWidth: 120 }} />
                {!item.isDropdown && (
                  <input value={item.href || ''} onChange={e => change(items => updateNavItem(items, item.id, { href: e.target.value }))}
                    placeholder="Adresse (ex. /contact)" aria-label="Adresse du lien" style={{ ...inp, flex: '1 1 150px', minWidth: 120 }} />
                )}
                {item.isDropdown && <span style={{ padding: '.2rem .5rem', background: '#e0f2fe', color: '#0369a1', borderRadius: '.3rem', fontSize: '.72rem', fontWeight: 600 }}>Menu déroulant</span>}
                {item.isCta && <span style={{ padding: '.2rem .5rem', background: '#dcfce7', color: '#15803d', borderRadius: '.3rem', fontSize: '.72rem', fontWeight: 600 }}>Bouton</span>}
                <button type="button" onClick={() => { if (confirm(`Supprimer « ${item.label} » du menu ?`)) change(items => removeNavItem(items, item.id)); }}
                  title="Supprimer ce lien" style={{ ...smallBtn, color: '#b91c1c' }}>🗑</button>
              </div>

              {item.isDropdown && (
                <div style={{ marginLeft: '2rem', marginTop: '.6rem', display: 'flex', flexDirection: 'column' }}>
                  <p style={{ fontSize: '.75rem', fontWeight: 600, color: '#888', margin: '0 0 .3rem' }}>Liens du menu déroulant :</p>
                  {(item.dropdownItems || []).map((sub, subIdx) => {
                    const dragging = dragSrcSub?.parentId === item.id && dragSrcSub.idx === subIdx;
                    const over = dragOverSub?.parentId === item.id && dragOverSub.idx === subIdx;
                    return (
                      <div key={sub.id}>
                        {over && dragSrcSub && !dragging && <div style={{ height: 2, background: '#2d5f54', borderRadius: 2, margin: '2px .25rem' }} />}
                        <div draggable={!locked}
                          onDragStart={e => { e.stopPropagation(); if (locked) { e.preventDefault(); return; } setDragSrcSub({ parentId: item.id, idx: subIdx }); e.dataTransfer.effectAllowed = 'move'; }}
                          onDragOver={e => { if (locked) return; e.preventDefault(); e.stopPropagation(); setDragOverSub({ parentId: item.id, idx: subIdx }); }}
                          onDrop={e => { e.stopPropagation(); onSubDrop(e, item.id, subIdx); }}
                          onDragEnd={() => { setDragSrcSub(null); setDragOverSub(null); }}
                          style={{ display: 'flex', gap: '.4rem', alignItems: 'center', flexWrap: 'wrap', padding: '.3rem', borderRadius: '.4rem', opacity: dragging ? 0.4 : 1, background: over ? '#f0fdf4' : 'transparent' }}>
                          <span style={{ cursor: 'grab', color: '#aaa', userSelect: 'none' }} title="Glisser pour changer l’ordre">⠿</span>
                          <button type="button" aria-label="Monter ce lien" title="Monter" disabled={locked || subIdx === 0}
                            onClick={() => change(items => moveSubItemBy(items, item.id, subIdx, -1))}
                            style={{ ...smallBtn, opacity: locked || subIdx === 0 ? 0.35 : 1, cursor: locked || subIdx === 0 ? 'not-allowed' : 'pointer' }}>▲</button>
                          <button type="button" aria-label="Descendre ce lien" title="Descendre" disabled={locked || subIdx === (item.dropdownItems?.length ?? 0) - 1}
                            onClick={() => change(items => moveSubItemBy(items, item.id, subIdx, 1))}
                            style={{ ...smallBtn, opacity: locked || subIdx === (item.dropdownItems?.length ?? 0) - 1 ? 0.35 : 1, cursor: locked || subIdx === (item.dropdownItems?.length ?? 0) - 1 ? 'not-allowed' : 'pointer' }}>▼</button>
                          <button type="button" onClick={() => change(items => updateSubItem(items, item.id, sub.id, { visible: !sub.visible }))}
                            style={{ ...smallBtn, background: sub.visible ? '#ecfdf5' : '#fef2f2', borderColor: sub.visible ? '#6ee7b7' : '#fca5a5' }}>{eye(sub.visible)}</button>
                          <input value={sub.label} onChange={e => change(items => updateSubItem(items, item.id, sub.id, { label: e.target.value }))}
                            placeholder="Nom" aria-label="Nom du lien" style={{ ...inp, flex: '1 1 130px', minWidth: 100 }} />
                          <input value={sub.href || ''} onChange={e => change(items => updateSubItem(items, item.id, sub.id, { href: e.target.value }))}
                            placeholder="Adresse" aria-label="Adresse du lien" style={{ ...inp, flex: '1 1 130px', minWidth: 100 }} />
                          <button type="button" onClick={() => { if (confirm(`Supprimer « ${sub.label} » ?`)) change(items => removeSubItem(items, item.id, sub.id)); }}
                            title="Supprimer ce lien" style={{ ...smallBtn, color: '#b91c1c' }}>🗑</button>
                        </div>
                      </div>
                    );
                  })}
                  <button type="button" onClick={() => change(items => addSubItem(items, item.id))} style={{ ...smallBtn, alignSelf: 'flex-start', marginTop: '.3rem' }}>➕ Ajouter un lien dans ce menu</button>
                </div>
              )}
            </div>
          </div>
        ))}
        {/* zone de dépôt en fin de liste */}
        <div onDragOver={e => { e.preventDefault(); setDragOver(nav.length); }} onDrop={e => onItemDrop(e, nav.length)}
          style={{ height: 14, borderRadius: 4, background: dragOver === nav.length && dragSrc !== null ? '#2d5f54' : 'transparent' }} />
      </div>

      <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" onClick={saveNav} disabled={saving || (!dirty && !lockDirty)}
          style={{ padding: '.65rem 1.6rem', background: '#2d5f54', color: 'white', border: 'none', borderRadius: '.5rem', fontWeight: 700, cursor: dirty || lockDirty ? 'pointer' : 'default', fontSize: '.9rem', opacity: saving || (!dirty && !lockDirty) ? .55 : 1 }}>
          {saving ? '⏳ Enregistrement…' : '💾 Enregistrer le menu'}
        </button>
        <button type="button" onClick={() => change(items => addNavItem(items))} style={smallBtn}>➕ Ajouter un lien</button>
        <button type="button" onClick={() => { if (confirm('Revenir au menu d’origine du site ? (rien n’est enregistré tant que vous ne cliquez pas sur « Enregistrer »)')) change(() => cloneNav(DEFAULT_NAV)); }}
          style={smallBtn}>↩ Menu d’origine</button>
        {(dirty || lockDirty) && <span style={{ fontSize: '.8rem', color: '#b45309' }}>● modifications non enregistrées</span>}
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { useState, useEffect, useCallback } from 'react';

// ─── Historique des modifications d'une page ──────────────────
export function PageHistoryPanel({ page, onRestored }: { page: string; onRestored?: () => void }) {
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


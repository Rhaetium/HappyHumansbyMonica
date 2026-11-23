'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PAGES_CONFIG } from '@/components/cms/admin/config';
import { buildFieldLabels, groupByDay, snippet, type HistoryRow } from '@/lib/journal';

type Props = {
  /** Recharge le contenu de l'admin après une restauration. */
  onRestored: () => void;
  handleUnauthorized: (res: Response) => boolean;
};

const KIND_LABEL = { ajout: 'Ajout', suppression: 'Texte retiré', modification: 'Modification' } as const;

export default function JournalTab({ onRestored, handleUnauthorized }: Props) {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [done, setDone] = useState('');
  const labels = useMemo(() => buildFieldLabels(PAGES_CONFIG), []);
  const days = useMemo(() => groupByDay(rows, labels), [rows, labels]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cms/history', { cache: 'no-store' });
      if (handleUnauthorized(res)) return;
      const d = await res.json().catch(() => ({}));
      if (res.status === 501) { setNotice(d.message || 'Le journal n’est pas encore activé.'); setRows([]); }
      else if (!res.ok) { setNotice(d.error || 'Erreur de chargement.'); setRows([]); }
      else { setRows(d.history || []); setNotice(''); }
    } catch { setNotice('Impossible de charger le journal.'); }
    finally { setLoading(false); }
  }, [handleUnauthorized]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement du journal depuis l'API
  useEffect(() => { load(); }, [load]);

  const restore = async (id: number, title: string) => {
    if (!confirm(`Revenir à l’ancien texte de « ${title} » ?\n\nLe texte actuel sera remplacé tout de suite sur le site en ligne (et noté dans ce journal : vous pourrez le rétablir).`)) return;
    setRestoringId(id); setDone('');
    try {
      const res = await fetch('/api/cms/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      if (handleUnauthorized(res)) return;
      if (res.ok) { setDone(`↩ « ${title} » est revenu à l’ancien texte.`); await load(); onRestored(); }
      else { const d = await res.json().catch(() => ({})); setDone(`❌ ${d.error || 'Restauration impossible.'}`); }
    } finally { setRestoringId(null); }
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.15rem' }}>🕘 Journal des modifications</h2>
        <button onClick={load} disabled={loading} style={{ background: 'none', border: 'none', color: '#01696f', cursor: 'pointer', fontWeight: 600 }}>
          {loading ? '⏳' : '🔄 Actualiser'}
        </button>
      </div>
      <p style={{ margin: '0 0 1rem', color: '#6b665f', fontSize: '.9rem', lineHeight: 1.5 }}>
        Les 100 dernières modifications de textes mises en ligne, de la plus récente à la plus ancienne. En cas d’erreur, « ↩ Revenir à l’ancien texte » remet l’ancien texte immédiatement.
      </p>
      {done && <p role="status" style={{ margin: '0 0 1rem', padding: '.7rem 1rem', background: '#f4f9f7', border: '1px solid #2d5f54', borderRadius: '.6rem', fontSize: '.88rem' }}>{done}</p>}
      {notice && <p style={{ fontSize: '.85rem', color: '#b45309', margin: 0, padding: '.75rem', background: '#fffbeb', borderRadius: '.5rem' }}>{notice}</p>}
      {!notice && !loading && rows.length === 0 && <p style={{ color: '#8a847b' }}>Aucune modification enregistrée pour le moment.</p>}
      {days.map(day => (
        <section key={day.day} style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ margin: '0 0 .5rem', fontSize: '.85rem', textTransform: 'capitalize', color: '#2d5f54' }}>{day.label}</h3>
          <div style={{ display: 'grid', gap: '.5rem' }}>
            {day.entries.map(e => (
              <div key={e.id} style={{ background: 'white', border: '1.5px solid #e8e3dc', borderRadius: '.75rem', padding: '.75rem 1rem', display: 'grid', gap: '.3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '.9rem' }}>{e.title}</span>
                  <span style={{ fontSize: '.75rem', color: '#8a847b' }}>
                    {KIND_LABEL[e.kind]} · {new Date(e.changed_at).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <span style={{ fontSize: '.84rem', color: '#6b665f', textDecoration: 'line-through', wordBreak: 'break-word' }}>{snippet(e.old_value)}</span>
                <span style={{ fontSize: '.88rem', wordBreak: 'break-word' }}>{snippet(e.new_value)}</span>
                <div>
                  <button onClick={() => restore(e.id, e.title)} disabled={restoringId === e.id}
                    style={{ background: 'white', border: '1.5px solid #2d5f54', color: '#2d5f54', borderRadius: '.5rem', padding: '.25rem .7rem', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer' }}>
                    {restoringId === e.id ? '⏳' : '↩ Revenir à l’ancien texte'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

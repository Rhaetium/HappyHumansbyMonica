'use client';

import { useState } from 'react';
import { applyCorrections, type Correction } from '@/lib/proofread';

type Props = {
  content: string;
  onApply: (html: string) => void;
  handleUnauthorized: (res: Response) => boolean;
};

/** « 🔤 Vérifier l'orthographe » : l'IA liste les fautes, Monica coche celles à corriger. Rien n'est enregistré avant « Enregistrer l'article ». */
export default function ProofreadPanel({ content, onApply, handleUnauthorized }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [list, setList] = useState<Correction[] | null>(null);
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState('');

  const check = async () => {
    setLoading(true); setError(''); setList(null); setMessage('');
    try {
      const res = await fetch('/api/cms/article-proofread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (handleUnauthorized(res)) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { setError(data.error || 'Relecture impossible. Réessayez.'); return; }
      setList(data.corrections || []);
      setChosen(new Set((data.corrections || []).map((_: Correction, i: number) => i)));
    } catch {
      setError('Erreur de connexion : réessayez dans un instant.');
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!list) return;
    const picked = list.filter((_, i) => chosen.has(i));
    const out = applyCorrections(content, picked);
    onApply(out.html);
    setMessage(`✅ ${out.applied} correction${out.applied > 1 ? 's' : ''} appliquée${out.applied > 1 ? 's' : ''}. Relisez, puis enregistrez l’article.`);
    setList(null);
  };

  const toggle = (i: number) => setChosen(prev => { const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n; });

  return (
    <div style={{ marginBottom: '.5rem' }}>
      <button type="button" onClick={check} disabled={loading}
        style={{ background: 'white', color: '#2d5f54', border: '1.5px solid #2d5f54', padding: '8px 16px', borderRadius: '6px', cursor: loading ? 'default' : 'pointer', fontSize: '.85rem', fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
        {loading ? 'Relecture…' : '🔤 Vérifier l’orthographe'}
      </button>
      {error && <p role="alert" style={{ margin: '.5rem 0 0', color: '#b42318', fontSize: '.85rem' }}>{error}</p>}
      {message && <p role="status" style={{ margin: '.5rem 0 0', fontSize: '.85rem', color: '#2d5f54' }}>{message}</p>}
      {list && (
        <div style={{ marginTop: '.6rem', border: '1.5px solid #e8e3dc', borderRadius: '.75rem', background: 'white', padding: '.8rem 1rem' }}>
          {list.length === 0 ? (
            <p style={{ margin: 0, fontSize: '.88rem' }}>✅ Aucune faute repérée.</p>
          ) : (
            <>
              <p style={{ margin: '0 0 .5rem', fontSize: '.85rem', color: '#6b665f' }}>{list.length} correction{list.length > 1 ? 's' : ''} proposée{list.length > 1 ? 's' : ''} : décochez celles que vous refusez.</p>
              <div style={{ display: 'grid', gap: '.4rem' }}>
                {list.map((c, i) => (
                  <label key={`${c.from}-${i}`} style={{ display: 'flex', gap: '.6rem', alignItems: 'baseline', fontSize: '.88rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={chosen.has(i)} onChange={() => toggle(i)} />
                    <span><span style={{ textDecoration: 'line-through', color: '#8a847b' }}>{c.from}</span> → <strong>{c.to}</strong>{c.reason && <span style={{ color: '#8a847b' }}> · {c.reason}</span>}</span>
                  </label>
                ))}
              </div>
              <button type="button" onClick={apply} disabled={chosen.size === 0}
                style={{ marginTop: '.7rem', background: '#2d5f54', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 14px', fontWeight: 600, fontSize: '.82rem', cursor: chosen.size === 0 ? 'default' : 'pointer', opacity: chosen.size === 0 ? 0.6 : 1 }}>
                Appliquer {chosen.size} correction{chosen.size > 1 ? 's' : ''}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

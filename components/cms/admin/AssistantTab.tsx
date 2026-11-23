'use client';

import { useState } from 'react';
import type { AssistantChange } from '@/lib/assistant';

type Props = {
  /** Enregistre les changements acceptés en BROUILLON (rien n'est en ligne avant « Publier »). Renvoie true si tout est enregistré. */
  applyChanges: (changes: AssistantChange[]) => Promise<boolean>;
  handleTabChange: (tab: string) => void;
  handleUnauthorized: (res: Response) => boolean;
};

const EXAMPLES = [
  'Rends l’introduction de la page Coaching plus chaleureuse',
  'Raccourcis le titre de l’accueil',
  'Reformule la présentation « À propos » à la première personne',
];

const card: React.CSSProperties = { border: '1.5px solid #e8e3dc', borderRadius: '1rem', background: 'white', padding: '1.25rem 1.5rem' };

export default function AssistantTab({ applyChanges, handleTabChange, handleUnauthorized }: Props) {
  const [request, setRequest] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [changes, setChanges] = useState<AssistantChange[] | null>(null);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const idOf = (c: AssistantChange) => `${c.page}|${c.key}`;

  const ask = async () => {
    if (!request.trim() || loading) return;
    setLoading(true); setError(''); setReply(''); setChanges(null); setDone(false);
    try {
      const res = await fetch('/api/cms/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request }),
      });
      if (handleUnauthorized(res)) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || 'L’assistant n’a pas pu répondre. Réessayez.');
        return;
      }
      setReply(data.reply || '');
      setChanges(data.changes || []);
      setAccepted(new Set((data.changes || []).map(idOf)));
    } catch {
      setError('Erreur de connexion : réessayez dans un instant.');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    const chosen = (changes || []).filter(c => accepted.has(idOf(c)));
    if (chosen.length === 0 || saving) return;
    setSaving(true);
    const ok = await applyChanges(chosen);
    setSaving(false);
    if (ok) { setDone(true); setChanges(null); }
  };

  const toggle = (id: string) => setAccepted(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div style={{ display: 'grid', gap: '1rem', maxWidth: 860 }}>
      <div style={card}>
        <h2 style={{ margin: '0 0 .35rem', fontSize: '1.15rem' }}>💬 Dites-moi ce que vous voulez changer</h2>
        <p style={{ margin: '0 0 .9rem', color: '#6b665f', fontSize: '.9rem', lineHeight: 1.5 }}>
          Écrivez en une phrase ce que vous souhaitez modifier. L’assistant propose de nouveaux textes, que vous relisez avant de les mettre en <strong>brouillon</strong>.
          Rien n’est publié tant que vous ne cliquez pas sur « Publier » dans l’onglet Pages.
        </p>
        <textarea
          value={request}
          onChange={e => setRequest(e.target.value)}
          onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') ask(); }}
          rows={3}
          maxLength={600}
          placeholder="Ex. : rends l’introduction de la page Coaching plus chaleureuse"
          aria-label="Ce que vous voulez changer"
          style={{ width: '100%', padding: '.75rem', border: '1.5px solid #e0dbd5', borderRadius: '.6rem', fontSize: '.95rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', margin: '.6rem 0' }}>
          {EXAMPLES.map(ex => (
            <button key={ex} type="button" onClick={() => setRequest(ex)}
              style={{ border: '1px solid #e0dbd5', background: '#faf9f7', borderRadius: 999, padding: '.25rem .7rem', fontSize: '.8rem', cursor: 'pointer', color: '#4a4640' }}>
              {ex}
            </button>
          ))}
        </div>
        <button type="button" onClick={ask} disabled={loading || !request.trim()}
          style={{ background: '#2d5f54', color: 'white', border: 'none', borderRadius: '.6rem', padding: '.6rem 1.2rem', fontWeight: 600, cursor: loading || !request.trim() ? 'default' : 'pointer', opacity: loading || !request.trim() ? 0.6 : 1 }}>
          {loading ? 'Je réfléchis…' : '✨ Proposer des modifications'}
        </button>
        {error && <p role="alert" style={{ margin: '.8rem 0 0', color: '#b42318', fontSize: '.9rem' }}>{error}{' '}
          {/IA|fournisseur|configur/i.test(error) && <button type="button" onClick={() => handleTabChange('ia')} style={{ background: 'none', border: 'none', color: '#2d5f54', textDecoration: 'underline', cursor: 'pointer' }}>Ouvrir l’onglet 🤖 IA</button>}
        </p>}
      </div>

      {done && (
        <div style={{ ...card, borderColor: '#2d5f54' }}>
          <p style={{ margin: 0 }}>✅ Enregistré en brouillon. Rien n’est en ligne pour le moment.</p>
          <button type="button" onClick={() => handleTabChange('contenu')}
            style={{ marginTop: '.6rem', background: 'none', border: 'none', color: '#2d5f54', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
            Voir les textes en attente de publication →
          </button>
        </div>
      )}

      {changes && (
        <div style={card}>
          {reply && <p style={{ margin: '0 0 1rem', fontStyle: 'italic', color: '#4a4640' }}>{reply}</p>}
          {changes.length === 0 ? (
            <p style={{ margin: 0, color: '#6b665f' }}>Aucune modification proposée. Essayez de préciser la page ou le texte concerné.</p>
          ) : (
            <>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {changes.map(c => {
                  const id = idOf(c);
                  return (
                    <label key={id} style={{ display: 'grid', gap: '.4rem', padding: '.9rem 1rem', border: '1.5px solid ' + (accepted.has(id) ? '#2d5f54' : '#e8e3dc'), borderRadius: '.75rem', cursor: 'pointer', background: accepted.has(id) ? '#f4f9f7' : 'white' }}>
                      <span style={{ display: 'flex', gap: '.6rem', alignItems: 'center', fontWeight: 600, fontSize: '.9rem' }}>
                        <input type="checkbox" checked={accepted.has(id)} onChange={() => toggle(id)} />
                        {c.pageLabel} — {c.label}
                      </span>
                      <span style={{ fontSize: '.78rem', color: '#8a847b' }}>Avant</span>
                      <span style={{ fontSize: '.88rem', color: '#6b665f', textDecoration: 'line-through', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.before}</span>
                      <span style={{ fontSize: '.78rem', color: '#2d5f54' }}>Proposition</span>
                      <span style={{ fontSize: '.92rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.after}</span>
                      {c.reason && <span style={{ fontSize: '.8rem', color: '#8a847b' }}>💡 {c.reason}</span>}
                      {c.warning && <span style={{ fontSize: '.8rem', color: '#b54708' }}>⚠️ {c.warning}</span>}
                    </label>
                  );
                })}
              </div>
              <button type="button" onClick={save} disabled={saving || accepted.size === 0}
                style={{ marginTop: '1rem', background: '#2d5f54', color: 'white', border: 'none', borderRadius: '.6rem', padding: '.6rem 1.2rem', fontWeight: 600, cursor: saving || accepted.size === 0 ? 'default' : 'pointer', opacity: saving || accepted.size === 0 ? 0.6 : 1 }}>
                {saving ? 'Enregistrement…' : `📝 Mettre ${accepted.size} modification${accepted.size > 1 ? 's' : ''} en brouillon`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

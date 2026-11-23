'use client';

import { useState } from 'react';
import { CUSTOM_PAGES_KEY, CUSTOM_PAGES_PAGE, parsePages, serializePages, uniqueSlug, type CustomPage } from '@/lib/custom-pages';
import { makeId } from '@/lib/custom-sections';
import { blockSummary, type PageProposal } from '@/lib/page-builder';

type Props = { handleTabChange: (tab: string) => void; handleUnauthorized: (res: Response) => boolean };

const card: React.CSSProperties = { border: '1.5px solid #e8e3dc', borderRadius: '1rem', background: 'white', padding: '1.25rem 1.5rem' };
const primary: React.CSSProperties = { background: '#2d5f54', color: 'white', border: 'none', borderRadius: '.6rem', padding: '.6rem 1.2rem', fontWeight: 600, cursor: 'pointer' };

const EXAMPLES = [
  'Une page pour mon atelier « Communiquer avec bienveillance » destiné aux équipes',
  'Une page de présentation de mon accompagnement des managers, avec une FAQ',
];

/** « Créer une page » : l'IA propose une page complète en blocs, créée HORS LIGNE dans « Pages libres ». */
export default function PageBuilderPanel({ handleTabChange, handleUnauthorized }: Props) {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [proposal, setProposal] = useState<PageProposal | null>(null);
  const [created, setCreated] = useState('');

  const ask = async () => {
    if (loading || description.trim().length < 15) return;
    setLoading(true); setError(''); setProposal(null); setCreated('');
    try {
      const res = await fetch('/api/cms/page-builder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description }) });
      if (handleUnauthorized(res)) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { setError(data.error || 'L’assistant n’a pas pu répondre. Réessayez.'); return; }
      setProposal({ page: data.page, notes: data.notes ?? [] });
    } catch { setError('Erreur de connexion : réessayez dans un instant.'); }
    finally { setLoading(false); }
  };

  // Ajoute la page à la liste enregistrée des pages libres (lecture, ajout, écriture), toujours hors ligne
  const create = async () => {
    if (!proposal || saving) return;
    setSaving(true); setError('');
    try {
      const read = await fetch(`/api/cms/content?page=${CUSTOM_PAGES_PAGE}`, { cache: 'no-store' });
      if (handleUnauthorized(read)) return;
      if (!read.ok) { setError('Lecture des pages impossible. Réessayez.'); return; }
      const rows = ((await read.json()).content ?? []) as { block_key: string; value: string | null }[];
      const pages = parsePages(rows.find(r => r.block_key === CUSTOM_PAGES_KEY)?.value);
      const page: CustomPage = { ...proposal.page, id: makeId(), slug: uniqueSlug(pages, proposal.page.slug), published: false };
      const write = await fetch('/api/cms/content', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: CUSTOM_PAGES_PAGE, block_key: CUSTOM_PAGES_KEY, value: serializePages([...pages, page]) }),
      });
      if (handleUnauthorized(write)) return;
      if (!write.ok) { setError('Enregistrement impossible. Réessayez.'); return; }
      setCreated(page.title); setProposal(null); setDescription('');
    } catch { setError('Erreur de connexion : réessayez dans un instant.'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={card}>
        <h2 style={{ margin: '0 0 .35rem', fontSize: '1.15rem' }}>🧱 Décrivez la page que vous voulez</h2>
        <p style={{ margin: '0 0 .9rem', color: '#6b665f', fontSize: '.9rem', lineHeight: 1.5 }}>
          L’assistant compose une page avec les blocs du CMS. Elle est créée <strong>hors ligne</strong> : vous la relisez, ajoutez vos vraies photos, chiffres et témoignages, puis la mettez en ligne.
        </p>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} maxLength={800}
          placeholder="Ex. : une page pour mon atelier de communication bienveillante, pour les équipes de 6 à 12 personnes"
          aria-label="Description de la page"
          style={{ width: '100%', padding: '.75rem', border: '1.5px solid #e0dbd5', borderRadius: '.6rem', fontSize: '.95rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', margin: '.6rem 0' }}>
          {EXAMPLES.map(ex => (
            <button key={ex} type="button" onClick={() => setDescription(ex)}
              style={{ border: '1px solid #e0dbd5', background: '#faf9f7', borderRadius: 999, padding: '.25rem .7rem', fontSize: '.8rem', cursor: 'pointer', color: '#4a4640' }}>{ex}</button>
          ))}
        </div>
        <button type="button" style={{ ...primary, opacity: loading || description.trim().length < 15 ? 0.6 : 1 }} onClick={ask} disabled={loading || description.trim().length < 15}>
          {loading ? 'Je compose la page…' : '✨ Proposer une page'}
        </button>
        {error && <p role="alert" style={{ margin: '.8rem 0 0', color: '#b42318', fontSize: '.9rem' }}>{error}</p>}
      </div>

      {created && (
        <div style={{ ...card, borderColor: '#2d5f54' }}>
          <p style={{ margin: 0 }}>✅ La page « {created} » est créée, <strong>hors ligne</strong>.</p>
          <button type="button" onClick={() => handleTabChange('custom-pages')}
            style={{ marginTop: '.6rem', background: 'none', border: 'none', color: '#2d5f54', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
            Ouvrir dans « Pages libres » pour la relire et la compléter →
          </button>
        </div>
      )}

      {proposal && (
        <div style={card}>
          <h3 style={{ margin: '0 0 .2rem', fontSize: '1.05rem' }}>{proposal.page.title}</h3>
          {proposal.page.intro && <p style={{ margin: '0 0 .8rem', color: '#6b665f', fontSize: '.9rem' }}>{proposal.page.intro}</p>}
          <ol style={{ margin: '0 0 .8rem', paddingLeft: '1.3rem', fontSize: '.88rem', lineHeight: 1.7 }}>
            {proposal.page.blocks.map(b => <li key={b.id}>{blockSummary(b)}</li>)}
          </ol>
          {proposal.notes.length > 0 && (
            <ul style={{ margin: '0 0 .8rem', paddingLeft: '1.2rem', color: '#b54708', fontSize: '.82rem' }}>
              {proposal.notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          )}
          <p style={{ margin: '0 0 .8rem', color: '#8a847b', fontSize: '.8rem' }}>Les passages entre [crochets] sont à compléter. Aucune image n’est ajoutée.</p>
          <button type="button" style={{ ...primary, opacity: saving ? 0.6 : 1 }} onClick={create} disabled={saving}>
            {saving ? 'Création…' : '📄 Créer cette page (hors ligne)'}
          </button>
        </div>
      )}
    </div>
  );
}

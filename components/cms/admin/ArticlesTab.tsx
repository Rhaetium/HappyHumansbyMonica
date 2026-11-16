'use client';

import type { Article } from '@/components/cms/admin/types';
import { fmt, slug } from '@/components/cms/admin/helpers';
import type { Dispatch, SetStateAction } from 'react';

type Props = {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  loadArticles: () => Promise<void>;
  statusFilter: string;
  setStatusFilter: Dispatch<SetStateAction<string>>;
  openArticleEditor: (article?: Partial<Article>) => void;
  loadingArticles: boolean;
  articles: Article[];
  duplicateArticle: (a: Article) => Promise<void>;
  togglePublish: (a: Article) => Promise<void>;
  deleteArticle: (id: number) => Promise<void>;
};

/** Onglet « articles » de l'admin du CMS (déplacé de app/cms-admin/page.tsx, JSX inchangé). */
export default function ArticlesTab({ search, setSearch, loadArticles, statusFilter, setStatusFilter, openArticleEditor, loadingArticles, articles, duplicateArticle, togglePublish, deleteArticle }: Props) {
  return (
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
  );
}

'use client';

import { unreadVisitorCount, unreadAlertCount } from '@/lib/cms-messages';
import { healthNeedsAttention, healthProblemCount } from '@/lib/cms-health';
import { fmt } from '@/components/cms/admin/helpers';
import PrioritiesCard from '@/components/cms/admin/PrioritiesCard';
import type { SeoIssue } from '@/lib/seo-audit';
import type { Article, ContactMessage } from '@/components/cms/admin/types';
import type { HealthCheck } from '@/lib/cms-health';
import type { MessageFilter } from '@/lib/cms-messages';

type Props = {
  healthChecks: HealthCheck[] | null;
  articles: Article[];
  setMessageFilter: (filter: MessageFilter) => void;
  handleTabChange: (nextTab: string) => void;
  messages: ContactMessage[];
  dbStatus: 'ok' | 'down' | 'checking';
  openArticleEditor: (article?: Partial<Article>) => void;
  seoIssues: SeoIssue[];
};

/** Onglet « dashboard » de l'admin du CMS (déplacé de app/cms-admin/page.tsx, JSX inchangé). */
export default function DashboardTab({ healthChecks, articles, setMessageFilter, handleTabChange, messages, dbStatus, openArticleEditor, seoIssues }: Props) {
  return (
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

      {/* Santé du site — ce qui empêche le site de rendre service, en haut de page */}
      {healthChecks && healthNeedsAttention(healthChecks).length > 0 && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {healthProblemCount(healthChecks) > 0 && (
            <p style={{ margin: 0, fontSize: '.8rem', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '.05em' }}>
              {healthProblemCount(healthChecks)} problème{healthProblemCount(healthChecks) > 1 ? 's' : ''} à corriger
            </p>
          )}
          {healthNeedsAttention(healthChecks).map(c => {
            const error = c.level === 'error';
            return (
              <div key={c.id} style={{
                background: error ? '#fff5f5' : '#fffbeb',
                border: `1.5px solid ${error ? '#fecaca' : '#fde68a'}`,
                borderRadius: '1rem', padding: '1.1rem 1.4rem',
              }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '.95rem', color: error ? '#991b1b' : '#92400e', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                  <span>{error ? '🚨' : '⚠️'}</span> {c.title}
                </p>
                <p style={{ margin: '.45rem 0 0', fontSize: '.88rem', color: '#444', lineHeight: 1.5 }}>{c.detail}</p>
                {c.fix && (
                  <p style={{ margin: '.5rem 0 0', fontSize: '.88rem', color: '#166534', fontWeight: 600, lineHeight: 1.5 }}>
                    ✅ À faire : {c.fix}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <PrioritiesCard seoIssues={seoIssues} onGoto={handleTabChange} />

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
        <div style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', cursor: 'pointer' }} onClick={() => { setMessageFilter('visitor'); handleTabChange('messages'); }}>
          <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 .4rem' }}>Messages non lus</p>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: unreadVisitorCount(messages) > 0 ? '#dc2626' : '#2d5f54', margin: 0 }}>{unreadVisitorCount(messages)}</p>
        </div>
        <div style={{ background: 'white', borderRadius: '1rem', padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)', cursor: 'pointer' }} onClick={() => { setMessageFilter('alert'); handleTabChange('messages'); }}>
          <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 .4rem' }}>Alertes techniques</p>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: unreadAlertCount(messages) > 0 ? '#c2410c' : '#2d5f54', margin: 0 }}>{unreadAlertCount(messages)}</p>
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
  );
}

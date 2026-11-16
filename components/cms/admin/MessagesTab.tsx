'use client';

import { matchesMessageFilter, messageKind, type MessageFilter } from '@/lib/cms-messages';
import { fmt } from '@/components/cms/admin/helpers';
import type { Dispatch, SetStateAction } from 'react';
import type { ContactMessage } from '@/components/cms/admin/types';

type Props = {
  messages: ContactMessage[];
  setMessages: Dispatch<SetStateAction<ContactMessage[]>>;
  loadingMessages: boolean;
  messageFilter: MessageFilter;
  setMessageFilter: (filter: MessageFilter) => void;
  loadMessages: () => void | Promise<void>;
};

/** Onglet « messages » de l'admin du CMS (déplacé de app/cms-admin/page.tsx, JSX inchangé). */
export default function MessagesTab({ messages, setMessages, loadingMessages, messageFilter, setMessageFilter, loadMessages }: Props) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#2d5f54', margin: 0 }}>💬 Messages reçus</h2>
        <button onClick={loadMessages} style={{ padding: '.45rem 1rem', background: '#f5f0eb', border: 'none', borderRadius: '.5rem', cursor: 'pointer', fontSize: '.85rem', color: '#555' }}>↻ Actualiser</button>
      </div>

      {/* Séparation des deux flux : les demandes de visiteurs et les alertes du site */}
      <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {([
          { id: 'all',     label: 'Tous',     n: messages.length },
          { id: 'unread',  label: 'Non lus',  n: messages.filter(m => m.status !== 'read').length },
          { id: 'visitor', label: '👤 Messages', n: messages.filter(m => messageKind(m.type) === 'visitor').length },
          { id: 'alert',   label: '🚨 Alertes techniques', n: messages.filter(m => messageKind(m.type) === 'alert').length },
        ] as { id: MessageFilter; label: string; n: number }[]).map(f => (
          <button key={f.id} onClick={() => setMessageFilter(f.id)}
            style={{
              padding: '.45rem .9rem', borderRadius: '999px', cursor: 'pointer', fontSize: '.82rem', fontWeight: messageFilter === f.id ? 700 : 500,
              background: messageFilter === f.id ? '#2d5f54' : 'white',
              color: messageFilter === f.id ? 'white' : '#555',
              border: `1.5px solid ${messageFilter === f.id ? '#2d5f54' : '#e0dbd5'}`,
            }}>
            {f.label} <span style={{ opacity: .8 }}>({f.n})</span>
          </button>
        ))}
      </div>

      {loadingMessages ? (
        <p style={{ textAlign: 'center', color: '#888', padding: '3rem' }}>Chargement…</p>
      ) : messages.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#aaa', padding: '3rem' }}>Aucun message pour le moment.</p>
      ) : (() => {
        const visible = messages.filter(m => matchesMessageFilter(m, messageFilter));
        if (visible.length === 0) {
          return <p style={{ textAlign: 'center', color: '#aaa', padding: '3rem' }}>Aucun message dans cette catégorie.</p>;
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {visible.map(m => {
              const alert = messageKind(m.type) === 'alert';
              return (
                <div key={m.id} style={{
                  background: alert ? '#fffaf5' : 'white',
                  borderRadius: '1rem', padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)',
                  borderLeft: `4px solid ${alert ? '#c2410c' : m.status === 'unread' ? '#2d5f54' : '#e0dbd5'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: '.95rem', color: '#1a1a1a', marginBottom: '.2rem', display: 'flex', alignItems: 'center', gap: '.45rem', flexWrap: 'wrap' }}>
                        {alert && (
                          <span style={{ fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: '#9a3412', background: '#ffedd5', border: '1px solid #fed7aa', borderRadius: '999px', padding: '.05rem .5rem' }}>
                            🚨 Alerte technique
                          </span>
                        )}
                        {m.name}
                        {!alert && <span style={{ fontWeight: 400, color: '#888' }}>— {m.email}</span>}
                      </p>
                      <p style={{ fontSize: '.8rem', color: '#aaa', marginBottom: '.75rem' }}>{fmt(m.created_at)}</p>
                      <p style={{ fontSize: '.9rem', color: '#444', whiteSpace: 'pre-wrap' }}>{m.message}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem', flexShrink: 0 }}>
                      {m.status !== 'read' && (
                        <button onClick={async () => {
                          await fetch(`/api/cms/contact-messages/${m.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-cms-token': localStorage.getItem('cms_token') || '' }, body: JSON.stringify({ status: 'read' }) });
                          setMessages(prev => prev.map(x => x.id === m.id ? { ...x, status: 'read' } : x));
                        }} style={{ padding: '.35rem .75rem', background: '#2d5f54', color: 'white', border: 'none', borderRadius: '.4rem', cursor: 'pointer', fontSize: '.78rem', fontWeight: 600 }}>
                          ✓ Marquer lu
                        </button>
                      )}
                      <button onClick={async () => {
                        if (!confirm('Supprimer ce message ?')) return;
                        await fetch(`/api/cms/contact-messages/${m.id}`, { method: 'DELETE', headers: { 'x-cms-token': localStorage.getItem('cms_token') || '' } });
                        setMessages(prev => prev.filter(x => x.id !== m.id));
                      }} style={{ padding: '.35rem .75rem', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '.4rem', cursor: 'pointer', fontSize: '.78rem', fontWeight: 600 }}>
                        🗑 Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

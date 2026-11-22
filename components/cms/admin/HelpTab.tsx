'use client'

import React, { useState } from 'react'
import { ASK_PROMPTS, HELP_RECIPES, WEEKLY_ROUTINE } from '@/lib/help-guide'

/**
 * Onglet « Aide » : que faire pour quoi (avec un bouton qui ouvre le bon onglet), la routine de la semaine,
 * des phrases toutes prêtes pour demander une modification à un assistant, et la sauvegarde du contenu.
 * Le CMS reste la source de vérité : tout ce qui est expliqué ici se fait depuis l'admin.
 */

const card: React.CSSProperties = { background: 'white', borderRadius: '1rem', padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }
const btn: React.CSSProperties = { padding: '.4rem .85rem', borderRadius: '.5rem', border: '1.5px solid #2d5f54', background: 'white', color: '#2d5f54', fontWeight: 600, fontSize: '.8rem', cursor: 'pointer' }
const h3: React.CSSProperties = { margin: '0 0 .75rem', fontSize: '1.05rem', color: '#2d5f54' }

export default function HelpTab({ onGoto, tabLabel }: { onGoto: (tab: string) => void; tabLabel: (tab: string) => string }) {
  const [copied, setCopied] = useState<string | null>(null)

  async function copy(id: string, text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000) } catch { /* copie impossible : le texte reste visible */ }
  }

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <div>
        <h2 style={{ margin: '0 0 .3rem', fontSize: '1.3rem' }}>🆘 Aide</h2>
        <p style={{ margin: 0, color: '#666', fontSize: '.9rem' }}>
          Tout ce qui est visible sur le site se modifie ici : le CMS est la référence. Astuce : <kbd>Ctrl</kbd> + <kbd>K</kbd> ouvre la recherche partout.
        </p>
      </div>

      <div style={card}>
        <h3 style={h3}>🗓️ La routine de la semaine</h3>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {WEEKLY_ROUTINE.map(r => (
            <li key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', padding: '.45rem 0', borderBottom: '1px solid #f2efeb', fontSize: '.9rem' }}>
              <span>{r.label}</span>
              <button type="button" style={btn} onClick={() => onGoto(r.tab)}>Ouvrir : {tabLabel(r.tab)}</button>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
        {HELP_RECIPES.map(r => (
          <div key={r.id} style={card}>
            <h3 style={{ ...h3, color: '#1e3a34' }}>{r.emoji} {r.title}</h3>
            <ol style={{ margin: '0 0 .9rem', paddingLeft: '1.2rem', listStyle: 'decimal', fontSize: '.86rem', color: '#444', lineHeight: 1.6 }}>
              {r.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
            <button type="button" style={btn} onClick={() => onGoto(r.tab)}>Ouvrir : {tabLabel(r.tab)}</button>
          </div>
        ))}
      </div>

      <div style={card}>
        <h3 style={h3}>🤝 Demander une modification à un assistant</h3>
        <p style={{ margin: '0 0 .9rem', fontSize: '.85rem', color: '#666', lineHeight: 1.5 }}>
          Copiez la phrase, remplacez ce qui est entre [crochets] et envoyez-la. La dernière phrase demande à l’assistant de passer par le CMS plutôt que par le code : ainsi vous pouvez toujours retoucher le résultat vous-même.
        </p>
        {ASK_PROMPTS.map(p => (
          <div key={p.id} style={{ marginBottom: '.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.25rem' }}>
              <strong style={{ fontSize: '.85rem' }}>{p.label}</strong>
              <button type="button" style={btn} onClick={() => void copy(p.id, p.text)}>{copied === p.id ? '✓ Copié' : 'Copier'}</button>
            </div>
            <p style={{ margin: 0, padding: '.6rem .8rem', background: '#faf9f7', border: '1px solid #eee', borderRadius: '.5rem', fontSize: '.82rem', color: '#444', lineHeight: 1.5 }}>{p.text}</p>
          </div>
        ))}
      </div>

      <div style={card}>
        <h3 style={h3}>💾 Sauvegarde du contenu</h3>
        <p style={{ margin: '0 0 .9rem', fontSize: '.85rem', color: '#666', lineHeight: 1.5 }}>
          Le CMS contient tout votre site (textes, brouillons, réglages, articles, pages libres). Téléchargez-en une copie de temps en temps et gardez-la en lieu sûr.
          Les clés et mots de passe des Connexions n’y figurent jamais.
        </p>
        <a href="/api/cms/export" download style={{ ...btn, textDecoration: 'none', display: 'inline-block', background: '#2d5f54', color: 'white' }}>⬇️ Télécharger la sauvegarde</a>
      </div>
    </div>
  )
}

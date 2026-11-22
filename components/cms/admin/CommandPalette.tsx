'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { searchCommands, type Command } from '@/lib/command-palette'

/** Fenêtre de la palette de commandes : champ de recherche, liste au clavier (↑ ↓ Entrée Échap), souris aussi. */
export default function CommandPalette({ commands, onRun, onClose }: {
  commands: Command[]
  onRun: (c: Command) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const results = useMemo(() => searchCommands(commands, query), [commands, query])
  const active = Math.min(index, Math.max(results.length - 1, 0))

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    document.getElementById(`cmd-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); onClose() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(Math.min(active + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(Math.max(active - 1, 0)) }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); onRun(results[active]) }
  }

  return (
    <div role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(20,30,28,.45)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '12vh' }}>
      <div role="dialog" aria-modal="true" aria-label="Palette de commandes" onKeyDown={onKeyDown}
        style={{ width: 'min(640px, 92vw)', background: 'white', borderRadius: '1rem', boxShadow: '0 20px 60px rgba(0,0,0,.3)', overflow: 'hidden' }}>
        <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setIndex(0) }}
          role="combobox" aria-expanded="true" aria-controls="cmd-list" aria-activedescendant={results.length ? `cmd-${active}` : undefined}
          placeholder="Aller à une page, un article, un texte… ou lancer une action"
          style={{ width: '100%', boxSizing: 'border-box', padding: '1rem 1.25rem', border: 'none', borderBottom: '1px solid #eee', fontSize: '1rem', outline: 'none' }} />
        <ul id="cmd-list" role="listbox" style={{ listStyle: 'none', margin: 0, padding: '.4rem', maxHeight: '50vh', overflowY: 'auto' }}>
          {results.length === 0 && <li style={{ padding: '1rem', color: '#888', fontSize: '.9rem' }}>Rien ne correspond à « {query} ».</li>}
          {results.map((c, i) => (
            <React.Fragment key={c.id}>
              {(i === 0 || results[i - 1].group !== c.group) && (
                <li role="presentation" style={{ padding: '.5rem .75rem .2rem', fontSize: '.68rem', fontWeight: 700, letterSpacing: '.05em', color: '#999', textTransform: 'uppercase' }}>{c.group}</li>
              )}
              <li id={`cmd-${i}`} role="option" aria-selected={i === active}
                onMouseMove={() => setIndex(i)} onClick={() => onRun(c)}
                style={{ padding: '.55rem .75rem', borderRadius: '.5rem', cursor: 'pointer', background: i === active ? '#eaf3f0' : 'transparent' }}>
                <span style={{ display: 'block', fontSize: '.92rem', fontWeight: 600, color: '#1e3a34' }}>{c.label}</span>
                <span style={{ display: 'block', fontSize: '.76rem', color: '#777', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.hint}</span>
              </li>
            </React.Fragment>
          ))}
        </ul>
        <div style={{ padding: '.5rem 1rem', borderTop: '1px solid #eee', fontSize: '.72rem', color: '#999', display: 'flex', gap: '1rem' }}>
          <span>↑ ↓ pour choisir</span><span>Entrée pour ouvrir</span><span>Échap pour fermer</span>
        </div>
      </div>
    </div>
  )
}

'use client';

import React from 'react';
import { useState } from 'react';

// ─── Composant principal ──────────────────────────────────────
export function BulkSlotCreator({ onCreated }: { onCreated: () => void }) {
  const [days, setDays] = React.useState<number[]>([1,2,3,4,5])
  const [startH, setStartH] = React.useState(9)
  const [endH, setEndH]   = React.useState(17)
  const [type, setType]   = React.useState('discovery')
  const [weeks, setWeeks] = React.useState(4)
  const [startDate, setStartDate] = React.useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = React.useState(false)
  const [result, setResult]   = React.useState('')

  const toggleDay = (d: number) => setDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d].sort())
  const DAY_LABELS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

  const create = async () => {
    setLoading(true); setResult('')
    const res = await fetch('/api/cms/booking-slots-bulk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days_of_week: days, start_hour: startH, end_hour: endH, slot_type: type, duration: 45, weeks, start_date: startDate })
    })
    const d = await res.json()
    setResult(d.message || d.error || 'Terminé')
    setLoading(false)
    if (res.ok) onCreated()
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
      <div>
        <label style={{ display:'block', fontSize:'.8rem', fontWeight:600, color:'#555', marginBottom:'.4rem' }}>Jours de la semaine</label>
        <div style={{ display:'flex', gap:'.3rem', flexWrap:'wrap' }}>
          {DAY_LABELS.map((l,i) => (
            <button key={i} onClick={() => toggleDay(i+1)} style={{ padding:'.3rem .6rem', borderRadius:'.4rem', border:'1.5px solid', fontSize:'.78rem', fontWeight:600, cursor:'pointer', background:days.includes(i+1) ? '#2d5f54' : 'white', color:days.includes(i+1) ? 'white' : '#555', borderColor:days.includes(i+1) ? '#2d5f54' : '#ddd' }}>{l}</button>
          ))}
        </div>
      </div>
      <div>
        <label style={{ display:'block', fontSize:'.8rem', fontWeight:600, color:'#555', marginBottom:'.4rem' }}>De (heure)</label>
        <select value={startH} onChange={e => setStartH(+e.target.value)} style={{ width:'100%', padding:'.5rem .75rem', border:'1.5px solid #e0dbd5', borderRadius:'.5rem', fontSize:'.88rem' }}>
          {Array.from({length:12}, (_,i)=>i+7).map(h => <option key={h} value={h}>{h}:00</option>)}
        </select>
      </div>
      <div>
        <label style={{ display:'block', fontSize:'.8rem', fontWeight:600, color:'#555', marginBottom:'.4rem' }}>À (heure)</label>
        <select value={endH} onChange={e => setEndH(+e.target.value)} style={{ width:'100%', padding:'.5rem .75rem', border:'1.5px solid #e0dbd5', borderRadius:'.5rem', fontSize:'.88rem' }}>
          {Array.from({length:12}, (_,i)=>i+9).map(h => <option key={h} value={h}>{h}:00</option>)}
        </select>
      </div>
      <div>
        <label style={{ display:'block', fontSize:'.8rem', fontWeight:600, color:'#555', marginBottom:'.4rem' }}>Type de séance</label>
        <select value={type} onChange={e => setType(e.target.value)} style={{ width:'100%', padding:'.5rem .75rem', border:'1.5px solid #e0dbd5', borderRadius:'.5rem', fontSize:'.88rem' }}>
          <option value="discovery">Découverte (gratuit)</option>
          <option value="coaching">Coaching (120€)</option>
          <option value="enterprise">Entreprise</option>
        </select>
      </div>
      <div>
        <label style={{ display:'block', fontSize:'.8rem', fontWeight:600, color:'#555', marginBottom:'.4rem' }}>Nb semaines</label>
        <select value={weeks} onChange={e => setWeeks(+e.target.value)} style={{ width:'100%', padding:'.5rem .75rem', border:'1.5px solid #e0dbd5', borderRadius:'.5rem', fontSize:'.88rem' }}>
          {[1,2,4,6,8,12].map(w => <option key={w} value={w}>{w} semaine{w>1?'s':''}</option>)}
        </select>
      </div>
      <div>
        <label style={{ display:'block', fontSize:'.8rem', fontWeight:600, color:'#555', marginBottom:'.4rem' }}>À partir du</label>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width:'100%', padding:'.5rem .75rem', border:'1.5px solid #e0dbd5', borderRadius:'.5rem', fontSize:'.88rem' }} />
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'.5rem' }}>
        <button onClick={create} disabled={loading || !days.length} style={{ padding:'.65rem 1rem', background:'#2d5f54', color:'white', border:'none', borderRadius:'.5rem', fontWeight:700, cursor:'pointer', fontSize:'.88rem', opacity:loading?0.7:1 }}>
          {loading ? 'Création…' : '+ Créer les créneaux'}
        </button>
        {result && <p style={{ fontSize:'.78rem', color:result.includes('Erreur') ? '#dc2626' : '#2d5f54', fontWeight:600 }}>{result}</p>}
      </div>
    </div>
  )
}

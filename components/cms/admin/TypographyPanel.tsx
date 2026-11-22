'use client'

import React, { useState } from 'react'
import { FONT_CHOICES, cleanFontFamily, customFontsHref, fontStack } from '@/lib/themes'
import { TYPO_OPTIONS, TYPO_TEMPLATES, resolveTypography, SIZE_PERCENT } from '@/lib/typography'

/**
 * Typographie et lisibilité : choix d'un gabarit de style, puis réglages fins (police, taille, graisse, interligne…)
 * avec un aperçu en direct. Un réglage laissé sur « selon le gabarit » suit le gabarit choisi.
 */

type Props = {
  settings: Record<string, string>
  onChange: (key: string, value: string) => void
}

const lbl: React.CSSProperties = { display: 'block', fontSize: '.78rem', fontWeight: 700, color: '#555', marginBottom: '.25rem' }
const sel: React.CSSProperties = { width: '100%', padding: '.5rem .65rem', border: '1.5px solid #ddd', borderRadius: '.5rem', fontSize: '.85rem', background: 'white' }
const ALL_FONTS_HREF = 'https://fonts.googleapis.com/css2?' + FONT_CHOICES.filter(f => f.google).map(f => 'family=' + f.google).join('&') + '&display=swap'

type Check = { state: 'ok' | 'ko' | 'wait'; text: string }

/** Champ « autre police Google Fonts » : saisie du nom, vérification auprès de Google, effacement. */
function CustomFont({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  const [check, setCheck] = useState<Check | null>(null)
  const family = cleanFontFamily(value)
  async function verify() {
    if (!family) { setCheck({ state: 'ko', text: 'Nom invalide : lettres, chiffres et espaces seulement (ex. « Playfair Display »).' }); return }
    setCheck({ state: 'wait', text: 'Vérification auprès de Google Fonts…' })
    try {
      const href = customFontsHref(['google:' + family])!
      const res = await fetch(href)
      setCheck(res.ok
        ? { state: 'ok', text: `✓ « ${family} » existe sur Google Fonts. Enregistrez pour l’utiliser sur le site.` }
        : { state: 'ko', text: `« ${family} » est introuvable sur Google Fonts : vérifiez l’orthographe exacte du nom.` })
    } catch {
      setCheck({ state: 'ko', text: 'Vérification impossible pour le moment (connexion). Le nom sera testé à l’affichage du site.' })
    }
  }
  return (
    <div>
      <label style={lbl} htmlFor={id}>{label}</label>
      <div style={{ display: 'flex', gap: '.4rem' }}>
        <input id={id} style={{ ...sel, flex: 1 }} value={value} onChange={e => { onChange(e.target.value); setCheck(null) }} placeholder="ex. Playfair Display" spellCheck={false} />
        <button type="button" onClick={() => void verify()} disabled={!value.trim()} style={{ padding: '.45rem .8rem', borderRadius: '.5rem', border: '1.5px solid #2d5f54', background: 'white', color: '#2d5f54', fontWeight: 600, fontSize: '.8rem', cursor: 'pointer' }}>Vérifier</button>
      </div>
      {check && <p role="status" style={{ margin: '.3rem 0 0', fontSize: '.76rem', color: check.state === 'ok' ? '#1e7a4d' : check.state === 'ko' ? '#b3261e' : '#777' }}>{check.text}</p>}
    </div>
  )
}

function LogoSize({ settings, onChange }: Props) {
  const row = (key: string, label: string, min: number, max: number, fallback: number) => (
    <div>
      <label style={lbl} htmlFor={key}>{label} : {Number(settings[key] || fallback)} px</label>
      <input id={key} type="range" min={min} max={max} step={2} value={Number(settings[key] || fallback)} onChange={e => onChange(key, e.target.value)} style={{ width: '100%', accentColor: '#2d5f54' }} />
    </div>
  )
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '.9rem', marginBottom: '1.25rem' }}>
      {row('logo_size', 'Taille du logo (en-tête)', 24, 64, 52)}
      {row('logo_footer_size', 'Taille du logo (pied de page)', 20, 72, 36)}
    </div>
  )
}

export default function TypographyPanel({ settings, onChange }: Props) {
  const customHref = customFontsHref([resolveTypography(settings).settings.fontHeading, resolveTypography(settings).settings.fontBody])
  const { template, settings: s } = resolveTypography(settings)
  const heading = fontStack(s.fontHeading, '')
  const body = fontStack(s.fontBody, '')

  const choice = (key: string, label: string, options: readonly (readonly [string, string])[]) => (
    <div>
      <label style={lbl} htmlFor={key}>{label}</label>
      <select id={key} style={sel} value={settings[key] || ''} onChange={e => onChange(key, e.target.value)}>
        <option value="">Selon le gabarit</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  )

  return (
    <div style={{ marginBottom: '1.75rem' }} data-testid="typography-panel">
      <link rel="stylesheet" href={ALL_FONTS_HREF} />
      {customHref && <link rel="stylesheet" href={customHref} />}
      <p style={{ fontSize: '.95rem', fontWeight: 700, color: '#2d5f54', margin: '0 0 .35rem' }}>✍️ Typographie et lisibilité</p>
      <p style={{ fontSize: '.82rem', color: '#777', margin: '0 0 1rem', lineHeight: 1.5 }}>
        Choisissez un gabarit : polices, taille, graisse et interligne changent sur tout le site d’un coup. Vous pouvez ensuite ajuster chaque réglage.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '.75rem', marginBottom: '1.25rem' }}>
        {TYPO_TEMPLATES.map(t => {
          const active = template === t.id
          return (
            <button key={t.id} type="button" aria-pressed={active}
              onClick={() => {
                onChange('theme_typo', t.id)
                // Choisir un gabarit repart de ses valeurs : les réglages individuels sont effacés
                for (const k of ['theme_font_heading', 'theme_font_body', 'theme_font_heading_custom', 'theme_font_body_custom', 'theme_text_size', 'theme_text_weight', 'theme_line_height', 'theme_heading_weight', 'theme_caps']) onChange(k, '')
              }}
              style={{ textAlign: 'left', cursor: 'pointer', padding: '.9rem 1rem', borderRadius: '.75rem', background: 'white', border: active ? '2.5px solid #2d5f54' : '1.5px solid #e5e7eb', boxShadow: active ? '0 0 0 3px #2d5f5422' : 'none' }}>
              <span style={{ display: 'block', fontFamily: fontStack(t.settings.fontHeading, 'serif'), fontWeight: Number(t.settings.headingWeight), fontSize: '1.15rem', color: '#1e3a34' }}>{t.label}{active ? ' ✓' : ''}</span>
              <span style={{ display: 'block', fontFamily: fontStack(t.settings.fontBody, 'sans-serif'), fontWeight: Number(t.settings.weight), fontSize: '.8rem', color: '#555', lineHeight: 1.5, marginTop: '.3rem' }}>{t.description}</span>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '.9rem', marginBottom: '1.25rem' }}>
        <div>
          <label style={lbl} htmlFor="theme_font_heading">Police des titres</label>
          <select id="theme_font_heading" style={sel} value={settings.theme_font_heading || ''} onChange={e => onChange('theme_font_heading', e.target.value)}>
            <option value="">Selon le gabarit</option>
            {FONT_CHOICES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl} htmlFor="theme_font_body">Police du texte</label>
          <select id="theme_font_body" style={sel} value={settings.theme_font_body || ''} onChange={e => onChange('theme_font_body', e.target.value)}>
            <option value="">Selon le gabarit</option>
            {FONT_CHOICES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>
        <CustomFont id="theme_font_heading_custom" label="… ou une autre police Google (titres)" value={settings.theme_font_heading_custom || ''} onChange={v => onChange('theme_font_heading_custom', v)} />
        <CustomFont id="theme_font_body_custom" label="… ou une autre police Google (texte)" value={settings.theme_font_body_custom || ''} onChange={v => onChange('theme_font_body_custom', v)} />
        {choice('theme_text_size', 'Taille du texte', TYPO_OPTIONS.size)}
        {choice('theme_text_weight', 'Épaisseur du texte', TYPO_OPTIONS.weight)}
        {choice('theme_line_height', 'Espace entre les lignes', TYPO_OPTIONS.lineHeight)}
        {choice('theme_heading_weight', 'Épaisseur des titres', TYPO_OPTIONS.headingWeight)}
        {choice('theme_caps', 'Étiquettes en capitales', TYPO_OPTIONS.caps)}
      </div>

      <LogoSize settings={settings} onChange={onChange} />

      {/* Aperçu : mêmes valeurs que le site, appliquées à ce cadre seulement */}
      <div style={{ border: '1.5px dashed #d7e5e0', borderRadius: '.85rem', padding: '1.1rem 1.25rem', background: '#faf9f7' }}>
        <p style={{ fontSize: '.7rem', fontWeight: 700, letterSpacing: '.05em', color: '#999', margin: '0 0 .6rem' }}>APERÇU</p>
        <div style={{ fontFamily: body, fontWeight: Number(s.weight), fontSize: `${16 * SIZE_PERCENT[s.size] / 100}px`, lineHeight: s.lineHeight, color: '#1a1a1a', maxWidth: 560 }} data-testid="typography-preview">
          <span style={{ display: 'block', fontSize: '.78em', color: '#2d5f54', textTransform: s.caps === 'keep' ? 'uppercase' : 'none', letterSpacing: s.caps === 'keep' ? '.18em' : '.01em', fontWeight: 600 }}>Accompagnement individuel</span>
          <span style={{ display: 'block', fontFamily: heading, fontWeight: Number(s.headingWeight), fontSize: '1.7em', color: '#1e3a34', lineHeight: 1.25, margin: '.2em 0 .35em' }}>Retrouver de l’énergie, à votre rythme</span>
          <span style={{ display: 'block' }}>Chaque séance part de votre réalité : ce qui vous pèse, ce qui vous donne envie. Nous avançons ensemble, une étape à la fois, avec des outils simples que vous gardez ensuite.</span>
        </div>
      </div>
    </div>
  )
}

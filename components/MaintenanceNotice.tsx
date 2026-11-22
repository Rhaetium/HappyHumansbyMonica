'use client'

import { Icon } from '@/components/icons'
import { useCmsContent } from '@/hooks/useCmsContent'
import { SITE_DEFAULTS } from '@/lib/cms-defaults/site'

/** Message affiché aux visiteurs quand le mode maintenance est actif (textes : CMS → « Textes communs » → Maintenance). */
export default function MaintenanceNotice() {
  const c = useCmsContent('site', SITE_DEFAULTS)
  return (
    <div style={{ minHeight: '100vh', background: 'var(--hh-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: '2rem' }}>
        <div style={{ marginBottom: '1.5rem', color: 'var(--hh-primary)', display: 'flex', justifyContent: 'center' }}><Icon name="wrench" size={48} /></div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--hh-primary)', marginBottom: '1rem', fontFamily: 'Georgia, serif' }}>
          {c.maintenance_title}
        </h1>
        <p style={{ color: '#78716c', fontSize: '1rem', lineHeight: 1.6 }}>
          {c.maintenance_text}<br />
          {c.maintenance_text2}
        </p>
        <p style={{ color: '#a8a29e', fontSize: '0.85rem', marginTop: '2rem' }}>
          <Icon name="chat" size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />{c.maintenance_help}{' '}
          <a href={`mailto:${c.maintenance_email}`} style={{ color: 'var(--hh-primary)' }}>
            {c.maintenance_email}
          </a>
        </p>
      </div>
    </div>
  )
}

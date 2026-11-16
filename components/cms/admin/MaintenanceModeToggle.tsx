'use client';

import { useState, useEffect } from 'react';

export function MaintenanceModeToggle() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/cms/maintenance')
      .then(r => r.json())
      .then(d => setEnabled(Boolean(d.enabled)))
      .catch(() => setEnabled(false))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/cms/maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      if (res.ok) {
        setEnabled(!enabled);
      }
    } catch {
      // silent fail
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div style={{ marginBottom: '2rem', padding: '1.25rem', background: enabled ? '#fff7ed' : '#f9fafb', border: `2px solid ${enabled ? '#f97316' : '#e5e7eb'}`, borderRadius: '.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: enabled ? '#c2410c' : '#374151', margin: '0 0 .35rem' }}>
            ⚠️ Mode maintenance
          </h3>
          <p style={{ fontSize: '.82rem', color: '#6b7280', margin: 0 }}>
            Affiche une page &quot;en maintenance&quot; à tous les visiteurs (sauf Monica connectée au CMS)
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={saving}
          style={{
            position: 'relative',
            width: 56,
            height: 30,
            borderRadius: 9999,
            border: 'none',
            cursor: 'pointer',
            background: enabled ? '#f97316' : '#d1d5db',
            transition: 'background .2s',
            flexShrink: 0,
            opacity: saving ? .7 : 1,
          }}
          title={enabled ? 'Désactiver le mode maintenance' : 'Activer le mode maintenance'}
        >
          <div style={{
            position: 'absolute',
            top: 3,
            left: enabled ? 29 : 3,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,.2)',
            transition: 'left .2s',
          }} />
        </button>
      </div>
      {enabled && (
        <div style={{ marginTop: '.75rem', padding: '.5rem .75rem', background: '#fff', borderRadius: '.4rem', border: '1px solid #fed7aa' }}>
          <p style={{ fontSize: '.8rem', color: '#c2410c', margin: 0 }}>
            ⚠️ Le site affiche actuellement une page de maintenance aux visiteurs non-connectés.
          </p>
        </div>
      )}
    </div>
  );
}


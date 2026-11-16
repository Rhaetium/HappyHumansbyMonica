// Styles partagés de l'admin du CMS (déplacés de app/cms-admin/page.tsx, sans changement)
import type { CSSProperties } from 'react';

export const lbl: CSSProperties = {
  display: 'block', fontWeight: 600, fontSize: '.85rem', color: '#555', marginBottom: '.35rem',
};
export const inp: CSSProperties = {
  width: '100%', padding: '.65rem .9rem',
  border: '1.5px solid #e0dbd5', borderRadius: '.5rem',
  fontSize: '.9rem', outline: 'none', background: '#faf9f7', color: '#1a1a1a',
};
export const metaChip: CSSProperties = {
  padding: '.35rem .65rem',
  borderRadius: '9999px',
  background: '#f0e8e4',
  color: '#2d5f54',
  fontSize: '.76rem',
  fontWeight: 600,
};
export const previewPanel: CSSProperties = {
  marginTop: '1.75rem',
  padding: '1.25rem',
  borderRadius: '1rem',
  background: '#f8f4ef',
  border: '1px solid #ece3d8',
};
export const previewFrame: CSSProperties = {
  background: 'white',
  borderRadius: '1rem',
  padding: '1.5rem',
  boxShadow: '0 1px 4px rgba(0,0,0,.05)',
};
export const previewImageFallback: CSSProperties = {
  minHeight: 220,
  marginBottom: '1.5rem',
  borderRadius: '.9rem',
  background: 'linear-gradient(135deg, #f2e8dc 0%, #d9ebe6 100%)',
  color: '#6d625a',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '1.5rem',
  fontWeight: 600,
};
export const previewBody: CSSProperties = {
  color: '#302925',
  lineHeight: 1.8,
  fontSize: '1rem',
};

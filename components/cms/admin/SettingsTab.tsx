'use client';

import SiteLogo, { logoPx, resolveLogo } from '@/components/SiteLogo';
import { THEMES } from '@/components/DynamicTheme';
import { FONT_CHOICES } from '@/lib/themes';
import { THEME_PACKS, DEFAULT_PACK_ID } from '@/lib/theme-packs';
import { SEARCH_CONSOLE_PROPERTY_DEFAULT } from '@/lib/search-console';
import { lbl, inp } from '@/components/cms/admin/styles';
import { BRANDING_PANEL_KEYS, SETTINGS_GROUPS } from '@/components/cms/admin/config';
import { MaintenanceModeToggle } from '@/components/cms/admin/MaintenanceModeToggle';
import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import type { Setting } from '@/components/cms/admin/types';

type Props = {
  loadingSettings: boolean;
  settingsGroup: string;
  setSettingsGroup: Dispatch<SetStateAction<string>>;
  settings: Setting[];
  editedSettings: Record<string, string>;
  setEditedSettings: Dispatch<SetStateAction<Record<string, string>>>;
  handleImageFile: (e: ChangeEvent<HTMLInputElement>, onUrl: (url: string) => void) => Promise<void>;
  saveSettings: () => Promise<void>;
  savingSettings: boolean;
};

/** Onglet « settings » de l'admin du CMS (déplacé de app/cms-admin/page.tsx, JSX inchangé). */
export default function SettingsTab({ loadingSettings, settingsGroup, setSettingsGroup, settings, editedSettings, setEditedSettings, handleImageFile, saveSettings, savingSettings }: Props) {
  return (
    <div>
      {loadingSettings ? <p style={{ textAlign: 'center', color: '#888', padding: '3rem' }}>Chargement…</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.5rem', alignItems: 'start' }}>

          {/* Sidebar settings */}
          <div style={{ background: 'white', borderRadius: '1rem', padding: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.75rem', padding: '0 .5rem' }}>Paramètres globaux</p>
            {Object.entries(SETTINGS_GROUPS).map(([key, cfg]) => (
              <button key={key} onClick={() => setSettingsGroup(key)}
                style={{ display: 'flex', alignItems: 'center', gap: '.5rem', width: '100%', textAlign: 'left', padding: '.6rem .75rem', borderRadius: '.5rem', border: 'none', cursor: 'pointer', fontSize: '.88rem', fontWeight: settingsGroup === key ? 700 : 400, background: settingsGroup === key ? '#f0e8e4' : 'transparent', color: settingsGroup === key ? '#2d5f54' : '#555', marginBottom: '.2rem' }}
              >
                <span>{cfg.emoji}</span> {cfg.label}
              </button>
            ))}
          </div>

          {/* Panel settings */}
          <div style={{ background: 'white', borderRadius: '1rem', padding: '2rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            {/* ── MAINTENANCE MODE ── */}
            <MaintenanceModeToggle />
            
            {(() => {
              const groupItems = settings.filter(s => s.group_name === settingsGroup);
              const groupCfg = SETTINGS_GROUPS[settingsGroup];
              return (
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2d5f54', marginBottom: '1.5rem' }}>
                    {groupCfg?.emoji} {groupCfg?.label}
                  </h2>
                  {/* ── BRANDING PANEL ── */}
                  {settingsGroup === 'branding' && (
                    <div style={{ marginBottom: '2rem' }}>
                      {/* Prévisualisation live */}
                      <div style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem', background: 'white', borderRadius: '.75rem', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: 260, background: '#fff', borderBottom: '1px solid #f0ece8', borderRadius: '.5rem .5rem 0 0', padding: '.6rem 1rem', display: 'flex', alignItems: 'center', gap: '.75rem', justifyContent: (editedSettings['logo_position'] || 'left') === 'center' ? 'center' : 'flex-start' }}>
                          <SiteLogo url={resolveLogo(editedSettings).url} size={resolveLogo(editedSettings).size} shape={resolveLogo(editedSettings).shape} />
                          <div>
                            {resolveLogo(editedSettings).showName && <p style={{ fontWeight: 700, fontSize: '.9rem', color: '#1a1a1a', margin: 0, fontFamily: 'Georgia, serif' }}>{editedSettings['site_name'] || 'Happy Humans'}</p>}
                            {editedSettings['tagline'] && <p style={{ fontSize: '.7rem', color: '#c9a96e', margin: 0, fontStyle: 'italic' }}>{editedSettings['tagline']}</p>}
                          </div>
                        </div>
                        <p style={{ fontSize: '.78rem', color: '#aaa', margin: 0 }}>← Prévisualisation header</p>
                      </div>

                      {/* Upload logo */}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <label style={lbl}>Logo (image)</label>
                        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <label style={{ padding: '.5rem 1rem', background: '#2d5f54', color: 'white', borderRadius: '.4rem', cursor: 'pointer', fontSize: '.85rem', display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}>
                            ⬆ Upload logo
                            <input type="file" accept="image/*" style={{ display: 'none' }}
                              onChange={e => handleImageFile(e, url => setEditedSettings(p => ({ ...p, logo_url: url })))} />
                          </label>
                          <input type="text" value={editedSettings['logo_url'] || ''} placeholder="Ou coller une URL d'image"
                            onChange={e => setEditedSettings(p => ({ ...p, logo_url: e.target.value }))}
                            style={{ ...inp, flex: 1, minWidth: 200 }} />
                          {editedSettings['logo_url'] && (
                            <button onClick={() => setEditedSettings(p => ({ ...p, logo_url: '' }))}
                              style={{ padding: '.4rem .6rem', background: '#fee2e2', border: 'none', borderRadius: '.3rem', cursor: 'pointer', fontSize: '.8rem', color: '#dc2626' }}>✕</button>
                          )}
                        </div>
                      </div>

                      {/* Taille du logo */}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <label style={lbl}>Taille du logo — {logoPx(editedSettings['logo_size'], 52)}px</label>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '.75rem', color: '#aaa' }}>24px</span>
                          <input type="range" min="24" max="64" step="4"
                            value={logoPx(editedSettings['logo_size'], 52)}
                            onChange={e => setEditedSettings(p => ({ ...p, logo_size: e.target.value }))}
                            style={{ flex: 1, accentColor: '#2d5f54' }} />
                          <span style={{ fontSize: '.75rem', color: '#aaa' }}>64px</span>
                          {/* Tailles prédéfinies */}
                          {[['XS', '28'], ['S', '36'], ['M', '44'], ['L', '56'], ['XL', '64']].map(([label, val]) => (
                            <button key={val} onClick={() => setEditedSettings(p => ({ ...p, logo_size: val }))}
                              style={{ padding: '.2rem .5rem', fontSize: '.72rem', border: `1px solid ${editedSettings['logo_size'] === val ? '#2d5f54' : '#ddd'}`, borderRadius: '.3rem', cursor: 'pointer', background: editedSettings['logo_size'] === val ? '#2d5f54' : 'white', color: editedSettings['logo_size'] === val ? 'white' : '#555' }}>
                              {label}
                            </button>
                          ))}
                        </div>

                      {/* Taille logo footer */}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <label style={lbl}>Taille logo footer — {editedSettings['logo_footer_size'] || 36}px</label>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '.75rem', color: '#aaa' }}>20px</span>
                          <input type="range" min="20" max="72" step="4"
                            value={Number(editedSettings['logo_footer_size'] || 36)}
                            onChange={e => setEditedSettings(p => ({ ...p, logo_footer_size: e.target.value }))}
                            style={{ flex: 1, accentColor: '#2d5f54' }} />
                          <span style={{ fontSize: '.75rem', color: '#aaa' }}>72px</span>
                          {[['S', '24'], ['M', '36'], ['L', '48']].map(([label, val]) => (
                            <button key={val} onClick={() => setEditedSettings(p => ({ ...p, logo_footer_size: val }))}
                              style={{ padding: '.2rem .5rem', fontSize: '.72rem', border: `1px solid ${editedSettings['logo_footer_size'] === val ? '#2d5f54' : '#ddd'}`, borderRadius: '.3rem', cursor: 'pointer', background: editedSettings['logo_footer_size'] === val ? '#2d5f54' : 'white', color: editedSettings['logo_footer_size'] === val ? 'white' : '#555' }}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Position du logo */}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <label style={lbl}>Position dans le header</label>
                        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                          {[['Gauche', 'left'], ['Centré', 'center']].map(([label, val]) => (
                            <button key={val} onClick={() => setEditedSettings(p => ({ ...p, logo_position: val }))}
                              style={{ padding: '.45rem 1.1rem', fontSize: '.82rem', fontWeight: 600, border: `1.5px solid ${(editedSettings['logo_position'] || 'left') === val ? '#2d5f54' : '#ddd'}`, borderRadius: '.5rem', cursor: 'pointer', background: (editedSettings['logo_position'] || 'left') === val ? '#2d5f54' : 'white', color: (editedSettings['logo_position'] || 'left') === val ? 'white' : '#555', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                              {val === 'left'
                                ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><line x1="14" y1="6" x2="21" y2="6"/></svg>{label}</>
                                : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="8" y2="6"/><rect x="9" y="3" width="6" height="6" rx="1"/><line x1="16" y1="6" x2="21" y2="6"/></svg>{label}</>
                              }
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Forme du logo */}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <label style={lbl}>Forme du logo</label>
                        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                          {[['Cercle', 'circle'], ['Arrondi', 'rounded'], ['Sans découpe', 'square']].map(([label, val]) => {
                            const active = (editedSettings['logo_shape'] || 'circle') === val;
                            const size = 32;
                            const radius = val === 'circle' ? '50%' : val === 'rounded' ? '6px' : '2px';
                            return (
                              <button key={val} onClick={() => setEditedSettings(p => ({ ...p, logo_shape: val }))}
                                style={{ padding: '.45rem 1rem', fontSize: '.82rem', fontWeight: 600, border: `1.5px solid ${active ? '#2d5f54' : '#ddd'}`, borderRadius: '.5rem', cursor: 'pointer', background: active ? '#2d5f54' : 'white', color: active ? 'white' : '#555', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                                <div style={{ width: size, height: size, borderRadius: radius, background: active ? 'rgba(255,255,255,.3)' : '#e8e4df', border: `1px solid ${active ? 'rgba(255,255,255,.4)' : '#ccc'}`, flexShrink: 0 }} />
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      </div>
                    </div>
                  )}

                  {/* ── THEME PICKER ── */}
                  {settingsGroup === 'theme' && (
                    <div style={{ marginBottom: '2rem' }}>
                      <p style={{ fontSize: '.85rem', color: '#888', marginBottom: '1rem' }}>Choisissez un thème visuel pour tout le site. Cliquez pour appliquer instantanément.</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        {Object.entries(THEMES).map(([key, theme]) => {
                          const isActive = (editedSettings['theme_preset'] || 'forest') === key;
                          return (
                            <button key={key} onClick={() => setEditedSettings(p => ({ ...p, theme_preset: key }))}
                              style={{ border: isActive ? `3px solid ${theme.primary}` : '2px solid #e5e7eb', borderRadius: '.75rem', padding: '1rem .75rem', cursor: 'pointer', background: theme.bg, textAlign: 'center', transition: 'all .15s', boxShadow: isActive ? `0 0 0 2px ${theme.primary}33` : 'none' }}>
                              <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '.5rem' }}>
                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: theme.primary }} />
                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: theme.accent }} />
                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: theme.dark }} />
                              </div>
                              <p style={{ fontWeight: isActive ? 700 : 500, fontSize: '.82rem', color: theme.text, margin: 0 }}>{theme.label}</p>
                              {isActive && <p style={{ fontSize: '.7rem', color: theme.primary, margin: '2px 0 0', fontWeight: 600 }}>✓ Actif</p>}
                            </button>
                          );
                        })}
                      </div>
                      {/* ── PACK D'ILLUSTRATIONS ── */}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={lbl}>Pack d'illustrations (galerie des 7 outils, lead magnet…)</label>
                        <select value={editedSettings['illustration_pack'] || DEFAULT_PACK_ID}
                          onChange={e => setEditedSettings(p => ({ ...p, illustration_pack: e.target.value }))}
                          style={{ ...inp, maxWidth: 360 }}>
                          {Object.values(THEME_PACKS).map(pack => (
                            <option key={pack.id} value={pack.id}>{pack.label} — {pack.description}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ borderTop: '1px solid #f0ece8', paddingTop: '1.5rem' }}>
                        <p style={{ fontSize: '.82rem', fontWeight: 600, color: '#555', marginBottom: '1rem' }}>Couleurs personnalisées (optionnel — surcharge le thème)</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          {[
                            { key: 'theme_primary', label: 'Couleur principale' },
                            { key: 'theme_accent',  label: 'Couleur accent' },
                            { key: 'theme_dark',    label: 'Couleur sombre (nav/footer)' },
                            { key: 'theme_light',   label: 'Couleur claire (variante)' },
                            { key: 'theme_bg',      label: 'Couleur fond' },
                            { key: 'theme_text',    label: 'Couleur texte' },
                          ].map(({ key, label }) => (
                            <div key={key}>
                              <label style={lbl}>{label}</label>
                              <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                                <input type="color" value={editedSettings[key] || '#2d5f54'}
                                  onChange={e => setEditedSettings(p => ({ ...p, [key]: e.target.value }))}
                                  style={{ width: 40, height: 36, border: 'none', borderRadius: '.3rem', cursor: 'pointer', padding: 2 }} />
                                <input type="text" value={editedSettings[key] || ''}
                                  onChange={e => setEditedSettings(p => ({ ...p, [key]: e.target.value }))}
                                  placeholder="ex: #2d5f54"
                                  style={{ ...inp, flex: 1 }} />
                                {editedSettings[key] && (
                                  <button onClick={() => setEditedSettings(p => { const n = {...p}; delete n[key]; return n; })}
                                    style={{ padding: '.3rem .5rem', background: '#fee2e2', border: 'none', borderRadius: '.3rem', cursor: 'pointer', fontSize: '.75rem', color: '#dc2626' }}>
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => setEditedSettings(p => {
                          const n = {...p};
                          delete n['theme_primary']; delete n['theme_accent'];
                          delete n['theme_dark']; delete n['theme_light'];
                          delete n['theme_bg']; delete n['theme_text'];
                          return n;
                        })} style={{ marginTop: '1rem', padding: '.4rem .9rem', background: '#f5f0eb', border: 'none', borderRadius: '.4rem', cursor: 'pointer', fontSize: '.8rem', color: '#666' }}>
                          Réinitialiser les couleurs personnalisées
                        </button>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.25rem' }}>
                          {[
                            { key: 'theme_font_heading', label: 'Police des titres' },
                            { key: 'theme_font_body', label: 'Police du texte courant' },
                          ].map(({ key, label }) => (
                            <div key={key}>
                              <label style={lbl}>{label}</label>
                              <select value={editedSettings[key] || ''}
                                onChange={e => setEditedSettings(p => ({ ...p, [key]: e.target.value }))}
                                style={inp}>
                                <option value="">— Police du preset —</option>
                                {FONT_CHOICES.map(f => (
                                  <option key={f.id} value={f.id}>{f.label}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>

                      {/* Position du logo */}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <label style={lbl}>Position dans le header</label>
                        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                          {[['Gauche', 'left'], ['Centré', 'center']].map(([label, val]) => (
                            <button key={val} onClick={() => setEditedSettings(p => ({ ...p, logo_position: val }))}
                              style={{ padding: '.45rem 1.1rem', fontSize: '.82rem', fontWeight: 600, border: `1.5px solid ${(editedSettings['logo_position'] || 'left') === val ? '#2d5f54' : '#ddd'}`, borderRadius: '.5rem', cursor: 'pointer', background: (editedSettings['logo_position'] || 'left') === val ? '#2d5f54' : 'white', color: (editedSettings['logo_position'] || 'left') === val ? 'white' : '#555', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                              {val === 'left'
                                ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><line x1="14" y1="6" x2="21" y2="6"/></svg>{label}</>
                                : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="8" y2="6"/><rect x="9" y="3" width="6" height="6" rx="1"/><line x1="16" y1="6" x2="21" y2="6"/></svg>{label}</>
                              }
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Forme du logo */}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <label style={lbl}>Forme du logo</label>
                        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                          {[['Cercle', 'circle'], ['Arrondi', 'rounded'], ['Carré', 'square']].map(([label, val]) => {
                            const active = (editedSettings['logo_shape'] || 'circle') === val;
                            const size = 32;
                            const radius = val === 'circle' ? '50%' : val === 'rounded' ? '6px' : '2px';
                            return (
                              <button key={val} onClick={() => setEditedSettings(p => ({ ...p, logo_shape: val }))}
                                style={{ padding: '.45rem 1rem', fontSize: '.82rem', fontWeight: 600, border: `1.5px solid ${active ? '#2d5f54' : '#ddd'}`, borderRadius: '.5rem', cursor: 'pointer', background: active ? '#2d5f54' : 'white', color: active ? 'white' : '#555', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                                <div style={{ width: size, height: size, borderRadius: radius, background: active ? 'rgba(255,255,255,.3)' : '#e8e4df', border: `1px solid ${active ? 'rgba(255,255,255,.4)' : '#ccc'}`, flexShrink: 0 }} />
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      </div>
                    </div>
                  )}
                  {/* ── SEARCH CONSOLE — guide pas à pas ── */}
                  {settingsGroup === 'search-console' && (
                    <div style={{ marginBottom: '1.75rem', padding: '1.25rem 1.5rem', background: '#f7faf9', border: '1.5px solid #d7e5e0', borderRadius: '.85rem' }}>
                      <p style={{ margin: '0 0 .6rem', fontSize: '.92rem', fontWeight: 700, color: '#2d5f54' }}>
                        🔎 Relier le site à Google Search Console
                      </p>
                      <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '.86rem', color: '#444', lineHeight: 1.7 }}>
                        <li>Ouvrez <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" style={{ color: '#2d5f54', fontWeight: 600 }}>search.google.com/search-console</a> et ajoutez une propriété « Préfixe d’URL » : <code style={{ background: '#ece8e2', padding: '.1rem .35rem', borderRadius: '.25rem' }}>{editedSettings['gsc_property'] || SEARCH_CONSOLE_PROPERTY_DEFAULT}</code></li>
                        <li>Choisissez la méthode <strong>Balise HTML</strong>, puis <strong>copiez la balise entière</strong> et collez-la dans le champ ci-dessous.</li>
                        <li>Enregistrez, puis cliquez sur <strong>Vérifier</strong> dans Search Console.</li>
                        <li>Dans le menu « Sitemaps », soumettez <code style={{ background: '#ece8e2', padding: '.1rem .35rem', borderRadius: '.25rem' }}>sitemap.xml</code>.</li>
                      </ol>
                      <p style={{ margin: '.75rem 0 0', fontSize: '.82rem', color: '#666', lineHeight: 1.5 }}>
                        Le site n’a besoin que de la balise : collez-la telle quelle, le jeton est extrait
                        automatiquement. L’état de la connexion s’affiche ensuite en haut du tableau de bord.
                      </p>
                    </div>
                  )}

                  {/* ── VISIBILITÉ — toggles ── */}
                  {settingsGroup === 'visibility' && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <p style={{ fontSize: '.82rem', color: '#888', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                        Contrôlez si chaque page est indexée par Google (robots meta). La navigation et le footer se gèrent dans l&apos;onglet <strong>Pages → Navigation</strong>.
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '.75rem' }}>
                        {groupItems.map(s => {
                          const isOn = (editedSettings[s.key] ?? 'true') !== 'false';
                          return (
                            <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.75rem 1rem', background: '#faf9f7', borderRadius: '.65rem', border: '1.5px solid #ece8e2' }}>
                              <span style={{ fontSize: '.88rem', color: '#444', fontWeight: 500 }}>{s.label}</span>
                              <button
                                onClick={() => setEditedSettings(prev => ({ ...prev, [s.key]: isOn ? 'false' : 'true' }))}
                                style={{
                                  position: 'relative', width: 46, height: 26, borderRadius: 9999,
                                  border: 'none', cursor: 'pointer', flexShrink: 0,
                                  background: isOn ? '#2d5f54' : '#d1d5db', transition: 'background .18s',
                                }}
                                title={isOn ? 'Indexé — cliquer pour désindexer' : 'Non indexé — cliquer pour indexer'}
                              >
                                <div style={{
                                  position: 'absolute', top: 3, left: isOn ? 23 : 3,
                                  width: 20, height: 20, borderRadius: '50%', background: 'white',
                                  boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left .18s',
                                }} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                    {settingsGroup !== 'visibility' && groupItems.filter(s => !(settingsGroup === 'branding' && BRANDING_PANEL_KEYS.includes(s.key))).map(s => {
                      const field = s as { key: string; label: string; type: string; options?: string[]; optionLabels?: string[]; placeholder?: string };
                      return (
                      <div key={s.key}>
                        <label style={lbl} htmlFor={`set-${s.key}`}>{s.label}</label>
                        {field.type === 'image' ? (
                          <div>
                            {editedSettings[s.key] && (
                              <div style={{ marginBottom: '.5rem' }}>
                                <img src={editedSettings[s.key]} alt="Logo" style={{ maxHeight: 80, maxWidth: 300, objectFit: 'contain', borderRadius: '.4rem', border: '1px solid #eee', padding: '.5rem', background: '#fafafa' }} />
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                              <label style={{ padding: '.5rem 1rem', background: '#2d5f54', color: 'white', borderRadius: '.4rem', cursor: 'pointer', fontSize: '.85rem' }}>
                                ⬆️ Choisir une image
                                <input type="file" accept="image/*" style={{ display: 'none' }}
                                  onChange={e => handleImageFile(e, url => setEditedSettings(prev => ({ ...prev, [s.key]: url })))} />
                              </label>
                              <input id={`set-${s.key}`} value={editedSettings[s.key] || ''} onChange={e => setEditedSettings(prev => ({ ...prev, [s.key]: e.target.value }))} style={{ ...inp, flex: 1 }} placeholder="Ou coller une URL..." />
                              {editedSettings[s.key] && <button onClick={() => setEditedSettings(prev => ({ ...prev, [s.key]: '' }))} style={{ padding: '.5rem .8rem', background: '#fee', color: '#c0392b', border: '1px solid #fcc', borderRadius: '.4rem', cursor: 'pointer', fontSize: '.85rem' }}>✕ Supprimer</button>}
                            </div>
                          </div>
                        ) : field.type === 'textarea' ? (
                          <textarea id={`set-${s.key}`} value={editedSettings[s.key] || ''} onChange={e => setEditedSettings(prev => ({ ...prev, [s.key]: e.target.value }))} style={{ ...inp, height: 100, resize: 'vertical' }} placeholder={s.label} />
                        ) : field.type === 'select' && field.options ? (
                          <select
                            id={`set-${s.key}`}
                            value={editedSettings[s.key] || field.options[0]}
                            onChange={e => setEditedSettings(prev => ({ ...prev, [s.key]: e.target.value }))}
                            style={{ ...inp, cursor: 'pointer' }}
                          >
                            {field.options.map((opt: string, i: number) => (
                              <option key={opt} value={opt}>{field.optionLabels?.[i] || opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input id={`set-${s.key}`} value={editedSettings[s.key] || ''}
                            onChange={e => setEditedSettings(prev => ({ ...prev, [s.key]: e.target.value }))}
                            style={inp} placeholder={field.placeholder || s.label} />
                        )}
                      </div>
                      );
                    })}
                    {settingsGroup !== 'visibility' && groupItems.length === 0 && (
                      <p style={{ color: '#aaa', fontSize: '.9rem', textAlign: 'center', padding: '2rem' }}>Aucun paramètre dans ce groupe.</p>
                    )}
                  </div>
                  <button onClick={saveSettings} disabled={savingSettings}
                    style={{ marginTop: '1.75rem', padding: '.7rem 2rem', background: '#2d5f54', color: 'white', border: 'none', borderRadius: '.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '.9rem', opacity: savingSettings ? .7 : 1 }}
                  >{savingSettings ? '⏳ Sauvegarde…' : '💾 Sauvegarder'}</button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

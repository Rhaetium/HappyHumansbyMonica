'use client'

import React, { useCallback, useEffect, useState } from 'react'
import CustomSectionsEditor from '@/components/cms/CustomSectionsEditor'
import { parseBlocks, serializeBlocks } from '@/lib/custom-sections'
import { uploadImage } from '@/lib/upload-client'
import { DEFAULT_NAV, NAV_UPDATED_EVENT, type NavItem } from '@/hooks/useCmsNavigation'
import { bustCmsCache } from '@/hooks/useCmsContent'
import { addNavLink, cloneNav, navHasHref, removeNavLinkByHref } from '@/lib/cms-nav'
import {
  CUSTOM_PAGES_KEY, CUSTOM_PAGES_PAGE, blankPage, duplicatePage, isValidSlug, movePage, pageHref,
  parsePages, removePage, serializePages, slugify, uniqueSlug, upsertPage, type CustomPage,
} from '@/lib/custom-pages'

/**
 * Admin → « 📄 Pages libres ».
 *
 * Créer une page entière depuis le CMS : adresse (/p/…), titre, accroche, blocs,
 * SEO, et interrupteur « En ligne ». Rien n'est codé en dur : la page publique
 * (app/p/[slug]/page.tsx) lit exactement ce qui est enregistré ici dans Supabase.
 *
 * Contrairement aux pages historiques du site, ces pages n'ont pas de circuit
 * brouillon → publication : chaque enregistrement écrit la vérité en base, et la
 * page n'est visible des visiteurs que si « En ligne » est activé.
 */

const inp: React.CSSProperties = {
  width: '100%', padding: '.65rem .9rem', border: '1.5px solid #e0dbd5', borderRadius: '.5rem',
  fontSize: '.9rem', outline: 'none', background: '#faf9f7', color: '#1a1a1a',
}
const lbl: React.CSSProperties = {
  display: 'block', fontWeight: 600, fontSize: '.85rem', color: '#555', marginBottom: '.35rem',
}
const smallBtn: React.CSSProperties = {
  padding: '.4rem .7rem', background: 'white', border: '1px solid #ddd', borderRadius: '.4rem',
  cursor: 'pointer', fontSize: '.8rem', color: '#555',
}

export default function CustomPagesManager() {
  const [pages, setPages] = useState<CustomPage[]>([])
  const [editing, setEditing] = useState<CustomPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  // Tant que Monica n'a pas touché l'adresse, elle suit le nom de la page
  const [slugEdited, setSlugEdited] = useState(false)
  // Menu du site : permet « Ajouter au menu » en un clic (null = pas encore lu)
  const [nav, setNav] = useState<NavItem[] | null>(null)
  const [navBusy, setNavBusy] = useState(false)
  const [navMsg, setNavMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/cms/content?page=${CUSTOM_PAGES_PAGE}`, { cache: 'no-store' })
      if (res.status === 401) { setError('Session expirée : reconnectez-vous à l’administration.'); return }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || `Erreur ${res.status}`); return }
      const row = ((data.content || []) as { block_key: string; value: string }[])
        .find(r => r.block_key === CUSTOM_PAGES_KEY)
      const list = parsePages(row?.value)
      setPages(list)
      setEditing(list[0] ?? null)
      setDirty(false)
    } catch {
      setError('Impossible de charger les pages libres.')
    } finally {
      setLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial depuis l'API
  useEffect(() => { void load() }, [load])

  const patch = (changes: Partial<CustomPage>) => {
    setEditing(p => (p ? { ...p, ...changes } : p))
    setDirty(true)
    setSaved(false)
  }

  const select = (page: CustomPage) => {
    if (dirty && !confirm('Des modifications ne sont pas enregistrées. Changer de page les abandonne. Continuer ?')) return
    setEditing({ ...page, blocks: page.blocks.map(b => ({ ...b })) })
    setDirty(false)
    setSaved(false)
    setSlugEdited(true)
  }

  useEffect(() => {
    let alive = true
    fetch('/api/cms/navigation', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : { nav: null }))
      .then(d => { if (alive) setNav(Array.isArray(d.nav) && d.nav.length > 0 ? d.nav : cloneNav(DEFAULT_NAV)) })
      .catch(() => { if (alive) setNav(cloneNav(DEFAULT_NAV)) })
    return () => { alive = false }
  }, [])

  /** Ajoute ou retire le lien de la page dans le menu du site, tout de suite (sans passer par l'onglet Menu). */
  const toggleInMenu = async (page: CustomPage, add: boolean) => {
    if (!nav) return
    const href = pageHref(page.slug)
    const next = add ? addNavLink(nav, page.title, href) : removeNavLinkByHref(nav, href)
    setNavBusy(true); setNavMsg(null)
    try {
      const res = await fetch('/api/cms/navigation', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nav: next }) })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(res.status === 401 ? 'Session expirée : reconnectez-vous à l’administration.' : data.error || `Erreur ${res.status}`)
      }
      bustCmsCache('navigation')
      window.dispatchEvent(new Event(NAV_UPDATED_EVENT))
      setNav(next)
      setNavMsg(add ? 'Ajoutée au menu.' : 'Retirée du menu.')
    } catch (e: unknown) {
      setNavMsg(e instanceof Error ? e.message : 'Modification du menu impossible.')
    } finally {
      setNavBusy(false)
    }
  }

  const duplicate = (page: CustomPage) => {
    if (dirty && !confirm('Des modifications ne sont pas enregistrées. Dupliquer les abandonne. Continuer ?')) return
    const next = duplicatePage(pages, page.id)
    const copy = next[next.findIndex(p => p.id === page.id) + 1]
    if (!copy) return
    setPages(next)
    setEditing({ ...copy })
    setDirty(true)
    setSaved(false)
    setSlugEdited(true)
  }

  const addPage = () => {
    if (dirty && !confirm('Des modifications ne sont pas enregistrées. Créer une page les abandonne. Continuer ?')) return
    const created = blankPage(pages)
    setPages(p => [...p, created])
    setEditing({ ...created })
    setDirty(true)
    setSaved(false)
    setSlugEdited(false)
  }

  const del = (page: CustomPage) => {
    if (!confirm(`Supprimer définitivement la page « ${page.title || page.slug} » ?\n\nElle ne sera plus accessible, même en ligne.`)) return
    const next = removePage(pages, page.id)
    setPages(next)
    setEditing(next[0] ? { ...next[0] } : null)
    setDirty(true)
    setSaved(false)
    setSlugEdited(true)
  }

  const move = (page: CustomPage, dir: -1 | 1) => {
    setPages(p => movePage(p, page.id, dir))
    setDirty(true)
    setSaved(false)
  }

  const pickImage = async (file: File | undefined) => {
    if (!file || !editing) return
    setUploading(true)
    setError(null)
    try {
      const url = await uploadImage(file)
      patch({ seoImage: url })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Envoi de l’image impossible.')
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    if (!editing) return
    if (!editing.title.trim()) { setError('Le nom de la page est obligatoire.'); return }
    const slug = slugify(editing.slug || editing.title)
    if (!isValidSlug(slug)) { setError('L’adresse ne peut contenir que des lettres, des chiffres et des tirets.'); return }

    const next = upsertPage(pages, { ...editing, slug })
    const stored = next.find(p => p.id === editing.id)!
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/cms/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: CUSTOM_PAGES_PAGE, block_key: CUSTOM_PAGES_KEY, value: serializePages(next) }),
      })
      if (res.status === 401) { setError('Session expirée : reconnectez-vous à l’administration.'); return }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || `Erreur ${res.status}`); return }
      setPages(next)
      setEditing({ ...stored, blocks: stored.blocks.map(b => ({ ...b })) })
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Impossible d’enregistrer : erreur réseau.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p style={{ textAlign: 'center', color: '#888', padding: '3rem' }}>Chargement des pages…</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#2d5f54', margin: 0 }}>📄 Pages libres</h2>
          <p style={{ margin: '.25rem 0 0', fontSize: '.82rem', color: '#7a7a7a' }}>
            Créez de nouvelles pages du site (adresse <code>/p/…</code>), avec leurs blocs et leur référencement.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          <button type="button" onClick={addPage} style={smallBtn}>➕ Nouvelle page</button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty || !editing}
            style={{ padding: '.55rem 1.3rem', background: '#2d5f54', color: 'white', border: 'none', borderRadius: '.5rem', fontWeight: 700, fontSize: '.88rem', cursor: saving || !dirty ? 'default' : 'pointer', opacity: saving || !dirty ? .5 : 1 }}
          >
            {saving ? '⏳ Enregistrement…' : saved ? '✅ Enregistré !' : '💾 Enregistrer'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '.7rem 1rem', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '.5rem', color: '#dc2626', fontSize: '.88rem', marginBottom: '1rem' }}>
          ❌ {error}
        </div>
      )}

      <p style={{ fontSize: '.82rem', color: '#7a5c00', background: '#fff8e1', border: '1px solid #f0c040', borderRadius: '.5rem', padding: '.6rem .9rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
        💡 Une page libre est enregistrée <strong>directement</strong> (pas de brouillon) ; les visiteurs ne la voient que si
        l’interrupteur <strong>En ligne</strong> est activé. Pour ajouter un lien dans le menu :
        onglet <strong>🧭 Menu</strong> → <strong>➕ Ajouter un lien</strong> → adresse <code>/p/votre-adresse</code>.
      </p>

      {pages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#faf8f5', border: '1.5px dashed #e0dbd5', borderRadius: '.75rem' }}>
          <p style={{ margin: 0, fontWeight: 600, color: '#44403c' }}>Aucune page libre pour le moment.</p>
          <p style={{ margin: '.35rem 0 1rem', fontSize: '.85rem', color: '#7a7a7a' }}>
            Cliquez sur « ➕ Nouvelle page » pour en créer une : titre, texte, blocs, photos.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Liste */}
          <div style={{ background: 'white', borderRadius: '1rem', padding: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 .5rem .75rem' }}>Pages créées</p>
            {pages.map(page => (
              <div key={page.id} style={{ display: 'flex', alignItems: 'center', gap: '.25rem', marginBottom: '.2rem' }}>
                <button
                  type="button"
                  onClick={() => select(page)}
                  style={{ flex: 1, textAlign: 'left', padding: '.55rem .6rem', borderRadius: '.5rem', border: 'none', cursor: 'pointer', fontSize: '.86rem', fontWeight: editing?.id === page.id ? 700 : 400, background: editing?.id === page.id ? '#f0e8e4' : 'transparent', color: editing?.id === page.id ? '#2d5f54' : '#555' }}
                >
                  {page.title || '(sans nom)'}
                  <span style={{ display: 'block', fontSize: '.7rem', color: page.published ? '#15803d' : '#a8a29e' }}>
                    {page.published ? '● En ligne' : '○ Hors ligne'}
                  </span>
                </button>
                <button type="button" onClick={() => move(page, -1)} title="Monter" style={{ ...smallBtn, padding: '.2rem .35rem' }}>↑</button>
                <button type="button" onClick={() => move(page, 1)} title="Descendre" style={{ ...smallBtn, padding: '.2rem .35rem' }}>↓</button>
              </div>
            ))}
          </div>

          {/* Éditeur */}
          {editing && (
            <div style={{ background: 'white', borderRadius: '1rem', padding: '1.75rem', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editing.published}
                    onClick={() => patch({ published: !editing.published })}
                    style={{ width: 50, height: 28, borderRadius: 9999, border: 'none', cursor: 'pointer', background: editing.published ? '#16a34a' : '#d1d5db', position: 'relative', transition: 'background .2s' }}
                    title={editing.published ? 'Cliquer pour mettre la page hors ligne' : 'Cliquer pour mettre la page en ligne'}
                  >
                    <span style={{ position: 'absolute', top: 3, left: editing.published ? 25 : 3, width: 22, height: 22, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .2s', display: 'block' }} />
                  </button>
                  <span style={{ fontSize: '.88rem', fontWeight: 700, color: editing.published ? '#15803d' : '#7a7a7a' }}>
                    {editing.published ? 'En ligne' : 'Hors ligne'}
                  </span>
                  {dirty && <span style={{ fontSize: '.78rem', color: '#b45309' }}>● non enregistré</span>}
                </div>
                {editing.published && (
                  <a href={pageHref(editing.slug)} target="_blank" rel="noopener noreferrer" style={{ fontSize: '.82rem', color: '#01696f', textDecoration: 'none' }}>
                    🔗 Voir la page
                  </a>
                )}
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={lbl} htmlFor="cp-title">Nom de la page (titre affiché)</label>
                <input
                  id="cp-title"
                  value={editing.title}
                  onChange={e => {
                    const title = e.target.value
                    patch(slugEdited ? { title } : { title, slug: slugify(title) || 'nouvelle-page' })
                  }}
                  style={inp}
                  placeholder="Ex. Ateliers Happy Humans"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={lbl} htmlFor="cp-slug">Adresse de la page</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                  <span style={{ fontSize: '.9rem', color: '#7a7a7a' }}>/p/</span>
                  <input
                    id="cp-slug"
                    value={editing.slug}
                    onChange={e => { setSlugEdited(true); patch({ slug: slugify(e.target.value) }) }}
                    style={{ ...inp, flex: 1 }}
                    placeholder="ateliers"
                  />
                </div>
                <p style={{ margin: '.35rem 0 0', fontSize: '.76rem', color: '#a8a29e' }}>
                  Adresse finale : <code>{pageHref(isValidSlug(editing.slug) ? editing.slug : slugify(editing.slug) || '…')}</code>
                  {editing.slug && uniqueSlug(pages, editing.slug, editing.id) !== editing.slug && ' — déjà prise : un numéro sera ajouté à l’enregistrement.'}
                </p>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={lbl} htmlFor="cp-intro">Accroche (sous le titre)</label>
                <textarea id="cp-intro" value={editing.intro} onChange={e => patch({ intro: e.target.value })} style={{ ...inp, height: 90, resize: 'vertical' }} placeholder="Quelques lignes pour présenter la page…" />
              </div>

              <div style={{ borderTop: '1.5px solid #ece8e2', paddingTop: '1.25rem', marginBottom: '1.25rem' }}>
                <p style={{ ...lbl, fontSize: '.95rem', color: '#2d5f54', marginBottom: '.6rem' }}>Sections de la page</p>
                <CustomSectionsEditor
                  value={serializeBlocks(editing.blocks)}
                  hint="Ajoutez des sections (titre+texte+image, texte, image, appel à l'action, citation), déplacez-les avec ▲ ▼. Elles s'affichent dans cet ordre, sous le titre et l'accroche. Cliquez sur « Enregistrer » en haut à droite quand vous avez terminé."
                  onChange={v => patch({ blocks: parseBlocks(v) })}
                />
              </div>

              <div style={{ borderTop: '1.5px solid #ece8e2', paddingTop: '1.25rem' }}>
                <p style={{ ...lbl, fontSize: '.95rem', color: '#2d5f54', marginBottom: '.6rem' }}>Référencement Google</p>
                <div style={{ marginBottom: '.85rem' }}>
                  <label style={lbl} htmlFor="cp-seo-title">Titre dans Google (vide = nom de la page)</label>
                  <input id="cp-seo-title" value={editing.seoTitle} onChange={e => patch({ seoTitle: e.target.value })} style={inp} />
                </div>
                <div style={{ marginBottom: '.85rem' }}>
                  <label style={lbl} htmlFor="cp-seo-desc">Description sous le titre</label>
                  <textarea id="cp-seo-desc" value={editing.seoDescription} onChange={e => patch({ seoDescription: e.target.value })} style={{ ...inp, height: 80, resize: 'vertical' }} />
                </div>
                <div style={{ marginBottom: '.85rem' }}>
                  <label style={lbl} htmlFor="cp-seo-image">Image de partage (Facebook, LinkedIn…)</label>
                  <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <label style={{ padding: '.45rem .9rem', background: '#2d5f54', color: 'white', borderRadius: '.4rem', cursor: 'pointer', fontSize: '.82rem' }}>
                      {uploading ? '⏳ Envoi…' : '⬆ Upload'}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => void pickImage(e.target.files?.[0])} />
                    </label>
                    <input id="cp-seo-image" value={editing.seoImage} onChange={e => patch({ seoImage: e.target.value })} style={{ ...inp, flex: 1, minWidth: 180 }} placeholder="https://…" />
                  </div>
                </div>
              </div>

              {nav && (() => {
                const href = pageHref(editing.slug)
                const inMenu = navHasHref(nav, href)
                const ready = editing.published && !dirty
                return (
                  <div style={{ background: '#faf9f7', border: '1px solid #ece8e2', borderRadius: '.6rem', padding: '.8rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '.85rem' }}>🧭 Dans le menu du site</span>
                    <span style={{ fontSize: '.8rem', color: inMenu ? '#15803d' : '#78716c' }}>{inMenu ? '● Cette page figure dans le menu' : '○ Cette page n’est pas dans le menu'}</span>
                    <button type="button" disabled={navBusy || !isValidSlug(editing.slug)} onClick={() => void toggleInMenu(editing, !inMenu)} style={smallBtn}>
                      {navBusy ? '…' : inMenu ? 'Retirer du menu' : '➕ Ajouter au menu'}
                    </button>
                    {!inMenu && !ready && <span style={{ fontSize: '.75rem', color: '#a16207' }}>Enregistrez la page et mettez-la en ligne pour que le lien fonctionne.</span>}
                    {navMsg && <span style={{ fontSize: '.8rem', color: '#44403c' }}>{navMsg}</span>}
                    <span style={{ fontSize: '.75rem', color: '#a8a29e' }}>L’ordre se règle dans l’onglet Menu.</span>
                  </div>
                )
              })()}

              <div style={{ borderTop: '1.5px solid #ece8e2', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => del(editing)} style={{ ...smallBtn, color: '#b91c1c', borderColor: '#fecaca' }}>
                    🗑 Supprimer cette page
                  </button>
                  <button type="button" onClick={() => duplicate(editing)} style={smallBtn} title="Crée une copie hors ligne, à modifier">
                    ⧉ Dupliquer
                  </button>
                </span>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving || !dirty}
                  style={{ padding: '.65rem 1.6rem', background: '#2d5f54', color: 'white', border: 'none', borderRadius: '.5rem', fontWeight: 700, fontSize: '.9rem', cursor: saving || !dirty ? 'default' : 'pointer', opacity: saving || !dirty ? .5 : 1 }}
                >
                  {saving ? '⏳ Enregistrement…' : '💾 Enregistrer'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

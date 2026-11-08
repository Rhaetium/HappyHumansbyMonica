'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { useCmsNavigation, type NavItem } from '@/hooks/useCmsNavigation'
import { useOptionalInlineEdit } from '@/contexts/InlineEditContext'
import NavigationEditor from '@/components/cms/NavigationEditor'
import Breadcrumb from '@/components/Breadcrumb'
import LogoQuickEditor from '@/components/cms/LogoQuickEditor'
import SiteLogo, { resolveLogo } from '@/components/SiteLogo'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { UI_LABELS } from '@/lib/ui-labels'

const ICONS: Record<string, string> = {
  star: '<path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  sparring: '<path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/><path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/><path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z"/><path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z"/><path d="M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5z"/><path d="M15.5 19H14v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"/><path d="M10 9.5C10 8.67 9.33 8 8.5 8h-5C2.67 8 2 8.67 2 9.5S2.67 11 3.5 11h5c.83 0 1.5-.67 1.5-1.5z"/><path d="M8.5 5H10V3.5C10 2.67 9.33 2 8.5 2S7 2.67 7 3.5 7.67 5 8.5 5z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
};

function NavIcon({ name, size = 14 }: { name: string; size?: number }) {
  const path = ICONS[name];
  if (!path) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: path }} />
  );
}

export default function Header() {
  const [open, setOpen] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  const { user, loading } = useAuth()
  // Logo et nom : réglés dans le CMS (Paramètres → Logo & Identité) ; sans réglage, logo d'origine
  const settings = useSiteSettings()
  const logo = resolveLogo(settings)
  const siteName = settings.site_name || 'Happy Humans'
  const logoPosition: 'left' | 'center' = settings.logo_position === 'center' ? 'center' : 'left'
  const showName = logo.showName
  const logoTextSize = settings.logo_text_size || '2xl'
  const logoTextWeight = settings.logo_text_weight || 'semibold'
  const logoTextColor = settings.logo_text_color || '#1c1917'
  const logoTextFont = settings.logo_text_font || 'serif'
  const logoTextTracking = settings.logo_text_tracking || 'tight'
  const logoTextLineHeight = settings.logo_text_line_height || 'none'
  const logoTextSpacing = settings.logo_text_spacing || '0'

  const { nav } = useCmsNavigation()
  // Mode « Éditer le site » : bouton « Menu » pour renommer, réordonner (glisser-déposer), ajouter ou masquer les liens
  const inlineEdit = useOptionalInlineEdit()
  const editingMenu = !!inlineEdit?.isEditing
  const [menuPanel, setMenuPanel] = useState(false)
  const isCmsUser = !loading && !!user


  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const visibleItems = nav.filter(item => item.visible).sort((a, b) => a.position - b.position);
  const dropdownItem = visibleItems.find(item => item.isDropdown);
  const leftItems = visibleItems.filter(item => !item.isDropdown && !item.isCta && item.position < (dropdownItem?.position ?? 999));
  const rightItems = visibleItems.filter(item => !item.isDropdown && !item.isCta && item.position > (dropdownItem?.position ?? 0));
  const ctaItem = visibleItems.find(item => item.isCta);

  return (
    <>
      <nav className="fixed top-0 z-50 w-full border-b border-stone-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">

          <Link href="/" className={`flex items-center gap-3 transition-colors duration-200 ${logoPosition === 'center' ? 'mx-auto' : ''}`} aria-label={UI_LABELS.homeLink(siteName)}>
            <SiteLogo url={logo.url} size={logo.size} shape={logo.shape} alt={showName ? '' : siteName} className="flex-shrink-0" />
            {showName && (
              <span
                className={`text-${logoTextSize} font-${logoTextWeight} ${logoTextFont === 'serif' ? 'font-serif' : 'font-sans'} tracking-${logoTextTracking} ${logoTextLineHeight !== 'none' ? `leading-${logoTextLineHeight}` : ''}`}
                style={{ color: logoTextColor, letterSpacing: logoTextSpacing !== '0' ? `${logoTextSpacing}em` : undefined, fontFamily: logoTextFont === 'serif' ? 'var(--hh-font, "Playfair Display", Georgia, serif)' : undefined }}
              >
                {siteName}
              </span>
            )}
          </Link>

          <div className="hidden items-center gap-6 lg:flex">

            {leftItems.map(item => (
              item.href ? (
                <Link key={item.id} href={item.href}
                  className="text-sm font-medium text-stone-600 transition-colors duration-200 hover:text-[#2d5f54]">
                  {item.label}
                </Link>
              ) : null
            ))}

            {dropdownItem && (
              <div ref={dropRef} className="relative">
                <button onMouseEnter={() => setDropOpen(true)} onClick={() => setDropOpen(d => !d)}
                  className="flex items-center gap-1 text-sm font-medium text-stone-600 transition-colors duration-200 hover:text-[#2d5f54]">
                  {dropdownItem.label}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"
                    className={`transition-transform duration-200 ${dropOpen ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {dropOpen && dropdownItem.dropdownItems && (
                  <div onMouseLeave={() => setDropOpen(false)}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 rounded-xl border border-stone-100 bg-white shadow-lg overflow-hidden z-50">
                    {dropdownItem.dropdownItems
                      .filter(sub => sub.visible)
                      .sort((a, b) => a.position - b.position)
                      .map((sub, i) => (
                        <div key={sub.id}>
                          {i > 0 && <div className="mx-3 h-px bg-stone-100" />}
                          <Link href={sub.href || '#'} onClick={() => setDropOpen(false)}
                            className="flex items-center gap-2 px-4 py-3 text-sm text-stone-700 hover:bg-[#f5f0e8] hover:text-[#2d5f54] transition-colors">
                            {sub.icon && <NavIcon name={sub.icon} />}
                            {sub.label}
                          </Link>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {rightItems.map(item => (
              item.href ? (
                <Link key={item.id} href={item.href}
                  className="text-sm font-medium text-stone-600 transition-colors duration-200 hover:text-[#2d5f54]">
                  {item.label}
                </Link>
              ) : null
            ))}

            {ctaItem && ctaItem.href && (
              <Link href={ctaItem.href}
                className="rounded-full bg-[#2d5f54] px-4 py-1.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#1e3a34]">
                {ctaItem.label}
              </Link>
            )}

            {isCmsUser && (
              <Link href="/cms-admin" className="text-xs text-stone-400 hover:text-stone-600 transition-colors duration-200">CMS</Link>
            )}
          </div>

          <button onClick={() => { setOpen(!open); setDropOpen(false) }}
            className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-lg lg:hidden" aria-label={UI_LABELS.menu}>
            <span className={`block h-0.5 w-5 bg-stone-700 transition-transform duration-200 ${open ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block h-0.5 w-5 bg-stone-700 transition-opacity duration-200 ${open ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 w-5 bg-stone-700 transition-transform duration-200 ${open ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>

        {open && (
          <div className="border-t border-stone-100 bg-white px-4 py-4 lg:hidden">
            <div className="flex flex-col gap-1">
              {visibleItems.filter(item => !item.isCta).map(item => {
                if (item.isDropdown && item.dropdownItems) {
                  return <MobileDropdown key={item.id} item={item} onClose={() => setOpen(false)} />;
                }
                return item.href ? (
                  <Link key={item.id} href={item.href} onClick={() => setOpen(false)}
                    className="text-sm font-medium text-stone-700 hover:text-[#2d5f54] py-2.5 border-b border-stone-50">
                    {item.label}
                  </Link>
                ) : null;
              })}

              {ctaItem && ctaItem.href && (
                <Link href={ctaItem.href} onClick={() => setOpen(false)}
                  className="mt-3 rounded-full bg-[#2d5f54] px-4 py-2.5 text-sm font-medium text-white text-center hover:bg-[#1e3a34]">
                  {ctaItem.label}
                </Link>
              )}
              {isCmsUser && (
                <Link href="/cms-admin" onClick={() => setOpen(false)}
                  className="text-xs text-center text-stone-400 hover:text-stone-600 mt-2">CMS</Link>
              )}
            </div>
          </div>
        )}
        {editingMenu && (
          <div className="mx-auto max-w-7xl px-4 pb-2 sm:px-6">
            <button
              type="button"
              onClick={() => setMenuPanel(o => !o)}
              className="rounded-full border-2 border-dashed border-[#2d5f54] bg-[#f0fff4] px-4 py-1.5 text-xs font-semibold text-[#2d5f54] hover:bg-white"
            >
              🧭 {menuPanel ? 'Fermer' : 'Modifier le menu et le logo'}
            </button>
          </div>
        )}
        {editingMenu && menuPanel && (
          <div className="mx-auto max-h-[70vh] max-w-3xl overflow-y-auto rounded-b-2xl border border-t-0 border-stone-200 bg-white p-5 shadow-2xl">
            <LogoQuickEditor />
            <h3 className="mb-2 text-sm font-bold text-[#2d5f54]">🧭 Menu du site</h3>
            <NavigationEditor onSaved={() => undefined} />
          </div>
        )}
      </nav>
      {/* Fil d'Ariane : affiché sur toutes les pages sauf l'accueil (libellés réglés dans le CMS) */}
      <Breadcrumb />
    </>
  )
}

function MobileDropdown({ item, onClose }: { item: NavItem; onClose: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between text-sm font-medium text-stone-700 hover:text-[#2d5f54] py-2.5 border-b border-stone-50 w-full text-left">
        {item.label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="ml-4 flex flex-col gap-0 border-l-2 border-[#2d5f54]/20 pl-3 mb-1">
          {item.dropdownItems?.filter(sub => sub.visible).sort((a, b) => a.position - b.position).map(sub => (
            <Link key={sub.id} href={sub.href || '#'} onClick={onClose}
              className="text-sm text-stone-600 hover:text-[#2d5f54] py-2">
              {sub.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

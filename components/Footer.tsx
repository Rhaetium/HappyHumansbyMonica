'use client'
import { safeHref } from '@/lib/safe-href'
import Link from 'next/link'
import { useCmsContent } from '@/hooks/useCmsContent'
import { FOOTER_DEFAULTS } from '@/lib/cms-defaults/footer'
import SiteLogo, { resolveLogo } from '@/components/SiteLogo'
import { useSiteSettings } from '@/hooks/useSiteSettings'

export default function Footer() {
  const c = useCmsContent('footer', FOOTER_DEFAULTS)
  const year = new Date().getFullYear()
  // logo du pied de page : celui du CMS (Paramètres → Logo & Identité), sinon le logo de la charte en version claire
  const settings = useSiteSettings()
  const logo = resolveLogo(settings, { sizeKey: 'logo_footer_size', fallbackSize: 48, maxSize: 72, onDark: true })
  return (
    <footer className="border-t px-6 py-10 md:px-10"
      style={{ backgroundColor: 'var(--hh-dark)', borderColor: 'var(--hh-primary)' }}>
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">

          {/* Brand */}
          <div>
            <Link href="/" aria-label={c.site_name} className="inline-flex items-center gap-3"
              style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', letterSpacing: '0.08em', color: 'var(--hh-bg)', fontWeight: 400 }}>
              <SiteLogo url={logo.url} size={logo.size} shape={logo.shape} alt="" />
              {logo.showName && c.site_name.toUpperCase()}
            </Link>
            <p className="text-xs italic mt-1" style={{ color: 'var(--hh-accent)', fontFamily: 'Cormorant Garamond, serif' }}>
              {c.get('tagline')}
            </p>
            <p className="text-xs mt-2" style={{ color: '#a9c4bd' }}>{c.get('description')}</p>
            <p className="text-xs mt-1" style={{ color: '#a9c4bd' }}>{c.get('description_2')}</p>
            {c.linkedin_url && (
              <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer"
                className="inline-block mt-3 text-xs hover:text-white transition" style={{ color: '#a9c4bd' }}>
                {c.t_linkedin}
              </a>
            )}
          </div>

          {/* Navigation */}
          <div>
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--hh-accent)' }}>{c.get('footer_nav_title')}</p>
            <div className="flex flex-col gap-2 text-xs" style={{ color: '#a9c4bd' }}>
              <Link href={safeHref(c.footer_nav_home_href, '/')} className="hover:text-white transition">{c.get('footer_nav_home')}</Link>
              <Link href={safeHref(c.footer_nav_coaching_href, '/coaching')} className="hover:text-white transition">{c.get('footer_nav_coaching')}</Link>
              <Link href={safeHref(c.footer_nav_hd_href, '/happiness-design')} className="hover:text-white transition">{c.get('footer_nav_hd')}</Link>
              <Link href={safeHref(c.footer_nav_sparring_href, '/sparring-partner')} className="hover:text-white transition">{c.get('footer_nav_sparring')}</Link>
              <Link href={safeHref(c.footer_nav_entreprises_href, '/entreprises')} className="hover:text-white transition">{c.get('footer_nav_entreprises')}</Link>
              <Link href={safeHref(c.footer_nav_relations_href, '/relations')} className="hover:text-white transition">{c.get('footer_nav_relations')}</Link>
              <Link href={safeHref(c.footer_nav_contact_href, '/contact')} className="hover:text-white transition">{c.get('footer_nav_contact')}</Link>
              <Link href={safeHref(c.footer_nav_blog_href, '/blog')} className="hover:text-white transition">{c.get('footer_nav_blog')}</Link>
              <Link href={safeHref(c.footer_nav_faq_href, '/faq')} className="hover:text-white transition">{c.get('footer_nav_faq')}</Link>
            </div>
          </div>

          {/* Services */}
          <div>
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--hh-accent)' }}>{c.get('footer_services_title')}</p>
            <div className="flex flex-col gap-2 text-xs" style={{ color: '#a9c4bd' }}>
              {[1,2,3,4,5].map(i => {
                const val = c.get(`service_${i}`)
                if (!val) return null
                return <span key={i}>{val}</span>
              })}
            </div>
          </div>

        </div>

        <div className="w-full h-px mb-6" style={{ backgroundColor: 'var(--hh-primary)' }} />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs" style={{ color: '#a9c4bd' }}>
          <div>
            <p>&copy; {year} {c.get('copyright')}</p>
            <p className="opacity-80 mt-1">
              {c.get('photos_label')}<a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition">{c.t_unsplash}</a>
            </p>
          </div>
          <div className="flex gap-6">
            <Link href={safeHref(c.t_mentions_legales_href, '/mentions-legales')} className="hover:text-white transition">{c.t_mentions_legales}</Link>
            <Link href={safeHref(c.t_confidentialite_href, '/politique-confidentialite')} className="hover:text-white transition">{c.t_confidentialite}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

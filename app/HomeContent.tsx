'use client'
import { useState, Fragment, type ReactNode } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useCmsContent } from '@/hooks/useCmsContent'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { useCalendly } from '@/hooks/useCalendly'
import CalendlyGate from '@/components/CalendlyGate'
import { DEFAULT_CONTACT_EMAIL } from '@/lib/site-contact'
import { HOME_DEFAULTS } from '@/lib/cms-defaults/home'
import { PAGE_SECTIONS, resolveSections } from '@/lib/cms-sections'
import { customSectionDefs, customSectionId, isCustomSectionId, parseBlocks } from '@/lib/custom-sections'
import { CustomBlockView } from '@/components/CustomSections'
import EditableImage from '@/components/EditableImage';

const CARD_DEFS = {
  coaching: {
    href: '/coaching',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d5f54" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>,
  },
  organisations: {
    href: '/entreprises',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d5f54" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>,
  },
  'happiness-design': {
    href: '/happiness-design',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c9a96e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  },
  relations: {
    href: '/relations',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d5f54" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  },
}

export default function LandingPage() {
  const c = useCmsContent('home', HOME_DEFAULTS)
  // Email de contact : réglage global du CMS (⚙️ Paramètres → Général), pas un texte de page
  const settings = useSiteSettings()
  const contactEmail = settings.contact_email || DEFAULT_CONTACT_EMAIL
  const { eventUrl } = useCalendly()
  // Adresse de réservation visée par les boutons de la page d'accueil (carte + modale) : sert à
  // vérifier, avant d'afficher un bouton, que le compte Calendly a bien des rendez-vous publics.
  const bookingUrl = eventUrl('coaching')
  const [bookingOpen, setBookingOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  // Titre et texte des cartes « Explorez les thématiques » : modifiables dans le CMS (admin → Accueil → Cartes)
  const cardText = {
    coaching: { title: c.home_card_coaching_title, desc: c.home_card_coaching_desc },
    organisations: { title: c.home_card_organisations_title, desc: c.home_card_organisations_desc },
    'happiness-design': { title: c.home_card_hd_title, desc: c.home_card_hd_desc },
    relations: { title: c.home_card_relations_title, desc: c.home_card_relations_desc },
  }

  // Dynamic card order for "Explorez les thématiques"
  const orderedCards = [
    c.home_card_order_1 || 'coaching',
    c.home_card_order_2 || 'organisations',
    c.home_card_order_3 || 'happiness-design',
    c.home_card_order_4 || 'relations',
  ].map(page => {
    const id = (page in CARD_DEFS ? page : 'coaching') as keyof typeof CARD_DEFS
    return { ...CARD_DEFS[id], ...cardText[id] }
  })

  const year = new Date().getFullYear()

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, type: 'contact' }),
      })
      setSent(true)
    } catch { /* silent */ }
    finally { setSending(false) }
  }

  // ── Sections de la page : ordre et affichage modifiables dans le CMS (admin → page → Structure) ──
  const sections: Record<string, ReactNode> = {
    hero: (
      <section className="relative overflow-hidden bg-stone-900 px-6 py-24 text-center md:py-36 md:px-10">
        <EditableImage page="home" fieldKey="hero_image" variant="cover" duotone
          src={c.hero_image}
          alt={c.t_bureau_elegant_avec_lumiere}
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(43,111,98,0.35),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(182,140,94,0.2),transparent_40%)]" />
        <div className="relative mx-auto max-w-3xl">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.25em] text-amber-400">
            {c.get('hero_badge')}
          </p>
          <h1 className="text-4xl font-serif font-light leading-tight text-white md:text-6xl">
            {c.get('hero_title')}
          </h1>
          <p className="mt-6 text-base text-stone-300 md:text-lg">{c.get('hero_subtitle')}</p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => setBookingOpen(true)}
              className="rounded-full bg-[#2d5f54] px-8 py-3.5 text-sm font-semibold text-white shadow hover:bg-[#1e3a34] transition"
            >
              {c.get('hero_cta_primary')}
            </button>
            <Link
              href="/contact"
              className="rounded-full border border-stone-500 px-8 py-3.5 text-sm font-semibold text-stone-200 hover:border-white hover:text-white transition"
            >
              {c.get('hero_cta_contact')}
            </Link>
          </div>
        </div>
      </section>
    ),
    services: (
      <section className="bg-[#f5f0e8] px-6 py-20 md:px-10 md:py-24" id="services">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-800">{c.get('services_badge')}</p>
            <h2 className="text-2xl font-serif font-light text-stone-900 md:text-3xl">{c.services_title}</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#eef4f3]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2d5f54" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </div>
              <h3 className="mb-3 text-xl font-serif font-semibold text-stone-900">{c.get('services_b2c_title')}</h3>
              <p className="mb-5 text-sm leading-relaxed text-stone-600">{c.get('services_b2c_text')}</p>
              <button onClick={() => setBookingOpen(true)} className="text-sm font-semibold text-[#2d5f54] hover:underline">
                {c.get('services_b2c_cta')}
              </button>
            </div>
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#eef4f3]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2d5f54" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
              </div>
              <h3 className="mb-3 text-xl font-serif font-semibold text-stone-900">{c.get('services_b2b_title')}</h3>
              <p className="mb-5 text-sm leading-relaxed text-stone-600">{c.get('services_b2b_text')}</p>
              <a href="#contact" className="text-sm font-semibold text-[#2d5f54] hover:underline">
                {c.get('services_b2b_cta')}
              </a>
            </div>
          </div>
        </div>
      </section>
    ),
    explorer: (
      <section className="bg-white px-6 py-20 md:px-10 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-800">{c.get('cards_section_badge')}</p>
            <h2 className="text-2xl font-serif font-light text-stone-900 md:text-3xl">{c.get('cards_section_title')}</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {orderedCards.map((card) => (
              <Link key={card.href} href={card.href} className="group rounded-2xl bg-[#f5f0e8] p-7 hover:bg-[#eef5f3] transition">
                <div className="mb-5 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                  {card.icon}
                </div>
                <h3 className="mb-2 text-lg font-serif font-semibold text-stone-900 group-hover:text-[#2d5f54] transition">{card.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed mb-4">{card.desc}</p>
                <span className="text-sm font-semibold text-[#2d5f54]">{c.get('cards_link_label')}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    ),
    booking: (
      <section className="bg-[#f5f0e8] px-6 py-20 md:px-10 md:py-24" id="booking">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-800">{c.get('booking_badge')}</p>
            <h2 className="text-2xl font-serif font-light text-stone-900 md:text-3xl">{c.get('booking_widget_title')}</h2>
            <p className="mt-3 text-sm text-stone-500">{c.get('booking_widget_subtitle')}</p>
          </div>
            
          {/* Calendly CTA Card — masquée si le compte Calendly n'a aucun rendez-vous public */}
          <CalendlyGate
            url={bookingUrl}
            contactEmail={contactEmail}
            blockedTitle={c.t_aucune_disponibilite_titre}
            blockedText={c.t_aucune_disponibilite_texte}
            className="mx-auto max-w-sm rounded-2xl bg-[#fdf6ec] p-8 text-center shadow-sm"
          >
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative mx-auto flex max-w-sm flex-col items-center rounded-2xl bg-gradient-to-br from-[#2d5f54] via-[#2f6b61] to-[#3d7a72] p-8 text-center shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-[#2d5f54]/20"
          >
            {/* Decorative circles */}
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -left-4 -bottom-4 h-20 w-20 rounded-full bg-white/5 blur-xl" />
              
            {/* Calendar icon */}
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
              </svg>
            </div>
              
            {/* Title */}
            <p className="mb-2 font-serif text-xl font-semibold tracking-wide text-white">
              {c.t_seance_decouverte}
            </p>
            <p className="mb-6 text-sm text-emerald-100">
              {c.t_gratuite_1h_sans_engagement}
            </p>
              
            {/* Button */}
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#2d5f54] shadow-lg transition-all duration-200 group-hover:gap-3">
              {c.t_reserver_maintenant}
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </span>
              
            {/* Trust badges */}
            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-emerald-200">
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                {c.t_confidentiel}
              </span>
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                {c.t_sans_engagement}
              </span>
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                {c.t_reponse_48h}
              </span>
            </div>
          </a>
          </CalendlyGate>
        </div>
      </section>
    ),
    contact: (
      <section className="bg-white px-6 py-20 md:px-10 md:py-24" id="contact">
        <div className="mx-auto max-w-xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-800">{c.get('contact_section_badge')}</p>
            <h2 className="text-2xl font-serif font-light text-stone-900 md:text-3xl">{c.get('contact_section_title')}</h2>
            <p className="mt-3 text-sm text-stone-500">{c.get('contact_section_subtitle')}</p>
          </div>
          {sent ? (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-10 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#2d5f54] flex items-center justify-center"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
              <h3 className="text-lg font-semibold text-stone-900 mb-2">{c.get('form_success_title')}</h3>
              <p className="text-sm text-stone-500">{c.form_success_body.replace('{email}', form.email)}</p>
            </div>
          ) : (
            <form onSubmit={handleContact} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-400">{c.t_nom}</label>
                  <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-[#2d5f54]" placeholder={c.t_votre_nom} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-400">{c.t_email}</label>
                  <input required type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-[#2d5f54]" placeholder={c.t_votre_email_com} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-400">{c.t_message}</label>
                <textarea required value={form.message} onChange={e => setForm(f => ({...f, message: e.target.value}))} rows={4} className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-[#2d5f54] resize-none" placeholder={c.t_votre_question_ou_demande} />
              </div>
              <button type="submit" disabled={sending} className="w-full rounded-full bg-[#2d5f54] py-3.5 text-sm font-semibold text-white hover:bg-[#1e3a34] disabled:opacity-60 transition">
                {sending ? c.form_sending : c.form_submit}
              </button>
              {contactEmail && (
                <p className="text-center text-xs text-stone-400">
                  {c.contact_email_label} <a href={`mailto:${contactEmail}`} className="text-[#2d5f54] hover:underline">{contactEmail}</a>
                </p>
              )}
            </form>
          )}
        </div>
      </section>
    ),
  }
  const customBlocks = parseBlocks(c.content?.['custom_sections'] ?? '')
  const sectionIds = resolveSections(
    [...PAGE_SECTIONS.home, ...customSectionDefs(customBlocks)],
    c.sections_layout,
  )

  return (
    <div className="min-h-screen bg-[#f5f0e8] font-sans">
      <Header />
      <main className="pt-[72px]">
        {sectionIds.map(id => {
          if (isCustomSectionId(id)) {
            const b = customBlocks.find(x => customSectionId(x.id) === id);
            return b ? <CustomBlockView key={id} b={b} /> : null;
          }
          return <Fragment key={id}>{sections[id]}</Fragment>;
        })}
      </main>

      <Footer />

      {/* ══ MODAL BOOKING ═════════════════════════════════════════════════ */}
      {/* TODO: Réactiver le système inhouse si besoin */}
      {bookingOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-900/70 backdrop-blur-sm p-4 pt-16"
          onClick={() => setBookingOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setBookingOpen(false)}
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200"
            >
              ✕
            </button>
            <div className="text-center py-8">
              <CalendlyGate
                url={bookingUrl}
                contactEmail={contactEmail}
                blockedTitle={c.t_aucune_disponibilite_titre}
                blockedText={c.t_aucune_disponibilite_texte}
              >
                <h2 className="text-xl font-semibold text-stone-900 mb-2">{c.get('booking_modal_title')}</h2>
                <p className="text-sm text-stone-500 mt-1 mb-6">{c.get('booking_modal_subtitle')}</p>
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#2d5f54] px-8 py-3.5 text-sm font-semibold text-white shadow hover:bg-[#1e3a34] transition"
                  onClick={() => setBookingOpen(false)}
                >
                  {c.t_reserver_via_calendly}
                </a>
              </CalendlyGate>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

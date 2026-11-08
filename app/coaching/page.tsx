'use client'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { useCmsContent } from '@/hooks/useCmsContent'
import { useCalendly } from '@/hooks/useCalendly'
import CalendlyGate from '@/components/CalendlyGate'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { DEFAULT_CONTACT_EMAIL } from '@/lib/site-contact'
import { COACHING_DEFAULTS } from '@/lib/cms-defaults/coaching'
import { PAGE_SECTIONS, resolveSections } from '@/lib/cms-sections'
import { customSectionDefs, customSectionId, isCustomSectionId, parseBlocks } from '@/lib/custom-sections'
import { readList } from '@/lib/cms-lists'
import { CustomBlockView } from '@/components/CustomSections'
import { Fragment, type ReactNode } from 'react'
import EditableImage from '@/components/EditableImage';

export default function CoachingPage() {
  const c = useCmsContent('coaching', COACHING_DEFAULTS)
  // Lien du rendez-vous de découverte : réglage CMS (⚙️ Paramètres → 📅 Réservation)
  const { eventUrl: calendlyEventUrl } = useCalendly()
  const settings = useSiteSettings()
  const contactEmail = settings.contact_email || DEFAULT_CONTACT_EMAIL

  // Programmes et témoignages : listes modifiables dans le CMS (⚙️ Pages → Coaching).
  // Chaque carte peut être ajoutée, retirée ou déplacée ; les anciens champs numérotés restent lus.
  const programs = readList(c.content, 'coaching_programs')
    .filter(p => (p.label ?? '').trim())
    .map(p => ({
      label: p.label,
      subtitle: p.subtitle,
      price: p.price,
      unit: p.unit,
      desc: p.desc,
      cta: p.cta,
      // « calendly » = agenda de réservation (Paramètres → Réservation) plutôt qu'une adresse figée
      href: p.href === 'calendly' ? calendlyEventUrl('coaching') : (p.href || '/booking'),
      calendly: p.href === 'calendly',
      highlight: p.highlight === 'oui',
    }))

  const temoignages = readList(c.content, 'coaching_testimonials')
    .filter(t => (t.quote ?? '').trim() || (t.name ?? '').trim())
    .map(t => ({ quote: t.quote ?? '', name: t.name ?? '', role: t.role ?? '' }))

  // ── Sections de la page : ordre et affichage modifiables dans le CMS (admin → page → Structure) ──
  const sections: Record<string, ReactNode> = {
    hero: (
      <section className="relative overflow-hidden bg-stone-900 px-6 py-24 text-center md:py-32 md:px-10">
        <EditableImage page="coaching" fieldKey="hero_image" variant="cover" duotone
          src={c.hero_image}
          alt={c.t_bureau_elegant_ambiance_coaching}
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-900/60 via-stone-900/40 to-stone-900/70" />
        <div className="relative mx-auto max-w-3xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-amber-400">{c.get('hero_badge')}</p>
          <h1 className="text-4xl font-serif font-light leading-tight text-white md:text-6xl">{c.get('hero_title')}</h1>
          <p className="mt-6 text-lg leading-relaxed text-stone-300">{c.get('hero_subtitle', undefined, {multiline:true})}</p>
          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <Link href="/booking?from=coaching" className="rounded-full bg-[#2f6b61] px-7 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-[#235249] transition">
              {c.get('hero_cta_primary')}
            </Link>
            <Link href="/contact" className="rounded-full border border-stone-400 px-7 py-3.5 text-sm font-semibold text-stone-200 hover:border-white hover:text-white transition">
              {c.get('hero_cta_contact')}
            </Link>
          </div>
        </div>
      </section>
    ),
    individuel: (
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-6 md:px-10">
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div className="space-y-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-800">{c.get('coaching_b2c_badge')}</p>
              <h2 className="text-3xl font-serif font-light leading-tight text-stone-900">{c.get('coaching_b2c_title')}</h2>
              <div className="text-base leading-relaxed text-stone-600 space-y-3">
                {c.coaching_b2c_text.split('\n').map((p, i) => p.trim() ? <p key={i}>{p}</p> : null)}
              </div>
              <Link href="/contact" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2f6b61] hover:underline">
                {c.get('coaching_b2c_cta_link')}
              </Link>
            </div>
            <EditableImage page="coaching" fieldKey="coaching_b2c_image" variant="block" duotone
              src={c.coaching_b2c_image}
              alt={c.t_coaching_individuel_introspection_}
              className="rounded-2xl object-cover shadow-lg h-72 w-full"
            />
          </div>
        </div>
      </section>
    ),
    temoignages: (
      <section className="bg-[#f7f4ef] py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-6 md:px-10">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-serif font-light text-stone-900 md:text-3xl">{c.get('testimonial_section_title')}</h2>
            <p className="mt-3 text-sm text-stone-500">{c.get('testimonial_section_desc')}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {temoignages.map((t, i) => {
              const isFr = !!t.quote.match(/[àâäéèêëîïôùûüœç«»]/);
              return (
                <div key={i} className="bg-white rounded-2xl p-7 shadow-sm flex flex-col">
                  <span className="text-4xl font-serif leading-none text-[#2f6b61] mb-4 select-none">&ldquo;</span>
                  <blockquote lang={isFr ? 'fr' : 'en'} className="flex-1 text-sm leading-relaxed text-stone-600 italic mb-5">
                    {t.quote}
                  </blockquote>
                  <footer>
                    <p className="text-sm font-semibold text-stone-900">{t.name}</p>
                    <p className="text-xs text-stone-500 italic mt-0.5">{t.role}</p>
                    <p className="text-xs text-stone-400 mt-1">{c.get('testimonial_note')}</p>
                  </footer>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    ),
    tunnel: (
      <section className="bg-[#eef5f3] border-y border-[#2d5f54]/15 py-8 px-6 md:px-10">
        <div className="mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-stone-900">{c.get('tunnel_title')}</p>
            <p className="text-xs text-stone-500 mt-0.5">{c.get('tunnel_reassurance')}</p>
          </div>
          <div className="flex flex-wrap gap-3 flex-shrink-0">
            <Link href="/booking?from=coaching" className="rounded-full bg-[#2f6b61] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#235249] transition shadow-sm">
              {c.get('tunnel_cta_primary')}
            </Link>
            <Link href="/contact" className="rounded-full border border-[#2f6b61] px-6 py-2.5 text-sm font-semibold text-[#2f6b61] hover:bg-[#2f6b61] hover:text-white transition">
              {c.get('tunnel_cta_secondary')}
            </Link>
          </div>
        </div>
      </section>
    ),
    programmes: (
      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-6 md:px-10">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-800">{c.get('programs_badge')}</p>
            <h2 className="text-2xl font-serif font-light text-stone-900 md:text-3xl">{c.get('programs_title')}</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {programs.map(({ label, subtitle, price, unit, desc, cta, href, calendly, highlight }, i) => (
              <div key={`${label}-${i}`} className={`rounded-2xl p-6 flex flex-col ${highlight ? 'bg-[#2f6b61] text-white shadow-lg ring-2 ring-[#2f6b61]' : 'bg-[#f7f4ef] text-stone-900 shadow-sm'}`}>
                <p className={`text-xs font-bold uppercase tracking-[0.15em] mb-1 ${highlight ? 'text-emerald-200' : 'text-amber-800'}`}>{label}</p>
                {subtitle && <p className={`text-xs mb-3 ${highlight ? 'text-emerald-200' : 'text-stone-500'}`}>{subtitle}</p>}
                {price && <p className={`text-2xl font-serif font-semibold mb-0.5 ${highlight ? 'text-white' : 'text-stone-900'}`}>{price}</p>}
                <p className={`text-xs mb-4 ${highlight ? 'text-emerald-200' : 'text-stone-500'}`}>{unit}</p>
                <p className={`text-sm leading-relaxed flex-1 mb-3 ${highlight ? 'text-emerald-100' : 'text-stone-600'}`}>{desc}</p>
                {calendly ? (
                  <CalendlyGate
                    url={href}
                    contactEmail={contactEmail}
                    blockedTitle={c.t_aucune_disponibilite_titre}
                    className="mt-auto rounded-full bg-[#f0e6d8] px-4 py-2.5 text-center"
                    compact
                  >
                    <a href={href} target="_blank" rel="noopener noreferrer" className="mt-auto rounded-full py-2.5 text-center text-sm font-semibold transition bg-[#2f6b61] text-white hover:bg-[#235249]">
                      {cta}
                    </a>
                  </CalendlyGate>
                ) : (
                  <Link href={href} className={`mt-auto rounded-full py-2.5 text-center text-sm font-semibold transition ${highlight ? 'bg-white text-[#2f6b61] hover:bg-stone-50' : 'bg-[#2f6b61] text-white hover:bg-[#235249]'}`}>
                    {cta}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
    organisations: (
      <section className="bg-[#f7f4ef] py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-6 md:px-10">
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <EditableImage page="coaching" fieldKey="coaching_b2b_image" variant="block" duotone
              src={c.coaching_b2b_image}
              alt={c.t_coaching_d_equipe_et}
              className="rounded-2xl object-cover shadow-lg h-72 w-full order-2 md:order-1"
            />
            <div className="space-y-5 order-1 md:order-2">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-800">{c.get('coaching_b2b_badge')}</p>
              <h2 className="text-3xl font-serif font-light leading-tight text-stone-900">{c.get('coaching_b2b_title')}</h2>
              <div className="text-base leading-relaxed text-stone-600 space-y-3">
                {c.coaching_b2b_text.split('\n').map((p, i) => p.trim() ? <p key={i}>{p}</p> : null)}
              </div>
              <Link href="/entreprises" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2f6b61] hover:underline">
                {c.get('coaching_b2b_cta_link')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    ),
    cta: (
      <section className="bg-[#2f6b61] py-16">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="mb-3 text-2xl font-serif font-light text-white">{c.get('cta_title')}</h2>
          <p className="mb-6 text-emerald-100 text-sm">{c.get('form_cta_title', undefined, {multiline:true})}</p>
          <Link href="/booking?from=coaching" className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-[#2f6b61] hover:bg-amber-50 transition">
            {c.get('form_cta_button')}
          </Link>
        </div>
      </section>
    ),
  }
  const customBlocks = parseBlocks(c.content?.['custom_sections'] ?? '')
  const sectionIds = resolveSections(
    [...PAGE_SECTIONS.coaching, ...customSectionDefs(customBlocks)],
    c.sections_layout,
  )

  return (
    <>
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
    </>
  )
}

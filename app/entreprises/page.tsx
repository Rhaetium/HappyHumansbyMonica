'use client'
import { safeHref } from '@/lib/safe-href'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { useCmsContent } from '@/hooks/useCmsContent'
import { ENTREPRISES_DEFAULTS } from '@/lib/cms-defaults/entreprises'
import { PAGE_SECTIONS, resolveSections } from '@/lib/cms-sections'
import { customSectionDefs, customSectionId, isCustomSectionId, parseBlocks } from '@/lib/custom-sections'
import { readList } from '@/lib/cms-lists'
import { CustomBlockView } from '@/components/CustomSections'
import { Fragment, type ReactNode } from 'react'
import EditableImage from '@/components/EditableImage';

// Champ « liste » du CMS : un élément par ligne
const lines = (s: string) => s.split('\n').map(l => l.trim()).filter(Boolean)

// Icônes des cartes « Domaines d'intervention » : choisies par carte dans le CMS.
const DOMAIN_ICONS: Record<string, ReactNode> = {
  people: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--hh-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  globe: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--hh-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  chat: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--hh-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  growth: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--hh-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  users: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--hh-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  smile: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--hh-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
}

export default function EntreprisesPage() {
  const c = useCmsContent('entreprises', ENTREPRISES_DEFAULTS)

  // Cartes modifiables dans le CMS (⚙️ Pages → Entreprises) : ajouter, retirer ou réordonner.
  const domains = readList(c.content, 'entreprises_domains')
    .filter(d => (d.title ?? '').trim() || (d.desc ?? '').trim())
    .map(d => ({
      icon: DOMAIN_ICONS[d.icon] ?? DOMAIN_ICONS.people,
      title: d.title,
      text: d.desc,
    }))

  const pricingCards = readList(c.content, 'entreprises_pricing')
    .filter(card => (card.title ?? '').trim())
    .map(card => ({
      label: card.title,
      price: card.price,
      unit: card.unit,
      desc: card.desc,
      items: lines(card.items ?? ''),
      cta: card.cta,
      href: card.href,
      highlight: card.highlight === 'oui',
    }))

  // ── Sections de la page : ordre et affichage modifiables dans le CMS (admin → page → Structure) ──
  const sections: Record<string, ReactNode> = {
    hero: (
      <section className="relative flex h-[55vh] items-end overflow-hidden bg-stone-900 md:h-[65vh]">
        <EditableImage page="entreprises" fieldKey="hero_image" variant="cover" duotone
          src={c.hero_image || ENTREPRISES_DEFAULTS.hero_image}
          alt={c.t_entreprises}
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        <div className="relative z-10 max-w-3xl px-6 pb-14 md:px-16 md:pb-24">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-amber-300">{c.hero_badge}</p>
          <h1 className="mb-5 text-4xl font-serif font-light leading-[1.1] text-white md:text-6xl">{c.get('page_title')}</h1>
          <p className="max-w-xl text-base leading-relaxed text-gray-300">{c.get('intro_text', undefined, { multiline: true })}</p>
        </div>
      </section>
    ),
    offres: (
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-6 md:px-10">
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div className="space-y-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-800">{c.offres_badge}</p>
              <h2 className="text-3xl font-serif font-light leading-tight text-stone-900">{c.get('section_title')}</h2>
              <div className="text-base leading-relaxed text-stone-600 space-y-4">
                {c.section_text.split('\n').map((p, i) => p.trim() ? <p key={i}>{p}</p> : null)}
              </div>
              <Link href={safeHref(c.offres_cta_href, '/contact')} className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--hh-primary)] hover:underline mt-2">
                {c.offres_cta}
              </Link>
            </div>
            {/* repli sur la photo par défaut du module CMS : aucune adresse d'image en dur ici */}
            <EditableImage page="entreprises" fieldKey="section_image" variant="block" duotone
              src={c.section_image || ENTREPRISES_DEFAULTS.section_image}
              alt={c.t_reunion_d_equipe_et}
              className="rounded-2xl object-cover shadow-lg h-72 w-full"
            />
          </div>
        </div>
      </section>
    ),
    domaines: (
      <section className="bg-[color:var(--hh-bg)] py-16 md:py-20 px-6 md:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-800">{c.domains_badge}</p>
            <h2 className="text-2xl font-serif font-light text-stone-900 md:text-3xl">{c.domains_title}</h2>
            <p className="mt-3 text-sm text-stone-500 max-w-xl mx-auto">{c.domains_subtitle}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {domains.map(({ icon, title, text }, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[color:var(--hh-bg)] flex items-center justify-center mb-4 flex-shrink-0">
                  {icon}
                </div>
                <h3 className="text-sm font-semibold text-stone-900 mb-2">{title}</h3>
                <p className="text-xs text-stone-500 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
    programme: (
      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-6 md:px-10">
          <div className="grid gap-10 md:grid-cols-2 items-center">
            <div className="space-y-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-800">{c.flash_badge}</p>
              <h2 className="text-3xl font-serif font-light leading-tight text-stone-900 whitespace-pre-line">{c.flash_title}</h2>
              <p className="text-base leading-relaxed text-stone-600">
                {c.flash_desc}
              </p>
              <ul className="space-y-2 text-sm text-stone-600">
                {lines(c.flash_features).map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-[color:var(--hh-primary)] mt-0.5 font-bold">→</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3 pt-2">
                <div className="rounded-xl bg-[color:var(--hh-bg)] border border-stone-200 px-4 py-2.5 text-center">
                  <p className="text-xs text-stone-400 uppercase tracking-wider">{c.t_format}</p>
                  <p className="text-sm font-semibold text-stone-900 mt-0.5">{c.flash_format}</p>
                </div>
                <div className="rounded-xl bg-[color:var(--hh-bg)] border border-stone-200 px-4 py-2.5 text-center">
                  <p className="text-xs text-stone-400 uppercase tracking-wider">{c.t_rythme}</p>
                  <p className="text-sm font-semibold text-stone-900 mt-0.5">{c.flash_rythme}</p>
                </div>
                <div className="rounded-xl bg-[color:var(--hh-primary)] border border-[color:var(--hh-primary)] px-4 py-2.5 text-center">
                  <p className="text-xs text-emerald-200 uppercase tracking-wider">{c.t_tarif}</p>
                  <p className="text-sm font-semibold text-white mt-0.5">{c.flash_tarif}</p>
                </div>
              </div>
              <Link href={safeHref(c.flash_cta_link_href, '/contact')} className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--hh-primary)] hover:underline">
                {c.flash_cta_link}
              </Link>
            </div>
            <div className="rounded-2xl bg-[color:var(--hh-bg)] p-8 border border-stone-100">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-amber-800 mb-4">{c.sparring_badge}</p>
              <h3 className="text-xl font-serif font-semibold text-stone-900 mb-4">{c.sparring_title}</h3>
              <p className="text-sm leading-relaxed text-stone-600 mb-5">
                {c.sparring_desc}
              </p>
              <ul className="space-y-2 text-sm text-stone-600 mb-6">
                {lines(c.sparring_features).map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-amber-600 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href={safeHref(c.sparring_cta_link_href, '/sparring-partner')} className="inline-block rounded-full bg-[color:var(--hh-primary)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--hh-primary)] transition">
                {c.sparring_cta_link}
              </Link>
            </div>
          </div>
        </div>
      </section>
    ),
    contact: (
      <section className="bg-[color:var(--hh-primary)] py-16 text-center">
        <div className="mx-auto max-w-xl px-6">
          <h2 className="mb-4 text-2xl font-serif font-light text-white">{c.cta_title}</h2>
          <Link href={safeHref(c.cta_button_href, '/contact')} className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-[color:var(--hh-primary)] hover:bg-amber-50 transition">
            {c.cta_button}
          </Link>
        </div>
      </section>
    ),
    tarifs: (
      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-6 md:px-10">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-800">{c.pricing_badge}</p>
            <h2 className="text-2xl font-serif font-light text-stone-900 md:text-3xl">{c.pricing_title}</h2>
            <p className="mt-3 text-sm text-stone-500 max-w-xl mx-auto">{c.pricing_subtitle}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {pricingCards.map(({ label, price, unit, desc, items, cta, href, highlight }, i) => (
              <div key={`${label}-${i}`} className={`rounded-2xl p-7 flex flex-col ${highlight ? 'bg-[color:var(--hh-primary)] text-white shadow-lg ring-2 ring-[color:var(--hh-primary)]' : 'bg-[color:color-mix(in_srgb,var(--hh-bg),white_27%)] text-stone-900'}`}>
                <p className={`text-xs font-bold uppercase tracking-[0.2em] mb-3 ${highlight ? 'text-emerald-200' : 'text-amber-800'}`}>{label}</p>
                <div className="mb-1">
                  <span className={`text-2xl font-serif font-semibold ${highlight ? 'text-white' : 'text-stone-900'}`}>{price}</span>
                  {unit && <span className={`ml-1 text-xs ${highlight ? 'text-emerald-200' : 'text-stone-500'}`}>{unit}</span>}
                </div>
                <p className={`mb-5 text-sm leading-relaxed ${highlight ? 'text-emerald-100' : 'text-stone-600'}`}>{desc}</p>
                <ul className="mb-6 flex-1 space-y-2">
                  {items.map(item => (
                    <li key={item} className={`flex items-start gap-2 text-xs ${highlight ? 'text-emerald-100' : 'text-stone-600'}`}>
                      <span className="mt-0.5 text-amber-400">✓</span>{item}
                    </li>
                  ))}
                </ul>
                <Link href={safeHref(href, '/contact')} className={`mt-auto rounded-full py-2.5 text-center text-sm font-semibold transition ${highlight ? 'bg-white text-[color:var(--hh-primary)] hover:bg-stone-50' : 'bg-[color:var(--hh-primary)] text-white hover:bg-[color:var(--hh-primary)]'}`}>{cta}</Link>
              </div>
            ))}
          </div>

        </div>
      </section>
    ),
    pourquoi: (
      <section className="bg-[color:var(--hh-bg)] py-12 md:py-16 px-6 md:px-10">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl bg-white border border-amber-200 p-8 md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-800 mb-3">{c.diff_badge}</p>
            <h2 className="text-xl font-serif font-semibold text-stone-900 mb-5 md:text-2xl">
              {c.diff_title}
            </h2>
            <div className="text-base leading-relaxed text-stone-600 space-y-4">
              {lines(c.diff_text).map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <Link href={safeHref(c.diff_cta_link_href, '/contact')} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--hh-primary)] hover:underline">
              {c.diff_cta_link}
            </Link>
          </div>
        </div>
      </section>
    ),
    temoignage: (
      <section className="bg-[color:color-mix(in_srgb,var(--hh-bg),white_27%)] py-14 md:py-16">
        <div className="mx-auto max-w-2xl px-6 md:px-10">
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <span className="text-3xl font-serif leading-none text-[color:var(--hh-primary)] select-none">&ldquo;</span>
            <blockquote lang="fr" className="mt-3 text-base leading-relaxed text-stone-700 italic">
              {c.get('temoignage_dorothee_text', undefined, { multiline: true })}
            </blockquote>
            <footer className="mt-6">
              <p className="text-sm font-semibold text-stone-900">{c.get('temoignage_dorothee_author')}</p>
              <p className="text-xs text-stone-500 italic mt-0.5">{c.get('temoignage_dorothee_role')}</p>
              <p className="text-xs text-stone-400 mt-1">{c.t_prenom_modifie}</p>
            </footer>
          </div>
        </div>
      </section>
    ),
  }
  const customBlocks = parseBlocks(c.content?.['custom_sections'] ?? '')
  const sectionIds = resolveSections(
    [...PAGE_SECTIONS.entreprises, ...customSectionDefs(customBlocks)],
    c.sections_layout,
  )

  return (
    <>
      <Header />
      <main>
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

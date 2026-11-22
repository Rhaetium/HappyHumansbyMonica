'use client'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { useCmsContent } from '@/hooks/useCmsContent'
import { SPARRING_PARTNER_DEFAULTS } from '@/lib/cms-defaults/sparring-partner'
import { PAGE_SECTIONS, resolveSections } from '@/lib/cms-sections'
import { customSectionDefs, customSectionId, isCustomSectionId, parseBlocks } from '@/lib/custom-sections'
import { readList } from '@/lib/cms-lists'
import { CustomBlockView } from '@/components/CustomSections'
import { Fragment, type ReactNode } from 'react'
import EditableImage from '@/components/EditableImage';

export default function SparringPartnerPage() {
  const c = useCmsContent('sparring-partner', SPARRING_PARTNER_DEFAULTS)

  // Situations : liste modifiable dans le CMS (⚙️ Pages → Sparring Partner).
  const useCases = readList(c.content, 'sparring_use_cases')
    .filter(u => (u.title ?? '').trim() || (u.desc ?? '').trim())
    .map(u => ({ title: u.title ?? '', desc: u.desc ?? '' }))

  const experienceItems = c.experience_items.split('\n').filter(Boolean)

  // ── Sections de la page : ordre et affichage modifiables dans le CMS (admin → page → Structure) ──
  const sections: Record<string, ReactNode> = {
    hero: (
      <section className="relative overflow-hidden bg-stone-900 px-6 py-24 text-center md:py-32 md:px-10">
        <EditableImage page="sparring-partner" fieldKey="hero_image" variant="cover" duotone src={c.hero_image} alt={c.t_discussion_strategique} className="absolute inset-0 h-full w-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-900/60 via-stone-900/40 to-stone-900/70" />
        <div className="relative mx-auto max-w-3xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-amber-400">{c.get('hero_badge')}</p>
          <h1 className="text-4xl font-serif font-light leading-tight text-white md:text-6xl">{c.get('hero_title')}</h1>
          <p className="mt-6 text-lg leading-relaxed text-stone-300 max-w-xl mx-auto">{c.get('hero_desc', undefined, { multiline: true })}</p>
          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <Link href="/booking?from=sparring-partner" className="rounded-full bg-[color:var(--hh-primary)] px-7 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-[color:var(--hh-primary)] transition">{c.get('hero_cta_primary')}</Link>
            <Link href="/contact" className="rounded-full border border-stone-400 px-7 py-3.5 text-sm font-semibold text-stone-200 hover:border-white hover:text-white transition">{c.get('hero_cta_secondary')}</Link>
          </div>
        </div>
      </section>
    ),
    situations: (
      <section className="bg-[color:var(--hh-bg)] px-6 py-16 md:py-20 md:px-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-800">{c.get('section_badge')}</p>
            <h2 className="text-2xl font-serif font-light text-stone-900 md:text-3xl">{c.get('section_title')}</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-5">
            {useCases.map(({ title, desc }, i) => (
              <div key={`${title}-${i}`} className="w-full md:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.84rem)] bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-base font-semibold text-stone-900 mb-2">{title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
    pourquoi: (
      <section className="bg-white px-6 py-16 md:py-20 md:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-800">{c.get('why_section_badge')}</p>
          <h2 className="text-2xl font-serif font-light text-stone-900 mb-8 md:text-3xl">{c.get('why_section_title')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 text-left mb-8">
            {experienceItems.map(item => (
              <div key={item} className="flex items-start gap-2 text-sm text-stone-600">
                <span className="text-[color:var(--hh-primary)] font-bold mt-0.5 flex-shrink-0">+</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
    cta: (
      <section className="bg-[color:var(--hh-primary)] py-16 text-center">
        <div className="mx-auto max-w-xl px-6">
          <h2 className="mb-3 text-2xl font-serif font-light text-white">{c.get('cta_title')}</h2>
          <p className="text-sm text-emerald-200 mb-8">{c.get('cta_desc', undefined, { multiline: true })}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/booking?from=sparring-partner" className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-[color:var(--hh-primary)] hover:bg-amber-50 transition shadow">{c.get('cta_primary')}</Link>
            <Link href="/contact" className="rounded-full border border-white px-8 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition">{c.get('cta_secondary')}</Link>
          </div>
        </div>
      </section>
    ),
  }
  const customBlocks = parseBlocks(c.content?.['custom_sections'] ?? '')
  const sectionIds = resolveSections(
    [...PAGE_SECTIONS['sparring-partner'], ...customSectionDefs(customBlocks)],
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

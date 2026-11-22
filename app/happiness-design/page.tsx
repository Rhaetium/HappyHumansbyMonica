'use client'
import { safeHref } from '@/lib/safe-href'
import { Fragment, type ReactNode } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { useCmsContent } from '@/hooks/useCmsContent'
import { useIllustrationPack } from '@/hooks/useIllustrationPack'
import { HAPPINESS_DESIGN_DEFAULTS } from '@/lib/cms-defaults/happiness-design'
import { PAGE_SECTIONS, resolveSections } from '@/lib/cms-sections'
import { customSectionDefs, customSectionId, isCustomSectionId, parseBlocks } from '@/lib/custom-sections'
import { CustomBlockView } from '@/components/CustomSections'
import EditableImage from '@/components/EditableImage';

export default function HappinessDesignPage() {
  const c = useCmsContent('happiness-design', HAPPINESS_DESIGN_DEFAULTS)
  const pack = useIllustrationPack()

  // ── Les 7 outils de la conférence « 7 outils pour sourire dans le chaos » ──
  // Titres, descriptions et textes alternatifs viennent du CMS ; les visuels, du pack d'illustrations actif.
  const outils = Array.from({ length: 7 }, (_, i) => {
    const n = i + 1
    const read = (k: string) => (c[k] as string) || HAPPINESS_DESIGN_DEFAULTS[k] || ''
    return {
      title: read(`outil_${n}_title`),
      desc: read(`outil_${n}_desc`),
      alt: read(`outil_${n}_alt`),
      srcs: pack.slots.outils[i] || [],
    }
  })

  const getStep = (i: number) => {
    const num = String(i + 1).padStart(2, '0')
    const titleKey = `step_${num}_title` as keyof typeof HAPPINESS_DESIGN_DEFAULTS
    const descKey = `step_${num}_desc` as keyof typeof HAPPINESS_DESIGN_DEFAULTS
    return {
      n: num,
      title: (c[titleKey] as string) || (HAPPINESS_DESIGN_DEFAULTS[titleKey] as string) || '',
      desc: (c[descKey] as string) || (HAPPINESS_DESIGN_DEFAULTS[descKey] as string) || '',
    }
  }

  const steps = Array.from({ length: 12 }, (_, i) => getStep(i))

  // ── Sections centrales réordonnables via le CMS ──────────────
  const sectionsJsx: Record<string, ReactNode> = {
    hero: (
      <section className="bg-stone-900 px-6 py-24 md:py-32 md:px-10 text-center relative overflow-hidden">
        <EditableImage page="happiness-design" fieldKey="hero_image" variant="cover" duotone
          src={c.hero_image}
          alt={c.t_lumiere_doree_symbolisant_la}
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="relative mx-auto max-w-3xl">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.25em] text-amber-400">{c.get('hero_badge')}</p>
          <h1 className="text-4xl font-serif font-light leading-tight text-white md:text-6xl">{c.get('page_title')}</h1>
          <p className="mt-5 text-xl font-serif font-light text-amber-300 md:text-2xl">{c.get('page_subtitle', undefined, { multiline: true })} <em className="text-stone-400 text-base">{c.t_par_happy_humans}</em></p>
          <p className="mt-7 text-base leading-relaxed text-stone-300 max-w-2xl mx-auto">{c.get('intro_text', undefined, { multiline: true })}</p>
          <div className="mt-10">
            <Link href={safeHref(c.hero_cta_href, '/booking?from=happiness-design')} className="rounded-full bg-[color:var(--hh-primary)] px-8 py-3.5 text-sm font-semibold text-white shadow hover:bg-[color:var(--hh-dark)] transition">
              {c.get('hero_cta')}
            </Link>
          </div>
        </div>
      </section>
    ),
    pourqui: (
      <section className="bg-white px-6 py-16 md:py-20 md:px-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-800">{c.get('pourqui_badge')}</p>
            <h2 className="text-2xl font-serif font-light text-stone-900 md:text-3xl">{c.get('pourqui_title')}</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="bg-[color:var(--hh-bg)] rounded-2xl p-6">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d5f54" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
              </div>
              <h3 className="text-sm font-semibold text-stone-900 mb-2">{c.get('pourqui_1_title')}</h3>
              <p className="text-xs text-stone-500 leading-relaxed">{c.get('pourqui_1_desc', undefined, { multiline: true })}</p>
            </div>
            <div className="bg-[color:var(--hh-bg)] rounded-2xl p-6">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d5f54" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="11" y2="16"/></svg>
              </div>
              <h3 className="text-sm font-semibold text-stone-900 mb-2">{c.get('pourqui_2_title')}</h3>
              <p className="text-xs text-stone-500 leading-relaxed">{c.get('pourqui_2_desc', undefined, { multiline: true })}</p>
            </div>
            <div className="bg-[color:var(--hh-bg)] rounded-2xl p-6">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d5f54" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
              </div>
              <h3 className="text-sm font-semibold text-stone-900 mb-2">{c.get('pourqui_3_title')}</h3>
              <p className="text-xs text-stone-500 leading-relaxed">{c.get('pourqui_3_desc', undefined, { multiline: true })}</p>
            </div>
          </div>
        </div>
      </section>
    ),
    program: (
      <section className="bg-[color:var(--hh-bg)] px-6 py-20 md:py-28 md:px-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-800">{c.get('program_badge')}</p>
            <h2 className="text-2xl font-serif font-light text-stone-900 md:text-3xl">{c.get('program_title')}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {steps.map(({ n, title, desc }) => (
              <div key={n} className="flex gap-5 bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[color:var(--hh-primary)] flex items-center justify-center text-white text-xs font-bold">
                  {n}
                </div>
                <div>
                  <h3 className="font-semibold text-stone-900 mb-1">{title}</h3>
                  <p className="text-sm text-stone-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm font-medium text-amber-800">{c.get('program_followups_note')}</p>
        </div>
      </section>
    ),
    tools: (
      <section className="bg-white px-6 py-16 md:py-20 md:px-10">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-8">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-800">{c.get('tools_badge')}</p>
            <h2 className="text-2xl font-serif font-light text-stone-900 mb-6 md:text-3xl">{c.get('tools_title')}</h2>
            <p className="text-base leading-relaxed text-stone-600 mb-4">{c.get('tools_intro_1')}</p>
            <p className="text-base leading-relaxed text-stone-600">{c.get('tools_intro_2')}</p>
          </div>

          {/* Les 7 outils illustrés — visuels du pack d'illustrations actif */}
          <div className="grid gap-6 md:grid-cols-2">
            {outils.map((outil, i) => (
              <article key={i} className="overflow-hidden rounded-2xl bg-stone-950 text-white shadow-sm">
                {outil.srcs.length === 1 ? (
                  <img src={outil.srcs[0]} alt={outil.alt} loading="lazy" className="h-52 w-full object-cover" />
                ) : (
                  <div className="grid grid-cols-2">
                    {outil.srcs.map((src) => (
                      <img key={src} src={src} alt={outil.alt} loading="lazy" className="h-52 w-full object-cover" />
                    ))}
                  </div>
                )}
                <div className="p-6">
                  <p className="mb-1 text-xs font-bold text-amber-400">{c.get('outil_label')} {i + 1}</p>
                  {/* text-white : la règle globale h1…h6 impose le vert foncé, illisible sur cette carte sombre */}
                  <h3 className="mb-2 font-serif text-lg font-light text-white">{outil.title}</h3>
                  <p className="text-sm leading-relaxed text-stone-300">{outil.desc}</p>
                </div>
              </article>
            ))}
          </div>

          {/* L'ORIGINE */}
          <div className="rounded-2xl bg-[color:var(--hh-bg)] border border-amber-200 p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-800 mb-4">{c.get('tools_origin_label')}</p>
            <div className="text-sm leading-relaxed text-stone-600 space-y-4">
              <p>{c.get('tools_origin_text', undefined, { multiline: true })}</p>
              <p><strong className="text-stone-800">{c.get('tools_conclusions_label')}</strong></p>
              <ol className="space-y-2 ml-4 list-decimal">
                <li>{c.get('tools_conclusion_1')}</li>
                <li>{c.get('tools_conclusion_2')}</li>
              </ol>
              <p className="font-medium text-stone-700">{c.get('tools_claim')}</p>
            </div>
          </div>
        </div>
      </section>
    ),
    pricing: (
      <section className="bg-[color:var(--hh-bg)] px-6 py-16 md:py-20 md:px-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-800">{c.get('pricing_badge')}</p>
            <h2 className="text-2xl font-serif font-light text-stone-900 md:text-3xl">{c.get('pricing_title')}</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Programme complet */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-amber-800 mb-2 mt-3">{c.get('pricing_title')}</p>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">{c.get('format_label')}</span>
                  <span className="font-medium text-stone-900">{c.get('format_value')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">{c.get('duration_label')}</span>
                  <span className="font-medium text-stone-900">{c.get('duration_value')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">{c.get('rhythm_label')}</span>
                  <span className="font-medium text-stone-900">{c.get('rhythm_value')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">{c.get('price_label')}</span>
                  <span className="font-medium text-stone-900">{c.get('price_value')}</span>
                </div>
              </div>
              <ul className="space-y-2 mb-6 border-t border-stone-100 pt-5">
                {c.program_complete_features.split('\n').filter(Boolean).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
                    <span className="text-[color:var(--hh-primary)] font-bold mt-0.5">✓</span>{item}
                  </li>
                ))}
              </ul>
              <Link href={safeHref(c.cta_label_href, '/contact')} className="block rounded-full bg-[color:var(--hh-primary)] py-3 text-center text-sm font-semibold text-white hover:bg-[color:var(--hh-dark)] transition">
                {c.get('cta_label')}
              </Link>
            </div>
            {/* Séance découverte */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-amber-800 mb-2 mt-3">{c.get('discovery_label')}</p>
              <p className="text-3xl font-serif font-semibold text-stone-900">{c.get('discovery_price')}</p>
              <p className="text-xs text-stone-400 mb-6">{c.get('discovery_unit')}</p>
              <ul className="space-y-2 mb-8">
                {c.discovery_features.split('\n').map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
                    <span className="text-[color:var(--hh-primary)] font-bold mt-0.5">✓</span>{item}
                  </li>
                ))}
              </ul>
              <Link href={safeHref(c.discovery_cta_href, '/booking?from=happiness-design')} className="block rounded-full border border-[color:var(--hh-primary)] py-3 text-center text-sm font-semibold text-[color:var(--hh-primary)] hover:bg-[color:var(--hh-primary)] hover:text-white transition">
                {c.get('discovery_cta')}
              </Link>
            </div>
          </div>

        </div>
      </section>
    ),
    cta: (
      <section className="bg-[color:var(--hh-primary)] py-16 text-center">
        <div className="mx-auto max-w-xl px-6">
          <h2 className="mb-4 text-2xl font-serif font-light text-white">{c.get('cta_title')}</h2>
          <p className="text-sm text-emerald-100 mb-7">{c.get('cta_subtitle', undefined, { multiline: true })}</p>
          <Link href={safeHref(c.cta_button_href, '/booking?from=happiness-design')} className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-[color:var(--hh-primary)] hover:bg-amber-50 transition">
            {c.get('cta_button')}
          </Link>
        </div>
      </section>
    ),
  }

  // Ordre et affichage des sections : modifiables dans le CMS (admin → page → Structure)
  // + blocs personnalisés positionnables librement dans la même liste.
  const customBlocks = parseBlocks(c.content?.['custom_sections'] ?? '')
  const sectionIds = resolveSections(
    [...PAGE_SECTIONS['happiness-design'], ...customSectionDefs(customBlocks)],
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
          return <Fragment key={id}>{sectionsJsx[id]}</Fragment>;
        })}
      </main>
      <Footer />
    </>
  )
}

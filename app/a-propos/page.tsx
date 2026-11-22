'use client'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import Image from 'next/image'
import { useCmsContent } from '@/hooks/useCmsContent'
import { A_PROPOS_DEFAULTS } from '@/lib/cms-defaults/a-propos'
import { PAGE_SECTIONS, resolveSections } from '@/lib/cms-sections'
import { customSectionDefs, customSectionId, isCustomSectionId, parseBlocks } from '@/lib/custom-sections'
import { CustomBlockView } from '@/components/CustomSections'
import { Fragment, type ReactNode } from 'react'
import EditableImage from '@/components/EditableImage';

export default function AProposPage() {
  const c = useCmsContent('a-propos', A_PROPOS_DEFAULTS)

  // ── Sections de la page : ordre et affichage modifiables dans le CMS (admin → page → Structure) ──
  const sections: Record<string, ReactNode> = {
    hero: (
      <section className="relative flex h-[55vh] items-end overflow-hidden bg-stone-900 md:h-[65vh]">
        <EditableImage page="a-propos" fieldKey="hero_image" variant="cover" duotone
          src={c.hero_image || A_PROPOS_DEFAULTS.hero_image}
          alt={c.t_monica_schneider_executive_coach}
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        <div className="relative z-10 max-w-3xl px-6 pb-14 md:px-16 md:pb-24">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-amber-300">{c.get('hero_badge')}</p>
          <h1 className="mb-5 text-4xl font-serif font-light leading-[1.1] text-white md:text-6xl">{c.get('page_title')}</h1>
          <p className="max-w-xl text-base leading-relaxed text-gray-300">{c.get('intro_text', undefined, { multiline: true })}</p>
        </div>
      </section>
    ),
    parcours: (
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-6 md:px-10">
          <div className="grid items-start gap-12 md:grid-cols-5 md:gap-20">
            <div className="space-y-5 md:col-span-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-800">{c.get('parcours_badge')}</p>
              <h2 className="text-3xl font-serif font-light leading-tight text-stone-900 md:text-4xl">{c.get('parcours_title')}</h2>
              <p className="text-lg text-stone-500 italic">{c.get('parcours_subtitle')}</p>
              <div className="text-base leading-relaxed text-stone-600 space-y-4">
                <p>{c.get('bio_p1')}</p>
                <p>{c.get('bio_p2')}</p>
                <p>{c.get('bio_p3')}</p>
                <p>{c.get('bio_p4')}</p>
                <p>{c.get('bio_p5')}</p>
                <p>{c.get('bio_p6')}</p>
                <p>{c.get('bio_p7')}</p>
                <p>{c.get('bio_p8')}</p>
              </div>
            </div>
            <div className="md:col-span-2 space-y-4">
              {c.photo ? (
                <EditableImage page="a-propos" fieldKey="photo" variant="block" src={c.photo} alt={c.t_monica_schneider} className="rounded-2xl object-cover object-top shadow-lg w-full h-80" />
              ) : (
                <div className="rounded-2xl bg-gradient-to-br from-[color:var(--hh-bg)] to-[color:var(--hh-bg)] h-80 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-[color:var(--hh-primary)] flex items-center justify-center text-white text-2xl font-serif font-bold mx-auto mb-3">{c.t_ms}</div>
                    <p className="text-sm text-stone-500">{c.t_monica_schneider_2}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    ),
    accompagnements: (
      <section className="bg-[color:var(--hh-bg)] py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-6 md:px-10">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-800">{c.get('acc_badge')}</p>
            <h2 className="text-3xl font-serif font-light text-stone-900 md:text-4xl">{c.get('acc_title')}</h2>
            <p className="mt-3 text-stone-500 text-sm">{c.get('acc_subtitle', undefined, { multiline: true })}</p>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            {/* Coaching */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--hh-bg)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2d5f54" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
              </div>
              <h3 className="text-xl font-serif font-semibold text-stone-900 mb-4">{c.get('coaching_label')}</h3>
              <p className="text-sm leading-relaxed text-stone-600">{c.get('coaching_text')}</p>
              <Link href="/coaching" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--hh-primary)] hover:underline">
                {c.get('coaching_cta')}
              </Link>
            </div>

            {/* Mentoring */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--hh-bg)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2d5f54" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <h3 className="text-xl font-serif font-semibold text-stone-900 mb-4">{c.get('mentoring_label')}</h3>
              <p className="text-sm leading-relaxed text-stone-600">{c.get('mentoring_text')}</p>
              <Link href="/contact" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--hh-primary)] hover:underline">
                {c.get('mentoring_cta')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    ),
    happiness_design: (
      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-6 md:px-10">
          <div className="rounded-2xl bg-[color:var(--hh-bg)] border border-amber-200 p-8 md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-800 mb-3">{c.get('hd_badge')}</p>
            <p className="text-base leading-relaxed text-stone-700 mb-6">
              {c.get('hd_text', undefined, { multiline: true })}
            </p>
            <Link href="/happiness-design" className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--hh-primary)] hover:underline">
              {c.get('hd_cta')}
            </Link>
          </div>
        </div>
      </section>
    ),
    cta: (
      <section className="bg-[color:var(--hh-primary)] py-16 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="mb-4 text-2xl font-serif font-light text-white">{c.get('footer_cta_title')}</h2>
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <Link href="/coaching" className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-[color:var(--hh-primary)] hover:bg-amber-50 transition">
              {c.get('footer_cta_coaching')}
            </Link>
            <Link href="/booking" className="rounded-full border border-white px-7 py-3 text-sm font-semibold text-white hover:bg-white/10 transition">
              {c.get('footer_cta_booking')}
            </Link>
          </div>
        </div>
      </section>
    ),
  }
  const customBlocks = parseBlocks(c.content?.['custom_sections'] ?? '')
  const sectionIds = resolveSections(
    [...PAGE_SECTIONS['a-propos'], ...customSectionDefs(customBlocks)],
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

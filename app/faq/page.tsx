'use client'
import { safeHref } from '@/lib/safe-href'
import { useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { useCmsContent } from '@/hooks/useCmsContent'
import { FAQ_DEFAULTS, FAQ_ITEMS } from '@/lib/cms-defaults/faq'
import { readList } from '@/lib/cms-lists'
import EditableImage from '@/components/EditableImage';

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(null)
  const c = useCmsContent('faq', FAQ_DEFAULTS)

  // Questions saisies dans le CMS (liste modifiable : ajouter, retirer, réordonner).
  // Tant qu'aucune liste n'est enregistrée, on affiche les questions d'origine (FAQ_ITEMS), et les
  // anciens emplacements numérotés (faq_1_q…) restent lus s'ils contiennent déjà des textes.
  const faqs = readList(c.content, 'faq_questions', FAQ_ITEMS).filter(f => (f.q ?? '').trim() && (f.a ?? '').trim())

  return (
    <>
      <Header />
      <main className="pt-[72px]">
        {/* Hero */}
        <section className="relative overflow-hidden bg-stone-900 px-6 py-24 md:py-32 md:px-10 text-center">
          <EditableImage page="faq" fieldKey="hero_image" variant="cover" duotone
            src={c.hero_image}
            alt={c.t_espace_calme_pour_reflechir}
            className="absolute inset-0 h-full w-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-900/60 via-stone-900/40 to-stone-900/70" />
          <div className="relative mx-auto max-w-3xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-amber-400">{c.t_faq}</p>
            <h1 className="text-4xl font-serif font-light text-white md:text-6xl leading-tight">{c.get('page_title')}</h1>
            <p className="mt-5 text-base text-stone-300 leading-relaxed max-w-xl mx-auto">{c.get('page_subtitle')}</p>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-white px-6 py-16 md:py-20 md:px-10">
          <div className="mx-auto max-w-3xl divide-y divide-stone-100">
            {faqs.map((faq, i) => (
              <div key={i} className="py-5">
                {/* La question est un vrai titre (h2) : les moteurs de recherche et de réponse IA repèrent ainsi chaque question. */}
                <h2 className="m-0">
                  <button
                    onClick={() => setOpen(open === i ? null : i)}
                    aria-expanded={open === i}
                    className="flex w-full items-start justify-between gap-4 text-left"
                  >
                    <span className="text-base font-medium text-stone-900 leading-snug pr-4">{faq.q}</span>
                    <span className={`flex-shrink-0 mt-0.5 text-[color:var(--hh-primary)] transition-transform duration-200 ${open === i ? 'rotate-45' : ''}`} style={{ fontSize: '1.4rem', lineHeight: 1 }}>+</span>
                  </button>
                </h2>
                {/* Réponse toujours présente dans le HTML (masquée tant que la question est fermée) :
                    les robots des moteurs de réponse IA lisent le texte sans cliquer. */}
                <p
                  hidden={open !== i}
                  className="mt-4 text-sm text-stone-500 leading-relaxed border-l-2 border-[color:var(--hh-primary)] pl-4"
                >
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[color:var(--hh-bg)] px-6 py-14 md:px-10 text-center">
          <div className="mx-auto max-w-xl">
            <h2 className="text-xl font-serif font-light text-stone-900 mb-2">{c.get('cta_title')}</h2>
            <p className="text-sm text-stone-500 mb-6">{c.get('cta_text')}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={safeHref(c.t_ecrire_a_monica_href, '/contact')} className="inline-block rounded-full border border-[color:var(--hh-primary)] px-6 py-3 text-sm font-semibold text-[color:var(--hh-primary)] hover:bg-[color:var(--hh-primary)] hover:text-white transition">
                {c.t_ecrire_a_monica}
              </Link>
              <Link href={safeHref(c.t_reserver_une_seance_href, '/booking')} className="inline-block rounded-full bg-[color:var(--hh-primary)] px-6 py-3 text-sm font-semibold text-white hover:bg-[color:var(--hh-dark)] transition">
                {c.t_reserver_une_seance}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

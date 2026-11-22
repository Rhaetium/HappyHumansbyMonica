'use client'

import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useCmsContent } from '@/hooks/useCmsContent'
import { SITE_DEFAULTS } from '@/lib/cms-defaults/site'

export default function NotFound() {
  // Textes modifiables dans le CMS (page « Textes communs » → Page introuvable)
  const c = useCmsContent('site', SITE_DEFAULTS)
  return (
    <>
      <Header />
      <main className="pt-[72px] min-h-screen bg-[color:var(--hh-bg)] flex flex-col items-center justify-center px-6 py-24 text-center">

        {/* Numéro sobre */}
        <p className="text-[120px] md:text-[180px] font-serif font-light text-stone-200 leading-none select-none">
          404
        </p>

        <div className="-mt-8 relative z-10 max-w-lg">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-amber-800">{c.notfound_badge}</p>
          <h1 className="text-3xl font-serif font-light text-stone-900 mb-5 md:text-4xl leading-snug">
            {c.notfound_title}
          </h1>
          <p className="text-base text-stone-500 leading-relaxed mb-10">
            {c.notfound_text}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="rounded-full bg-[color:var(--hh-primary)] px-7 py-3 text-sm font-semibold text-white hover:bg-[color:var(--hh-dark)] transition"
            >
              {c.notfound_home}
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-stone-300 px-7 py-3 text-sm font-semibold text-stone-700 hover:border-[color:var(--hh-primary)] hover:text-[color:var(--hh-primary)] transition"
            >
              {c.notfound_contact}
            </Link>
          </div>
        </div>

        {/* Liens utiles */}
        <div className="mt-16 flex flex-wrap gap-x-8 gap-y-3 justify-center text-sm text-stone-400">
          {[
            { href: '/coaching',          label: c.notfound_link_coaching },
            { href: '/relations',         label: c.notfound_link_relations },
            { href: '/happiness-design',  label: c.notfound_link_happiness },
            { href: '/booking',           label: c.notfound_link_booking },
          ].map(l => (
            <Link key={l.href} href={l.href} className="hover:text-[color:var(--hh-primary)] transition">{l.label}</Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  )
}

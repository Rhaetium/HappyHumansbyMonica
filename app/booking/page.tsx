'use client'

import { Suspense } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import CalendlyWidget from '@/components/CalendlyWidget'
import { useCmsContent } from '@/hooks/useCmsContent'
import { useCalendly } from '@/hooks/useCalendly'
import { useCalendlyAvailability } from '@/hooks/useCalendlyAvailability'
import { shouldHideCalendlyCta } from '@/lib/calendly-availability'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { BOOKING_DEFAULTS } from '@/lib/cms-defaults/booking'

export default function BookingPage() {
  const c = useCmsContent('booking', BOOKING_DEFAULTS)
  const { profileUrl } = useCalendly()
  const availability = useCalendlyAvailability(profileUrl)
  const settings = useSiteSettings()

  return (
    <>
      <Header />
      <main className="pt-[72px]">

        {/* HERO SOBRE */}
        <section className="bg-[#f5f0e8] px-6 py-16 md:py-20 text-center">
          <div className="mx-auto max-w-2xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-amber-800">{c.get('hero_badge')}</p>
            <h1 className="text-3xl font-serif font-light text-stone-900 md:text-5xl">{c.get('hero_title')}</h1>
            <p className="mt-4 text-base text-stone-500">
              {c.get('hero_subtitle', undefined, { multiline: true })}
            </p>
          </div>
        </section>

        {/* CALENDLY WIDGET OFFICIEL */}
        <section className="bg-white py-8">
          <div className="mx-auto max-w-4xl px-4">
            <Suspense fallback={
              <div className="h-[700px] flex items-center justify-center text-stone-400 text-sm">
                {c.t_chargement_du_calendrier}
              </div>
            }>
              <CalendlyWidget
                loadingLabel={String(c.t_chargement_du_calendrier)}
                blockedTitle={String(c.t_aucune_disponibilite_titre)}
                blockedText={String(c.t_aucune_disponibilite_texte)}
                contactEmail={settings.contact_email}
                labels={{
                  coaching: c.service_label_coaching,
                  'happiness-design': c.service_label_happiness_design,
                  'sparring-partner': c.service_label_sparring_partner,
                  entreprises: c.service_label_entreprises,
                  relations: c.service_label_relations,
                }}
              />
            </Suspense>
            {/* « Ouvrir Calendly directement » n'a pas de sens quand l'agenda n'a rien de public :
                le lien mènerait au même écran vide. On le masque, le message ci-dessus prend le relais. */}
            {!shouldHideCalendlyCta(availability) && (
              <p className="mt-4 text-center text-xs text-stone-400">
                {c.display_problem}{' '}
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#2d5f54] hover:underline"
                >
                  {c.t_ouvrir_calendly_directement}
                </a>
              </p>
            )}
          </div>
        </section>

        {/* RÉASSURANCES */}
        <section className="bg-[#f5f0e8] py-12">
          <div className="mx-auto max-w-3xl px-6 md:px-10">
            <div className="grid gap-6 sm:grid-cols-3 text-center">
              {[
                {
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d5f54" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>,
                  title: c.get('reassurance_1_title'),
                  desc: c.get('reassurance_1_desc', undefined, { multiline: true }),
                },
                {
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d5f54" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
                  title: c.get('reassurance_2_title'),
                  desc: c.get('reassurance_2_desc', undefined, { multiline: true }),
                },
                {
                  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2d5f54" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>,
                  title: c.get('reassurance_3_title'),
                  desc: c.get('reassurance_3_desc', undefined, { multiline: true }),
                },
              ].map(({ icon, title, desc }, i) => (
                <div key={i} className="rounded-2xl bg-white p-6">
                  <div className="w-10 h-10 rounded-full bg-[#eef5f3] flex items-center justify-center shadow-sm mx-auto mb-3">{icon}</div>
                  <h3 className="text-sm font-semibold text-stone-900 mb-2">{title}</h3>
                  <p className="text-xs text-stone-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-xs text-stone-400">
              {c.get('footer_note', undefined, { multiline: true })}
            </p>
          </div>
        </section>

        {/* LIEN DE SECOURS */}
        <section className="bg-white py-8 text-center">
          <p className="text-sm text-stone-500 mb-3">{c.t_vous_preferez_reserver_par}</p>
          <Link href="/contact" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2d5f54] hover:underline">
            {c.get('email_booking_text')}
          </Link>
        </section>

      </main>
      <Footer />
    </>
  )
}

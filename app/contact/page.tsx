'use client'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useCmsContent } from '@/hooks/useCmsContent'
import { useState } from 'react'
import { CONTACT_DEFAULTS } from '@/lib/cms-defaults/contact'
import EditableImage from '@/components/EditableImage';

export default function ContactPage() {
  const c = useCmsContent('contact', CONTACT_DEFAULTS)
  const [form, setForm] = useState({ name: '', email: '', type: '', subject: '', message: '' })
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, type: form.type }),
      })
      if (res.ok) setSent(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Header />
      <main>
        {/* HERO */}
        <section className="relative flex h-[40vh] items-end overflow-hidden bg-stone-900">
          <EditableImage page="contact" fieldKey="hero_image" variant="cover" duotone
            src={c.hero_image || CONTACT_DEFAULTS.hero_image}
            alt={c.t_espace_d_echange_calme}
            className="absolute inset-0 h-full w-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          <div className="relative z-10 max-w-3xl px-6 pb-12 md:px-16 md:pb-20">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-amber-300">{c.get('hero_badge')}</p>
            <h1 className="text-4xl font-serif font-light leading-[1.1] text-white md:text-5xl">{c.get('page_title')}</h1>
          </div>
        </section>

        {/* FORM */}
        <section className="bg-white py-20 md:py-28">
          <div className="mx-auto max-w-5xl px-6 md:px-10">
            <div className="grid gap-16 md:grid-cols-[1fr_380px] items-start">
              <div>
                <p className="mb-8 text-base leading-relaxed text-stone-600">{c.get('intro_text', undefined, { multiline: true })}</p>
                {sent ? (
                  <div className="rounded-2xl bg-[color:var(--hh-bg)] border border-[color:color-mix(in_srgb,var(--hh-primary)_20%,transparent)] p-8 text-center">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[color:var(--hh-primary)] flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-stone-900 mb-2">{c.get('success_title')}</h3>
                    <p className="text-sm text-stone-600">{c.get('success_text', undefined, { multiline: true })}</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">{c.get('form_name_label')}</label>
                        <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-[color:var(--hh-primary)]" placeholder={c.t_votre_nom} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">{c.get('form_email_label')}</label>
                        <input required type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-[color:var(--hh-primary)]" placeholder={c.t_votre_email_com} />
                      </div>
                    </div>
                    <div>
                      
                      <div>
                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">{c.t_type_de_demande}</label>
                        <select required value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))} className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-[color:var(--hh-primary)] bg-white">
                          <option value="">{c.t_selectionnez}</option>
                          <option value="coaching-individuel">{c.t_coaching_individuel}</option>
                          <option value="coaching-entreprises">{c.t_coaching_accompagnement_entreprise}</option>
                          <option value="relations">{c.t_accompagnement_relations}</option>
                          <option value="conference">{c.t_conference_formation}</option>
                          <option value="autre">{c.t_autre_question}</option>
                        </select>
                      </div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">{c.get('form_subject_label')}</label>
                      <input value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))} className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-[color:var(--hh-primary)]" placeholder={c.t_objet_de_votre_message} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">{c.get('form_message_label')}</label>
                      <textarea required value={form.message} onChange={e => setForm(f => ({...f, message: e.target.value}))} rows={6} className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-[color:var(--hh-primary)] resize-none" placeholder={c.t_decrivez_votre_situation_ou} />
                    </div>
                    <button type="submit" disabled={sending} className="rounded-full bg-[color:var(--hh-primary)] px-8 py-3.5 text-sm font-semibold text-white hover:bg-[color:var(--hh-dark)] transition disabled:opacity-60">
                      {sending ? 'Envoi…' : c.get('form_submit_label')}
                    </button>
                  </form>
                )}
              </div>
              <div className="space-y-6">
                {c.photo ? (
                  <EditableImage page="contact" fieldKey="photo" variant="block" src={c.photo} alt={c.t_monica_schneider} className="rounded-2xl object-cover object-top w-full h-64 shadow-lg" />
                ) : (
                  <div className="rounded-2xl bg-gradient-to-br from-[color:var(--hh-bg)] to-[color:var(--hh-bg)] h-64 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-[color:var(--hh-primary)] flex items-center justify-center text-white text-2xl font-serif font-bold">{c.t_ms}</div>
                  </div>
                )}
                <div className="space-y-3 text-sm text-stone-600">
                  <p className="font-semibold text-stone-900">{c.t_monica_schneider_2}</p>
                  <p>{c.t_executive_coach_philosophical_coun}</p>
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2d5f54" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    <span>{c.t_francais_anglais_et_roumain}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2d5f54" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span>{c.t_reponse_sous_48h}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

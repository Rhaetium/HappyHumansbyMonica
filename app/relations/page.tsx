'use client';
import { useState, useRef, Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import { AttachmentTest } from '@/components/attachment-test/AttachmentTest';
import Header from '@/components/Header';
import SiteLogo, { resolveLogo } from '@/components/SiteLogo';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { Icon, type IconName } from '@/components/icons';

const buildSources = (c: CmsResult) => [
  {
    id: 'attached',
    icon: 'book' as IconName,
    title: c.t_attached,
    subtitle: c.t_comprendre_son_style_d,
    content: (
      <div className="space-y-6" style={{ color: '#444', lineHeight: 1.8 }}>
        <p><Rich text={c.t_le_livre_attached_applique} /></p>
        <p>{c.t_le_style_secure_permet}</p>
        <p>{c.t_le_style_anxieux_genere}</p>
        <p>{c.t_le_style_evitant_pousse}</p>
        <p>{c.t_le_livre_propose_des}</p>
        <div className="mt-8 p-6 rounded-xl" style={{ background: 'rgba(168,100,160,0.08)' }}>
          <h4 className="text-lg font-semibold mb-4" style={{ color: 'var(--hh-primary)' }}>{c.t_comment_ces_styles_se}</h4>
          <div className="space-y-4" style={{ color: '#555' }}>
            <p>{c.t_selon_bowlby_le_nourrisson}</p>
            <p><Rich text={c.t_si_le_parent_est} /></p>
            <p><Rich text={c.t_si_les_reponses_du} /></p>
            <p><Rich text={c.t_si_le_parent_est_2} /></p>
            <p className="mt-4" style={{ fontStyle: 'italic' }}>{c.t_ces_modeles_formes_avant}</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'rogers',
    icon: 'mirror' as IconName,
    title: c.t_carl_rogers,
    subtitle: c.t_deconstruire_l_amour_conditionnel,
    content: (
      <div className="space-y-6" style={{ color: '#444', lineHeight: 1.8 }}>
        <div>
          <h4 className="text-lg font-semibold mb-3" style={{ color: 'var(--hh-primary)' }}>{c.t_le_concept_de_carl}</h4>
          <div className="space-y-4">
            <p>{c.t_l_idee_de_carl}</p>
            <p>{c.t_rogers_pensait_que_la}</p>
            <p>{c.t_le_probleme_c_est}</p>
            <p><Rich text={c.t_pour_rogers_une_vraie} /></p>
          </div>
        </div>
        <div className="p-6 rounded-xl" style={{ background: 'rgba(168,100,160,0.06)' }}>
          <h4 className="text-lg font-semibold mb-4" style={{ color: 'var(--hh-primary)' }}>{c.t_comment_faire_la_paix}</h4>
          <div className="space-y-4" style={{ color: '#555' }}>
            <p>{c.t_rogers_ne_voyait_pas}</p>
            <p><Rich text={c.t_abandonner_les_conditions_de} /></p>
            <p><Rich text={c.t_faire_confiance_a_sa} /></p>
            <p><Rich text={c.t_pratiquer_le_regard_positif} /></p>
            <p><Rich text={c.t_chercher_des_environnements_ou} /></p>
            <p className="mt-4" style={{ fontStyle: 'italic' }}>{c.t_c_est_moins_une}</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'fromm',
    icon: 'hand-heart' as IconName,
    title: c.t_erich_fromm,
    subtitle: c.t_se_preparer_a_l,
    content: (
      <div className="space-y-6" style={{ color: '#444', lineHeight: 1.8 }}>
        <p><Rich text={c.t_erich_fromm_dans_l} /></p>
        <div className="p-5 rounded-xl border-l-4" style={{ background: '#fff', borderColor: '#dc2626' }}>
          <h4 className="font-semibold mb-2" style={{ color: '#dc2626' }}>{c.t_amour_immature}</h4>
          <p className="italic mb-2">{c.t_je_t_aime_parce}</p>
          <p className="text-sm">{c.t_il_est_enracine_dans}</p>
        </div>
        <div className="p-5 rounded-xl border-l-4" style={{ background: '#fff', borderColor: '#166534' }}>
          <h4 className="font-semibold mb-2" style={{ color: '#166534' }}>{c.t_amour_mature}</h4>
          <p className="italic mb-2">{c.t_j_ai_besoin_de}</p>
          <p className="text-sm">{c.t_ici_l_amour_est}</p>
        </div>
        <div className="p-5 rounded-xl" style={{ background: 'rgba(168,100,160,0.08)' }}>
          <p><Rich text={c.t_pour_fromm_c_est} /></p>
        </div>
      </div>
    ),
  },
];

const buildAttachmentStyles = (c: CmsResult) => [
  {
    id: 'secure',
    icon: 'leaf' as IconName,
    label: c.t_secure_2,
    percent: '55–60 %',
    color: 'var(--hh-primary)',
    bg: 'rgba(45,95,84,0.07)',
    desc: c.t_a_l_aise_avec,
  },
  {
    id: 'anxious',
    icon: 'wave' as IconName,
    label: c.t_anxieux_2,
    percent: '~20 %',
    color: '#b45309',
    bg: 'rgba(180,83,9,0.07)',
    desc: c.t_peur_du_rejet_et,
  },
  {
    id: 'avoidant',
    icon: 'wind' as IconName,
    label: c.t_evitant_2,
    percent: '~25 %',
    color: '#64748b',
    bg: 'rgba(100,116,139,0.07)',
    desc: c.t_a_appris_a_minimiser,
  },
  {
    id: 'disorganized',
    icon: 'bolt' as IconName,
    label: c.t_desorganise,
    percent: '~5 %',
    color: '#78716c',
    bg: 'rgba(120,113,108,0.07)',
    desc: c.t_conflit_interne_entre_le,
  },
];

import { useCmsContent, type CmsResult } from '@/hooks/useCmsContent';
import { RELATIONS_DEFAULTS } from '@/lib/cms-defaults/relations'
import Rich from '@/components/Rich'
import { PAGE_SECTIONS, resolveSections } from '@/lib/cms-sections'
import { customSectionDefs, customSectionId, isCustomSectionId, parseBlocks } from '@/lib/custom-sections'
import { CustomBlockView } from '@/components/CustomSections'
import EditableImage from '@/components/EditableImage';

export default function RelationsPage() {
  const c = useCmsContent('relations', RELATIONS_DEFAULTS);
  // logo du pied de page : celui du CMS (version claire), sinon le logo de la charte en crème
  const footerLogo = resolveLogo(useSiteSettings(), { sizeKey: 'logo_footer_size', fallbackSize: 40, maxSize: 72, onDark: true });

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const bookingRef = useRef<HTMLDivElement>(null);

  const handleBook = () => {
    // Scroll to booking section
    setTimeout(() => {
      bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const activeSource = buildSources(c).find(s => s.id === activeModal);

  // ── Sections de la page : ordre et affichage modifiables dans le CMS (admin → page → Structure) ──
  const sections: Record<string, ReactNode> = {
    hero: (
      <section className="relative overflow-hidden bg-stone-900 px-6 py-24 md:py-36 md:px-10 text-center">
        <EditableImage page="relations" fieldKey="hero_image" variant="cover" duotone
          src={c.hero_image}
          alt={c.t_connexion_humaine_mains_tendues}
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="relative mx-auto max-w-2xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-amber-400">
            {c.get('hero_badge')}
          </p>
          <h1 className="text-4xl font-serif font-light leading-tight text-white mb-4 md:text-6xl">
            {c.get('hero_title')}
          </h1>
          <p className="text-stone-400 text-sm md:text-base leading-relaxed max-w-xl mx-auto">
            {c.get('hero_description')}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleBook}
              className="rounded-full bg-[color:var(--hh-primary)] px-7 py-3.5 text-sm font-semibold text-white shadow hover:bg-[color:var(--hh-dark)] transition"
            >
              {c.get('hero_cta_primary')}
            </button>
            <a
              href="#quiz"
              onClick={e => { e.preventDefault(); document.querySelector('[data-quiz]')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="rounded-full border border-stone-500 px-7 py-3.5 text-sm font-semibold text-stone-300 hover:border-white hover:text-white transition"
            >
              {c.get('hero_cta_secondary')}
            </a>
          </div>
        </div>
      </section>
    ),
    styles: (
      <section className="bg-[color:var(--hh-bg)] px-6 py-16 md:px-10 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-800">{c.get('styles_badge')}</p>
            <h2 className="text-2xl font-serif font-light text-stone-900 md:text-3xl">{c.get('styles_title')}</h2>
            <p className="mt-3 text-sm text-stone-500 max-w-xl mx-auto">
              {c.get('styles_subtitle')}
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {buildAttachmentStyles(c).map(s => (
              <div key={s.id} className="rounded-2xl bg-white p-6 shadow-sm border-t-4" style={{ borderColor: s.color }}>
                <div className="mb-3 text-[color:var(--hh-primary)]"><Icon name={s.icon} size={34} /></div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-semibold text-stone-900">{s.label}</h3>
                  <span className="text-xs font-bold rounded-full px-2 py-0.5" style={{ background: s.bg, color: s.color }}>{s.percent}</span>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
    test: (
      <section className="bg-stone-900 px-6 py-16 md:py-24 md:px-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-amber-400">
              {c.get('quiz_badge')}
            </p>
          </div>
          <AttachmentTest onBook={handleBook} />
        </div>
      </section>
    ),
    danse: (
      <section className="bg-white px-6 py-16 md:px-10 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-800">{c.get('manifestations_badge')}</p>
            <h2 className="text-2xl font-serif font-light text-stone-900 md:text-3xl">{c.get('manifestations_title')}</h2>
            <p className="mt-3 text-sm text-stone-500 max-w-xl mx-auto">
              {c.get('manifestations_subtitle')}
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-6 items-stretch">
            <div className="flex-1 rounded-2xl p-7 text-center" style={{ background: 'rgba(180,83,9,0.07)', border: '1px solid rgba(180,83,9,0.15)' }}>
              <div className="mb-3 flex justify-center" style={{ color: '#b45309' }}><Icon name="wave" size={40} /></div>
              <h3 className="font-semibold text-lg mb-2" style={{ color: '#b45309' }}>{c.get('manifestations_anxious_title')}</h3>
              <p className="text-sm text-stone-600 leading-relaxed">{c.get('manifestations_anxious_desc')}</p>
            </div>
            <div className="flex items-center justify-center text-3xl md:text-5xl text-stone-300 font-light select-none">
              ⟷
            </div>
            <div className="flex-1 rounded-2xl p-7 text-center" style={{ background: 'rgba(29,78,216,0.07)', border: '1px solid rgba(29,78,216,0.12)' }}>
              <div className="mb-3 flex justify-center" style={{ color: '#1d4ed8' }}><Icon name="wind" size={40} /></div>
              <h3 className="font-semibold text-lg mb-2" style={{ color: '#1d4ed8' }}>{c.get('manifestations_avoidant_title')}</h3>
              <p className="text-sm text-stone-600 leading-relaxed">{c.get('manifestations_avoidant_desc')}</p>
            </div>
          </div>
          <div className="mt-8 rounded-2xl p-6 text-center" style={{ background: 'rgba(45,95,84,0.07)' }}>
            <p className="text-sm text-stone-700 leading-relaxed">
              <strong style={{ color: 'var(--hh-primary)' }}>{c.t_bonne_nouvelle}</strong> {c.get('manifestations_goodnews_text')}
            </p>
          </div>
        </div>
      </section>
    ),
    changement: (
      <section className="bg-[color:var(--hh-bg)] px-6 py-16 md:px-10 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-800">{c.get('healing_badge')}</p>
            <h2 className="text-2xl font-serif font-light text-stone-900 md:text-3xl">{c.get('healing_title')}</h2>
            <p className="mt-3 text-sm text-stone-500 max-w-xl mx-auto">
              {c.get('healing_subtitle')}
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-7 shadow-sm">
              <div className="mb-3 flex justify-center text-[color:var(--hh-primary)]"><Icon name="search" size={34} /></div>
              <h3 className="font-semibold mb-2 text-stone-900">{c.get('healing_step1_title')}</h3>
              <p className="text-sm text-stone-500 leading-relaxed">{c.get('healing_step1_desc')}</p>
            </div>
            <div className="rounded-2xl bg-white p-7 shadow-sm">
              <div className="mb-3 flex justify-center text-[color:var(--hh-primary)]"><Icon name="connect" size={34} /></div>
              <h3 className="font-semibold mb-2 text-stone-900">{c.get('healing_step2_title')}</h3>
              <p className="text-sm text-stone-500 leading-relaxed">{c.get('healing_step2_desc')}</p>
            </div>
            <div className="rounded-2xl bg-white p-7 shadow-sm">
              <div className="mb-3 flex justify-center text-[color:var(--hh-primary)]"><Icon name="sparkle" size={34} /></div>
              <h3 className="font-semibold mb-2 text-stone-900">{c.get('healing_step3_title')}</h3>
              <p className="text-sm text-stone-500 leading-relaxed">{c.get('healing_step3_desc')}</p>
            </div>
          </div>
        </div>
      </section>
    ),
    communication: (
      <section className="bg-white px-6 py-16 md:px-10 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-800">{c.get('comm_badge')}</p>
            <h2 className="text-2xl font-serif font-light text-stone-900 md:text-3xl">{c.get('comm_title')}</h2>
            <p className="mt-3 text-sm text-stone-500 max-w-xl mx-auto">
              {c.get('comm_subtitle')}
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <div key="comm1" className="rounded-2xl bg-[color:var(--hh-bg)] p-7">
              <div className="mb-3 flex justify-center text-[color:var(--hh-primary)]"><Icon name="target" size={34} /></div>
              <h3 className="font-semibold mb-2 text-stone-900">{c.get('comm_rule1_title')}</h3>
              <p className="text-sm text-stone-600 leading-relaxed mb-3">{c.get('comm_rule1_desc')}</p>
              <p className="text-xs text-stone-400 italic border-l-2 border-amber-300 pl-3 leading-relaxed">{c.get('comm_rule1_example')}</p>
            </div>
            <div key="comm2" className="rounded-2xl bg-[color:var(--hh-bg)] p-7">
              <div className="mb-3 flex justify-center text-[color:var(--hh-primary)]"><Icon name="heart" size={34} /></div>
              <h3 className="font-semibold mb-2 text-stone-900">{c.get('comm_rule2_title')}</h3>
              <p className="text-sm text-stone-600 leading-relaxed mb-3">{c.get('comm_rule2_desc')}</p>
              <p className="text-xs text-stone-400 italic border-l-2 border-amber-300 pl-3 leading-relaxed">{c.get('comm_rule2_example')}</p>
            </div>
            <div key="comm3" className="rounded-2xl bg-[color:var(--hh-bg)] p-7">
              <div className="mb-3 flex justify-center text-[color:var(--hh-primary)]"><Icon name="shield" size={34} /></div>
              <h3 className="font-semibold mb-2 text-stone-900">{c.get('comm_rule3_title')}</h3>
              <p className="text-sm text-stone-600 leading-relaxed mb-3">{c.get('comm_rule3_desc')}</p>
              <p className="text-xs text-stone-400 italic border-l-2 border-amber-300 pl-3 leading-relaxed">{c.get('comm_rule3_example')}</p>
            </div>
          </div>
        </div>
      </section>
    ),
    travail: (
      <section className="bg-[color:var(--hh-bg)] px-6 py-16 md:px-10 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-800">{c.get('work_section_badge')}</p>
              <h2 className="text-2xl font-serif font-light text-stone-900 md:text-3xl mb-4">{c.get('work_section_title')}</h2>
              <p className="text-sm text-stone-600 leading-relaxed mb-4">
                {c.get('work_section_desc')}
              </p>
              <ul className="space-y-3 text-sm text-stone-600">
                <li className="flex items-start gap-2"><span style={{ color: 'var(--hh-primary)' }}><Icon name="leaf" size={18} className="mt-0.5" /></span><span><strong>{c.get('work_secure_label')}</strong> {c.get('work_secure_desc')}</span></li>
                <li className="flex items-start gap-2"><span style={{ color: '#b45309' }}><Icon name="wave" size={18} className="mt-0.5" /></span><span><strong>{c.get('work_anxious_label')}</strong> {c.get('work_anxious_desc')}</span></li>
                <li className="flex items-start gap-2"><span style={{ color: '#1d4ed8' }}><Icon name="wind" size={18} className="mt-0.5" /></span><span><strong>{c.get('work_avoidant_label')}</strong> {c.get('work_avoidant_desc')}</span></li>
              </ul>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={handleBook}
                className="rounded-2xl bg-[color:var(--hh-primary)] px-8 py-5 text-sm font-semibold text-white shadow hover:bg-[color:var(--hh-dark)] transition text-center block"
              >
                <span className="mb-2 block text-[color:var(--hh-primary)]"><Icon name="briefcase" size={28} /></span>
                {c.get('work_section_cta')}
              </button>
            </div>
          </div>
        </div>
      </section>
    ),
    actions: (
      <section className="bg-white px-6 py-16 md:px-10 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-800">{c.get('steps_badge')}</p>
            <h2 className="text-2xl font-serif font-light text-stone-900 md:text-3xl">{c.get('steps_title')}</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div key="step1" className="rounded-2xl bg-[color:var(--hh-bg)] p-7 shadow-sm">
              <p className="mb-3 text-3xl font-serif font-light text-[color:var(--hh-primary)] opacity-60">01</p>
              <h3 className="mb-2 text-base font-semibold text-stone-900">{c.get('step1_title')}</h3>
              <p className="text-sm text-stone-500">{c.get('step1_desc')}</p>
            </div>
            <div key="step2" className="rounded-2xl bg-[color:var(--hh-bg)] p-7 shadow-sm">
              <p className="mb-3 text-3xl font-serif font-light text-[color:var(--hh-primary)] opacity-60">02</p>
              <h3 className="mb-2 text-base font-semibold text-stone-900">{c.get('step2_title')}</h3>
              <p className="text-sm text-stone-500">{c.get('step2_desc')}</p>
            </div>
            <div key="step3" className="rounded-2xl bg-[color:var(--hh-bg)] p-7 shadow-sm">
              <p className="mb-3 text-3xl font-serif font-light text-[color:var(--hh-primary)] opacity-60">03</p>
              <h3 className="mb-2 text-base font-semibold text-stone-900">{c.get('step3_title')}</h3>
              <p className="text-sm text-stone-500">{c.get('step3_desc')}</p>
            </div>
          </div>
        </div>
      </section>
    ),
    monde_pro: (
      <section className="bg-white px-6 py-16 md:px-10 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-800">{c.get('multiculture_badge')}</p>
            <h2 className="text-2xl font-serif font-light text-stone-900 md:text-3xl">{c.get('multiculture_title')}</h2>
            <p className="mt-3 text-sm text-stone-500 max-w-2xl mx-auto">
              {c.get('multiculture_subtitle')}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl bg-[color:var(--hh-bg)] p-7">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2d5f54" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
              </div>
              <h3 className="text-base font-semibold text-stone-900 mb-3">{c.get('multiculture_entreprise_title')}</h3>
              <div className="text-sm text-stone-600 space-y-2">
                <p><strong>{c.t_secure}</strong> {c.get('work_secure_desc')}</p>
                <p><strong>{c.t_anxieux}</strong> {c.get('work_anxious_desc')}</p>
                <p><strong>{c.t_evitant}</strong> {c.get('work_avoidant_desc')}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-[color:var(--hh-bg)] p-7">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2d5f54" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </div>
              <h3 className="text-base font-semibold text-stone-900 mb-3">{c.get('multiculture_mc_title')}</h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                {c.get('multiculture_mc_desc')}
              </p>
            </div>
          </div>
          <div className="mt-8 rounded-2xl bg-[color:var(--hh-bg)] border border-[color:color-mix(in_srgb,var(--hh-primary)_20%,transparent)] p-6 text-center">
            <p className="text-sm text-stone-700 max-w-xl mx-auto">
              <strong className="text-[color:var(--hh-primary)]">{c.get('multiculture_note')}</strong>
            </p>
            <button
              onClick={handleBook}
              className="mt-4 rounded-full bg-[color:var(--hh-primary)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--hh-dark)] transition"
            >
              {c.get('multiculture_cta')}
            </button>
          </div>
        </div>
      </section>
    ),
    reservation: (
      <section
        ref={bookingRef}
        className="bg-[color:var(--hh-bg)] px-6 py-16 md:px-10 md:py-20"
        id="booking"
      >
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-800">{c.get('booking_badge')}</p>
            <h2 className="text-2xl font-serif font-light text-stone-900 md:text-3xl">
              {c.get('booking_title')}
            </h2>
            <p className="mt-3 text-sm text-stone-500">
              {c.get('booking_subtitle')}
            </p>
          </div>
          <div className="text-center">
            <a
              href="/booking"
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--hh-primary)] px-8 py-4 text-sm font-semibold text-white shadow hover:bg-[color:var(--hh-dark)] transition"
            >
              {c.get('booking_cta_button')}
            </a>
          </div>
        </div>
      </section>
    ),
    ressources: (
      <section className="bg-white px-6 py-16 md:px-10 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-amber-800">{c.get('theory_badge')}</p>
            <h2 className="text-2xl font-serif font-light text-stone-900 md:text-3xl">
              {c.get('theory_title')}
            </h2>
            <p className="mt-3 text-sm text-stone-500 max-w-xl mx-auto">
              {c.get('theory_subtitle')}
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {buildSources(c).map(source => (
              <button
                key={source.id}
                onClick={() => setActiveModal(source.id)}
                className="rounded-2xl bg-[color:var(--hh-bg)] p-6 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group"
              >
                <div className="mb-3 text-[color:var(--hh-primary)]"><Icon name={source.icon} size={34} /></div>
                <h3 className="mb-1 text-base font-semibold text-stone-900 group-hover:text-[color:var(--hh-primary)] transition">{source.title}</h3>
                <p className="text-xs text-stone-500">{source.subtitle}</p>
                <p className="mt-3 text-xs font-semibold text-[color:var(--hh-primary)]">{c.t_decouvrir}</p>
              </button>
            ))}
          </div>
        </div>
      </section>
    ),
  }
  const customBlocks = parseBlocks(c.content?.['custom_sections'] ?? '')
  const sectionIds = resolveSections(
    [...PAGE_SECTIONS.relations, ...customSectionDefs(customBlocks)],
    c.sections_layout,
  )

  return (
    <div className="min-h-screen bg-[color:var(--hh-bg)]">

      {/* ══ NAV MINIMALISTE ═══════════════════════════════════════════════ */}
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

      {/* ══ FOOTER MINIMAL ════════════════════════════════════════════════ */}
      <footer className="border-t border-stone-800 bg-stone-900 px-6 py-8 md:px-10">
        <div className="mx-auto max-w-5xl flex flex-col items-center justify-between gap-4 text-xs text-stone-400 md:flex-row">
          <Link href="/" aria-label={c.footer_site_name} className="flex items-center gap-2 hover:opacity-80 transition">
            <SiteLogo url={footerLogo.url} size={footerLogo.size} shape={footerLogo.shape} alt="" />
            {footerLogo.showName && <span className="font-serif text-base text-stone-300 font-semibold hover:text-white transition">{c.get('footer_site_name')}</span>}
          </Link>
          <p>{c.get('footer_copyright')}</p>
          <div className="flex gap-6">
            <a href="/mentions-legales" className="hover:text-stone-200 transition">{c.t_mentions_legales}</a>
            <a href="/politique-confidentialite" className="hover:text-stone-200 transition">{c.t_confidentialite}</a>
          </div>
        </div>
      </footer>

      {/* ══ MODAL THÉORIQUE ═══════════════════════════════════════════════ */}
      {activeModal && activeSource && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-900/80 p-4 pt-16 backdrop-blur-sm"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveModal(null)}
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200"
            >✕</button>
            <div className="mb-6 flex items-center gap-3">
              <span className="text-[color:var(--hh-primary)]"><Icon name={activeSource.icon} size={34} /></span>
              <div>
                <h2 className="text-xl font-semibold text-stone-900">{activeSource.title}</h2>
                <p className="text-sm text-stone-500">{activeSource.subtitle}</p>
              </div>
            </div>
            <div className="prose prose-sm max-w-none text-stone-700">
              {activeSource.content}
            </div>
            <div className="mt-8 border-t pt-6">
              <button
                onClick={() => { setActiveModal(null); handleBook(); }}
                className="w-full rounded-full bg-[color:var(--hh-primary)] py-3 text-sm font-semibold text-white hover:bg-[color:var(--hh-dark)] transition"
              >
                {c.get('theory_modal_cta')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

'use client';

import type { AttachmentProfile, AttachmentResult } from '@/lib/attachment-test/types';
import { Icon, type IconName } from '@/components/icons';
import { useCmsContent } from '@/hooks/useCmsContent';
import { TEST_ATTACHEMENT_DEFAULTS } from '@/lib/cms-defaults/test-attachement';

const PROFILE_ICON: Record<AttachmentProfile, IconName> = {
  secure: 'heart',
  anxious: 'wave',
  avoidant: 'wind',
  disorganized: 'knot',
};

interface ScoreBarProps {
  label: string;
  percent: number;
  color: string;
}

function ScoreBar({ label, percent, color }: ScoreBarProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-white">{label}</span>
        <span className="text-sm font-bold text-white">{percent}%</span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

interface ResultCardProps {
  result: AttachmentResult;
  onRestart: () => void;
  onBook?: () => void;
}

export function ResultCard({ result, onRestart, onBook }: ResultCardProps) {
  const c = useCmsContent('test-attachement', TEST_ATTACHEMENT_DEFAULTS);
  const handleCopy = () => {
    const text = `${c.copy_intro} ${result.title}\n${c.copy_anxiety} ${result.anxietyPercent}% | ${c.copy_avoidance} ${result.avoidancePercent}%`;
    navigator.clipboard?.writeText(text);
  };

  return (
    <div className="space-y-6">
      {/* Header profil */}
      <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-white/20 text-center">
        <div className="mb-3 flex justify-center text-emerald-200"><Icon name={PROFILE_ICON[result.profile]} size={44} /></div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">{result.title}</h2>
        <p className="text-white/80 text-base md:text-lg leading-relaxed">{result.summary}</p>
      </div>

      {/* Scores */}
      <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-rose-300 mb-4">{c.scores_title}</h3>
        <ScoreBar label={c.score_anxiety_label} percent={result.anxietyPercent} color="bg-gradient-to-r from-amber-400 to-orange-400" />
        <ScoreBar label={c.score_avoidance_label} percent={result.avoidancePercent} color="bg-gradient-to-r from-sky-400 to-indigo-400" />
      </div>

      {/* Forces */}
      <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-emerald-300"><Icon name="sparkle" size={16} />{c.strengths_title}</h3>
        <ul className="space-y-2">
          {result.strengths.map((s, i) => (
            <li key={i} className="flex gap-3 text-white/80 text-sm">
              <span className="text-emerald-400 mt-0.5 shrink-0">▸</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Défis */}
      <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-amber-300"><Icon name="bolt" size={16} />{c.challenges_title}</h3>
        <ul className="space-y-2">
          {result.challenges.map((c, i) => (
            <li key={i} className="flex gap-3 text-white/80 text-sm">
              <span className="text-amber-400 mt-0.5 shrink-0">▸</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Pistes */}
      <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-pink-300"><Icon name="sprout" size={16} />{c.growth_title}</h3>
        <ul className="space-y-2">
          {result.growthTips.map((t, i) => (
            <li key={i} className="flex gap-3 text-white/80 text-sm">
              <span className="text-pink-400 mt-0.5 shrink-0">▸</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-4">
        <p className="text-amber-200/80 text-xs leading-relaxed">
          <span className="font-semibold"><Icon name="alert" size={16} className="mr-1 inline -mt-0.5" />{c.note_label} </span>
          {result.disclaimer}
        </p>
      </div>

      {/* CTA BOOKING — mis en avant */}
      <div className="bg-[color:color-mix(in_srgb,var(--hh-primary)_80%,transparent)] border border-emerald-400/30 rounded-3xl p-6 md:p-8 text-center">
        <div className="mb-3 flex justify-center text-emerald-100"><Icon name="calendar" size={36} /></div>
        <h3 className="text-xl font-semibold text-white mb-2">{c.cta_title}</h3>
        <p className="text-emerald-100 text-sm mb-5 leading-relaxed">
          {c.cta_text_before} <strong>{c.cta_text_strong}</strong>{c.cta_text_after}
        </p>
        <button
          onClick={onBook}
          className="w-full md:w-auto rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-[color:var(--hh-primary)] shadow hover:bg-emerald-50 transition"
        >
          {c.cta_button}
        </button>
      </div>

      {/* Actions secondaires */}
      <div className="grid gap-3 md:grid-cols-2">
        <button
          onClick={onRestart}
          className="w-full py-3.5 px-6 rounded-2xl bg-white/10 border border-white/20 text-white font-medium hover:bg-white/20 transition-colors"
        >
          <span className="inline-flex items-center justify-center gap-2"><Icon name="refresh" size={18} />{c.restart_button}</span>
        </button>
        <button
          onClick={handleCopy}
          className="w-full py-3.5 px-6 rounded-2xl bg-white/10 border border-white/20 text-white font-medium hover:bg-white/20 transition-colors"
        >
          <span className="inline-flex items-center justify-center gap-2"><Icon name="clipboard" size={18} />{c.copy_button}</span>
        </button>
      </div>
    </div>
  );
}

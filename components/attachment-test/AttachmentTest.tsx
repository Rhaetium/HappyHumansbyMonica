'use client';

import { useState, useCallback } from 'react';
import { computeAttachmentResult } from '@/lib/attachment-test/scoring';
import type { AttachmentAnswer, AttachmentResult } from '@/lib/attachment-test/types';
import { ProgressBar } from './ProgressBar';
import { QuestionCard } from './QuestionCard';
import { ResultCard } from './ResultCard';
import { Icon } from '@/components/icons';
import { useCmsContent } from '@/hooks/useCmsContent';
import { TEST_ATTACHEMENT_DEFAULTS } from '@/lib/cms-defaults/test-attachement';
import { questionsFromCms, resultFromCms } from '@/lib/attachment-test/cms';

type Phase = 'intro' | 'quiz' | 'result';

interface AttachmentTestProps {
  onBook?: () => void;
}

export function AttachmentTest({ onBook }: AttachmentTestProps) {
  // textes du test (questions, résultats, boutons) : CMS → page « Test d'attachement »
  const c = useCmsContent('test-attachement', TEST_ATTACHEMENT_DEFAULTS);
  const attachmentQuestions = questionsFromCms(c);
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AttachmentAnswer[]>([]);
  const [result, setResult] = useState<AttachmentResult | null>(null);

  const total = attachmentQuestions.length;
  const currentQuestion = attachmentQuestions[currentIndex];
  const currentAnswer =
    answers.find((a) => a.questionId === currentQuestion?.id)?.value ?? null;

  const handleAnswer = useCallback(
    (value: 1 | 2 | 3 | 4 | 5) => {
      setAnswers((prev) => {
        const filtered = prev.filter((a) => a.questionId !== currentQuestion.id);
        return [...filtered, { questionId: currentQuestion.id, value }];
      });
    },
    [currentQuestion]
  );

  const handleNext = useCallback(() => {
    if (currentIndex < total - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      const res = resultFromCms(computeAttachmentResult(answers), c);
      setResult(res);
      setPhase('result');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('quiz_completed', { detail: { profile: res.profile } })
        );
      }
    }
  }, [currentIndex, total, answers, c]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }, [currentIndex]);

  const handleRestart = useCallback(() => {
    setPhase('intro');
    setCurrentIndex(0);
    setAnswers([]);
    setResult(null);
  }, []);

  const handleStart = useCallback(() => {
    setPhase('quiz');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('quiz_started'));
    }
  }, []);

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="text-center space-y-6 max-w-xl mx-auto">
        <div className="mb-2 flex justify-center text-white/90"><Icon name="knot" size={56} /></div>
        <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
          {c.intro_title}
        </h2>
        <p className="text-white/70 text-base md:text-lg leading-relaxed">
          {c.intro_text}
        </p>
        <div className="flex flex-wrap justify-center gap-3 text-sm">
          <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-white/80"><Icon name="timer" size={16} />{c.pill_time}</span>
          <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-white/80"><Icon name="note" size={16} />{c.pill_questions}</span>
          <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-white/80"><Icon name="sparkle" size={16} />{c.pill_results}</span>
        </div>
        <p className="text-white/50 text-sm italic">
          {c.intro_note}
        </p>
        <button
          onClick={handleStart}
          className="mt-4 w-full md:w-auto px-10 py-4 bg-[color:var(--hh-primary)] hover:bg-[color:var(--hh-primary)] text-white font-semibold rounded-2xl text-lg transition-all duration-200 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        >
          {c.start_button}
        </button>
      </div>
    );
  }

  // ── RÉSULTAT ───────────────────────────────────────────────────────────────
  if (phase === 'result' && result) {
    return (
      <div className="max-w-2xl mx-auto">
        <ResultCard result={result} onRestart={handleRestart} onBook={onBook} />
      </div>
    );
  }

  // ── QUIZ ───────────────────────────────────────────────────────────────────
  const canProceed = currentAnswer !== null;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <ProgressBar current={currentIndex + 1} total={total} />

      <QuestionCard
        question={currentQuestion}
        value={currentAnswer}
        onChange={handleAnswer}
        index={currentIndex + 1}
        total={total}
      />

      <div className="flex gap-3">
        {currentIndex > 0 && (
          <button
            onClick={handlePrev}
            className="flex-1 py-4 rounded-2xl bg-white/10 border border-white/20 text-white font-medium hover:bg-white/20 transition-colors"
          >
            {c.prev_button}
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={!canProceed}
          className={`flex-1 py-4 rounded-2xl font-semibold text-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${
            canProceed
              ? 'bg-[color:var(--hh-primary)] hover:bg-[color:var(--hh-primary)] shadow-lg'
              : 'bg-white/10 border border-white/20 opacity-50 cursor-not-allowed'
          }`}
        >
          {currentIndex === total - 1 ? c.finish_button : c.next_button}
        </button>
      </div>
    </div>
  );
}

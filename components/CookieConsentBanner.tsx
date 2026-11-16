'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { readCookieConsent, writeCookieConsent } from '@/lib/consent';
import { useCmsContent } from '@/hooks/useCmsContent';
import { SITE_DEFAULTS } from '@/lib/cms-defaults/site';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  // Textes modifiables dans le CMS (page « Textes communs »)
  const c = useCmsContent('site', SITE_DEFAULTS);

  // Lecture du cookie reportée après hydratation pour éviter tout mismatch serveur/client.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydratation : lecture cookie côté client uniquement
    setVisible(readCookieConsent() === null);
  }, []);

  const setConsent = (value: 'accepted' | 'rejected') => {
    writeCookieConsent(value);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] px-3 pb-3 sm:px-4 sm:pb-4" role="dialog" aria-label={c.cookie_title}>
      <div className="mx-auto max-w-5xl rounded-2xl border border-stone-200 bg-white shadow-2xl">
        <div className="p-4 md:p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-eucalyptus font-semibold mb-1.5 sm:mb-2">
            {c.cookie_title}
          </p>
          <p className="text-[13px] sm:text-sm md:text-base text-charcoal/85 leading-snug sm:leading-relaxed">
            {c.cookie_text}
          </p>
          <p className="text-xs sm:text-sm mt-2 sm:mt-3 text-charcoal/75">
            {c.cookie_details}{' '}
            <Link
              href="/politique-confidentialite"
              className="text-eucalyptus hover:text-teal transition font-medium"
            >
              {c.cookie_privacy_link}
            </Link>{' '}
            {c.cookie_and}{' '}
            <Link
              href="/mentions-legales"
              className="text-eucalyptus hover:text-teal transition font-medium"
            >
              {c.cookie_legal_link}
            </Link>
            .
          </p>
          <div className="mt-3 sm:mt-5 flex flex-row gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setConsent('rejected')}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-lg border border-stone-300 text-sm sm:text-base text-charcoal hover:border-stone-400 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eucalyptus"
            >
              {c.cookie_refuse}
            </button>
            <button
              type="button"
              onClick={() => setConsent('accepted')}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-lg bg-eucalyptus text-sm sm:text-base text-white font-medium hover:bg-eucalyptus/90 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eucalyptus"
            >
              {c.cookie_accept}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

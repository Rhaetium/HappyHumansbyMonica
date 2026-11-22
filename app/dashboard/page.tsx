'use client';

import { safeHref } from '@/lib/safe-href'
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/components/AuthProvider';
import { trackEvent } from '@/lib/analytics';
import { useCmsContent } from '@/hooks/useCmsContent';
import { COMPTE_DEFAULTS } from '@/lib/cms-defaults/compte';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const c = useCmsContent('compte', COMPTE_DEFAULTS);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth/login?next=/dashboard');
      return;
    }

    trackEvent('view_dashboard', { source: 'espace_client' });
  }, [loading, user, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f7f2e9] via-white to-[color:var(--hh-bg)]">
      <Header />

      <section className="pt-28 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-12">
            <div>
              <p className="text-xs tracking-[0.16em] uppercase text-[#8d5d2f] mb-2">{c.get('compte_badge')}</p>
              <h1 className="text-3xl md:text-4xl font-serif text-stone-900">{c.dash_welcome}{user?.email ? `, ${user.email.split('@')[0]}` : ''}</h1>
              <p className="text-stone-600 mt-2">
                {c.get('dash_subtitle', undefined, { multiline: true })}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="self-start sm:self-auto px-5 py-2.5 rounded-full border border-stone-300 text-stone-700 hover:border-[color:var(--hh-primary)] hover:text-[color:var(--hh-primary)] transition"
            >
              {c.get('dash_signout')}
            </button>
          </div>

          {/* Ressources */}
          <div className="mb-10">
            <h2 className="text-xl font-serif text-stone-900 mb-6">{c.get('dash_resources_title')}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-stone-200 p-6">
                <div className="w-10 h-10 rounded-full bg-[color:color-mix(in_srgb,var(--hh-primary)_10%,transparent)] flex items-center justify-center mb-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--hh-primary)" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-stone-900 mb-2">{c.get('dash_test_title')}</h3>
                <p className="text-sm text-stone-600 mb-4">
                  {c.get('dash_test_text', undefined, { multiline: true })}
                </p>
                <Link
                  href={safeHref(c.dash_test_cta_href, '/test-attachement')}
                  className="inline-flex items-center text-sm font-medium text-[color:var(--hh-primary)] hover:underline"
                >
                  {c.get('dash_test_cta')}
                </Link>
              </div>

              <div className="bg-white rounded-2xl border border-stone-200 p-6">
                <div className="w-10 h-10 rounded-full bg-[#8d5d2f]/10 flex items-center justify-center mb-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8d5d2f" strokeWidth="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-stone-900 mb-2">{c.get('dash_relations_title')}</h3>
                <p className="text-sm text-stone-600 mb-4">
                  {c.get('dash_relations_text', undefined, { multiline: true })}
                </p>
                <Link
                  href={safeHref(c.dash_relations_cta_href, '/relations')}
                  className="inline-flex items-center text-sm font-medium text-[#8d5d2f] hover:underline"
                >
                  {c.get('dash_relations_cta')}
                </Link>
              </div>
            </div>
          </div>

          {/* Prochaines étapes */}
          <div className="bg-white rounded-2xl border border-stone-200 p-8">
            <h2 className="text-xl font-serif text-stone-900 mb-4">{c.get('dash_next_title')}</h2>
            <p className="text-stone-600 mb-6">
              {c.get('dash_next_text', undefined, { multiline: true })}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href={safeHref(c.dash_contact_cta_href, '/contact')}
                className="inline-flex items-center px-6 py-3 rounded-full bg-[color:var(--hh-primary)] text-white font-medium hover:bg-[#275a52] transition"
              >
                {c.get('dash_contact_cta')}
              </Link>
              <Link
                href={safeHref(c.dash_coaching_cta_href, '/coaching')}
                className="inline-flex items-center px-6 py-3 rounded-full border border-stone-300 text-stone-700 font-medium hover:border-[color:var(--hh-primary)] hover:text-[color:var(--hh-primary)] transition"
              >
                {c.get('dash_coaching_cta')}
              </Link>
            </div>
          </div>

          {/* Contact rapide */}
          <div className="mt-8 text-center">
            <p className="text-sm text-stone-500">
              {c.get('dash_help_text')}{' '}
              <a href={`mailto:${c.dash_email}`} className="text-[color:var(--hh-primary)] hover:underline">
                {c.dash_email}
              </a>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

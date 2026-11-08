'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCmsContent } from '@/hooks/useCmsContent';
import { UI_LABELS } from '@/lib/ui-labels';
import { FIL_ARIANE_DEFAULTS } from '@/lib/cms-defaults/fil-ariane';
import { buildCrumbs, isBreadcrumbHidden } from '@/lib/breadcrumb';

/**
 * Fil d'Ariane de tout le site.
 *
 * Affiché par l'en-tête (components/Header.tsx) sur toutes les pages sauf l'accueil.
 * Les libellés, le libellé de départ et l'affichage général se règlent dans
 * l'admin → « 🔗 Fil d'Ariane » (page CMS « fil-ariane »). L'adresse de chaque
 * étape est déduite du chemin : aucune saisie technique n'est nécessaire.
 */
export default function Breadcrumb() {
  const pathname = usePathname() || '/';
  const c = useCmsContent('fil-ariane', FIL_ARIANE_DEFAULTS);

  if (isBreadcrumbHidden(c.bc_enabled, pathname)) return null;

  // Libellés réglables, un par page du site (voir lib/cms-defaults/fil-ariane.ts)
  const labels: Record<string, string> = {
    '/a-propos': c.bc_a_propos,
    '/coaching': c.bc_coaching,
    '/entreprises': c.bc_entreprises,
    '/happiness-design': c.bc_happiness_design,
    '/relations': c.bc_relations,
    '/sparring-partner': c.bc_sparring_partner,
    '/booking': c.bc_booking,
    '/contact': c.bc_contact,
    '/blog': c.bc_blog,
    '/faq': c.bc_faq,
    '/merci': c.bc_merci,
    '/mentions-legales': c.bc_mentions_legales,
    '/politique-confidentialite': c.bc_politique_confidentialite,
    '/temoignages': c.bc_temoignages,
    '/test-attachement': c.bc_test_attachement,
  };

  const crumbs = buildCrumbs(pathname, c.bc_home_label, labels);
  if (crumbs.length < 2) return null;

  return (
    <nav aria-label={UI_LABELS.breadcrumb} className="hh-crumb mt-[72px] border-b border-stone-100 bg-stone-50/80 px-4 py-3 backdrop-blur-sm md:px-6">
      <div className="mx-auto max-w-7xl">
        <ol className="no-scrollbar flex items-center gap-1.5 overflow-x-auto text-xs md:text-sm">
          {crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1;
            return (
              <li key={crumb.href} className="flex items-center gap-1.5 whitespace-nowrap">
                {index > 0 && (
                  <svg aria-hidden="true" className="h-3 w-3 flex-shrink-0 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                {last ? (
                  <span aria-current="page" className="font-medium text-stone-500">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href} className="text-stone-400 transition-colors hover:text-amber-700">
                    {crumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

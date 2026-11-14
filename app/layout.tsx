import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import CookieConsentBanner from '@/components/CookieConsentBanner';
import DynamicFavicon from '@/components/DynamicFavicon';
import MaintenanceGate from '@/components/MaintenanceGate';
import { InlineEditProvider } from '@/contexts/InlineEditContext';
import InlineEditor from '@/components/InlineEditor';
import { getKvSettings } from '@/lib/cms-settings-server';
import { DEFAULT_CONTACT_EMAIL } from '@/lib/site-contact';
import { DEFAULT_PROFILES } from '@/lib/site-social';
import {
  DEFAULT_PERSON_JOB_TITLE,
  DEFAULT_PERSON_NAME,
  DEFAULT_SEO_KEYWORDS,
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_TITLE,
  parseKeywords,
} from '@/lib/site-seo';
import { extractVerificationToken } from '@/lib/search-console';
import { SITE_URL } from '@/lib/site-url';
import { buildThemeCSS, resolveTheme, GOOGLE_FONTS_HREF } from '@/lib/themes';
import DuotoneFilter from '@/components/DuotoneFilter';
import CmsServerContent from '@/components/CmsServerContent';
import { SITE_DEFAULTS } from '@/lib/cms-defaults/site';
import { FOOTER_DEFAULTS } from '@/lib/cms-defaults/footer';
import { FIL_ARIANE_DEFAULTS } from '@/lib/cms-defaults/fil-ariane';


export const viewport: Viewport = {
  themeColor: '#2d5f54',
};

const DEFAULT_TITLE = DEFAULT_SITE_TITLE;
const DEFAULT_DESCRIPTION = DEFAULT_SITE_DESCRIPTION;

// SEO global piloté par le CMS (Paramètres → SEO global), avec fallback
export async function generateMetadata(): Promise<Metadata> {
  const kv = await getKvSettings();
  const seoTitle = kv.seo_title || DEFAULT_TITLE;
  const seoDescription = kv.seo_description || DEFAULT_DESCRIPTION;
  const ogImage = kv.og_image || '/og-images/og-default.svg';
  const personName = kv.geo_person_name || DEFAULT_PERSON_NAME;
  const keywords = parseKeywords(kv.seo_keywords);
  // Google Search Console : Monica colle la balise fournie par Google, on n'en garde que le jeton.
  const googleVerification = extractVerificationToken(kv.gsc_verification);

  return {
    ...baseMetadata,
    title: {
      default: seoTitle,
      template: '%s | Happy Humans',
    },
    description: seoDescription,
    keywords,
    authors: [{ name: personName, url: SITE_URL }],
    creator: personName,
    ...(googleVerification ? { verification: { google: googleVerification } } : {}),
    openGraph: {
      ...baseMetadata.openGraph,
      title: seoTitle,
      description: seoDescription,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: seoTitle,
        },
      ],
    },
    twitter: {
      ...baseMetadata.twitter,
      title: seoTitle,
      description: seoDescription,
      images: [ogImage],
    },
  };
}

const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: '%s | Happy Humans',
  },
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_SEO_KEYWORDS,
  authors: [{ name: DEFAULT_PERSON_NAME, url: SITE_URL }],
  creator: DEFAULT_PERSON_NAME,
  publisher: 'Happy Humans',
  icons: {
    icon: [
      { url: '/og-images/og-default.svg' },
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    other: [
      { rel: 'android-chrome-192x192', url: '/android-chrome-192x192.png' },
      { rel: 'android-chrome-512x512', url: '/android-chrome-512x512.png' },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: SITE_URL,
    siteName: 'Happy Humans',
    title: 'Happy Humans — Monica Schneider',
    description:
      "Accompagnement individuel et collectif pour managers, dirigeants et entreprises en quête d'alignement, de clarté et de transformation durable.",
    images: [
      {
        url: '/og-images/og-default.svg',
        width: 1200,
        height: 630,
        alt: 'Happy Humans - coaching et transformation avec Monica Schneider',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Happy Humans | Coaching & transformation avec Monica Schneider',
    description:
      'Executive coaching, philosophical counselling et accompagnement des entreprises avec Monica Schneider.',
    images: ['/og-images/og-default.svg'],
  },
};

// Schemas JSON-LD — enrichis par les réglages Géo du CMS (Paramètres → Géo & Business)
function buildSchemas(kv: Record<string, string>) {
  const businessName = kv.geo_business_name || 'Happy Humans - Monica Schneider';
  const siteName = kv.site_name || 'Happy Humans';
  const locale = kv.geo_default_locale || 'fr-FR';
  const address = kv.geo_address || 'Paris, France';
  const [locality, country] = address.split(',').map(s => s.trim());
  const geo = kv.geo_lat && kv.geo_lng
    ? { '@type': 'GeoCoordinates', latitude: kv.geo_lat, longitude: kv.geo_lng }
    : undefined;
  const areaServed = (kv.geo_service_area || 'Paris, France, Europe')
    .split(',').map(s => s.trim()).filter(Boolean);

  // Profils publics : réglés dans ⚙️ Paramètres → Réseaux sociaux (jamais écrits en dur ici).
  const profiles = [kv.linkedin_url, kv.instagram_url, kv.facebook_url, kv.personal_site_url].filter(
    (url): url is string => Boolean(url && url.trim()),
  );

  const schemaWebSite = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    alternateName: businessName,
    url: SITE_URL,
    description: 'Plateforme de coaching et de transformation portée par Monica Schneider.',
    inLanguage: locale,
  };

  const schemaOrganization = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: businessName,
    url: SITE_URL,
    logo: `${SITE_URL}/og-images/og-default.svg`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: locality || 'Paris',
      addressCountry: country || 'France',
    },
    ...(geo ? { geo } : {}),
    areaServed,
    ...(kv.geo_price_range ? { priceRange: kv.geo_price_range } : {}),
    sameAs: profiles.length ? profiles : DEFAULT_PROFILES,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      // adresse réglée dans ⚙️ Paramètres → Général, repli si elle n'est pas encore enregistrée
      email: kv.contact_email || DEFAULT_CONTACT_EMAIL,
      availableLanguage: ['French', 'English', 'Romanian'],
    },
  };

  const schemaPerson = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: kv.geo_person_name || DEFAULT_PERSON_NAME,
    jobTitle: kv.geo_person_job_title || DEFAULT_PERSON_JOB_TITLE,
    url: SITE_URL,
    image: `${SITE_URL}/og-default.jpg`,
    ...(locality ? { workLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: locality } } } : {}),
    sameAs: profiles.length ? profiles : DEFAULT_PROFILES,
    knowsLanguage: ['fr', 'en', 'ro'],
    worksFor: {
      '@type': 'Organization',
      name: siteName,
    },
  };

  return { schemaWebSite, schemaOrganization, schemaPerson };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const kv = await getKvSettings();
  const { schemaWebSite, schemaOrganization, schemaPerson } = buildSchemas(kv);
  // Thème SSR : preset + surcharges publiés, injectés dans <head> (zéro flash).
  // Sans Supabase : repli sur le preset par défaut (forest).
  const { id: themeId, tokens: themeTokens } = resolveTheme(kv.theme_preset, {
    primary: kv.theme_primary, dark: kv.theme_dark, light: kv.theme_light,
    accent: kv.theme_accent, bg: kv.theme_bg, bgCard: kv.theme_bg_card, text: kv.theme_text,
    fontHeading: kv.theme_font_heading, fontBody: kv.theme_font_body,
  });
  return (
    <html lang="fr" data-theme={themeId}>
      <head>
        <style id="hh-theme-ssr" dangerouslySetInnerHTML={{ __html: buildThemeCSS(themeTokens) }} />
        <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 44 44'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%232d5f54'/%3E%3Cstop offset='100%25' stop-color='%233d7a72'/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx='22' cy='22' r='20' fill='url(%23g)'/%3E%3Cg stroke='white' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='11' y='13' width='22' height='20' rx='3'/%3E%3Cline x1='11' y1='19' x2='33' y2='19'/%3E%3Cline x1='16' y1='9' x2='16' y2='15'/%3E%3Cline x1='28' y1='9' x2='28' y2='15'/%3E%3Cpath d='M17 26L20 29L27 22' stroke-width='2'/%3E%3C/g%3E%3C/svg%3E" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={GOOGLE_FONTS_HREF} rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaWebSite) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrganization) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaPerson) }}
        />
      </head>
      <body>
        <DuotoneFilter />
        <MaintenanceGate>
          <InlineEditProvider>
            <AuthProvider>
              <DynamicFavicon />
              {/* Textes partagés (bandeau cookies, pied de page, fil d'Ariane) lus sur le serveur : présents dans le HTML */}
              <CmsServerContent pages={{ site: SITE_DEFAULTS, footer: FOOTER_DEFAULTS, 'fil-ariane': FIL_ARIANE_DEFAULTS }}>
                {children}
                <CookieConsentBanner />
              </CmsServerContent>
              <InlineEditor />
            </AuthProvider>
          </InlineEditProvider>
        </MaintenanceGate>
      </body>
    </html>
  );
}

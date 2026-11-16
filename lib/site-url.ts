/**
 * URL publique du site : base des URL canoniques, du sitemap, de robots.txt et des liens dans les e-mails.
 *
 * Adresse officielle : https://happyhumans.fr (valeur par défaut ci-dessous).
 * La variable d'environnement NEXT_PUBLIC_SITE_URL (sans slash final) permet de la surcharger :
 * tout le site suit (canonicals, sitemap, robots, articles, e-mails).
 * Attention : si elle est définie dans Vercel/Netlify avec l'ancienne adresse *.vercel.app, la mettre à jour.
 */
export const DEFAULT_SITE_URL = 'https://happyhumans.fr'

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL).replace(/\/+$/, '')

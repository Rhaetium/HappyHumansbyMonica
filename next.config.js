/** @type {import('next').NextConfig} */

// Adresses du site : celle configurée (NEXT_PUBLIC_SITE_URL, comme lib/site-url.ts), l'adresse Vercel et le domaine
// officiel avec et sans « www ». Une image servie par l'une d'elles (ou après une redirection de l'une vers l'autre)
// doit rester autorisée, sinon elle disparaît du site au moment de changer de domaine.
const configuredHost = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SITE_URL || '').hostname } catch { return null }
})()
const OWN_HOSTS = [...new Set(['happyhumans.vercel.app', 'happyhumans.fr', 'www.happyhumans.fr', configuredHost].filter(Boolean))]

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://assets.calendly.com",
      "style-src 'self' 'unsafe-inline' https://api.fontshare.com https://fonts.googleapis.com https://assets.calendly.com",
      `img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co ${OWN_HOSTS.map(h => `https://${h}`).join(' ')} https://behold.pictures https://cdn2.behold.pictures https://*.calendly.com`,
      "font-src 'self' https://api.fontshare.com https://fonts.gstatic.com",
      "frame-src 'self' https://calendly.com https://*.calendly.com",
      "connect-src 'self' https://*.supabase.co https://api.perplexity.ai https://api.unsplash.com https://api.bufferapp.com https://calendly.com https://*.calendly.com",
      // 'self' (au lieu de 'none') : permet l'aperçu iframe du site dans /cms-admin
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig = {
  // Hôtes autorisés à charger les ressources du serveur de développement (aperçu cloud, tunnel).
  // Fourni par l'environnement de dev : aucun nom d'hôte propre à un poste n'est écrit ici.
  allowedDevOrigins: (process.env.NEXT_ALLOWED_DEV_ORIGINS || '')
    .split(',')
    .map(h => h.trim())
    .filter(Boolean),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2678400,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
      {
        protocol: 'https',
        hostname: 'd2xsxph8kpxj0f.cloudfront.net',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'heldonica.fr',
      },
      {
        protocol: 'https',
        hostname: 'www.heldonica.fr',
      },
      ...OWN_HOSTS.map(hostname => ({ protocol: 'https', hostname })),
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'behold.pictures',
      },
      {
        protocol: 'https',
        hostname: 'cdn2.behold.pictures',
      },
    ],
  },
  compress: true,
  staticPageGenerationTimeout: 300,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },

  async redirects() {
    return [
      { source: '/admin', destination: '/cms-admin', permanent: true },
      { source: '/admin/:path*', destination: '/cms-admin/:path*', permanent: true },
      { source: '/planifier', destination: '/coaching', permanent: true },
      { source: '/travel-planning', destination: '/coaching', permanent: true },
      { source: '/travel-planning-form', destination: '/contact', permanent: true },
      { source: '/hotel-consulting', destination: '/entreprises', permanent: true },
      { source: '/ai-hotellerie', destination: '/entreprises', permanent: true },
      { source: '/etudes-de-cas', destination: '/entreprises', permanent: true },
      // /blog est une vraie page — pas de redirect
      { source: '/destinations', destination: '/', permanent: true },
      { source: '/destinations/:path*', destination: '/', permanent: true },
      { source: '/slow-travel', destination: '/', permanent: true },
      // /temoignages est une vraie page — pas de redirect
      { source: '/travel-planner', destination: '/coaching', permanent: true },
      { source: '/travel-planner/', destination: '/coaching', permanent: true },
      { source: '/nos-services', destination: '/coaching', permanent: true },
      { source: '/nos-services/', destination: '/coaching', permanent: true },
      { source: '/sujets/bons-plans', destination: '/', permanent: true },
      { source: '/sujets/bons-plans/', destination: '/', permanent: true },
      { source: '/sujets/:slug', destination: '/', permanent: true },
      { source: '/etiquettes/:slug', destination: '/', permanent: true },
      { source: '/stoos-ridge-notre-aventure-sur-la-crete-panoramique-2', destination: '/', permanent: true },
    ];
  },
}

module.exports = nextConfig

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

const SESSION_DURATION_SECONDS = 60 * 60 * 8;
export const CMS_SESSION_COOKIE = 'happyhumans_cms_session';

type CmsAuthStatus = 'ok' | 'unauthorized' | 'misconfigured';

type CmsSessionPayload = {
  exp: number;
  iat: number;
  sid: string;
};

function getConfiguredPassword() {
  const password = process.env.CMS_PASSWORD?.trim();
  return password ? password : null;
}

function getSessionSecret() {
  const secret = process.env.CMS_SESSION_SECRET?.trim();
  return secret ? secret : getConfiguredPassword();
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value: string) {
  const padding = (4 - (value.length % 4)) % 4;
  const normalized = `${value}${'='.repeat(padding)}`
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  return Buffer.from(normalized, 'base64').toString('utf8');
}

function signSessionPayload(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

function createSessionToken(secret: string) {
  const now = Math.floor(Date.now() / 1000);
  const payload: CmsSessionPayload = {
    exp: now + SESSION_DURATION_SECONDS,
    iat: now,
    sid: randomBytes(16).toString('hex'),
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signSessionPayload(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

function parseSessionPayload(token: string, secret: string): CmsSessionPayload | null {
  const [encodedPayload, signature] = token.split('.');

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signSessionPayload(encodedPayload, secret);
  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<CmsSessionPayload>;

    if (
      typeof payload.exp !== 'number' ||
      !Number.isFinite(payload.exp) ||
      typeof payload.iat !== 'number' ||
      !Number.isFinite(payload.iat) ||
      typeof payload.sid !== 'string' ||
      payload.sid.length === 0
    ) {
      return null;
    }

    if (payload.iat > payload.exp) {
      return null;
    }

    if (Math.floor(Date.now() / 1000) >= payload.exp) {
      return null;
    }

    return {
      exp: payload.exp,
      iat: payload.iat,
      sid: payload.sid,
    };
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | null) {
  const cookies: Record<string, string> = {};

  if (!cookieHeader) {
    return cookies;
  }

  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');

    if (!rawName || rawValue.length === 0) {
      continue;
    }

    cookies[rawName] = decodeURIComponent(rawValue.join('='));
  }

  return cookies;
}

// ── Session d'édition en ligne (cookie « hh_cms_edit ») ──────────────────────────────────────────
// Le proxy émet ce cookie après validation du lien d'édition (jeton de 5 min généré par l'admin) : c'est un jeton
// SIGNÉ (HMAC-SHA256) valable 2 h, httpOnly. Avant, le cookie valait simplement « 1 » et n'importe quel visiteur
// pouvait le fabriquer pour écrire en ligne et lire toutes les données du CMS : il est désormais vérifié ici.
export const CMS_EDIT_COOKIE = 'hh_cms_edit';
export const CMS_EDIT_UI_COOKIE = 'hh_cms_ui'; // simple indicateur d'affichage (bouton « Éditer »), ne donne AUCUN accès

// Même ordre de repli que app/api/cms/generate-edit-token et proxy.ts
function getEditSecret() {
  return (
    process.env.CMS_HMAC_SECRET?.trim() ||
    process.env.CMS_SESSION_SECRET?.trim() ||
    process.env.CMS_PASSWORD?.trim() ||
    null
  );
}

export function verifyEditSession(token: string | null | undefined): boolean {
  const secret = getEditSecret();
  if (!secret || !token) return false;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return false;
  if (!safeEqual(signature, signSessionPayload(encoded, secret))) return false;
  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as { kind?: unknown; exp?: unknown };
    // kind : un lien d'édition de 5 min (sans kind) ne peut pas servir de session
    return payload.kind === 'edit-session' && typeof payload.exp === 'number' && Math.floor(Date.now() / 1000) < payload.exp;
  } catch {
    return false;
  }
}

export function getCmsSessionToken() {
  const secret = getSessionSecret();
  return secret ? createSessionToken(secret) : null;
}

export function getCurrentSessionToken(req: Request): string | null {
  const secret = getSessionSecret();
  if (!secret) return null;
  const cookies = parseCookies(req.headers.get('cookie'));
  const sessionCookie = cookies[CMS_SESSION_COOKIE];
  if (!sessionCookie) return null;
  if (!parseSessionPayload(sessionCookie, secret)) return null;
  return sessionCookie;
}

export function isValidCmsPassword(candidate: string | null | undefined) {
  const password = getConfiguredPassword();

  if (!password || !candidate) {
    return false;
  }

  return safeEqual(candidate, password);
}

export function getCmsAuthStatus(req: Request): CmsAuthStatus {
  const password = getConfiguredPassword();

  if (!password) {
    return 'misconfigured';
  }

  // Le mot de passe n'est vérifié qu'à la connexion (POST /api/cms/auth). Avant, chaque route d'admin
  // acceptait aussi le mot de passe en clair dans un en-tête « x-cms-auth » : autant de portes pour le deviner.
  const secret = getSessionSecret();
  const cookies = parseCookies(req.headers.get('cookie'));
  const sessionCookie = cookies[CMS_SESSION_COOKIE];

  if (secret && sessionCookie && parseSessionPayload(sessionCookie, secret)) {
    return 'ok';
  }

  // Session d'édition en ligne : jeton signé posé par le proxy après validation du lien d'édition
  if (verifyEditSession(cookies[CMS_EDIT_COOKIE])) {
    return 'ok';
  }

  return 'unauthorized';
}

export function requireCmsAuth(req: Request) {
  const status = getCmsAuthStatus(req);

  if (status === 'ok') {
    return null;
  }

  if (status === 'misconfigured') {
    return NextResponse.json(
      { error: 'CMS non configuré : variable CMS_PASSWORD manquante.' },
      { status: 503 }
    );
  }

  return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
}

export function createCmsSessionResponse() {
  const sessionToken = getCmsSessionToken();

  if (!sessionToken) {
    return NextResponse.json(
      { error: 'CMS non configuré : variable CMS_PASSWORD manquante.' },
      { status: 503 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: CMS_SESSION_COOKIE,
    value: sessionToken,
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  });

  return response;
}

export function clearCmsSessionResponse(
  status = 200,
  body: Record<string, unknown> = { ok: true }
) {
  const response = NextResponse.json(body, { status });
  response.cookies.set({
    name: CMS_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });

  return response;
}

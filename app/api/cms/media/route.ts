import { NextRequest, NextResponse } from 'next/server';
import { requireCmsAuth } from '@/lib/cms-auth';
import { getSupabaseServer } from '@/lib/supabase-server';
import { NOT_AN_IMAGE_MESSAGE, sniffImage } from '@/lib/image-sniff';
import { lookup } from 'node:dns/promises';
import { checkPublicHttpsUrl, isPrivateIp } from '@/lib/safe-url';

const MAX_REDIRECTS = 3;

/** Télécharge une image distante sans jamais atteindre un serveur interne (SSRF). */
async function fetchPublicImage(
  start: string,
  maxBytes: number,
): Promise<{ ok: true; buffer: Buffer } | { ok: false; error: string }> {
  let current = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const verdict = checkPublicHttpsUrl(current);
    if (!verdict.ok) return { ok: false, error: verdict.reason };
    try {
      // Le nom doit pointer vers des adresses publiques (un nom peut cacher une IP interne)
      const addresses = await lookup(verdict.url.hostname, { all: true });
      if (addresses.length === 0 || addresses.some(a => isPrivateIp(a.address))) {
        return { ok: false, error: 'Adresse réseau interne refusée.' };
      }
      const res = await fetch(verdict.url, { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
      if (res.status >= 300 && res.status < 400) {
        const next = res.headers.get('location');
        if (!next) break;
        current = new URL(next, verdict.url).toString();
        continue;
      }
      if (!res.ok) return { ok: false, error: 'Impossible de télécharger l\'image depuis cette URL' };
      const declared = Number(res.headers.get('content-length') || 0);
      if (declared > maxBytes) return { ok: false, error: 'Image trop volumineuse (max 10 Mo)' };
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > maxBytes) return { ok: false, error: 'Image trop volumineuse (max 10 Mo)' };
      return { ok: true, buffer };
    } catch {
      return { ok: false, error: 'Impossible de télécharger l\'image depuis cette URL' };
    }
  }
  return { ok: false, error: 'Trop de redirections.' };
}

export const dynamic = 'force-dynamic';

function getSupabase() {
  return getSupabaseServer();
}

// GET /api/cms/media?prefix=articles — list files in bucket
export async function GET(req: NextRequest) {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 });
  const authError = requireCmsAuth(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const prefix = searchParams.get('prefix') || '';

  const { data, error } = await sb.storage
    .from('cms-assets')
    .list(prefix || undefined, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const files = (data || [])
    .filter(f => f.id && f.name)
    .map(f => {
      const { data: publicData } = sb.storage.from('cms-assets').getPublicUrl(
        prefix ? `${prefix}/${f.name}` : f.name
      );
      return {
        key: prefix ? `${prefix}/${f.name}` : f.name,
        name: f.name,
        url: publicData.publicUrl,
        size: f.metadata?.size,
        lastModified: f.updated_at,
      };
    });

  return NextResponse.json({ files });
}

// POST /api/cms/media — import image from URL
export async function POST(req: NextRequest) {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 });
  const authError = requireCmsAuth(req);
  if (authError) return authError;

  try {
    const { imageUrl, filename, folder = 'articles' } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'URL manquante' }, { status: 400 });
    }

    // Téléchargement protégé : adresse publique en https seulement, redirections revérifiées une à une
    const maxSize = 10 * 1024 * 1024; // 10 Mo
    const fetched = await fetchPublicImage(String(imageUrl), maxSize);
    if (!fetched.ok) return NextResponse.json({ error: fetched.error }, { status: 400 });
    const buffer = fetched.buffer;
    // Type lu dans le contenu du fichier (pas l'en-tête du site distant) ; SVG refusé
    const image = sniffImage(buffer);
    if (!image) return NextResponse.json({ error: NOT_AN_IMAGE_MESSAGE }, { status: 400 });
    const contentType = image.contentType;

    const safeName = (filename || 'import.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${folder}/${Date.now()}-${safeName}`;

    const { error } = await sb.storage
      .from('cms-assets')
      .upload(fileName, buffer, { contentType, upsert: false });

    if (error) {
      return NextResponse.json({ error: `Échec de l'import: ${error.message}` }, { status: 500 });
    }

    const { data: publicData } = sb.storage.from('cms-assets').getPublicUrl(fileName);

    return NextResponse.json({ url: publicData.publicUrl });
  } catch (err) {
    console.error('Import exception:', err);
    return NextResponse.json({ error: 'Erreur lors de l\'import' }, { status: 500 });
  }
}

// DELETE /api/cms/media — delete a file
export async function DELETE(req: NextRequest) {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 });
  const authError = requireCmsAuth(req);
  if (authError) return authError;

  try {
    const { key } = await req.json();

    if (!key) {
      return NextResponse.json({ error: 'Clé manquante' }, { status: 400 });
    }

    const { error } = await sb.storage.from('cms-assets').remove([key]);

    if (error) {
      return NextResponse.json({ error: `Échec de la suppression: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete exception:', err);
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireCmsAuth } from '@/lib/cms-auth';
import { getSupabaseServer } from '@/lib/supabase-server';
import { NOT_AN_IMAGE_MESSAGE, sniffImage } from '@/lib/image-sniff';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authError = requireCmsAuth(req);
  if (authError) return authError;

  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string | null) || 'articles';

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024; // 10 Mo
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo)' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // Type lu dans le contenu du fichier (pas celui annoncé) ; SVG refusé
    const image = sniffImage(buffer);
    if (!image) return NextResponse.json({ error: NOT_AN_IMAGE_MESSAGE }, { status: 400 });

    const baseName = file.name.replace(/\.[^.]*$/, '').replace(/[^a-zA-Z0-9._-]/g, '_') || 'image';
    const fileName = `${folder}/${Date.now()}-${baseName}.${image.ext}`;

    // le « bucket » de stockage est créé au premier envoi s'il n'existe pas encore
    const { error: bucketError } = await sb.storage.getBucket('cms-assets');
    if (bucketError) await sb.storage.createBucket('cms-assets', { public: true });

    const { error } = await sb.storage
      .from('cms-assets')
      .upload(fileName, buffer, {
        contentType: image.contentType,
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ error: `Échec de l'upload: ${error.message}` }, { status: 500 });
    }

    const { data: publicData } = sb.storage.from('cms-assets').getPublicUrl(fileName);

    return NextResponse.json({ url: publicData.publicUrl });
  } catch (err) {
    console.error('Upload exception:', err);
    return NextResponse.json({ error: 'Erreur lors de l\'upload' }, { status: 500 });
  }
}

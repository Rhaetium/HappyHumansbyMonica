'use client';
import { useRef, useState } from 'react';
import { useOptionalInlineEdit } from '@/contexts/InlineEditContext';
import { uploadImage } from '@/lib/upload-client';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { unsplashSrcSet } from '@/lib/image-srcset';

type EditableImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  /** Page du CMS et champ « image » qui contiennent l'adresse de la photo */
  page: string;
  fieldKey: string;
  src: string;
  /**
   * 'cover' : photo de fond d'un bandeau (position absolue dans une section) — le bouton se place dans le coin de la section.
   * 'block' : photo dans la page — elle est enveloppée dans un bloc relatif qui reprend ses classes de disposition.
   */
  variant?: 'cover' | 'block';
  /** Applique l'effet duotone vert/or de la marque (désactivable dans Paramètres → Thème & Couleurs). */
  duotone?: boolean;
};

// classes qui placent l'image dans une grille / un flex : elles doivent rester sur l'élément qui est enfant de la grille
const LAYOUT_CLASS = /^(?:[a-z]+:)*(?:order|col-span|col-start|row-span|row-start|self|justify-self|basis|grow|shrink|flex-1)(?:-|$)/;

/**
 * Photo modifiable directement sur la page : en mode « Éditer le site », un bouton « Changer la photo » ouvre le choix
 * du fichier, la photo est réduite puis envoyée, et s'affiche aussitôt ; elle est enregistrée avec les autres
 * modifications (brouillon, puis « Publier »). Hors mode édition, c'est une simple image.
 */
export default function EditableImage({ page, fieldKey, src, variant = 'block', duotone = false, className = '', alt = '', ...rest }: EditableImageProps) {
  const edit = useOptionalInlineEdit();
  const siteSettings = useSiteSettings();
  const tinted = duotone && siteSettings.photo_duotone !== 'false';
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pending = edit?.pendingChanges[page]?.[fieldKey];
  const shown = pending !== undefined && pending !== '' ? pending : src;
  const editing = !!edit?.isEditing;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target;
    const file = target.files?.[0];
    if (!file || !edit) return;
    setBusy(true);
    setError('');
    try {
      edit.updateField(page, fieldKey, await uploadImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible. Réessayez.');
    } finally {
      setBusy(false);
      target.value = '';
    }
  };

  const controls = editing && (
    <>
      <input ref={input} type="file" accept="image/*" hidden onChange={onFile} />
      <div className="absolute right-3 top-3 z-30 flex max-w-[80%] flex-col items-end gap-1" style={{ pointerEvents: 'auto' }}>
        <button
          type="button"
          disabled={busy}
          onClick={e => { e.preventDefault(); e.stopPropagation(); input.current?.click(); }}
          className="rounded-full border-2 border-dashed border-[#2d5f54] bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#2d5f54] shadow hover:bg-white disabled:opacity-60"
        >
          {busy ? 'Envoi en cours…' : '📷 Changer la photo'}
        </button>
        {error && <span className="rounded bg-red-600 px-2 py-1 text-xs text-white shadow">{error}</span>}
      </div>
    </>
  );

  // Tailles adaptées à l'écran pour les photos Unsplash (sinon un téléphone télécharge la version 1600 px).
  // Les attributs passés par la page (`loading`, `sizes`, `srcSet`…) restent prioritaires : ils sont placés après.
  const srcSet = unsplashSrcSet(shown);

  if (variant === 'cover') {
    // Photo de bandeau en haut de page = image principale : chargée en priorité, jamais différée
    return (
      <>
        <img
          src={shown}
          srcSet={srcSet}
          sizes={srcSet ? '100vw' : undefined}
          alt={alt}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className={`${className} ${tinted ? 'hh-duotone' : ''}`.trim()}
          {...rest}
        />
        {controls}
      </>
    );
  }

  const tokens = className.split(/\s+/).filter(Boolean);
  const wrapperClasses = tokens.filter(t => LAYOUT_CLASS.test(t)).join(' ');
  const imgClasses = tokens.filter(t => !LAYOUT_CLASS.test(t)).join(' ');
  return (
    <div className={`relative ${wrapperClasses}`.trim()}>
      {/* Photo dans la page : chargée seulement quand on s'en approche (économise le chargement initial) */}
      <img
        src={shown}
        srcSet={srcSet}
        sizes={srcSet ? '(min-width: 1024px) 800px, 100vw' : undefined}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`block ${imgClasses} ${tinted ? 'hh-duotone' : ''}`.trim()}
        {...rest}
      />
      {controls}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import CarouselBuilderModal from '@/components/cms/CarouselBuilderModal';
import { buildCarouselHtml, buildImageHtml } from '@/lib/carousel-html';

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onImageUpload?: (url: string) => void;
};

const TOOLS = [
  { cmd: 'bold',                icon: 'B',   title: 'Gras',             style: { fontWeight: 700 } },
  { cmd: 'italic',              icon: 'I',   title: 'Italique',         style: { fontStyle: 'italic' } },
  { cmd: 'underline',           icon: 'U',   title: 'Soulign\u00e9',   style: { textDecoration: 'underline' } },
  { cmd: 'separator' },
  { cmd: 'h2',                  icon: 'H2',  title: 'Titre 2' },
  { cmd: 'h3',                  icon: 'H3',  title: 'Titre 3' },
  { cmd: 'separator' },
  { cmd: 'insertUnorderedList', icon: '\u2261', title: 'Liste \u00e0 puces' },
  { cmd: 'insertOrderedList',   icon: '1.', title: 'Liste num\u00e9rot\u00e9e' },
  { cmd: 'separator' },
  { cmd: 'createLink',          icon: '\uD83D\uDD17', title: 'Lien' },
  { cmd: 'unlink',              icon: '\uD83D\uDEAB', title: 'Supprimer lien' },
  { cmd: 'separator' },
  { cmd: 'blockquote',          icon: '\u275D', title: 'Citation' },
  { cmd: 'separator' },
  { cmd: 'carousel',            icon: '\u25A6', title: 'Carrousel photo' },
  { cmd: 'separator' },
  { cmd: 'removeFormat',        icon: '\u2715', title: 'Effacer format' },
] as const;

export default function RichEditor({
  value,
  onChange,
  placeholder = "Commence \u00e0 \u00e9crire ton article ici\u2026",
  onImageUpload,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtml = useRef(value);
  const savedRangeRef = useRef<Range | null>(null);
  const [showCarouselBuilder, setShowCarouselBuilder] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
      lastHtml.current = value || '';
    }
  }, [value]);

  const saveSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      return;
    }

    savedRangeRef.current = range.cloneRange();
  };

  const restoreSelection = () => {
    const selection = window.getSelection();

    if (!selection || !savedRangeRef.current) {
      return false;
    }

    selection.removeAllRanges();
    selection.addRange(savedRangeRef.current);
    return true;
  };

  const exec = (cmd: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    saveSelection();
    if (cmd === 'h2' || cmd === 'h3') {
      document.execCommand('formatBlock', false, cmd);
    } else if (cmd === 'blockquote') {
      document.execCommand('formatBlock', false, 'blockquote');
    } else if (cmd === 'createLink') {
      const url = prompt('URL du lien :');
      if (url) document.execCommand('createLink', false, url);
    } else if (cmd === 'carousel') {
      setShowCarouselBuilder(true);
      return;
    } else {
      document.execCommand(cmd, false);
    }
    emitChange();
  };

  const emitChange = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    if (html !== lastHtml.current) {
      lastHtml.current = html;
      onChange(html);
    }
  };

  const insertHtml = (html: string) => {
    const editor = editorRef.current;
    if (!editor || !html) return;

    editor.focus();
    const restored = restoreSelection();
    const inserted = restored ? document.execCommand('insertHTML', false, html) : false;

    if (!inserted) {
      editor.insertAdjacentHTML('beforeend', html);
    }

    emitChange();
    saveSelection();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'articles');
    // Authentification : le cookie de session CMS, envoyé automatiquement (même origine).
    const res = await fetch('/api/cms/media-upload', {
      method: 'POST',
      body: fd,
    });
    const data = await res.json();
    if (data.url) {
      insertHtml(buildImageHtml(data.url));
      if (onImageUpload) onImageUpload(data.url);
    }
    e.target.value = '';
  };

  return (
    <div style={{ border: '1.5px solid #e0dbd5', borderRadius: '.75rem', overflow: 'hidden', background: '#faf9f7' }}>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '.25rem',
        padding: '.5rem .75rem', background: 'white',
        borderBottom: '1.5px solid #e8e3dc', alignItems: 'center',
      }}>
        {TOOLS.map((t, i) => {
          if (t.cmd === 'separator') return <span key={i} style={{ width: 1, height: 22, background: '#e0dbd5', margin: '0 .15rem' }} />;
          return (
            <button
              key={t.cmd}
              type="button"
              title={t.title}
              onMouseDown={e => { e.preventDefault(); exec(t.cmd as string); }}
              style={{
                padding: '.3rem .55rem', border: '1px solid transparent',
                borderRadius: '.35rem', background: 'none', cursor: 'pointer',
                fontSize: t.icon.length > 2 ? '.88rem' : '.85rem',
                fontWeight: 600, color: '#444', lineHeight: 1,
                ...(('style' in t ? t.style : {}) || {}),
                transition: 'all .15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f0ece6')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >{t.icon}</button>
          );
        })}
        <span style={{ width: 1, height: 22, background: '#e0dbd5', margin: '0 .15rem' }} />
        <label
          title="Ins\u00e9rer une image"
          onMouseDown={saveSelection}
          style={{ padding: '.3rem .55rem', border: '1px solid transparent', borderRadius: '.35rem', background: 'none', cursor: 'pointer', fontSize: '.88rem', color: '#444', lineHeight: 1 }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f0ece6')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          \uD83D\uDDBC\uFE0F
          <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
        </label>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={emitChange}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        data-placeholder={placeholder}
        style={{
          minHeight: 320, padding: '1.25rem', outline: 'none',
          fontSize: '1rem', lineHeight: 1.75, color: '#1a1a1a',
          fontFamily: 'system-ui, sans-serif',
        }}
      />

      <style>{`
        [contenteditable]:empty:before { content: attr(data-placeholder); color: #bbb; pointer-events: none; }
        [contenteditable] h2 { font-size: 1.4rem; font-weight: 700; margin: 1.2em 0 .5em; color: #2d5f54; }
        [contenteditable] h3 { font-size: 1.15rem; font-weight: 700; margin: 1em 0 .4em; color: #444; }
        [contenteditable] blockquote { border-left: 3px solid #d4a88a; margin: 1em 0; padding: .5em 1em; background: #faf3ee; color: #666; border-radius: 0 .5rem .5rem 0; font-style: italic; }
        [contenteditable] ul { list-style: disc; padding-left: 1.5em; margin: .5em 0; }
        [contenteditable] ol { list-style: decimal; padding-left: 1.5em; margin: .5em 0; }
        [contenteditable] a { color: #01696f; text-decoration: underline; }
        [contenteditable] img { max-width: 100%; border-radius: .5rem; margin: 1rem 0; }
        [contenteditable] p { margin: .5em 0; }
        [contenteditable] .happyhumans-carousel { margin: 1.4rem 0; border: 1px solid #ece3d8; border-radius: 1rem; overflow: hidden; background: #faf8f5; }
        [contenteditable] .happyhumans-carousel__slide { margin: 0; }
        [contenteditable] .happyhumans-carousel__slide img { margin: 0; width: 100%; display: block; aspect-ratio: 16 / 10; object-fit: cover; border-radius: 0; }
        [contenteditable] .happyhumans-carousel__controls { display: none; }
      `}</style>

      <CarouselBuilderModal
        isOpen={showCarouselBuilder}
        onClose={() => setShowCarouselBuilder(false)}
        onInsert={(urls) => {
          const carouselHtml = buildCarouselHtml(urls);
          insertHtml(carouselHtml);
          setShowCarouselBuilder(false);
        }}
      />
    </div>
  );
}

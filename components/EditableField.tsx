'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useInlineEdit } from '@/contexts/InlineEditContext';

type EditableFieldProps = {
  page: string;
  fieldKey: string;
  value: string;
  multiline?: boolean;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'div';
  style?: React.CSSProperties;
  className?: string;
};

const EDIT_OUTLINE = '2px dashed var(--hh-primary)';
const EDIT_BG = 'rgba(240,255,244,0.95)';

export default function EditableField({
  page, fieldKey, value, multiline = false,
  as: Tag = 'span', style, className,
}: EditableFieldProps) {
  const { isEditing, updateField, pendingChanges } = useInlineEdit();
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pending value overrides server value
  const pending = pendingChanges[page]?.[fieldKey];
  const displayValue = pending !== undefined ? pending : value;

  // Auto-resize textarea to fit content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [displayValue, focused]);

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (focused) {
      setTimeout(() => {
        if (multiline) textareaRef.current?.focus();
        else inputRef.current?.focus();
      }, 0);
    }
  }, [focused, multiline]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    e.stopPropagation();
    setFocused(true);
  }, [isEditing]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    updateField(page, fieldKey, e.target.value);
  }, [page, fieldKey, updateField]);

  const handleBlur = useCallback(() => {
    setFocused(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setFocused(false);
      textareaRef.current?.blur();
      inputRef.current?.blur();
    }
    // Ctrl+Enter closes the field (multiline)
    if (multiline && (e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      setFocused(false);
      textareaRef.current?.blur();
    }
  }, [multiline]);

  // Normal mode — plain render
  if (!isEditing) {
    return <Tag style={style} className={className}>{displayValue}</Tag>;
  }

  // Edit mode — field is focused: show real input/textarea
  if (focused) {
    const commonStyle: React.CSSProperties = {
      ...style,
      outline: EDIT_OUTLINE,
      border: 'none',
      borderRadius: '4px',
      padding: multiline ? '6px 8px' : '2px 6px',
      fontFamily: 'inherit',
      fontSize: 'inherit',
      fontWeight: 'inherit',
      lineHeight: 'inherit',
      color: 'inherit',
      background: EDIT_BG,
      boxSizing: 'border-box',
    };

    if (multiline) {
      return (
        <textarea
          ref={textareaRef}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            ...commonStyle,
            width: '100%',
            resize: 'none',
            overflow: 'hidden',
            display: 'block',
          }}
          rows={1}
          aria-label={`Modifier : ${fieldKey}`}
        />
      );
    }

    return (
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          ...commonStyle,
          width: '100%',
          display: 'inline-block',
        }}
        aria-label={`Modifier : ${fieldKey}`}
      />
    );
  }

  // Edit mode — not focused: highlight editable field
  const hasPendingChange = pending !== undefined && pending !== value;

  return (
    <Tag
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...style,
        cursor: 'text',
        borderRadius: '3px',
        outline: hovered ? EDIT_OUTLINE : '1px dashed rgba(45,95,84,0.3)',
        outlineOffset: '2px',
        background: hasPendingChange ? 'rgba(240,255,244,0.7)' : (hovered ? 'rgba(240,255,244,0.5)' : 'transparent'),
        transition: 'outline 0.15s, background 0.15s',
        position: 'relative',
        display: 'inline',
      }}
      className={className}
      title={hasPendingChange ? `✎ Modifié — cliquez pour éditer` : `✎ Cliquez pour modifier`}
    >
      {displayValue}
      {hasPendingChange && (
        <span style={{
          position: 'absolute',
          top: '-6px',
          right: '-6px',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#16a34a',
          border: '1.5px solid white',
          display: 'inline-block',
          flexShrink: 0,
        }} aria-hidden="true" />
      )}
    </Tag>
  );
}

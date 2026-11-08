'use client';

import { useState } from 'react';

interface BlogGeneratorProps {
  onGenerated?: (data: { title: string; excerpt: string; content: string; hashtags: string[]; suggestedSlug: string }) => void;
}

export default function BlogGenerator({ onGenerated }: BlogGeneratorProps) {
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState<'story' | 'guide' | 'list' | 'review'>('story');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    
    setIsGenerating(true);
    setError('');
    setResult(null);
    
    try {
      const response = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, style, length }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResult(data);
        onGenerated?.(data);
      } else {
        setError(data.error || 'Erreur de génération');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseContent = () => {
    if (result) {
      onGenerated?.(result);
    }
  };

  return (
    <div style={{ background: '#faf8f5', borderRadius: '1rem', padding: '1.5rem', border: '1.5px solid #e8e3dc' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '1rem', margin: '0 0 1rem' }}>
        ✨ Générateur d'articles Blog
      </h3>
      
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: '.85rem', color: '#555', marginBottom: '.35rem' }}>
          Sujet de l'article *
        </label>
        <input
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="Ex : Poser ses limites au travail, Retrouver de l'élan après un burn-out, Mieux communiquer en couple…"
          style={{ width: '100%', padding: '.65rem .9rem', border: '1.5px solid #e0dbd5', borderRadius: '.5rem', fontSize: '.88rem', background: '#fff' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '.85rem', color: '#555', marginBottom: '.35rem' }}>Style</label>
          <select
            value={style}
            onChange={e => setStyle(e.target.value as any)}
            style={{ width: '100%', padding: '.65rem .9rem', border: '1.5px solid #e0dbd5', borderRadius: '.5rem', fontSize: '.88rem', background: '#fff' }}
          >
            <option value="story">📖 Situation vécue + enseignements</option>
            <option value="guide">📋 Guide pratique</option>
            <option value="list">📝 Liste de conseils</option>
            <option value="review">💭 Réflexion</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '.85rem', color: '#555', marginBottom: '.35rem' }}>Longueur</label>
          <select
            value={length}
            onChange={e => setLength(e.target.value as any)}
            style={{ width: '100%', padding: '.65rem .9rem', border: '1.5px solid #e0dbd5', borderRadius: '.5rem', fontSize: '.88rem', background: '#fff' }}
          >
            <option value="short">Court (300-400 mots)</option>
            <option value="medium">Moyen (600-800 mots)</option>
            <option value="long">Long (1000-1200 mots)</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={isGenerating || !topic.trim()}
        style={{
          width: '100%', padding: '.75rem',
          background: isGenerating ? '#ccc' : '#01696f',
          color: 'white', border: 'none', borderRadius: '.5rem',
          cursor: isGenerating ? 'wait' : 'pointer',
          fontSize: '.9rem', fontWeight: 600,
          marginBottom: '1rem',
        }}
      >
        {isGenerating ? '⏳ Génération en cours...' : '✨ Générer mon article'}
      </button>

      {error && (
        <div style={{ background: '#fdecea', color: '#c0392b', padding: '.75rem', borderRadius: '.5rem', fontSize: '.85rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ background: '#fff', borderRadius: '.75rem', padding: '1rem', border: '1.5px solid #e8e3dc', maxHeight: 300, overflow: 'auto' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', margin: '0 0 .5rem' }}>{result.title}</h4>
          <p style={{ fontSize: '.85rem', color: '#666', marginBottom: '.75rem', fontStyle: 'italic' }}>{result.excerpt}</p>
          <div style={{ fontSize: '.8rem', color: '#888', whiteSpace: 'pre-wrap', marginBottom: '.75rem' }}>
            {result.content?.slice(0, 500)}...
          </div>
          {result.hashtags?.length > 0 && (
            <div style={{ fontSize: '.75rem', color: '#2d5f54' }}>
              {result.hashtags.slice(0, 8).join(' ')}
            </div>
          )}
          <button
            onClick={handleUseContent}
            style={{
              width: '100%', marginTop: '1rem', padding: '.5rem',
              background: '#2d5f54', color: 'white', border: 'none', borderRadius: '.4rem',
              cursor: 'pointer', fontSize: '.85rem', fontWeight: 600,
            }}
          >
            📥 Utiliser cet article
          </button>
        </div>
      )}
    </div>
  );
}
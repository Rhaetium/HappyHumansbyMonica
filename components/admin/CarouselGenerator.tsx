'use client';

import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface CarouselGeneratorProps {
  onComplete?: (carousel: any) => void;
}

export default function CarouselGenerator({ onComplete }: CarouselGeneratorProps) {
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    
    setIsGenerating(true);
    setError('');
    setResult(null);
    
    try {
      const response = await fetch('/api/carousel/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResult(data);
        onComplete?.(data);
      } else {
        setError(data.error || 'Erreur de génération');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!result) return;
    
    try {
      setIsGenerating(true);
      const zip = new JSZip();
      
      const contentText = `TITRE: ${result.title}

CAPTION:
${result.caption}

HASHTAGS:
${result.hashtags?.join(' ')}

SLIDES:
${result.slides?.map((s: any, i: number) => `
--- Slide ${i+1} ---
Titre: ${s.title}
Contenu: ${s.content}
`).join('\n')}

---
Généré avec Happy Humans CMS
`;
      
      zip.file('contenu.txt', contentText);
      
      // Add all images
      const allImages = result.images?.length > 0 ? result.images : (result.image ? [result.image] : []);
      for (let i = 0; i < allImages.length; i++) {
        try {
          const imgRes = await fetch(allImages[i]);
          const imgBlob = await imgRes.blob();
          zip.file(`image-${i+1}.jpg`, imgBlob);
        } catch {}
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `carousel-${result.title.replace(/\s+/g, '-').toLowerCase()}.zip`);
    } catch (err) {
      alert('Erreur lors de la création du ZIP');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">🎠 Générateur de Carrousel</h2>
      
      {/* Topic Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Sujet du carrousel</label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Ex : 5 signes qu'il est temps de ralentir"
          className="w-full px-3 py-2 border rounded-lg"
          disabled={isGenerating}
        />
      </div>
      
      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!topic.trim() || isGenerating}
        className="w-full px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <span className="animate-spin">⏳</span>
            <span>Génération en cours...</span>
          </>
        ) : (
          <>
            <span>✨</span>
            <span>Générer le carrousel</span>
          </>
        )}
      </button>
      
      {/* Error */}
      {error && (
        <div className="mt-3 p-2 bg-red-50 text-red-600 rounded text-sm">
          {error}
        </div>
      )}
      
      {/* Result */}
      {result && (
        <div className="mt-4 p-4 bg-green-50 rounded-lg">
          <h3 className="font-bold text-green-800 mb-2">✅ Carrousel généré!</h3>
          
          <div className="mb-3">
            <span className="text-sm font-medium">Titre:</span>
            <p className="text-lg font-bold">{result.title}</p>
          </div>
          
          <div className="mb-3">
            <span className="text-sm font-medium">Slides:</span>
            <ul className="mt-1 space-y-1">
              {result.slides?.map((slide: any, i: number) => (
                <li key={i} className="text-sm p-2 bg-white rounded">
                  <strong>{i + 1}. {slide.title}</strong>
                  <p className="text-gray-600">{slide.content}</p>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="mb-3">
            <span className="text-sm font-medium">Caption:</span>
            <p className="text-sm">{result.caption}</p>
          </div>
          
          <div className="mb-3">
            <span className="text-sm font-medium">Hashtags:</span>
            <p className="text-sm">{result.hashtags?.join(' ')}</p>
          </div>
          
          {result.images && result.images.length > 0 ? (
            <div className="mb-3">
              <span className="text-sm font-medium">Images ({result.images.length}):</span>
              <div className="grid grid-cols-5 gap-2 mt-1">
                {result.images.map((img: string, i: number) => (
                  <img key={i} src={img} alt={`Slide ${i+1}`} className="w-full h-20 object-cover rounded" />
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
              Pas de photos proposées : ajoutez une clé Unsplash gratuite dans Vercel (NEXT_PUBLIC_UNSPLASH_ACCESS_KEY) pour en avoir. Le texte, lui, est prêt.
            </div>
          )}
          
          <button
            onClick={handleDownloadZip}
            disabled={isGenerating}
            className="mt-3 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            📦 Télécharger ZIP (image + texte)
          </button>
          
          <button
            onClick={() => {
              const text = `TITRE: ${result.title}\n\nCAPTION:\n${result.caption}\n\nHASHTAGS:\n${result.hashtags?.join(' ')}\n\nSLIDES:\n${result.slides?.map((s: any, i: number) => `--- Slide ${i+1} ---\nTitre: ${s.title}\n${s.content}`).join('\n\n')}`;
              navigator.clipboard.writeText(text);
              alert('📋 Copié dans le presse-papier!');
            }}
            className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            📋 Copier le texte
          </button>
        </div>
      )}
    </div>
  );
}
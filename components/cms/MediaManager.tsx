'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function MediaManager({ data, onSave }: any) {
  const [media, setMedia] = useState(data?.media || []);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress('');

    const newMedia = [...media];

    // Authentification : le cookie de session CMS, envoyé automatiquement (même origine).
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Upload ${i + 1}/${files.length}...`);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/cms/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          let errorMsg = 'Erreur inconnue';
          try {
            const error = await response.json();
            errorMsg = error?.error || error?.message || `Erreur ${response.status}`;
          } catch (e) {
            errorMsg = `Erreur ${response.status}: ${response.statusText}`;
          }
          console.error('Upload failed:', response.status, errorMsg);
          alert(`Échec de l'upload pour ${file.name}: ${errorMsg}`);
          continue;
        }

        const result = await response.json();
        
        newMedia.push({
          id: `media-${Date.now()}-${i}`,
          name: file.name,
          type: file.type.startsWith('image') ? 'image' : 'video',
          url: result.url,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Upload error:', err);
        alert(`Erreur lors de l'upload de ${file.name}`);
      }
    }

    setMedia(newMedia);
    setUploading(false);
    setUploadProgress('');
  };

  const removeMedia = (id: string) => {
    setMedia(media.filter((m: any) => m.id !== id));
  };

  const handleSave = () => {
    onSave({
      ...data,
      media,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-serif font-bold text-mahogany mb-6">🖼️ Gestion des Médias</h2>

      {/* Upload */}
      <div className="mb-8 p-6 border-2 border-dashed border-eucalyptus rounded-lg bg-blue-50">
        <div className="text-center">
          <h3 className="font-bold text-mahogany mb-4">Télécharger des médias</h3>
          <Input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <Button
              as="label"
              className="bg-eucalyptus hover:bg-teal cursor-pointer"
              disabled={uploading}
            >
              {uploading ? '⏳ Téléchargement...' : '📤 Sélectionner des fichiers'}
            </Button>
          </label>
          <p className="text-sm text-gray-600 mt-2">
            Glissez-déposez vos images ou vidéos ici
          </p>
          {uploadProgress && (
            <p className="text-sm text-eucalyptus mt-2 font-medium">
              {uploadProgress}
            </p>
          )}
        </div>
      </div>

      {/* Galerie de médias */}
      <div>
        <h3 className="font-bold text-mahogany mb-4">Médias ({media.length})</h3>
        {media.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucun média téléchargé</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {media.map((item: any) => (
              <div key={item.id} className="relative group">
                <div className="bg-gray-100 rounded-lg overflow-hidden aspect-square flex items-center justify-center">
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <p className="text-2xl">🎥</p>
                      <p className="text-xs text-gray-600 mt-2">{item.name}</p>
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Button
                    onClick={() => removeMedia(item.id)}
                    variant="destructive"
                    size="sm"
                  >
                    Supprimer
                  </Button>
                </div>
                <p className="text-xs text-gray-600 mt-2 truncate">{item.name}</p>
                <p className="text-xs text-gray-500">
                  {(item.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Boutons d'action */}
      <div className="flex gap-4 mt-8">
        <Button onClick={handleSave} className="bg-mahogany hover:bg-red-900">
          💾 Sauvegarder
        </Button>
      </div>
    </div>
  );
}

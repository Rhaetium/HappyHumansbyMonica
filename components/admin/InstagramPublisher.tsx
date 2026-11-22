'use client';

import { useState } from 'react';
import { openBufferComposer } from '@/lib/buffer';
import { openPerplexityForCaption } from '@/lib/perplexity-caption';
import { searchUnsplash, getCredit, type UnsplashPhoto } from '@/lib/unsplash';

interface InstagramPostFormProps {
  onSuccess?: () => void;
}

export default function InstagramPublisher({ onSuccess }: InstagramPostFormProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UnsplashPhoto[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleBufferShare = () => {
    // Opens Buffer Composer - user adds image there
    openBufferComposer();
    setSuccess('✅ Buffer opened! Add your image, write caption, and click Publish.');
  };

  const handleSearchUnsplash = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setError(null);
    setSearchResults([]);
    
    try {
      const results = await searchUnsplash(searchQuery, 6);
      setSearchResults(results);
      
      if (results.length === 0) {
        setError('No photos found. Try a different search.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recherche impossible. Réessayez.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPhoto = (photo: UnsplashPhoto) => {
    setImageUrl(photo.urls.regular);
    // Add photographer credit to caption
    const credit = `\n\n📸 ${getCredit(photo)}`;
    setCaption(caption + credit);
    setSuccess('✅ Photo selected! Add your caption and publish.');
  };

  const handleGenerateCaption = () => {
    // Opens Perplexity to generate caption
    openPerplexityForCaption({ topic: caption || undefined });
    setSuccess('✅ Perplexity opened! Copy the generated caption and paste it above.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/instagram/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl, caption }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to post to Instagram');
        return;
      }

      setSuccess(`Posted successfully! View at: ${data.post?.permalink || 'N/A'}`);
      setImageUrl('');
      setCaption('');
      onSuccess?.();
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">📸 Publish to Instagram</h2>
      
      {/* Unsplash Search */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-2">🔍 Search Free Photos on Unsplash</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g., paris, travel, photography..."
            className="flex-1 px-3 py-2 border rounded-lg"
            onKeyDown={(e) => e.key === 'Enter' && handleSearchUnsplash()}
          />
          <button
            type="button"
            onClick={handleSearchUnsplash}
            disabled={isSearching}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
          >
            {isSearching ? '...' : 'Search'}
          </button>
        </div>
        
        {/* Search Results Grid */}
        {searchResults.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {searchResults.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => handleSelectPhoto(photo)}
                className="relative aspect-square overflow-hidden rounded group"
              >
                <img
                  src={photo.urls.small}
                  alt={photo.alt_description || 'Unsplash photo'}
                  className="w-full h-full object-cover group-hover:scale-110 transition"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                  <span className="text-white opacity-0 group-hover:opacity-100 text-xs">Select</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Image URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            required
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-600 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Caption <span className="text-red-500">*</span>
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write your caption..."
            required
            rows={4}
            maxLength={2200}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-600 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">{caption.length}/2200</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !imageUrl || !caption}
          className="w-full px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Publishing...' : '📸 Publish to Instagram'}
        </button>

        <button
          type="button"
          onClick={handleGenerateCaption}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          <span>🤖</span>
          <span>Generate caption with Perplexity</span>
        </button>

        <button
          type="button"
          onClick={handleBufferShare}
          className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 flex items-center justify-center gap-2"
        >
          <span>📱</span>
          <span>Prepare on Buffer (easier)</span>
        </button>
      </form>
    </div>
  );
}
/**
 * Instagram Graph API Integration for Happy Humans
 * 
 * This module provides functionality to publish content to Instagram via the Meta Graph API.
 * 
 * Prerequisites:
 * 1. Facebook Developer Account
 * 2. Instagram Business Account connected to a Facebook Page
 * 3. App created in Meta Developer Portal with Instagram permissions
 * 
 * Required Environment Variables:
 * - INSTAGRAM_ACCESS_TOKEN: Long-lived access token from Meta
 * - INSTAGRAM_BUSINESS_ACCOUNT_ID: Your Instagram Business Account ID
 */

export interface InstagramPost {
  id: string;
  caption: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROSEL_ALBUM';
  mediaUrl: string;
  permalink?: string;
  timestamp?: string;
}

export interface InstagramMediaContainer {
  id: string;
  status: 'OK' | 'ERROR' | 'PENDING';
}

import { loadConnectionEnv } from '@/lib/connections';

const INSTAGRAM_GRAPH_API_BASE = 'https://graph.facebook.com';

/**
 * Get the Instagram Graph API configuration
 */
async function getInstagramConfig() {
  // Vercel d'abord, sinon réglé dans l'admin (onglet Connexions)
  const cfg = await loadConnectionEnv();
  return {
    accessToken: cfg.INSTAGRAM_ACCESS_TOKEN,
    businessAccountId: cfg.INSTAGRAM_BUSINESS_ACCOUNT_ID,
  };
}

/**
 * Check if Instagram integration is configured
 */
export async function isInstagramConfigured(): Promise<boolean> {
  const config = await getInstagramConfig();
  return !!(config.accessToken && config.businessAccountId);
}

/**
 * Create a media container for publishing
 * This is the first step - you upload/describe the media before publishing
 */
export async function createMediaContainer(
  imageUrl: string,
  caption: string
): Promise<InstagramMediaContainer | null> {
  const config = await getInstagramConfig();
  
  if (!config.accessToken || !config.businessAccountId) {
    console.warn('Instagram not configured');
    return null;
  }

  try {
    const response = await fetch(
      `${INSTAGRAM_GRAPH_API_BASE}/${config.businessAccountId}/media`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: caption,
          access_token: config.accessToken,
        }),
      }
    );

    const data = await response.json();
    
    if (data.error) {
      console.error('Instagram API error:', data.error);
      return null;
    }

    return {
      id: data.id,
      status: 'OK',
    };
  } catch (error) {
    console.error('Failed to create Instagram media container:', error);
    return null;
  }
}

/**
 * Publish a media container
 * This is the second step - you publish the container created in step 1
 */
export async function publishMediaContainer(
  containerId: string
): Promise<InstagramPost | null> {
  const config = await getInstagramConfig();
  
  if (!config.accessToken || !config.businessAccountId) {
    return null;
  }

  try {
    const response = await fetch(
      `${INSTAGRAM_GRAPH_API_BASE}/${config.businessAccountId}/media_publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: config.accessToken,
        }),
      }
    );

    const data = await response.json();
    
    if (data.error) {
      console.error('Instagram publish error:', data.error);
      return null;
    }

    // Get the published post details
    const postResponse = await fetch(
      `${INSTAGRAM_GRAPH_API_BASE}/${data.id}`,
      {
        headers: {
          access_token: config.accessToken,
        },
      }
    );

    const postData = await postResponse.json();

    return {
      id: data.id,
      caption: postData.caption || '',
      mediaType: 'IMAGE',
      mediaUrl: postData.media_url || '',
      permalink: postData.permalink || '',
      timestamp: postData.timestamp || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to publish to Instagram:', error);
    return null;
  }
}

/**
 * Publish an image to Instagram (convenience function combining both steps)
 */
export async function postToInstagram(
  imageUrl: string,
  caption: string
): Promise<InstagramPost | null> {
  // Step 1: Create media container
  const container = await createMediaContainer(imageUrl, caption);
  
  if (!container) {
    console.error('Failed to create media container');
    return null;
  }

  // Step 2: Publish the container
  const published = await publishMediaContainer(container.id);
  
  return published;
}

/**
 * Get Instagram account profile information
 */
export async function getInstagramProfile() {
  const config = await getInstagramConfig();
  
  if (!config.accessToken || !config.businessAccountId) {
    return null;
  }

  try {
    const fields = 'id,username,account_type,media_count';
    const response = await fetch(
      `${INSTAGRAM_GRAPH_API_BASE}/me?fields=${fields}&access_token=${config.accessToken}`
    );

    return await response.json();
  } catch (error) {
    console.error('Failed to get Instagram profile:', error);
    return null;
  }
}

/**
 * Get recent media posts from Instagram
 */
export async function getRecentMedia(limit = 10) {
  const config = await getInstagramConfig();
  
  if (!config.accessToken) {
    return null;
  }

  try {
    const fields = 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count';
    const response = await fetch(
      `${INSTAGRAM_GRAPH_API_BASE}/me/media?fields=${fields}&access_token=${config.accessToken}&limit=${limit}`
    );

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Failed to get Instagram media:', error);
    return null;
  }
}
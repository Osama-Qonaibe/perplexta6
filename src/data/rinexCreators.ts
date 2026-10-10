// Rinex Creators & Marketplace Ecosystem Architecture
import { secureStorage } from '../lib/storage';

export interface RinexCreator {
  id: string;
  username: string;
  name: string;
  roleAr: string;
  roleEn: string;
  avatar: string;
  bioAr: string;
  bioEn: string;
  verified: boolean;
  totalViews: number;
  totalUses: number;
  rating: number;
  earningsBalance: number;
  followersCount: number;
  likesCount: number;
  profileVisitsCount: number;
  socialLinks: {
    twitter?: string;
    behance?: string;
    instagram?: string;
    website?: string;
  };
  email?: string;
  createdAt: number;
}

export interface MarketplaceTemplate {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorUsername: string;
  creatorAvatar: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  thumbnail: string;
  category: 'reels' | 'story' | 'marketing' | 'social' | 'youtube' | 'cards';
  categoryLabelAr: string;
  dimensions: string;
  priceType: 'free' | 'pro' | 'points';
  price: number; // 0 if free, or points/credits
  viewsCount: number;
  usesCount: number;
  rating: number;
  createdAt: number;
  elements?: any[];
  canvasBackground?: string;
  videoUrl?: string;
  previewVideoUrl?: string;
}

export interface CreatorPayoutRequest {
  id: string;
  creatorId: string;
  amount: number;
  method: string;
  details: string;
  status: 'pending' | 'completed' | 'rejected';
  requestedAt: number;
}

// Local helper to fetch with Bearer token
async function apiFetch(url: string, options: RequestInit = {}) {
  const token = secureStorage.getSync('app_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

// Map database snake_case keys back to camelCase frontend models
function mapCreatorToFrontend(c: any): RinexCreator {
  return {
    id: c.id,
    username: c.username,
    name: c.name,
    roleAr: c.role_ar,
    roleEn: c.role_en,
    avatar: c.avatar,
    bioAr: c.bio_ar,
    bioEn: c.bio_en,
    verified: c.verified,
    totalViews: c.total_views || 0,
    totalUses: c.total_uses || 0,
    rating: parseFloat(c.rating || '5.0'),
    earningsBalance: parseFloat(c.earnings_balance || '0'),
    followersCount: c.followers_count || 0,
    likesCount: c.likes_count || 0,
    profileVisitsCount: c.profile_visits_count || 0,
    socialLinks: typeof c.social_links === 'string' ? JSON.parse(c.social_links) : (c.social_links || {}),
    email: c.email || undefined,
    createdAt: new Date(c.created_at).getTime()
  };
}

function mapTemplateToFrontend(t: any): MarketplaceTemplate {
  const isRemotion = String(t.id).startsWith('remotion_');
  const remId = isRemotion ? String(t.id).replace('remotion_', '') : t.id;
  const computedVideoUrl = t.video_url || t.videoUrl || (isRemotion ? `https://raw.githubusercontent.com/Osama-Qonaibe/remotion-templates2/main/site/previews/${remId}.mp4` : undefined);

  return {
    id: t.id,
    creatorId: t.creator_id,
    creatorName: t.creator_name,
    creatorUsername: t.creator_username,
    creatorAvatar: t.creator_avatar,
    titleAr: t.title_ar,
    titleEn: t.title_en,
    descriptionAr: t.description_ar || '',
    descriptionEn: t.description_en || '',
    thumbnail: t.thumbnail || '',
    canvasBackground: t.canvas_background || '',
    category: t.category,
    categoryLabelAr: t.category_label_ar || '',
    dimensions: t.dimensions || '1080 × 1080',
    priceType: t.price_type || 'free',
    price: parseFloat(t.price || '0'),
    viewsCount: t.views_count || 0,
    usesCount: t.uses_count || 0,
    rating: parseFloat(t.rating || '5.0'),
    createdAt: new Date(t.created_at).getTime(),
    elements: typeof t.elements === 'string' ? JSON.parse(t.elements) : (t.elements || []),
    videoUrl: computedVideoUrl,
    previewVideoUrl: computedVideoUrl
  };
}

function mapPayoutToFrontend(p: any): CreatorPayoutRequest {
  return {
    id: p.id,
    creatorId: p.creator_id,
    amount: parseFloat(p.amount || '0'),
    method: p.method,
    details: p.details || '',
    status: p.status,
    requestedAt: new Date(p.requested_at).getTime()
  };
}

// 1. Get all creators
export async function getStoredCreators(): Promise<RinexCreator[]> {
  try {
    const list = await apiFetch('/api/rinex/creators');
    return list.map(mapCreatorToFrontend);
  } catch (err) {
    console.error('getStoredCreators error:', err);
    return [];
  }
}

// 2. Get all marketplace templates
export async function getStoredMarketplaceTemplates(): Promise<MarketplaceTemplate[]> {
  try {
    const list = await apiFetch('/api/rinex/templates');
    return list.map(mapTemplateToFrontend);
  } catch (err) {
    console.error('getStoredMarketplaceTemplates error:', err);
    return [];
  }
}

// 3. Register creator
export async function registerNewCreator(data: {
  username: string;
  name: string;
  roleAr: string;
  roleEn: string;
  bioAr: string;
  bioEn: string;
  avatar?: string;
  email?: string;
  socialLinks?: RinexCreator['socialLinks'];
}): Promise<RinexCreator> {
  const payload = {
    username: data.username,
    name: data.name,
    roleAr: data.roleAr,
    roleEn: data.roleEn,
    bioAr: data.bioAr,
    bioEn: data.bioEn,
    avatar: data.avatar,
    portfolioUrl: data.socialLinks?.website
  };

  const result = await apiFetch('/api/rinex/creators', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return mapCreatorToFrontend(result);
}

// 4. Record template use
export async function recordTemplateUse(templateId: string): Promise<void> {
  try {
    await apiFetch(`/api/rinex/templates/${templateId}/use`, {
      method: 'POST'
    });
  } catch (err) {
    console.error('recordTemplateUse error:', err);
  }
}

// 5. Publish template
export async function publishMarketplaceTemplate(template: Omit<MarketplaceTemplate, 'id' | 'viewsCount' | 'usesCount' | 'rating' | 'createdAt'>): Promise<MarketplaceTemplate> {
  const payload = {
    creatorId: template.creatorId,
    creatorName: template.creatorName,
    creatorUsername: template.creatorUsername,
    creatorAvatar: template.creatorAvatar,
    titleAr: template.titleAr,
    titleEn: template.titleEn,
    descriptionAr: template.descriptionAr,
    descriptionEn: template.descriptionEn,
    thumbnail: template.thumbnail,
    canvasBackground: template.canvasBackground,
    category: template.category,
    categoryLabelAr: template.categoryLabelAr,
    dimensions: template.dimensions,
    priceType: template.priceType,
    price: template.price,
    elements: template.elements
  };

  const result = await apiFetch('/api/rinex/templates', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return mapTemplateToFrontend(result);
}

// 6. Get creator profile and templates
export async function getCreatorProfile(username: string): Promise<{ creator: RinexCreator; templates: MarketplaceTemplate[] } | null> {
  try {
    const result = await apiFetch(`/api/rinex/creators/${encodeURIComponent(username)}`);
    return {
      creator: mapCreatorToFrontend(result.creator),
      templates: result.templates.map(mapTemplateToFrontend)
    };
  } catch (err) {
    console.error('getCreatorProfile error:', err);
    return null;
  }
}

// 7. Toggle Follow
const FOLLOWS_STORAGE_KEY = 'rinex_followed_creators_v1';
export function isCreatorFollowed(creatorId: string): boolean {
  try {
    const raw = localStorage.getItem(FOLLOWS_STORAGE_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    return list.includes(creatorId);
  } catch (e) {
    return false;
  }
}

export async function toggleFollowCreator(creatorId: string): Promise<{ isFollowed: boolean; followersCount: number }> {
  let list: string[] = [];
  try {
    const raw = localStorage.getItem(FOLLOWS_STORAGE_KEY);
    list = raw ? JSON.parse(raw) : [];
  } catch (e) {}

  const isFollowed = list.includes(creatorId);
  let updatedList: string[];
  const action = isFollowed ? 'unfollow' : 'follow';

  if (isFollowed) {
    updatedList = list.filter(id => id !== creatorId);
  } else {
    updatedList = [...list, creatorId];
  }

  localStorage.setItem(FOLLOWS_STORAGE_KEY, JSON.stringify(updatedList));

  const result = await apiFetch(`/api/rinex/creators/${creatorId}/follow`, {
    method: 'POST',
    body: JSON.stringify({ action })
  });

  return { isFollowed: !isFollowed, followersCount: result.followersCount };
}

// 8. Toggle Like
const LIKES_STORAGE_KEY = 'rinex_liked_creators_v1';
export function isCreatorLiked(creatorId: string): boolean {
  try {
    const raw = localStorage.getItem(LIKES_STORAGE_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    return list.includes(creatorId);
  } catch (e) {
    return false;
  }
}

export async function toggleLikeCreator(creatorId: string): Promise<{ isLiked: boolean; likesCount: number }> {
  let list: string[] = [];
  try {
    const raw = localStorage.getItem(LIKES_STORAGE_KEY);
    list = raw ? JSON.parse(raw) : [];
  } catch (e) {}

  const isLiked = list.includes(creatorId);
  let updatedList: string[];
  const action = isLiked ? 'unlike' : 'like';

  if (isLiked) {
    updatedList = list.filter(id => id !== creatorId);
  } else {
    updatedList = [...list, creatorId];
  }

  localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(updatedList));

  const result = await apiFetch(`/api/rinex/creators/${creatorId}/like`, {
    method: 'POST',
    body: JSON.stringify({ action })
  });

  return { isLiked: !isLiked, likesCount: result.likesCount };
}

// 9. Increment profile visits
export async function incrementProfileVisits(creatorId: string): Promise<number> {
  try {
    const result = await apiFetch(`/api/rinex/creators/${creatorId}/visit`, {
      method: 'POST'
    });
    return result.profileVisitsCount;
  } catch (err) {
    console.error('incrementProfileVisits error:', err);
    return 1;
  }
}

// 10. Toggle Favorite Template
const FAV_TEMPLATES_KEY = 'rinex_favorite_templates_v1';
export function isTemplateFavorite(templateId: string): boolean {
  try {
    const raw = localStorage.getItem(FAV_TEMPLATES_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    return list.includes(templateId);
  } catch (e) {
    return false;
  }
}

export async function toggleFavoriteTemplate(templateId: string): Promise<{ isFavorite: boolean }> {
  let list: string[] = [];
  try {
    const raw = localStorage.getItem(FAV_TEMPLATES_KEY);
    list = raw ? JSON.parse(raw) : [];
  } catch (e) {}

  const isFav = list.includes(templateId);
  let updatedList: string[];

  if (isFav) {
    updatedList = list.filter(id => id !== templateId);
  } else {
    updatedList = [...list, templateId];
  }

  localStorage.setItem(FAV_TEMPLATES_KEY, JSON.stringify(updatedList));

  try {
    await apiFetch(`/api/rinex/templates/${templateId}/favorite`, {
      method: 'POST'
    });
  } catch {}

  return { isFavorite: !isFav };
}

// 11. Record Rating
export async function recordCreatorRating(creatorId: string, rating: number): Promise<number> {
  try {
    const result = await apiFetch(`/api/rinex/creators/${creatorId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating })
    });
    return result.rating;
  } catch (err) {
    console.error('recordCreatorRating error:', err);
    return rating;
  }
}

// 12. Get Payout Requests
export async function getStoredPayoutRequests(creatorId?: string): Promise<CreatorPayoutRequest[]> {
  try {
    const url = creatorId ? `/api/rinex/payouts?creatorId=${encodeURIComponent(creatorId)}` : '/api/rinex/payouts';
    const list = await apiFetch(url);
    return list.map(mapPayoutToFrontend);
  } catch (err) {
    console.error('getStoredPayoutRequests error:', err);
    return [];
  }
}

// 13. Request Payout
export async function requestCreatorPayout(
  creatorId: string,
  amount: number,
  method: string,
  details: string
): Promise<{ success: boolean; newBalance: number; payout?: CreatorPayoutRequest; error?: string }> {
  try {
    const result = await apiFetch('/api/rinex/payouts', {
      method: 'POST',
      body: JSON.stringify({ creatorId, amount, method, details })
    });
    return {
      success: true,
      newBalance: result.newBalance,
      payout: mapPayoutToFrontend(result.payout)
    };
  } catch (err: any) {
    return {
      success: false,
      newBalance: 0,
      error: err.message || 'Failed to request payout'
    };
  }
}

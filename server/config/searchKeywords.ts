/**
 * Refined Search Keywords & Intent Detection
 * Distinguishes true real-time/web queries (prices, weather, breaking news, dates, live facts)
 * from standard conceptual or creative queries (math, programming, definitions).
 */
export const REALTIME_SEARCH_KEYWORDS = [
  'search', 'google', 'طقس', 'الطقس', 'درجة الحرارة', 'أخبار', 'اخبار', 'عاجل', 'سعر', 'اسعار', 'أسعار', 'دولار', 'يورو', 'ذهب', 'بيتكوين',
  'سهم', 'تداول', 'مباراة', 'مباريات', 'نتيجة', 'نتائج', 'أحدث', 'احدث', 'آخر مستجدات', 'اخر اخبار', 'اليوم', 'أمس', 'غدا', 'غداً',
  '2025', '2026', 'موقع', 'رابط', 'ابحث عن', 'ابحث لي', 'ابحث في الويب', 'find online', 'weather', 'breaking news', 'stock price',
  'latest news', 'current price', 'who won', 'match score', 'live update', 'happening now'
];

export const SEARCH_KEYWORDS = REALTIME_SEARCH_KEYWORDS;

export const isExplicitSearchRequested = (prompt: string, toolId: string = 'chat_fast'): boolean => {
  if (!prompt || typeof prompt !== 'string') return false;
  
  // Explicit search tools always require search
  if (['sovereign_search', 'search', 'deep_research'].includes(toolId)) {
    return true;
  }

  const normalized = prompt.trim().toLowerCase();

  // Explicit command patterns
  if (/^(ابحث|دور|بحث|search|find|google|look up|what is the price|what is the weather)/i.test(normalized)) {
    return true;
  }

  // Check against real-time indicators
  return REALTIME_SEARCH_KEYWORDS.some(keyword => {
    const kw = keyword.toLowerCase();
    return normalized.includes(kw);
  });
};


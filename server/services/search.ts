import { getCachedApiKeysVault } from '../db/queries.js';

export interface SearchResultItem {
  index?: number;
  title: string;
  link: string;
  url?: string;
  snippet: string;
  source?: string;
  domain?: string;
  publishedDate?: string;
}

/**
 * Extracts a concise, high-density search query from conversational user prompts.
 * Removes conversational pleasantries and filler keywords to maximize search hit rate.
 */
export function extractSearchQuery(rawPrompt: string): string {
  if (!rawPrompt || typeof rawPrompt !== 'string') return '';
  
  let cleaned = rawPrompt.trim();

  // Remove common Arabic conversational prefixes and filler phrases
  cleaned = cleaned.replace(/^(ابحث لي عن|ابحث عن|ابحث في الويب عن|ابحث في الانترنت عن|هل يمكنك البحث عن|ممكن تبحث عن|دور لي على|ما هي آخر أخبار|ما هي احدث اخبار|ما هو سعر|ما هي اسعار|ما هو|ما هي|ماذا تعرف عن|من هو|من هي|أريد معرفة|اريد معرفة|اخبرني عن|أخبرني عن)\s+/gi, '');

  // Remove common English conversational prefixes
  cleaned = cleaned.replace(/^(search for|search online for|look up|google|can you search for|please find|what is the price of|what is the latest news about|what is the weather in|tell me about|who is|who was)\s+/gi, '');

  // Trim punctuation from edges
  cleaned = cleaned.replace(/^[؟?.,!:]+|[؟?.,!:]+$/g, '').trim();

  // Geographic entity normalization for compound Arabic city names
  cleaned = cleaned
    .replace(/\bطول\s+كرم\b/g, 'طولكرم')
    .replace(/\bام\s+الفحم\b/g, 'أم الفحم')
    .replace(/\bابو\s+ظبي\b/g, 'أبوظبي')
    .replace(/\bشرم\s+الشيخ\b/g, 'شرم الشيخ')
    .replace(/\bراس\s+الخيمة\b/g, 'رأس الخيمة')
    .replace(/\bعين\s+كارم\b/g, 'عين كارم');

  return cleaned.length >= 2 ? cleaned : rawPrompt.trim();
}

/**
 * Extracts the domain name from a URL
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'web';
  }
}

/**
 * Decodes DuckDuckGo redirect link URLs to extract actual target URLs
 */
function cleanDuckDuckGoUrl(url: string): string {
  if (!url) return '';
  try {
    if (url.includes('duckduckgo.com/l/?uddg=')) {
      const match = url.match(/uddg=([^&]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    }
    if (url.startsWith('//')) {
      return 'https:' + url;
    }
    return url;
  } catch {
    return url;
  }
}

/**
 * Strips HTML tags and excessive whitespace
 */
function cleanSnippetText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tier 1: Google Serper API Search Engine
 */
async function searchViaSerper(query: string, apiKey: string): Promise<SearchResultItem[]> {
  try {
    const isArabic = /[\u0600-\u06FF]/.test(query);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        q: query,
        gl: isArabic ? 'ps' : 'us',
        hl: isArabic ? 'ar' : 'en',
        num: 6
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data: any = await response.json();
      const results: SearchResultItem[] = [];

      // Include knowledge graph / direct answers if available
      if (data.knowledgeGraph && data.knowledgeGraph.description) {
        const link = data.knowledgeGraph.website || 'https://google.com';
        results.push({
          title: data.knowledgeGraph.title || query,
          link,
          url: link,
          snippet: cleanSnippetText(data.knowledgeGraph.description),
          source: data.knowledgeGraph.type || 'Knowledge Graph',
          domain: extractDomain(link)
        });
      }

      if (data.answerBox && (data.answerBox.snippet || data.answerBox.answer)) {
        const link = data.answerBox.link || 'https://google.com';
        results.push({
          title: data.answerBox.title || 'Direct Answer',
          link,
          url: link,
          snippet: cleanSnippetText(data.answerBox.snippet || data.answerBox.answer),
          source: 'Answer Box',
          domain: extractDomain(link)
        });
      }

      if (Array.isArray(data.organic)) {
        for (const item of data.organic.slice(0, 5)) {
          if (item.link && item.title) {
            results.push({
              title: cleanSnippetText(item.title),
              link: item.link,
              url: item.link,
              snippet: cleanSnippetText(item.snippet || item.title),
              source: extractDomain(item.link),
              domain: extractDomain(item.link),
              publishedDate: item.date
            });
          }
        }
      }

      if (results.length > 0) return results;
    }
  } catch (err: any) {
    console.warn('[Search Engine] Serper tier skipped:', err.message);
  }
  return [];
}

/**
 * Tier 2: DuckDuckGo HTML Lite Engine (Robust Header Masking & URL Decoding)
 */
async function searchViaDuckDuckGoHtml(query: string): Promise<SearchResultItem[]> {
  try {
    const isArabic = /[\u0600-\u06FF]/.test(query);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': isArabic ? 'ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7' : 'en-US,en;q=0.9,ar;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `q=${encodeURIComponent(query)}&b=`,
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (response.ok) {
      const html = await response.text();
      const results: SearchResultItem[] = [];
      
      // Regex parsing for DuckDuckGo HTML results
      const resultBlockRegex = /<div class="result\s+results_links[^"]*"[\s\S]*?<a class="result__url" href="([^"]+)"[\s\S]*?>([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet"[\s\S]*?>([\s\S]*?)<\/a>/gi;
      let match;
      while ((match = resultBlockRegex.exec(html)) !== null && results.length < 5) {
        const rawLink = match[1];
        const rawTitle = match[2];
        const rawSnippet = match[3];

        const cleanLink = cleanDuckDuckGoUrl(rawLink);
        const title = cleanSnippetText(rawTitle);
        const snippet = cleanSnippetText(rawSnippet);

        if (cleanLink && title && !cleanLink.includes('duckduckgo.com/y.js')) {
          results.push({
            title,
            link: cleanLink,
            url: cleanLink,
            snippet,
            source: extractDomain(cleanLink),
            domain: extractDomain(cleanLink)
          });
        }
      }

      if (results.length > 0) return results;
    }
  } catch (err: any) {
    console.warn('[Search Engine] DuckDuckGo HTML tier skipped:', err.message);
  }
  return [];
}

/**
 * Tier 3: Multilingual Wikipedia Search Engine
 */
async function searchViaWikipedia(query: string): Promise<SearchResultItem[]> {
  try {
    const isArabic = /[\u0600-\u06FF]/.test(query);
    const domain = isArabic ? 'ar.wikipedia.org' : 'en.wikipedia.org';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const wikiRes = await fetch(
      `https://${domain}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=1&format=json&srlimit=4`,
      {
        headers: { 'User-Agent': 'PerplextaPlatformBot/1.0 (https://perplexta.ai; bot@perplexta.ai)' },
        signal: controller.signal
      }
    );

    clearTimeout(timeout);

    if (wikiRes.ok) {
      const wikiData: any = await wikiRes.json();
      const searchHits = wikiData.query?.search || [];
      if (searchHits.length > 0) {
        return searchHits.map((h: any) => {
          const link = `https://${domain}/wiki/${encodeURIComponent(h.title.replace(/\s+/g, '_'))}`;
          return {
            title: cleanSnippetText(h.title),
            link,
            url: link,
            snippet: cleanSnippetText(h.snippet),
            source: isArabic ? 'ويكيبيديا' : 'Wikipedia',
            domain
          };
        });
      }
    }
  } catch (err: any) {
    console.warn('[Search Engine] Wikipedia tier skipped:', err.message);
  }
  return [];
}

/**
 * Master Hybrid Search Dispatcher
 * Executes multi-tier failover search across available APIs, direct web scraping, and knowledge bases.
 * Deduplicates results and assigns clean unified index numbers.
 */
export async function performPerplextaSearch(rawQuery: string): Promise<SearchResultItem[]> {
  if (!rawQuery || typeof rawQuery !== 'string' || rawQuery.trim().length === 0) {
    return [];
  }

  const query = extractSearchQuery(rawQuery);
  let rawResults: SearchResultItem[] = [];

  // 1. Check for dedicated Serper API key in Vault or Environment
  try {
    let serperKey = process.env.SERPER_API_KEY;
    if (!serperKey) {
      const activeKeys = await getCachedApiKeysVault();
      const serperEntry = activeKeys.find((k: any) => k.provider === 'serper' && k.is_active);
      if (serperEntry) {
        serperKey = serperEntry.decrypted_key || serperEntry.encrypted_key;
      }
    }

    if (serperKey) {
      rawResults = await searchViaSerper(query, serperKey);
    }
  } catch (err: any) {
    console.warn('[Search Engine] Vault lookup failed:', err.message);
  }

  // 2. Primary Keyless Engine: DuckDuckGo HTML Lite with link decoder
  if (rawResults.length === 0) {
    rawResults = await searchViaDuckDuckGoHtml(query);
  }

  // 3. Knowledge Base Fallback: Multilingual Wikipedia
  if (rawResults.length === 0) {
    rawResults = await searchViaWikipedia(query);
  }

  // Deduplicate by URL and assign uniform sequential indices
  const seenUrls = new Set<string>();
  const unifiedResults: SearchResultItem[] = [];

  for (const item of rawResults) {
    const cleanUrl = item.link || item.url || '';
    if (cleanUrl && !seenUrls.has(cleanUrl.toLowerCase())) {
      seenUrls.add(cleanUrl.toLowerCase());
      unifiedResults.push({
        ...item,
        url: cleanUrl,
        link: cleanUrl,
        index: unifiedResults.length + 1
      });
    }
  }

  return unifiedResults;
}


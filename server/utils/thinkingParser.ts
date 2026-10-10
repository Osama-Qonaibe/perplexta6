/**
 * PERPLEXTA Deep Thinking & Reasoning Extractor (Server Engine)
 * Parses and extracts <thinking>...</thinking> or <think>...</think> cognition traces.
 */

export interface ServerThinkingParseResult {
  hasThinking: boolean;
  thinkingContent: string;
  cleanContent: string;
}

export function extractServerThinking(rawText: string | undefined | null): ServerThinkingParseResult {
  if (!rawText) {
    return {
      hasThinking: false,
      thinkingContent: '',
      cleanContent: ''
    };
  }

  const openTagMatch = rawText.match(/<(?:thinking|think)>/i);
  const closeTagMatch = rawText.match(/<\/(?:thinking|think)>/i);

  if (openTagMatch && closeTagMatch && closeTagMatch.index !== undefined && openTagMatch.index !== undefined) {
    if (closeTagMatch.index > openTagMatch.index) {
      const openTagLen = openTagMatch[0].length;
      const closeTagLen = closeTagMatch[0].length;
      const thinkingStart = openTagMatch.index + openTagLen;
      const thinkingEnd = closeTagMatch.index;

      const thinkingContent = rawText.slice(thinkingStart, thinkingEnd).trim();
      const beforeTag = rawText.slice(0, openTagMatch.index);
      const afterTag = rawText.slice(closeTagMatch.index + closeTagLen);
      const cleanContent = (beforeTag + afterTag).trim();

      return {
        hasThinking: Boolean(thinkingContent.length > 0),
        thinkingContent,
        cleanContent
      };
    }
  }

  // Check if open tag wasn't closed cleanly
  if (openTagMatch) {
    const openTagLen = openTagMatch[0].length;
    const thinkingStart = (openTagMatch.index || 0) + openTagLen;
    const thinkingContent = rawText.slice(thinkingStart).trim();
    const cleanContent = rawText.slice(0, openTagMatch.index).trim();

    return {
      hasThinking: Boolean(thinkingContent.length > 0),
      thinkingContent,
      cleanContent
    };
  }

  const legacyMatch = rawText.match(/\[Reasoning\]([\s\S]*?)\[\/Reasoning\]/i);
  if (legacyMatch) {
    const thinkingContent = (legacyMatch[1] || '').trim();
    const cleanContent = rawText.replace(/\[Reasoning\][\s\S]*?\[\/Reasoning\]/i, '').trim();
    return {
      hasThinking: Boolean(thinkingContent.length > 0),
      thinkingContent,
      cleanContent
    };
  }

  return {
    hasThinking: false,
    thinkingContent: '',
    cleanContent: rawText
  };
}

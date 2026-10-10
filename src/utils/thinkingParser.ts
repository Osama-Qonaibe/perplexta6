/**
 * PERPLEXTA Deep Thinking & Reasoning Extractor
 * Parses and separates internal <thinking>...</thinking> or <think>...</think> cognition traces from final answers.
 */

export interface ThinkingParseResult {
  hasThinking: boolean;
  isThinkingActive: boolean; // Currently streaming inside the thinking tag
  thinkingContent: string;   // The extracted raw thinking trace
  cleanContent: string;      // The sanitized answer outside thinking tags
}

export function extractThinking(rawText: string | undefined | null): ThinkingParseResult {
  if (!rawText) {
    return {
      hasThinking: false,
      isThinkingActive: false,
      thinkingContent: '',
      cleanContent: ''
    };
  }

  // Regex patterns for opening and closing tags
  const openTagMatch = rawText.match(/<(?:thinking|think)>/i);
  const closeTagMatch = rawText.match(/<\/(?:thinking|think)>/i);

  // Case 1: Complete closed <thinking>...</thinking>
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
        isThinkingActive: false,
        thinkingContent,
        cleanContent
      };
    }
  }

  // Case 2: Open tag during active streaming: <thinking>streaming internal cognition...
  if (openTagMatch && (!closeTagMatch || (closeTagMatch.index !== undefined && openTagMatch.index !== undefined && closeTagMatch.index < openTagMatch.index))) {
    const openTagLen = openTagMatch[0].length;
    const thinkingStart = (openTagMatch.index || 0) + openTagLen;
    const thinkingContent = rawText.slice(thinkingStart).trim();
    const beforeTag = rawText.slice(0, openTagMatch.index).trim();

    return {
      hasThinking: true,
      isThinkingActive: true,
      thinkingContent,
      cleanContent: beforeTag
    };
  }

  // Case 3: Secondary legacy [Reasoning] tags
  const legacyMatch = rawText.match(/\[Reasoning\]([\s\S]*?)\[\/Reasoning\]/i);
  if (legacyMatch) {
    const thinkingContent = (legacyMatch[1] || '').trim();
    const cleanContent = rawText.replace(/\[Reasoning\][\s\S]*?\[\/Reasoning\]/i, '').trim();
    return {
      hasThinking: Boolean(thinkingContent.length > 0),
      isThinkingActive: false,
      thinkingContent,
      cleanContent
    };
  }

  // Case 4: No thinking tag detected
  return {
    hasThinking: false,
    isThinkingActive: false,
    thinkingContent: '',
    cleanContent: rawText
  };
}

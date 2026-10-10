import { useState, useEffect, useRef } from 'react';

export interface TypewriterResult {
  displayedText: string;
  isStillTyping: boolean;
}

/**
  * High-precision, sovereign, calm typewriter buffer for streaming AI responses.
  *
  * Guarantees:
  * 1. Historical & Refreshed Messages: Display immediately at full length with 0 latency (no typewriter replay).
  * 2. Active Streaming Messages: Pure, serene character-by-character cadence anchored on frame 1 to eliminate layout jumps.
  * 3. Stable syntactic token release: Keeps newlines and table delimiters intact for jitter-free markdown rendering.
  */
export function useTypewriterBuffer(
  content: string,
  isStreaming: boolean = false,
  isLastMessage: boolean = false
): TypewriterResult {
  // Flag to recognize historical messages loaded from backend/refresh
  const isHistoricallyLoadedRef = useRef<boolean>(!isStreaming);
  
  // Track the latest target content
  const targetRef = useRef<string>(content);
  targetRef.current = content;

  if (isStreaming) {
    isHistoricallyLoadedRef.current = false;
  }

  // Initial display state - anchored cleanly on character 1 for streaming
  const [displayedText, setDisplayedText] = useState<string>(() => {
    // Historical / completed message -> show 100% immediately
    if (!isStreaming || !isLastMessage || !content) {
      return content || '';
    }
    // New active stream -> anchor immediately on the first character
    return content.length <= 1 ? content : content.slice(0, 1);
  });

  const currentPosRef = useRef<number>(displayedText.length);
  const [isStillTyping, setIsStillTyping] = useState<boolean>(() => {
    return Boolean(isStreaming && isLastMessage);
  });

  useEffect(() => {
    // If historical message, ensure it stays full length without animation
    if (!isLastMessage || isHistoricallyLoadedRef.current) {
      if (displayedText !== content) {
        setDisplayedText(content);
        currentPosRef.current = content.length;
      }
      setIsStillTyping(false);
      return;
    }

    let timeoutId: NodeJS.Timeout | null = null;
    let isCancelled = false;

    const drainBuffer = () => {
      if (isCancelled) return;

      const target = targetRef.current || '';
      const currentPos = currentPosRef.current;
      const targetLength = target.length;
      const backlog = targetLength - currentPos;

      if (backlog > 0) {
        setIsStillTyping(true);

        // Calm, steady typewriter rhythm:
        let step = 1;
        let delay = 32;

        if (backlog > 350) {
          step = 2;
          delay = 18;
        } else if (backlog > 180) {
          step = 1;
          delay = 22;
        } else if (backlog > 60) {
          step = 1;
          delay = 26;
        } else {
          step = 1;
          delay = 32;
        }

        // If next character is a pipe '|' or newline '\n', ensure syntactic tokens stay intact
        let nextPos = Math.min(currentPos + step, targetLength);
        
        // Peek slightly ahead to avoid breaking markdown syntax mid-delimiter (e.g. '|', '**', '```')
        if (nextPos < targetLength) {
          const nextChar = target[nextPos];
          if (nextChar === '|' || nextChar === '*' || nextChar === '`') {
            // Include adjacent delimiter if available
            if (nextPos + 1 <= targetLength && target[nextPos + 1] === nextChar) {
              nextPos = Math.min(nextPos + 2, targetLength);
            }
          }
        }

        currentPosRef.current = nextPos;
        setDisplayedText(target.slice(0, nextPos));

        timeoutId = setTimeout(() => {
          if (!isCancelled) {
            drainBuffer();
          }
        }, delay);
      } else {
        // Backlog completely caught up
        if (!isStreaming) {
          setIsStillTyping(false);
        } else {
          setIsStillTyping(true);
          // Wait briefly for incoming chunks from the network stream
          timeoutId = setTimeout(() => {
            if (!isCancelled) {
              drainBuffer();
            }
          }, 35);
        }
      }
    };

    // Start draining loop
    timeoutId = setTimeout(drainBuffer, 20);

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLastMessage, isStreaming]);

  // For historical messages, return full content directly
  if (!isLastMessage || isHistoricallyLoadedRef.current) {
    return {
      displayedText: content,
      isStillTyping: false
    };
  }

  return {
    displayedText,
    isStillTyping: isStillTyping || (isStreaming && currentPosRef.current < (content?.length || 0))
  };
}

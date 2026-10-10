import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { useArtifact } from '../../../context/ArtifactContext';
import { useAppContext } from '../../../context/AppContext';
import { useResizeObserver } from '../../../hooks/useResizeObserver';

export interface CanvasLayoutState {
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  isArtifactOpen: boolean;
  isFullscreen: boolean;
  isCompact: boolean;
  chatWidth: number;
  canvasWidth: number;
  effectiveCanvasWidth: number;
  effectiveChatWidthNum: number;
  viewportWidth: number;
  isDraggingResize: boolean;
  handleStartResize: (e: React.MouseEvent | React.TouchEvent) => void;
  handleKeyDownResize: (e: React.KeyboardEvent) => void;
  resetToDefaultWidth: () => void;
  setSplitRatio: (ratio: number) => void;
  chatMainStyle: React.CSSProperties;
  canvasMainStyle: React.CSSProperties;
  chatContentStyle: React.CSSProperties;
  contentPaddingClass: string;
  contentMaxWidthClass: string;
  headerTabsMaxWidth: string;
  headerTabsContainerClass: string;
}

export const CHAT_WIDTH_PX = 530;
export const CANVAS_WIDTH_PX = 1340;
export const MIN_CHAT_WIDTH = 530;
export const DEFAULT_CHAT_PREVIEW_WIDTH = 530;

const STORAGE_KEY = 'perplexta_chat_split_width';

/**
 * useCanvasLayout - Manages fixed dimensions (Chat: 530px, Canvas: 1340px)
 * and eliminates conflicting dimensions and animations.
 */
export function useCanvasLayout(): CanvasLayoutState {
  const { isArtifactOpen, isFullscreen, activeArtifact } = useArtifact();
  const { isSidebarOpen } = useAppContext();

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  const isImageActive = isArtifactOpen && activeArtifact?.type === 'image';
  const resolvedChatWidthPx = isImageActive ? 410 : CHAT_WIDTH_PX;
  const resolvedCanvasWidthPx = isImageActive ? (CANVAS_WIDTH_PX + (CHAT_WIDTH_PX - 410)) : CANVAS_WIDTH_PX;

  const [chatWidth, setChatWidth] = useState<number>(resolvedChatWidthPx);
  const [canvasWidth, setCanvasWidth] = useState<number>(resolvedCanvasWidthPx);
  const isDraggingResize = false;

  // Enforce removal of conflicting custom widths from localStorage
  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const [viewportWidth, setViewportWidth] = useState<number>(() => {
    return typeof window !== 'undefined' ? window.innerWidth : 1920;
  });

  // Locked chat pane flex-basis: resolvedChatWidthPx on desktop, 100% when closed or mobile
  const defaultChatFlexBasis = useMemo(() => {
    if (!isArtifactOpen || isFullscreen) return '100%';
    if (viewportWidth < 1024) return '100%';
    return `${resolvedChatWidthPx}px`;
  }, [isArtifactOpen, isFullscreen, viewportWidth, resolvedChatWidthPx]);

  // Actual effective width in pixels as a number: strictly resolvedChatWidthPx on desktop
  const effectiveChatWidthNum = useMemo(() => {
    if (viewportWidth < 1024) return viewportWidth;
    return resolvedChatWidthPx;
  }, [viewportWidth, resolvedChatWidthPx]);

  // Actual effective width style: strictly resolvedChatWidthPx
  const effectiveChatWidth = useMemo(() => {
    if (!isArtifactOpen || isFullscreen) return '100%';
    if (viewportWidth < 1024) return '100%';
    return `${resolvedChatWidthPx}px`;
  }, [isArtifactOpen, isFullscreen, viewportWidth, resolvedChatWidthPx]);

  // Effective canvas width in pixels: strictly resolvedCanvasWidthPx on desktop
  const effectiveCanvasWidth = useMemo(() => {
    if (viewportWidth < 1024) return viewportWidth;
    return resolvedCanvasWidthPx;
  }, [viewportWidth, resolvedCanvasWidthPx]);

  // Window resize & viewport observer
  useEffect(() => {
    let animationFrameId: number;

    const handleWindowResize = () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        setViewportWidth(window.innerWidth);
      });
    };

    window.addEventListener('resize', handleWindowResize, { passive: true });
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleWindowResize);
    };
  }, []);

  // Resize handlers are disabled to prevent any conflicting dimensions or motions
  const handleStartResize = useCallback(() => {}, []);
  const handleKeyDownResize = useCallback(() => {}, []);
  const resetToDefaultWidth = useCallback(() => {
    setChatWidth(resolvedChatWidthPx);
    setCanvasWidth(resolvedCanvasWidthPx);
  }, [resolvedChatWidthPx, resolvedCanvasWidthPx]);
  const setSplitRatio = useCallback(() => {}, []);

  // High-performance ResizeObserver for the chat container
  const chatObserver = useResizeObserver<HTMLDivElement>(
    {
      triggers: [isArtifactOpen, isFullscreen, isSidebarOpen, effectiveChatWidth],
      onResize: (_entry, bounds) => {
        if (!isArtifactOpen) {
          setChatWidth(Math.round(bounds.width));
        }
      }
    },
    chatContainerRef
  );

  // Sync measured chat width when closed
  useEffect(() => {
    if (!isArtifactOpen && chatObserver.width > 0) {
      setChatWidth(chatObserver.width);
    } else if (isArtifactOpen) {
      setChatWidth(resolvedChatWidthPx);
    }
  }, [chatObserver.width, isArtifactOpen, resolvedChatWidthPx]);

  // High-performance ResizeObserver for the canvas container
  const canvasObserver = useResizeObserver<HTMLDivElement>(
    {
      disabled: !isArtifactOpen,
      triggers: [isArtifactOpen, isFullscreen, isSidebarOpen],
      onResize: (_entry, bounds) => {
        if (isArtifactOpen) {
          setCanvasWidth(Math.round(bounds.width) || resolvedCanvasWidthPx);
        }
      }
    },
    canvasContainerRef
  );

  // Sync measured canvas width
  useEffect(() => {
    if (isArtifactOpen) {
      setCanvasWidth(resolvedCanvasWidthPx);
    } else {
      setCanvasWidth(0);
    }
  }, [isArtifactOpen, resolvedCanvasWidthPx]);

  // Immediate Layout Synchronization on Toggle - zero motion, zero delay
  useLayoutEffect(() => {
    if (isArtifactOpen) {
      setChatWidth(resolvedChatWidthPx);
      setCanvasWidth(resolvedCanvasWidthPx);
    } else {
      setCanvasWidth(0);
      if (chatContainerRef.current) {
        const rect = chatContainerRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          setChatWidth(Math.round(rect.width));
        }
      }
    }
  }, [isArtifactOpen, isFullscreen, resolvedChatWidthPx, resolvedCanvasWidthPx]);

  const isCompact = chatWidth > 0 && chatWidth < 640;

  // Chat <main> layout style: strictly resolvedChatWidthPx when canvas is open on desktop
  // Prevents any conflicting dimensions, stretching, or layout shifts.
  const chatMainStyle = useMemo<React.CSSProperties>(() => {
    if (isArtifactOpen && isFullscreen) {
      return { display: 'none' };
    }

    if (isArtifactOpen && viewportWidth >= 1024) {
      return {
        flex: `0 0 ${resolvedChatWidthPx}px`,
        width: `${resolvedChatWidthPx}px`,
        minWidth: `${resolvedChatWidthPx}px`,
        maxWidth: `${resolvedChatWidthPx}px`,
        overflowX: 'hidden',
        overflowAnchor: 'none',
        boxSizing: 'border-box',
        contain: 'layout',
      };
    }

    return {
      flex: '1 1 0%',
      minWidth: 0,
      width: '100%',
      overflowX: 'hidden',
      overflowAnchor: 'none',
      boxSizing: 'border-box',
      contain: 'layout',
    };
  }, [isArtifactOpen, isFullscreen, viewportWidth, resolvedChatWidthPx]);

  // Canvas <aside> layout style: strictly resolvedCanvasWidthPx when open on desktop
  const canvasMainStyle = useMemo<React.CSSProperties>(() => {
    if (isFullscreen) {
      return {};
    }

    if (isArtifactOpen && viewportWidth >= 1024) {
      return {
        flex: `0 0 ${resolvedCanvasWidthPx}px`,
        width: `${resolvedCanvasWidthPx}px`,
        minWidth: `${resolvedCanvasWidthPx}px`,
        maxWidth: `${resolvedCanvasWidthPx}px`,
        contain: 'layout paint',
        overflowX: 'hidden',
        boxSizing: 'border-box',
      };
    }

    return {
      contain: 'layout paint',
      overflowX: 'hidden',
      boxSizing: 'border-box',
    };
  }, [isArtifactOpen, isFullscreen, viewportWidth, resolvedCanvasWidthPx]);

  // Content container style inside chat
  const chatContentStyle = useMemo<React.CSSProperties>(() => {
    return {
      width: '100%',
      maxWidth: '100%',
      overflowX: 'hidden',
      boxSizing: 'border-box',
    };
  }, []);

  // Stable content dimensions to prevent layout shifts on toggle
  const contentPaddingClass = 'px-4 sm:px-6';
  const contentMaxWidthClass = 'max-w-3xl mx-auto w-full';

  // Dynamic header tabs max-width matching chat container boundaries
  const headerTabsMaxWidth = '48rem'; // 48rem = max-w-3xl
  const headerTabsContainerClass = 'inset-x-0 justify-center';

  return {
    chatContainerRef,
    canvasContainerRef,
    isArtifactOpen,
    isFullscreen,
    isCompact,
    chatWidth,
    canvasWidth,
    effectiveCanvasWidth,
    effectiveChatWidthNum,
    viewportWidth,
    isDraggingResize,
    handleStartResize,
    handleKeyDownResize,
    resetToDefaultWidth,
    setSplitRatio,
    chatMainStyle,
    canvasMainStyle,
    chatContentStyle,
    contentPaddingClass,
    contentMaxWidthClass,
    headerTabsMaxWidth,
    headerTabsContainerClass
  };
}

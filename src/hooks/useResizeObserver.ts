import { useState, useEffect, useRef, useCallback } from 'react';

export interface ResizeObserverOptions {
  /**
   * Debounce delay in milliseconds for rapid resize events.
   * Defaults to 0 (uses requestAnimationFrame for silky 60fps updates).
   */
  debounceMs?: number;
  /**
   * Box sizing model to observe. Defaults to 'content-box'.
   */
  box?: ResizeObserverBoxOptions;
  /**
   * Whether observation is disabled.
   */
  disabled?: boolean;
  /**
   * Optional custom callback triggered upon resize.
   */
  onResize?: (entry: ResizeObserverEntry, bounds: DOMRectReadOnly) => void;
  /**
   * External triggers that should immediately force recalculation of layout bounds
   * (e.g. [isArtifactOpen, isFullscreen, isSidebarOpen]).
   */
  triggers?: readonly unknown[];
}

export interface ResizeObserverResult<T extends HTMLElement = HTMLDivElement> {
  /**
   * Ref to attach to the target container DOM element.
   */
  ref: React.RefObject<T | null>;
  /**
   * Measured width of the observed container.
   */
  width: number;
  /**
   * Measured height of the observed container.
   */
  height: number;
  /**
   * Exact DOMRect bounds of the observed container.
   */
  bounds: DOMRectReadOnly | null;
  /**
   * True once initial measurement has completed.
   */
  isReady: boolean;
  /**
   * Forces an immediate synchronous recalculation of layout bounds.
   */
  recalculate: () => void;
}

/**
 * useResizeObserver - Highly performant, jitter-free ResizeObserver hook
 * specifically engineered for dynamic containers, canvas stages, and split-screen layouts.
 *
 * Prevents layout shifts and visual jitter by:
 * 1. Performing immediate synchronous bounding measurement upon mount and ref binding.
 * 2. Throttling active continuous resize events with requestAnimationFrame.
 * 3. Immediately forcing bounds recalculation when external layout triggers change (toggles/fullscreens/sidebars).
 * 4. Cleaning up pending animation frames and timers on unmount.
 */
export function useResizeObserver<T extends HTMLElement = HTMLDivElement>(
  options: ResizeObserverOptions = {},
  externalRef?: React.RefObject<T | null>
): ResizeObserverResult<T> {
  const {
    debounceMs = 0,
    box = 'content-box',
    disabled = false,
    onResize,
    triggers = []
  } = options;

  const internalRef = useRef<T | null>(null);
  const targetRef = externalRef || internalRef;

  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
    bounds: DOMRectReadOnly | null;
    isReady: boolean;
  }>({
    width: 0,
    height: 0,
    bounds: null,
    isReady: false
  });

  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  const rafIdRef = useRef<number | null>(null);
  const timerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronous measurement helper
  const measure = useCallback(() => {
    const el = targetRef.current;
    if (!el || disabled) return;

    const rect = el.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);

    setDimensions(prev => {
      if (prev.width === w && prev.height === h && prev.isReady) {
        return prev;
      }
      return {
        width: w,
        height: h,
        bounds: rect,
        isReady: true
      };
    });
  }, [targetRef, disabled]);

  // Handler for ResizeObserver notifications
  const handleEntries = useCallback((entries: ResizeObserverEntry[]) => {
    if (!entries || entries.length === 0 || disabled) return;

    const entry = entries[0];
    let w = 0;
    let h = 0;

    if (entry.contentBoxSize && entry.contentBoxSize.length > 0) {
      w = Math.round(entry.contentBoxSize[0].inlineSize);
      h = Math.round(entry.contentBoxSize[0].blockSize);
    } else {
      w = Math.round(entry.contentRect.width);
      h = Math.round(entry.contentRect.height);
    }

    const updateState = () => {
      setDimensions(prev => {
        if (prev.width === w && prev.height === h && prev.isReady) {
          return prev;
        }
        return {
          width: w,
          height: h,
          bounds: entry.contentRect,
          isReady: true
        };
      });

      if (onResizeRef.current) {
        onResizeRef.current(entry, entry.contentRect);
      }
    };

    if (debounceMs > 0) {
      if (timerIdRef.current) clearTimeout(timerIdRef.current);
      timerIdRef.current = setTimeout(updateState, debounceMs);
    } else {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(updateState);
    }
  }, [disabled, debounceMs]);

  // Main ResizeObserver lifecycle
  useEffect(() => {
    const el = targetRef.current;
    if (!el || disabled) {
      return;
    }

    // 1. Immediate synchronous measurement to avoid layout shift on first frame
    measure();

    // 2. Setup ResizeObserver
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(handleEntries);
      observer.observe(el, { box });
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
      }
    };
  }, [targetRef, disabled, box, handleEntries, measure]);

  // Trigger recalculation immediately when external triggers change
  useEffect(() => {
    if (disabled) return;
    measure();
    // Also perform a fast delayed check to capture end of CSS transitions (300ms)
    const transitionTimer = setTimeout(measure, 320);
    return () => clearTimeout(transitionTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, measure, ...triggers]);

  // Window resize fallback
  useEffect(() => {
    if (disabled) return;

    let resizeRaf: number;
    const onWindowResize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(measure);
    };

    window.addEventListener('resize', onWindowResize, { passive: true });
    return () => {
      cancelAnimationFrame(resizeRaf);
      window.removeEventListener('resize', onWindowResize);
    };
  }, [disabled, measure]);

  return {
    ref: targetRef,
    width: dimensions.width,
    height: dimensions.height,
    bounds: dimensions.bounds,
    isReady: dimensions.isReady,
    recalculate: measure
  };
}

import React, { useState, useEffect, useRef } from 'react';
import { getAspectRatioClass } from '../utils/mediaUtils';
import { MediaAspectRatio, MediaFitMode } from '../context/VideoResourceContext';

export interface UniversalMediaContainerProps {
  children: React.ReactNode;
  aspectRatio?: MediaAspectRatio;
  fitMode?: MediaFitMode;
  maxHeight?: string;
  className?: string;
  backdropUrl?: string;
  ambientGlow?: boolean;
  onDimensionsChange?: (dimensions: { width: number; height: number; ratio: number }) => void;
  overlaySlot?: React.ReactNode;
}

/**
 * UniversalMediaContainer
 * Layout-agnostic wrapper that guarantees structural layout integrity across
 * dynamic video aspect ratios (1:1 Square, 9:16 Reels/Portrait, 16:9 Widescreen, 4:5 Vertical, 21:9 Banner).
 */
export const UniversalMediaContainer: React.FC<UniversalMediaContainerProps> = ({
  children,
  aspectRatio = '16:9',
  fitMode = 'cover',
  maxHeight,
  className = '',
  backdropUrl,
  ambientGlow = true,
  onDimensionsChange,
  overlaySlot
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Map ratio string to standard class or custom style
  const ratioClass = getAspectRatioClass(aspectRatio);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
        if (onDimensionsChange && width > 0 && height > 0) {
          onDimensionsChange({ width, height, ratio: width / height });
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [onDimensionsChange]);

  // Derive explicit CSS aspect-ratio as inline style fallback for strict lock
  const cssAspectRatio = (() => {
    switch (aspectRatio) {
      case '9:16': return '9 / 16';
      case '4:5': return '4 / 5';
      case '1:1': return '1 / 1';
      case '21:9': return '21 / 9';
      case '16:9':
      default:
        return '16 / 9';
    }
  })();

  return (
    <div
      ref={containerRef}
      className={`relative w-full p-0 m-0 overflow-hidden bg-black select-none ${ratioClass} ${className}`}
      style={{
        aspectRatio: cssAspectRatio,
        maxHeight: maxHeight || undefined,
      }}
    >
      {/* Ambient Synchronized Backdrop for contain mode */}
      {ambientGlow && (fitMode === 'contain' || fitMode === 'ambient') && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40 blur-2xl scale-110">
          {backdropUrl ? (
            <img
              src={backdropUrl}
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-accent/30 via-slate-900 to-black" />
          )}
        </div>
      )}

      {/* Main Content Viewport - Strict Zero Padding & Full Containment */}
      <div className="relative z-10 w-full h-full p-0 m-0 overflow-hidden flex items-center justify-center">
        {children}
      </div>

      {/* Optional Overlay Layer (Controls, badges, status) */}
      {overlaySlot && (
        <div className="absolute inset-0 z-20 pointer-events-none p-0 m-0">
          {overlaySlot}
        </div>
      )}
    </div>
  );
};

/**
 * 📐 PERPLEXTA DESIGN SYSTEM — SPACING, SHAPE & HITBOX CONSTITUTION
 * 
 * Enforces:
 * 1. 4px mathematical layout grid
 * 2. WCAG AA & Material Design 3 mandatory 44px touch targets
 * 3. 5 discrete M3 shape radius tokens
 * 4. Nested corner radius formula: Inner Radius = Outer Radius - Padding
 */

export const SPACING = {
  0: 0,
  1: 4,    // 0.25rem
  2: 8,    // 0.5rem
  3: 12,   // 0.75rem
  4: 16,   // 1.0rem
  5: 20,   // 1.25rem
  6: 24,   // 1.5rem
  8: 32,   // 2.0rem
  10: 40,  // 2.5rem
  12: 48,  // 3.0rem
  16: 64,  // 4.0rem
} as const;

/**
 * Standard Control & Popover Spacing Tokens
 */
export const CONTROL_SPACING = {
  controlHeight: 'h-8',             // 32px
  controlHeightPx: 32,
  iconButtonSize: 'w-8 h-8',        // 32px x 32px
  iconInnerSize: 'w-4 h-4',         // 16px x 16px
  popoverPadding: 'p-1.5',
  popoverItemSpacing: 'space-y-0.5',
  popoverWidth: 'w-max min-w-[170px] max-w-[260px]',
} as const;

export const POPOVER_SPACING = {
  padding: 'p-1.5',
  itemSpacing: 'space-y-0.5',
  widthConstraints: 'w-max min-w-[170px] max-w-[260px]',
} as const;

/**
 * Material Design 3 Shape Scale (Strictly 5 levels)
 */
export const SHAPE = {
  xs: 'rounded-shape-xs',     // 4px - Micro badges & tags
  sm: 'rounded-shape-sm',     // 8px - Buttons & input fields
  md: 'rounded-shape-md',     // 12px - Standard cards, popovers & dropdowns
  lg: 'rounded-shape-lg',     // 16px - Large modals & floating sheets
  full: 'rounded-shape-full', // 9999px - Capsule navigation, pills & avatars
} as const;

export const SHAPE_VALUES = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const;

/**
 * Mandatory Touch Target Standard (44px x 44px minimum bounding box)
 */
export const TOUCH_TARGET = {
  minSize: 44,
  className: 'min-h-[44px] min-w-[44px]',
  hitBoxExpansion: 'relative before:absolute before:-inset-1.5 before:content-[\'\']',
} as const;

/**
 * Container Padding Standards (Outer padding >= Inner item spacing)
 */
export const CONTAINER_PADDING = {
  dropdown: 'p-1',          // 4px outer padding
  card: 'p-4 sm:p-5',       // 16px - 20px
  modal: 'p-5 sm:p-6',      // 20px - 24px
  page: 'px-4 sm:px-6 lg:px-8',
} as const;

/**
 * Mathematical Nested Radius Calculator
 * Ensures optical harmony: Inner Radius = Outer Radius - Padding
 */
export function calculateInnerRadius(outerRadius: number, padding: number): number {
  return Math.max(0, outerRadius - padding);
}

/**
 * 📍 PERPLEXTA DESIGN SYSTEM — POSITIONING & ANCHOR CONSTITUTION
 * 
 * Defines placement offsets, anchor alignments, and origin mappings
 * for popovers, context menus, tooltips, and floating cards.
 */

export type AnchorOrigin =
  | 'top-left'
  | 'top-right'
  | 'top-center'
  | 'bottom-left'
  | 'bottom-right'
  | 'bottom-center'
  | 'left-center'
  | 'right-center';

export const POSITIONING = {
  // Safe default offset between trigger and popcard
  triggerOffset: 6,
  
  // Viewport padding edge constraint
  viewportPadding: 12,

  // CSS origin class mapping for Framer Motion / CSS transforms
  originClasses: {
    'top-left': 'origin-top-left',
    'top-right': 'origin-top-right',
    'top-center': 'origin-top',
    'bottom-left': 'origin-bottom-left',
    'bottom-right': 'origin-bottom-right',
    'bottom-center': 'origin-bottom',
    'left-center': 'origin-left',
    'right-center': 'origin-right',
  },
} as const;

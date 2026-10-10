/**
 * 📦 PERPLEXTA DESIGN SYSTEM — FLEXBOX PRIMITIVE
 * 
 * Utility wrapper component for structured flex layouts.
 */

import React, { forwardRef } from 'react';

export type FlexGap = 'xs' | 'sm' | 'md' | 'lg' | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;

export interface FlexBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  gap?: FlexGap;
  wrap?: boolean;
  inline?: boolean;
  children: React.ReactNode;
}

const DIRECTION_MAP = {
  row: 'flex-row',
  col: 'flex-col',
  'row-reverse': 'flex-row-reverse',
  'col-reverse': 'flex-col-reverse',
};

const ALIGN_MAP = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
};

const JUSTIFY_MAP = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
};

const GAP_MAP: Record<string | number, string> = {
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-3',
  lg: 'gap-4',
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-4',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-8',
  12: 'gap-8',
};

export const FlexBox = forwardRef<HTMLDivElement, FlexBoxProps>(({
  direction = 'row',
  align = 'center',
  justify = 'start',
  gap = 2,
  wrap = false,
  inline = false,
  className = '',
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={`
        ${inline ? 'inline-flex' : 'flex'}
        ${DIRECTION_MAP[direction]}
        ${ALIGN_MAP[align]}
        ${JUSTIFY_MAP[justify]}
        ${GAP_MAP[gap] || 'gap-2'}
        ${wrap ? 'flex-wrap' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
});

FlexBox.displayName = 'FlexBox';

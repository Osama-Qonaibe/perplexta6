import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { 
  Type, ArrowUpRight, Square, Circle, Edit3, Sliders, Trash2, 
  Download, RefreshCw, ZoomIn, ZoomOut, Check, Maximize2, Minimize2, Move, Layers, Send, X,
  LayoutTemplate, Image as ImageIcon, Shapes, Upload,
  Undo2, Redo2, Eye, EyeOff, Lock, Unlock, Copy, Sparkles, MousePointer,
  Highlighter, Star, ChevronUp, ChevronDown, Palette, Maximize, AlertTriangle, CheckCircle2,
  FileImage, Sparkle, Plus, MoreHorizontal, ChevronsUp, ChevronsDown, Wand2, Paintbrush,
  Share2, SlidersHorizontal, AlignJustify, AlignLeft, AlignCenter, AlignRight, RotateCw,
  Link2, MessageCircle, Folder, Save, FileDown, Strikethrough, Crown, ChevronLeft, ChevronRight,
  FolderOpen, Settings, Info, CloudCheck, Cloud, FileText, Printer, CheckCheck, Globe, Languages,
  UploadCloud, File as FileIcon, Play, Camera, Pipette, Eraser, Bold, Italic, Underline, Award, Search, User, LogIn, Heart, Smartphone,
  Monitor, Compass, Tv, PlusCircle, Pause, Clock, Music, CreditCard, Volume2, VolumeX
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { CreatorRegistrationModal } from '../../creators/CreatorRegistrationModal';
import { toast, SelectDropdown } from '@/design-system';
import { RATAQ_SHAPES, ShapeItem } from '../../../data/rataqShapes';
import { RATAQ_TEMPLATES, StudioTemplate, convertMarketplaceToStudioTemplate } from '../../../data/rataqTemplates';
import { getStoredCreators, getStoredMarketplaceTemplates, recordTemplateUse } from '../../../data/rinexCreators';
import { CURATED_PUBLIC_TEMPLATES } from '../../../data/publicTemplatesData';
import { 
  filterTemplatesByWorkspaceDimensions, 
  getAspectRatioLabel 
} from '../../../services/templateService';
import { RATAQ_TYPOGRAPHY, TypographyPreset } from '../../../data/rataqTypography';
import { 
  STUDIO_FONTS, 
  STUDIO_PHOTOS, 
  STUDIO_BACKGROUNDS, 
  STUDIO_PALETTES, 
  STUDIO_ELEMENTS, 
  STUDIO_TEXT_EFFECTS, 
  STUDIO_ANIMATIONS,
  StudioFontItem,
  StudioPhotoItem,
  StudioBackgroundItem,
  StudioPaletteItem,
  StudioElementItem,
  StudioEffectPreset,
  StudioAnimationPreset
} from '../../../data/rataqStudioCatalog';
import { resolveImageUrl } from '../../../utils/imageResolver';
import { 
  StudioUploadItem, 
  getStoredStudioUploads, 
  saveStoredStudioUploads, 
  registerDynamicCustomFont,
  getUploadsFromDB,
  saveStudioSessionToDB,
  getStudioSessionFromDB
} from '../../../data/rataqUploads';
import { 
  StudioBrandKit, 
  getStoredBrandKit, 
  saveStoredBrandKit, 
  DEFAULT_BRAND_KIT 
} from '../../../data/rataqBrandKit';
import {
  StudioProject,
  saveUserStudioProject,
  getUserStudioProjects,
  deleteUserStudioProject,
  duplicateUserStudioProject
} from '../../../data/rataqProjects';

interface ArtifactImageEditorProps {
  artifact: {
    id: string;
    title: string;
    content: string; // Image URL or Base64
  };
  initialElements?: CanvasElement[];
  initialFilters?: EditorFilters;
  initialImageSize?: { width: number; height: number };
  projectId?: string;
  onSaveProject?: (project: StudioProject) => void;
  onClose?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  initialPages?: StudioPageItem[];
  initialCurrentPageIndex?: number;
  isInChat?: boolean;
}

export interface CanvasElement {
  id: string;
  type: 'text' | 'rect' | 'circle' | 'arrow' | 'line' | 'star' | 'badge' | 'draw' | 'sticker' | 'svg' | 'frame';
  name?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  color: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
  locked?: boolean;
  hidden?: boolean;
  
  // Photo Container Frame specific
  frameShape?: string;
  frameImgSrc?: string;
  frameImgElement?: HTMLImageElement;
  frameImgScale?: number;
  frameImgOffsetX?: number;
  frameImgOffsetY?: number;
  frameBorderColor?: string;
  frameBorderWidth?: number;
  frameBgColor?: string;
  
  // SVG Shape specific
  svgPath?: string;
  viewBox?: string;
  
  // Text specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right';
  textBgColor?: string;
  textBgPadding?: number;
  textBgCornerRadius?: number;
  textShadow?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  textStrokeColor?: string;
  textStrokeWidth?: number;
  textLetterSpacing?: number;
  textLineHeight?: number;
  textCurve?: number;
  textUnderline?: boolean;
  textUppercase?: boolean;
  
  // Shape specific
  cornerRadius?: number;
  
  // Brush specific
  points?: Array<{ x: number; y: number }>;
  brushMode?: 'pen' | 'highlighter' | 'marker';
  
  // Image / Sticker specific
  imgSrc?: string;
  imgElement?: HTMLImageElement;

  // Effects & Animations
  effect?: string;
  animation?: string;
  animationSpeed?: number;
  animationDirection?: string;

  // Keyframes for professional animation
  keyframes?: {
    [key: string]: Array<{
      time: number;
      value: any;
      easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
    }>;
  };
}

export interface EditorFilters {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  grayscale: number;
  sepia: number;
  hueRotate: number;
  invert: number;
}

export interface StudioPageItem {
  id: string;
  title: string;
  elements: CanvasElement[];
  locked?: boolean;
  bgImgSrc?: string;
  backgroundColor?: string;
}

export interface SnapGuidesState {
  x?: number;
  y?: number;
  isCenterVertical?: boolean;
  isCenterHorizontal?: boolean;
  isCenterIntersection?: boolean;
  isMargin?: boolean;
}

const DEFAULT_FILTERS: EditorFilters = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  hueRotate: 0,
  invert: 0
};

// Royalty Free Audio Tracks Library
export const ROYALTY_FREE_AUDIO_LIBRARY = [
  {
    id: 'track-arabic-oud',
    titleAr: 'عود شرقي سينمائي أنيق (Rinex Oud)',
    titleEn: 'Cinematic Arabic Oud & Ambient',
    category: 'arabic',
    duration: '03:45',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
  },
  {
    id: 'track-upbeat-tech',
    titleAr: 'موسيقى تسويقية حماسية (Upbeat Tech Reel)',
    titleEn: 'Upbeat Tech Reel & Motion',
    category: 'upbeat',
    duration: '02:30',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
  },
  {
    id: 'track-lofi-sunset',
    titleAr: 'لوفاي هادئ للستوري والقصص (Lofi Chill)',
    titleEn: 'Lofi Chill Sunset Story',
    category: 'lofi',
    duration: '04:15',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
  },
  {
    id: 'track-inspiring-corporate',
    titleAr: 'إلهامي للشركات والإعلانات (Inspiring Corporate)',
    titleEn: 'Inspiring Corporate Commercial',
    category: 'corporate',
    duration: '03:10',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'
  },
  {
    id: 'track-energetic-vlog',
    titleAr: 'فلوغ حماسي للسوشيال ميديا (Energetic Vlog Beat)',
    titleEn: 'Energetic Vlog Beat',
    category: 'upbeat',
    duration: '02:50',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'
  }
];

// Canvas 2D Context for High-Precision Text Measurement
let measureCanvasCtx: CanvasRenderingContext2D | null = null;
function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!measureCanvasCtx) {
    const canvas = document.createElement('canvas');
    measureCanvasCtx = canvas.getContext('2d');
  }
  return measureCanvasCtx;
}

// Compute exact bounding dimensions and wrapped lines for text elements
export function computeTextMetrics(
  text: string,
  fontFamily: string = 'Tajawal, sans-serif',
  fontSize: number = 32,
  fontWeight: string = 'bold',
  fontStyle: string = 'normal',
  maxWidth?: number,
  lineHeightMultiplier: number = 1.25,
  uppercase: boolean = false
): { lines: string[]; width: number; height: number; lineHeight: number } {
  const displayText = uppercase ? text.toUpperCase() : text;
  const ctx = getMeasureCtx();
  const lineHeight = Math.round(fontSize * lineHeightMultiplier);
  
  if (!ctx || !displayText) {
    const rawLines = displayText ? displayText.split('\n') : [''];
    return {
      lines: rawLines,
      width: Math.max(60, (displayText ? displayText.length : 1) * fontSize * 0.6),
      height: Math.max(30, rawLines.length * lineHeight),
      lineHeight
    };
  }

  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  const rawParagraphs = displayText.split('\n');
  const wrappedLines: string[] = [];

  rawParagraphs.forEach(paragraph => {
    if (!paragraph) {
      wrappedLines.push('');
      return;
    }

    if (!maxWidth || maxWidth <= 0) {
      wrappedLines.push(paragraph);
      return;
    }

    const words = paragraph.split(' ');
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = ctx.measureText(testLine).width;
      if (testWidth > maxWidth && currentLine) {
        wrappedLines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      wrappedLines.push(currentLine);
    }
  });

  const maxLineWidth = wrappedLines.reduce((max, line) => {
    const w = ctx.measureText(line).width;
    return w > max ? w : max;
  }, 0);

  const calculatedWidth = Math.max(60, Math.ceil(maxWidth && maxWidth > maxLineWidth ? maxWidth : maxLineWidth));
  const calculatedHeight = Math.max(30, Math.ceil(wrappedLines.length * lineHeight));

  return {
    lines: wrappedLines,
    width: calculatedWidth,
    height: calculatedHeight,
    lineHeight
  };
}

// Helper for generating vector clip paths for frame shapes
export function createFramePath(ctx: CanvasRenderingContext2D, shape: string, x: number, y: number, w: number, h: number) {
  ctx.beginPath();
  switch (shape) {
    case 'circle':
    case 'double_circle':
    case 'gold_luxury':
    case 'neon_cyber':
    case 'dotted_circle':
    case 'circle_3d': {
      const r = Math.min(w, h) / 2;
      ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2);
      break;
    }
    case 'oval': {
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      break;
    }
    case 'rounded': {
      const rad = Math.min(24, Math.min(w, h) * 0.15);
      ctx.roundRect(x, y, w, h, rad);
      break;
    }
    case 'heart': {
      const topH = h * 0.3;
      ctx.moveTo(x + w / 2, y + h);
      ctx.bezierCurveTo(x, y + h * 0.7, x, y + topH, x + w / 4, y + topH);
      ctx.bezierCurveTo(x + w / 2, y + topH, x + w / 2, y + topH + h * 0.1, x + w / 2, y + topH + h * 0.1);
      ctx.bezierCurveTo(x + w / 2, y + topH + h * 0.1, x + w / 2, y + topH, x + (w * 3) / 4, y + topH);
      ctx.bezierCurveTo(x + w, y + topH, x + w, y + h * 0.7, x + w / 2, y + h);
      break;
    }
    case 'star': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const outerR = Math.min(w, h) / 2;
      const innerR = outerR * 0.45;
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case 'arch': {
      const r = w / 2;
      ctx.moveTo(x, y + h);
      ctx.lineTo(x, y + r);
      ctx.arc(x + r, y + r, r, Math.PI, 0, false);
      ctx.lineTo(x + w, y + h);
      ctx.closePath();
      break;
    }
    case 'hexagon': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const rx = w / 2;
      const ry = h / 2;
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 - Math.PI / 6;
        const px = cx + rx * Math.cos(angle);
        const py = cy + ry * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case 'octagon': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const rx = w / 2;
      const ry = h / 2;
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4 - Math.PI / 8;
        const px = cx + rx * Math.cos(angle);
        const py = cy + ry * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case 'polaroid': {
      const margin = w * 0.08;
      ctx.roundRect(x + margin, y + margin, w - margin * 2, h * 0.72, 4);
      break;
    }
    case 'phone': {
      const b = w * 0.05;
      ctx.roundRect(x + b, y + b, w - b * 2, h - b * 2, 20);
      break;
    }
    case 'laptop': {
      ctx.roundRect(x + w * 0.12, y + h * 0.08, w * 0.76, h * 0.68, 6);
      break;
    }
    case 'browser': {
      ctx.rect(x + 2, y + 30, w - 4, h - 32);
      break;
    }
    case 'diamond': {
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h / 2);
      ctx.lineTo(x + w / 2, y + h);
      ctx.lineTo(x, y + h / 2);
      ctx.closePath();
      break;
    }
    case 'flower': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const baseR = Math.min(w, h) / 2;
      for (let a = 0; a <= Math.PI * 2; a += 0.05) {
        const r = baseR * (0.85 + 0.15 * Math.sin(8 * a));
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case 'stamp': {
      const toothR = 4;
      ctx.roundRect(x + toothR, y + toothR, w - toothR * 2, h - toothR * 2, 4);
      break;
    }
    case 'shield': {
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h * 0.25);
      ctx.quadraticCurveTo(x + w, y + h * 0.75, x + w / 2, y + h);
      ctx.quadraticCurveTo(x, y + h * 0.75, x, y + h * 0.25);
      ctx.closePath();
      break;
    }
    case 'blob': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const rx = w / 2;
      const ry = h / 2;
      ctx.moveTo(cx + rx * 0.9, cy);
      ctx.bezierCurveTo(cx + rx, cy - ry * 0.8, cx + rx * 0.2, cy - ry, cx, cy - ry * 0.9);
      ctx.bezierCurveTo(cx - rx * 0.8, cy - ry, cx - rx, cy - ry * 0.2, cx - rx * 0.9, cy);
      ctx.bezierCurveTo(cx - rx, cy + ry * 0.8, cx - rx * 0.3, cy + ry, cx, cy + ry * 0.9);
      ctx.bezierCurveTo(cx + rx * 0.7, cy + ry, cx + rx, cy + ry * 0.5, cx + rx * 0.9, cy);
      ctx.closePath();
      break;
    }
    case 'pill': {
      const r = Math.min(w, h) / 2;
      ctx.roundRect(x, y, w, h, r);
      break;
    }
    case 'ticket': {
      const notchR = Math.min(16, h * 0.2);
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + h / 2 - notchR);
      ctx.arc(x + w, y + h / 2, notchR, -Math.PI / 2, Math.PI / 2, true);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x, y + h / 2 + notchR);
      ctx.arc(x, y + h / 2, notchR, Math.PI / 2, -Math.PI / 2, true);
      ctx.closePath();
      break;
    }
    case 'badge': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const outerR = Math.min(w, h) / 2;
      const innerR = outerR * 0.88;
      const points = 16;
      for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case 'torn_paper': {
      ctx.moveTo(x + 4, y + 4);
      ctx.lineTo(x + w - 4, y + 2);
      ctx.lineTo(x + w - 2, y + h - 6);
      ctx.lineTo(x + w * 0.75, y + h - 2);
      ctx.lineTo(x + w * 0.5, y + h - 8);
      ctx.lineTo(x + w * 0.25, y + h - 3);
      ctx.lineTo(x + 2, y + h - 5);
      ctx.closePath();
      break;
    }
    default: {
      ctx.rect(x, y, w, h);
      break;
    }
  }
}

// Safely normalize raw SVG markup or unencoded data URIs to valid encoded browser URLs
export function safeSvgDataUrl(svgRawOrUrl: string): string {
  if (!svgRawOrUrl || typeof svgRawOrUrl !== 'string') return '';
  if (svgRawOrUrl.startsWith('data:image/svg+xml;utf8,')) {
    const rawSvg = svgRawOrUrl.replace('data:image/svg+xml;utf8,', '');
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(rawSvg)}`;
  }
  if (svgRawOrUrl.startsWith('<svg') || svgRawOrUrl.startsWith('<?xml')) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgRawOrUrl)}`;
  }
  return svgRawOrUrl;
}

// Pure rendering function for drawing elements onto any canvas context
export function renderElementsToCanvas(
  ctx: CanvasRenderingContext2D,
  pageElements: CanvasElement[],
  bgImg: HTMLImageElement | HTMLCanvasElement | null,
  w: number,
  h: number,
  filters: EditorFilters,
  hoveredFrameId?: string | null,
  editingFrameId?: string | null,
  bgColor?: string
) {
  if (!ctx || w === 0 || h === 0) return;
  ctx.clearRect(0, 0, w, h);

  // 1. Render Background with Filters
  if (
    bgImg &&
    ((bgImg instanceof HTMLImageElement && bgImg.complete && bgImg.naturalWidth > 0) ||
     bgImg instanceof HTMLCanvasElement)
  ) {
    ctx.filter = `
      brightness(${filters.brightness}%) 
      contrast(${filters.contrast}%) 
      saturate(${filters.saturation}%) 
      blur(${filters.blur}px) 
      grayscale(${filters.grayscale}%) 
      sepia(${filters.sepia}%)
      hue-rotate(${filters.hueRotate}deg)
      invert(${filters.invert}%)
    `.trim();
    ctx.drawImage(bgImg, 0, 0, w, h);
    ctx.filter = 'none';
  } else {
    ctx.fillStyle = bgColor || '#0f172a';
    ctx.fillRect(0, 0, w, h);
  }

  // 2. Render Page Elements
  pageElements.forEach(el => {
    if (el.hidden) return;

    ctx.save();
    
    let opacity = el.opacity !== undefined ? el.opacity : 1;
    let rotation = el.rotation || 0;

    ctx.globalAlpha = opacity;
    
    // Apply Rotation around element center
    if (rotation !== 0) {
      const cx = el.x + el.w / 2;
      const cy = el.y + el.h / 2;
      ctx.translate(cx, cy);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }
    
    // Apply Rotation around element center
    if (rotation !== 0) {
      const cx = el.x + el.w / 2;
      const cy = el.y + el.h / 2;
      ctx.translate(cx, cy);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    if (el.type === 'draw' && el.points && el.points.length > 0) {
      const sw = el.strokeWidth || 4;
      ctx.strokeStyle = el.color;
      ctx.lineWidth = sw;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (el.brushMode === 'highlighter') {
        ctx.globalAlpha = (el.opacity || 0.45) * 0.45;
        ctx.lineWidth = Math.max(12, sw * 2.5);
      } else if (el.brushMode === 'marker') {
        ctx.lineWidth = Math.max(8, sw * 1.8);
      }
      ctx.beginPath();
      el.points.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
    } else if (el.type === 'text' && el.text) {
      let displayText = el.text;
      if (el.textUppercase) displayText = displayText.toUpperCase();
      const fontSize = el.fontSize || 32;
      const fontFamily = el.fontFamily || 'Tajawal, sans-serif';
      const fontWeight = el.fontWeight || 'bold';
      const fontStyle = el.fontStyle || 'normal';
      const maxWidth = el.w && el.w > 30 ? el.w - 12 : undefined;

      ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.textAlign = el.textAlign || 'center';
      ctx.textBaseline = 'top';

      const metrics = computeTextMetrics(displayText, fontFamily, fontSize, fontWeight, fontStyle, maxWidth, el.textLineHeight || 1.25, false);
      const lines = metrics.lines;
      const lineHeight = metrics.lineHeight;
      const pad = el.textBgPadding !== undefined ? el.textBgPadding : 6;
      const rad = el.textBgCornerRadius !== undefined ? el.textBgCornerRadius : 6;

      if (el.textBgColor && el.textBgColor !== 'transparent') {
        ctx.fillStyle = el.textBgColor;
        ctx.beginPath();
        const bgW = el.w || (metrics.width + pad * 2);
        const bgH = el.h || (metrics.height + pad * 2);
        ctx.roundRect(el.x, el.y, bgW, bgH, rad);
        ctx.fill();
      }

      if (el.textShadow) {
        ctx.shadowColor = el.shadowColor || 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = el.shadowBlur || 8;
        ctx.shadowOffsetX = el.shadowOffsetX || 2;
        ctx.shadowOffsetY = el.shadowOffsetY || 2;
      }

      ctx.fillStyle = el.color;

      lines.forEach((line, idx) => {
        let drawX = el.x;
        const totalW = el.w || metrics.width;
        if (el.textAlign === 'center') drawX = el.x + totalW / 2;
        else if (el.textAlign === 'right') drawX = el.x + totalW;

        const drawY = el.y + idx * lineHeight + 4;

        if (el.textStrokeColor && el.textStrokeWidth) {
          ctx.strokeStyle = el.textStrokeColor;
          ctx.lineWidth = el.textStrokeWidth;
          ctx.strokeText(line, drawX, drawY);
        }
        ctx.fillText(line, drawX, drawY);
      });
    } else if (el.type === 'rect') {
      const sw = el.strokeWidth || 0;
      ctx.fillStyle = el.fillColor || el.color;
      ctx.strokeStyle = el.strokeColor || el.color;
      ctx.lineWidth = sw;
      ctx.beginPath();
      if (el.cornerRadius) {
        ctx.roundRect(el.x, el.y, el.w, el.h, el.cornerRadius);
      } else {
        ctx.rect(el.x, el.y, el.w, el.h);
      }
      if (el.fillColor && el.fillColor !== 'transparent') ctx.fill();
      if (sw > 0) ctx.stroke();
    } else if (el.type === 'circle') {
      const sw = el.strokeWidth || 0;
      ctx.fillStyle = el.fillColor || el.color;
      ctx.strokeStyle = el.strokeColor || el.color;
      ctx.lineWidth = sw;
      ctx.beginPath();
      const radius = Math.min(el.w, el.h) / 2;
      ctx.arc(el.x + radius, el.y + radius, radius, 0, 2 * Math.PI);
      if (el.fillColor && el.fillColor !== 'transparent') ctx.fill();
      if (sw > 0) ctx.stroke();
    } else if (el.type === 'svg' || el.svgPath) {
      if (el.svgPath) {
        ctx.fillStyle = el.color || el.fillColor || '#ffffff';
        ctx.save();
        ctx.translate(el.x, el.y);
        const scaleX = (el.w || 48) / 24;
        const scaleY = (el.h || 48) / 24;
        ctx.scale(scaleX, scaleY);
        try {
          const path = new Path2D(el.svgPath);
          ctx.fill(path);
        } catch {}
        ctx.restore();
      }
    } else if (el.type === 'frame' || el.frameShape) {
      const shape = el.frameShape || 'circle';
      const frameW = el.w || 200;
      const frameH = el.h || 200;
      const x = el.x;
      const y = el.y;

      // 1. Draw Frame Outer Body / Backdrop for Special Frame Mockups
      if (shape === 'polaroid') {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;
        ctx.beginPath();
        ctx.roundRect(x, y, frameW, frameH, 8);
        ctx.fill();
        ctx.shadowColor = 'transparent';
      } else if (shape === 'phone') {
        ctx.fillStyle = el.color || '#1e293b';
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.roundRect(x, y, frameW, frameH, 28);
        ctx.fill();
        ctx.shadowColor = 'transparent';
      } else if (shape === 'laptop') {
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.roundRect(x + frameW * 0.08, y, frameW * 0.84, frameH * 0.8, 8);
        ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.roundRect(x, y + frameH * 0.8, frameW, frameH * 0.15, 6);
        ctx.fill();
      } else if (shape === 'browser') {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(x, y, frameW, frameH, 10);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.roundRect(x, y, frameW, 30, [10, 10, 0, 0]);
        ctx.fill();
        const dotY = y + 15;
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(x + 16, dotY, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(x + 28, dotY, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#10b981'; ctx.beginPath(); ctx.arc(x + 40, dotY, 4, 0, Math.PI * 2); ctx.fill();
      } else if (shape === 'gold_luxury') {
        const g = ctx.createLinearGradient(x, y, x + frameW, y + frameH);
        g.addColorStop(0, '#f59e0b');
        g.addColorStop(0.5, '#fef08a');
        g.addColorStop(1, '#d97706');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(x - 6, y - 6, frameW + 12, frameH + 12, 12);
        ctx.fill();
      }

      // Translucent Ghost Unclipped Image Preview for Active In-Frame Crop Mode
      let ghostFrameImg: any = el.frameImgElement;
      const isGhostValid = ghostFrameImg && (ghostFrameImg instanceof HTMLImageElement || ghostFrameImg instanceof HTMLCanvasElement);
      if (!isGhostValid && el.frameImgSrc) {
        if (previewImageCache.has(el.frameImgSrc)) {
          ghostFrameImg = previewImageCache.get(el.frameImgSrc);
          el.frameImgElement = ghostFrameImg;
        } else {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = el.frameImgSrc;
          img.onload = () => {
            el.frameImgElement = img;
          };
          previewImageCache.set(el.frameImgSrc, img);
          ghostFrameImg = img;
        }
      }

      if (
        editingFrameId === el.id &&
        ghostFrameImg &&
        ((ghostFrameImg instanceof HTMLImageElement && ghostFrameImg.complete && ghostFrameImg.naturalWidth > 0) ||
         (ghostFrameImg instanceof HTMLCanvasElement))
      ) {
        const imgW = (ghostFrameImg as HTMLImageElement).naturalWidth || ghostFrameImg.width || 400;
        const imgH = (ghostFrameImg as HTMLImageElement).naturalHeight || ghostFrameImg.height || 400;

        let areaX = x, areaY = y, areaW = frameW, areaH = frameH;
        if (shape === 'polaroid') {
          const margin = frameW * 0.08;
          areaX = x + margin; areaY = y + margin;
          areaW = frameW - margin * 2; areaH = frameH * 0.72;
        } else if (shape === 'phone') {
          const b = frameW * 0.05;
          areaX = x + b; areaY = y + b; areaW = frameW - b * 2; areaH = frameH - b * 2;
        } else if (shape === 'laptop') {
          areaX = x + frameW * 0.12; areaY = y + frameH * 0.08;
          areaW = frameW * 0.76; areaH = frameH * 0.68;
        } else if (shape === 'browser') {
          areaY = y + 30; areaH = frameH - 30;
        }

        const userScale = el.frameImgScale || 1;
        const scale = Math.max(areaW / imgW, areaH / imgH) * userScale;
        const drawW = imgW * scale;
        const drawH = imgH * scale;

        const offsetX = el.frameImgOffsetX || 0;
        const offsetY = el.frameImgOffsetY || 0;
        
        const drawX = areaX + (areaW - drawW) / 2 + offsetX;
        const drawY = areaY + (areaH - drawH) / 2 + offsetY;

        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.drawImage(ghostFrameImg, drawX, drawY, drawW, drawH);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(drawX, drawY, drawW, drawH);
        ctx.restore();
      }

      // 2. Save Context & Create Mask Path for Photo Clipping
      ctx.save();
      createFramePath(ctx, shape, x, y, frameW, frameH);
      ctx.clip();

      // 3. Render Loaded Image or Placeholder Fill inside Frame Path
      let frameImg: any = el.frameImgElement;
      const isFrameImgValid = frameImg && (frameImg instanceof HTMLImageElement || frameImg instanceof HTMLCanvasElement);
      if (!isFrameImgValid && el.frameImgSrc) {
        if (previewImageCache.has(el.frameImgSrc)) {
          frameImg = previewImageCache.get(el.frameImgSrc);
          el.frameImgElement = frameImg;
        } else {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = el.frameImgSrc;
          img.onload = () => {
            el.frameImgElement = img;
          };
          previewImageCache.set(el.frameImgSrc, img);
          frameImg = img;
        }
      }

      if (
        frameImg &&
        ((frameImg instanceof HTMLImageElement && frameImg.complete && frameImg.naturalWidth > 0) ||
         frameImg instanceof HTMLCanvasElement)
      ) {
        const imgW = (frameImg as HTMLImageElement).naturalWidth || frameImg.width || 400;
        const imgH = (frameImg as HTMLImageElement).naturalHeight || frameImg.height || 400;

        let areaX = x, areaY = y, areaW = frameW, areaH = frameH;
        if (shape === 'polaroid') {
          const margin = frameW * 0.08;
          areaX = x + margin; areaY = y + margin;
          areaW = frameW - margin * 2; areaH = frameH * 0.72;
        } else if (shape === 'phone') {
          const b = frameW * 0.05;
          areaX = x + b; areaY = y + b; areaW = frameW - b * 2; areaH = frameH - b * 2;
        } else if (shape === 'laptop') {
          areaX = x + frameW * 0.12; areaY = y + frameH * 0.08;
          areaW = frameW * 0.76; areaH = frameH * 0.68;
        } else if (shape === 'browser') {
          areaY = y + 30; areaH = frameH - 30;
        }

        const userScale = el.frameImgScale || 1;
        const scale = Math.max(areaW / imgW, areaH / imgH) * userScale;
        const drawW = imgW * scale;
        const drawH = imgH * scale;

        const offsetX = el.frameImgOffsetX || 0;
        const offsetY = el.frameImgOffsetY || 0;

        const drawX = areaX + (areaW - drawW) / 2 + offsetX;
        const drawY = areaY + (areaH - drawH) / 2 + offsetY;

        ctx.drawImage(frameImg, drawX, drawY, drawW, drawH);
      } else {
        ctx.fillStyle = el.frameBgColor || '#f8fafc';
        ctx.fillRect(x, y, frameW, frameH);

        ctx.strokeStyle = el.frameBorderColor || el.color || '#6366f1';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        createFramePath(ctx, shape, x + 6, y + 6, frameW - 12, frameH - 12);
        ctx.stroke();
        ctx.setLineDash([]);

        const cx = x + frameW / 2;
        const cy = y + frameH / 2;
        ctx.fillStyle = el.frameBorderColor || el.color || '#6366f1';
        
        ctx.beginPath();
        ctx.roundRect(cx - 16, cy - 18, 32, 22, 4);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy - 7, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = el.frameBorderColor || el.color || '#4338ca';
        ctx.font = 'bold 12px Tajawal, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('+ إضافة صورة', cx, cy + 14);
      }
      ctx.restore();

      // 4. Draw Outer Frame Borders, Rings & Accents
      const borderWidth = el.frameBorderWidth !== undefined ? el.frameBorderWidth : (el.frameImgSrc ? 0 : 2);
      if (borderWidth > 0 && !['polaroid', 'phone', 'laptop', 'browser', 'double_circle', 'dotted_circle', 'neon_cyber', 'gold_luxury', 'circle_3d'].includes(shape)) {
        ctx.strokeStyle = el.frameBorderColor || el.color || '#6366f1';
        ctx.lineWidth = borderWidth;
        createFramePath(ctx, shape, x, y, frameW, frameH);
        ctx.stroke();
      }

      if (shape === 'double_circle') {
        ctx.strokeStyle = el.frameBorderColor || '#f59e0b';
        ctx.lineWidth = 3;
        const r = Math.min(frameW, frameH) / 2;
        ctx.beginPath();
        ctx.arc(x + frameW / 2, y + frameH / 2, Math.max(2, r - 6), 0, Math.PI * 2);
        ctx.stroke();
      } else if (shape === 'dotted_circle') {
        ctx.save();
        ctx.strokeStyle = el.frameBorderColor || '#ec4899';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        const r = Math.min(frameW, frameH) / 2;
        ctx.beginPath();
        ctx.arc(x + frameW / 2, y + frameH / 2, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (shape === 'neon_cyber') {
        ctx.save();
        ctx.strokeStyle = el.frameBorderColor || '#06b6d4';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 12;
        const r = Math.min(frameW, frameH) / 2;
        ctx.beginPath();
        ctx.arc(x + frameW / 2, y + frameH / 2, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (shape === 'gold_luxury') {
        ctx.save();
        const g = ctx.createLinearGradient(x, y, x + frameW, y + frameH);
        g.addColorStop(0, '#f59e0b');
        g.addColorStop(0.5, '#fef08a');
        g.addColorStop(1, '#d97706');
        ctx.strokeStyle = g;
        ctx.lineWidth = 5;
        const r = Math.min(frameW, frameH) / 2;
        ctx.beginPath();
        ctx.arc(x + frameW / 2, y + frameH / 2, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (shape === 'circle_3d') {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 3;
        const r = Math.min(frameW, frameH) / 2;
        ctx.beginPath();
        ctx.arc(x + frameW / 2, y + frameH / 2, Math.max(2, r - 3), -Math.PI / 4, (3 * Math.PI) / 4);
        ctx.stroke();
        ctx.restore();
      } else if (shape === 'phone') {
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.roundRect(x + frameW / 2 - 24, y + 8, 48, 12, 6);
        ctx.fill();
      }

      // Active Frame Hover / Drop Target Highlight
      if (hoveredFrameId === el.id) {
        ctx.save();
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 16;
        ctx.setLineDash([8, 8]);
        createFramePath(ctx, shape, x - 2, y - 2, frameW + 4, frameH + 4);
        ctx.stroke();
        ctx.setLineDash([]);

        const badgeW = 130;
        const badgeH = 26;
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.roundRect(x + frameW / 2 - badgeW / 2, y + frameH / 2 - badgeH / 2, badgeW, badgeH, 13);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Tajawal, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✨ أفلت لإدراج الصورة', x + frameW / 2, y + frameH / 2 + 4);
        ctx.restore();
      }

      // Active In-Frame Crop Mode Highlight Indicator
      if (editingFrameId === el.id) {
        ctx.save();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 14;
        ctx.setLineDash([6, 6]);
        createFramePath(ctx, shape, x - 2, y - 2, frameW + 4, frameH + 4);
        ctx.stroke();
        ctx.setLineDash([]);

        const badgeW = 165;
        const badgeH = 26;
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.roundRect(x + frameW / 2 - badgeW / 2, y - 32, badgeW, badgeH, 13);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Tajawal, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✥ اسحب الصورة للتحريك والضبط', x + frameW / 2, y - 15);
        ctx.restore();
      }
    } else if (el.type === 'sticker' || el.imgSrc) {
      let stickerImg: any = el.imgElement;
      if (!stickerImg && el.imgSrc) {
        if (previewImageCache.has(el.imgSrc)) {
          stickerImg = previewImageCache.get(el.imgSrc);
        } else {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = el.imgSrc;
          previewImageCache.set(el.imgSrc, img);
          stickerImg = img;
        }
      }
      if (
        stickerImg &&
        ((stickerImg instanceof HTMLImageElement && stickerImg.complete && stickerImg.naturalWidth > 0) ||
         stickerImg instanceof HTMLCanvasElement)
      ) {
        ctx.drawImage(stickerImg, el.x, el.y, el.w, el.h);
      }
    }
    ctx.restore();
  });
}

const previewImageCache = new Map<string, HTMLImageElement>();

// Sub-component for rendering non-active page previews in vertical scroll stage
const PageCanvasPreview: React.FC<{
  elements: CanvasElement[];
  imageSize: { width: number; height: number };
  bgImgSrc?: string;
  bgColor?: string;
  defaultBgImg?: HTMLImageElement | HTMLCanvasElement | null;
  filters: EditorFilters;
}> = ({ elements, imageSize, bgImgSrc, bgColor, defaultBgImg, filters }) => {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const hoveredFrameId = null;
  const editingFrameId = null;

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || imageSize.width === 0 || imageSize.height === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = imageSize.width;
    canvas.height = imageSize.height;

    let targetBg: HTMLImageElement | HTMLCanvasElement | null = defaultBgImg || null;

    if (bgImgSrc) {
      if (previewImageCache.has(bgImgSrc)) {
        targetBg = previewImageCache.get(bgImgSrc)!;
      } else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = bgImgSrc;
        previewImageCache.set(bgImgSrc, img);
        img.onload = () => {
          if (previewCanvasRef.current) {
            const freshCtx = previewCanvasRef.current.getContext('2d');
            if (freshCtx) {
              renderElementsToCanvas(freshCtx, elements, img, imageSize.width, imageSize.height, filters, null, null, bgColor);
            }
          }
        };
      }
    }

    renderElementsToCanvas(ctx, elements, targetBg, imageSize.width, imageSize.height, filters, hoveredFrameId, editingFrameId, bgColor);
  }, [elements, imageSize, bgImgSrc, bgColor, defaultBgImg, filters]);

  return (
    <canvas 
      ref={previewCanvasRef} 
      className="block w-full h-full bg-white select-none pointer-events-none rounded-shape-xs"
    />
  );
};

const sanitizeElementsForStorage = (elementsArray: CanvasElement[]): CanvasElement[] => {
  if (!elementsArray || !Array.isArray(elementsArray)) return elementsArray;
  return elementsArray.map(el => {
    const { frameImgElement, imgElement, ...rest } = el;
    return rest;
  });
};

const sanitizePagesForStorage = (pagesArray: any[]): any[] => {
  if (!pagesArray || !Array.isArray(pagesArray)) return pagesArray;
  return pagesArray.map(page => ({
    ...page,
    elements: sanitizeElementsForStorage(page.elements || [])
  }));
};

export const ArtifactImageEditor: React.FC<ArtifactImageEditorProps> = ({ 
  artifact,
  initialElements,
  initialFilters,
  initialImageSize,
  projectId,
  onSaveProject,
  onClose,
  isFullscreen = false,
  onToggleFullscreen,
  initialPages,
  initialCurrentPageIndex,
  isInChat = false
}) => {
  const { language, setLanguage, dir, theme, siteSettings, user, setIsAuthModalOpen } = useAppContext();
  const navigate = useNavigate();
  const isAr = language === 'ar' || dir === 'rtl';

  // Projects, Creators, and Session States
  const [currentProjId, setCurrentProjId] = useState<string | undefined>(projectId);
  const [isUserRegisteredCreator, setIsUserRegisteredCreator] = useState<boolean>(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState<boolean>(false);
  const [userProjects, setUserProjects] = useState<StudioProject[]>([]);
  const [projectSearchQuery, setProjectSearchQuery] = useState<string>('');

  const refreshUserProjects = useCallback(() => {
    if (user?.id) {
      setUserProjects(getUserStudioProjects(user.id));
    } else {
      setUserProjects([]);
    }
  }, [user]);

  useEffect(() => {
    refreshUserProjects();
  }, [user, refreshUserProjects]);

  useEffect(() => {
    async function checkCreatorStatus() {
      if (!user) {
        setIsUserRegisteredCreator(false);
        return;
      }
      try {
        const creators = await getStoredCreators();
        const status = creators.some((c: any) => 
          (c.email && (c as any).email === user.email) ||
          (c.name && c.name.toLowerCase() === user.name.toLowerCase()) ||
          ((user as any)?.username && c.username.toLowerCase() === (user as any).username.toLowerCase())
        );
        setIsUserRegisteredCreator(status);
      } catch (err) {
        console.error('Error checking creator status:', err);
        setIsUserRegisteredCreator(false);
      }
    }
    checkCreatorStatus();
  }, [user]);

  const handleOpenProjectInternally = (proj: StudioProject) => {
    recordHistory();
    setElements(JSON.parse(JSON.stringify(proj.elements || [])));
    if (proj.filters) setFilters(proj.filters);
    if (proj.width && proj.height) {
      setImageSize({ width: proj.width, height: proj.height });
      setCustomCanvasWidth(proj.width);
      setCustomCanvasHeight(proj.height);
    }
    setDesignTitle(proj.title);
    if ((proj as any).pages && Array.isArray((proj as any).pages) && (proj as any).pages.length > 0) {
      setPages((proj as any).pages);
      setCurrentPageIndex(0);
    } else {
      setPages([{
        id: `page-${Date.now()}`,
        title: proj.title,
        elements: JSON.parse(JSON.stringify(proj.elements || [])),
        bgImgSrc: safeSvgDataUrl(proj.canvasBackground || proj.previewUrl)
      }]);
      setCurrentPageIndex(0);
    }
    setCurrentProjId(proj.id);
    
    // Save to active session storage immediately
    try {
      localStorage.setItem('rataq_studio_session_active', 'true');
      localStorage.setItem('rataq_studio_session_projectId', proj.id);
      localStorage.setItem('rataq_studio_session_designTitle', proj.title);
      localStorage.setItem('rataq_studio_session_elements', JSON.stringify(proj.elements || []));
      if (proj.filters) localStorage.setItem('rataq_studio_session_filters', JSON.stringify(proj.filters));
      localStorage.setItem('rataq_studio_session_imageSize', JSON.stringify({ width: proj.width, height: proj.height }));
    } catch (e) {}

    toast.success(isAr ? `تم فتح مشروع "${proj.title}" بنجاح ✨` : `Opened project "${proj.title}" successfully ✨`);
    setIsSidebarOpen(false);
  };

  const handleDeleteProjectInternally = (projId: string) => {
    if (!user?.id) return;
    try {
      deleteUserStudioProject(user.id, projId);
      refreshUserProjects();
      toast.success(isAr ? 'تم حذف المشروع بنجاح' : 'Project deleted successfully');
      if (currentProjId === projId) {
        setCurrentProjId(undefined);
        localStorage.removeItem('rataq_studio_session_projectId');
      }
    } catch (e) {
      toast.error(isAr ? 'تعذر حذف المشروع' : 'Could not delete project');
    }
  };

  const handleDuplicateProjectInternally = (projId: string) => {
    if (!user?.id) return;
    try {
      duplicateUserStudioProject(user.id, projId);
      refreshUserProjects();
      toast.success(isAr ? 'تم تكرار المشروع بنجاح ✨' : 'Project duplicated successfully ✨');
    } catch (e) {
      toast.error(isAr ? 'تعذر تكرار المشروع' : 'Could not duplicate project');
    }
  };

  const brandLogo = (theme === 'dark' ? siteSettings?.logoBase64 : (siteSettings?.logoLightBase64 || siteSettings?.logoBase64));
  const siteLogoUrl = brandLogo ? resolveImageUrl(brandLogo, 'general') : '/brand/default-logo.svg';

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileUploadInputRef = useRef<HTMLInputElement>(null);
  const brandLogoInputRef = useRef<HTMLInputElement>(null);
  const brandFontInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [customCanvasWidth, setCustomCanvasWidth] = useState<number>(1080);
  const [customCanvasHeight, setCustomCanvasHeight] = useState<number>(1080);

  const handleCreateNewDesign = (width: number, height: number, customTitle?: string) => {
    recordHistory();
    const defaultId = `project-user-${Date.now()}`;
    const title = customTitle || (isAr ? 'تصميم جديد بدون عنوان' : 'Untitled Design');
    
    // Create a default simple canvas image background
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, '#f8fafc');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
    const defaultBg = canvas.toDataURL('image/png');

    const newProj: StudioProject = {
      id: defaultId,
      userId: String(user?.id || 'guest'),
      title,
      previewUrl: defaultBg,
      width,
      height,
      canvasBackground: defaultBg,
      elements: [],
      filters: {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0,
        grayscale: 0,
        sepia: 0,
        hueRotate: 0,
        invert: 0
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setElements([]);
    if (newProj.filters) setFilters(newProj.filters);
    setImageSize({ width, height });
    setCustomWidth(width);
    setCustomHeight(height);
    setDesignTitle(title);
    setPages([{ id: `page-${Date.now()}`, title: isAr ? 'الصفحة الأولى' : 'Page 1', elements: [] }]);
    setCurrentPageIndex(0);
    setCurrentProjId(defaultId);

    // Save to active session storage immediately
    try {
      localStorage.setItem('rataq_studio_session_active', 'true');
      localStorage.setItem('rataq_studio_session_projectId', defaultId);
      localStorage.setItem('rataq_studio_session_designTitle', title);
      localStorage.setItem('rataq_studio_session_elements', '[]');
      localStorage.setItem('rataq_studio_session_imageSize', JSON.stringify({ width, height }));
    } catch (e) {}

    // Save project so it displays in My Projects
    try {
      saveUserStudioProject(user?.id, newProj);
      refreshUserProjects();
    } catch (err) {}

    setTimeout(() => {
      fitImageToContainer(width, height);
    }, 60);

    toast.success(isAr ? `تم إنشاء تصميم جديد بمقاس ${width} × ${height} بكسل` : `Created a new design at ${width} × ${height} px`);
    setIsSidebarOpen(false); // Close sidebar so they can start editing!
  };

  // Active Tool & Navigation
  const [activeSidebarTab, setActiveSidebarTab] = useState<'create' | 'projects' | 'templates' | 'fonts' | 'elements' | 'photos' | 'background' | 'colors' | 'effects' | 'animations' | 'transitions' | 'text' | 'brand' | 'uploads' | 'magic_eraser' | 'brush' | 'filters' | 'layers' | 'shapes' | 'stickers' | 'audio'>(() => user ? 'create' : 'templates');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [selectedTemplateCat, setSelectedTemplateCat] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('rataq_studio_session_templateCategory');
      if (stored) return stored;
    } catch {}
    return 'all';
  });

  const [templateSearchQuery, setTemplateSearchQuery] = useState<string>('');
  const [templateViewColumns, setTemplateViewColumns] = useState<1 | 2>(2);
  const [filterTemplatesByDimensions, setFilterTemplatesByDimensions] = useState<boolean>(true);
  const [createPresetCategory, setCreatePresetCategory] = useState<string>('all');
  const [createPresetSearch, setCreatePresetSearch] = useState<string>('');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [chatPromptInput, setChatPromptInput] = useState<string>('');
  const [activeTool, setActiveTool] = useState<'select' | 'draw' | 'text' | 'rect' | 'circle' | 'arrow' | 'star' | 'eraser'>('select');
  const [communityTemplates, setCommunityTemplates] = useState<any[]>([]);

  useEffect(() => {
    async function loadCommunityTemplates() {
      try {
        const list = await getStoredMarketplaceTemplates();
        const converted = list.map(m => convertMarketplaceToStudioTemplate(m));
        setCommunityTemplates(converted);
      } catch (err) {
        console.error('Error loading community templates in editor:', err);
      }
    }
    loadCommunityTemplates();
  }, []);

  // Dedicated Drawers States
  const [fontSearchQuery, setFontSearchQuery] = useState<string>('');
  const [selectedFontCat, setSelectedFontCat] = useState<'all' | 'arabic' | 'english' | 'kufi' | 'naskh' | 'display' | 'brand'>('all');
  const [favoriteFonts, setFavoriteFonts] = useState<string[]>(['tajawal', 'cairo', 'amiri', 'alexandria']);
  const [fontPreviewText, setFontPreviewText] = useState<string>('');

  const [photoSearchQuery, setPhotoSearchQuery] = useState<string>('');
  const [selectedPhotoCat, setSelectedPhotoCat] = useState<'all' | 'business' | 'nature' | 'tech' | 'abstract' | 'people'>('all');

  const [bgSearchQuery, setBgSearchQuery] = useState<string>('');
  const [selectedBgCat, setSelectedBgCat] = useState<'all' | 'trending' | 'ai' | 'tech' | 'wallpaper' | 'texture' | 'abstract' | 'nature' | 'luxury' | 'gradient' | 'solid'>('all');
  const [bgOpacity, setBgOpacity] = useState<number>(1);

  const [elementSearchQuery, setElementSearchQuery] = useState<string>('');
  const [selectedElementCat, setSelectedElementCat] = useState<'all' | 'social' | 'frames' | 'app_icons' | 'shapes' | 'badges'>('all');

  const [selectedEffectId, setSelectedEffectId] = useState<string>('none');
  const [selectedAnimationId, setSelectedAnimationId] = useState<string>('typewriter');
  const [animationSpeed, setAnimationSpeed] = useState<number>(1);
  const [animationDirection, setAnimationDirection] = useState<'right' | 'left' | 'top' | 'bottom'>('right');
  const [isAnimationPlaying, setIsAnimationPlaying] = useState<boolean>(false);
  const [typewriterSpeed, setTypewriterSpeed] = useState<number>(15); // characters per sec

  // -------------------------------------------------------------
  // RINEX MOTION VIDEO STUDIO & SMART WORKSPACE ROUTER STATES
  // -------------------------------------------------------------
  const [studioMode, setStudioMode] = useState<'image' | 'video'>(() => {
    try {
      const storedVideo = localStorage.getItem('rataq_studio_session_isVideo');
      if (storedVideo === 'true') return 'video';
      
      const title = (artifact?.title || '').toLowerCase();
      const content = (artifact?.content || '').toLowerCase();
      const cat = (localStorage.getItem('rataq_studio_session_templateCategory') || '').toLowerCase();
      
      if (
        title.includes('reel') || title.includes(' video') || title.includes('فيديو') || title.includes('ريلز') ||
        cat.includes('reels') || cat.includes('video') || cat.includes('story') ||
        content.endsWith('.mp4') || content.includes('previews/')
      ) {
        return 'video';
      }
    } catch (e) {}
    return 'image';
  });

  // Video Scenes & Multi-Track Timeline State
  const [videoScenes, setVideoScenes] = useState<Array<{
    id: string;
    durationSeconds: number;
    backgroundColor: string;
    backgroundImage?: string;
    bgImgSrc?: string;
    elements: CanvasElement[];
    transitionToNext?: {
      type: 'none' | 'dissolve' | 'slide' | 'wipe' | 'flow' | 'circle' | 'split';
      durationSeconds: number;
      direction?: 'left' | 'right' | 'top' | 'bottom';
    };
  }>>(() => [
    {
      id: 'scene-1',
      durationSeconds: 5.0,
      backgroundColor: '#090d16',
      elements: initialElements && initialElements.length > 0 ? initialElements : [
        {
          id: 'sc1-txt-1',
          type: 'text',
          name: 'Scene 1 Title',
          x: 180,
          y: 360,
          w: 720,
          h: 140,
          text: 'مرحباً بك في عالم المونتاج والفيديو 🎬',
          color: '#ffffff',
          fontSize: 48,
          fontFamily: 'Tajawal, sans-serif',
          fontWeight: 'bold',
          textAlign: 'center',
          animation: 'fade'
        }
      ],
      transitionToNext: { type: 'dissolve', durationSeconds: 0.5, direction: 'right' }
    },
    {
      id: 'scene-2',
      durationSeconds: 4.0,
      backgroundColor: '#1e1b4b',
      elements: [
        {
          id: 'sc2-txt-1',
          type: 'text',
          name: 'Scene 2 Title',
          x: 200,
          y: 400,
          w: 680,
          h: 120,
          text: 'رينكس فيديو استوديو ✨',
          color: '#38bdf8',
          fontSize: 52,
          fontFamily: 'Tajawal, sans-serif',
          fontWeight: 'bold',
          textAlign: 'center',
          animation: 'bounce'
        }
      ],
      transitionToNext: { type: 'slide', durationSeconds: 0.5, direction: 'left' }
    },
    {
      id: 'scene-3',
      durationSeconds: 4.5,
      backgroundColor: '#022c22',
      elements: [
        {
          id: 'sc3-txt-1',
          type: 'text',
          name: 'Scene 3 Title',
          x: 180,
          y: 420,
          w: 720,
          h: 130,
          text: 'تصميم مقاطع فيديو باحترافية عالية 🔥',
          color: '#34d399',
          fontSize: 44,
          fontFamily: 'Tajawal, sans-serif',
          fontWeight: 'bold',
          textAlign: 'center',
          animation: 'zoom'
        }
      ],
      transitionToNext: { type: 'wipe', durationSeconds: 0.5, direction: 'top' }
    },
    {
      id: 'scene-4',
      durationSeconds: 5.0,
      backgroundColor: '#31124b',
      elements: [
        {
          id: 'sc4-txt-1',
          type: 'text',
          name: 'Scene 4 Title',
          x: 220,
          y: 400,
          w: 640,
          h: 140,
          text: 'انضم إلينا وابدأ المونتاج الآن 🚀',
          color: '#f43f5e',
          fontSize: 48,
          fontFamily: 'Tajawal, sans-serif',
          fontWeight: 'bold',
          textAlign: 'center',
          animation: 'fade'
        }
      ],
      transitionToNext: { type: 'flow', durationSeconds: 0.5, direction: 'right' }
    }
  ]);

  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
  const [isPlayingVideoTimeline, setIsPlayingVideoTimeline] = useState<boolean>(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0); // seconds
  const [timelineZoom, setTimelineZoom] = useState<number>(1);
  const [isFullscreenVideoPreview, setIsFullscreenVideoPreview] = useState<boolean>(false);
  const [isExportVideoModalOpen, setIsExportVideoModalOpen] = useState<boolean>(false);
  const [videoExportQuality, setVideoExportQuality] = useState<'1080p' | '4k' | '720p'>('1080p');
  const [videoExportFPS, setVideoExportFPS] = useState<30 | 60>(30);
  const [selectedTransitionSceneIndex, setSelectedTransitionSceneIndex] = useState<number | null>(null);

  // Audio Track & Soundtrack Engine State
  const [activeAudioTrack, setActiveAudioTrack] = useState<{
    id: string;
    titleAr: string;
    titleEn: string;
    url: string;
    volume: number;
    isMuted: boolean;
  } | null>(() => ({
    id: 'track-arabic-oud',
    titleAr: 'عود شرقي سينمائي أنيق (Rinex Oud)',
    titleEn: 'Cinematic Arabic Oud & Ambient',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    volume: 0.8,
    isMuted: false
  }));

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize and Sync Audio Element
  useEffect(() => {
    if (!activeAudioTrack || !activeAudioTrack.url) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return;
    }

    if (!audioRef.current || audioRef.current.src !== activeAudioTrack.url) {
      audioRef.current = new Audio(activeAudioTrack.url);
      audioRef.current.loop = true;
    }

    audioRef.current.volume = activeAudioTrack.isMuted ? 0 : activeAudioTrack.volume;
    audioRef.current.muted = activeAudioTrack.isMuted;
  }, [activeAudioTrack]);

  // Video Timeline Playback Loop & Audio Sync
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const totalDuration = videoScenes.reduce((acc, sc) => acc + (sc.durationSeconds || 5), 0);

    if (isPlayingVideoTimeline) {
      if (audioRef.current) {
        try {
          audioRef.current.currentTime = videoCurrentTime % (audioRef.current.duration || 30);
          audioRef.current.play().catch(() => {});
        } catch (e) {}
      }

      const updateTick = (now: number) => {
        const deltaSeconds = (now - lastTime) / 1000;
        lastTime = now;

        setVideoCurrentTime(prev => {
          const nextTime = prev + deltaSeconds;
          if (nextTime >= totalDuration) {
            if (audioRef.current) {
              try { audioRef.current.currentTime = 0; } catch (e) {}
            }
            return 0;
          }
          return nextTime;
        });

        animationFrameId = requestAnimationFrame(updateTick);
      };

      animationFrameId = requestAnimationFrame(updateTick);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isPlayingVideoTimeline, videoScenes]);

  // Switch Active Video Scene (Restores Scene Elements & Scene Background)
  const drawCanvasRef = useRef<(() => void) | null>(null);

  const switchActiveScene = useCallback((targetIdx: number, scenesList = videoScenes) => {
    if (targetIdx < 0 || targetIdx >= scenesList.length) return;
    const sc = scenesList[targetIdx];
    if (!sc) return;

    setActiveSceneIndex(targetIdx);

    // 1. Sync Elements
    if (sc.elements) {
      setElements(JSON.parse(JSON.stringify(sc.elements)));
    } else {
      setElements([]);
    }

    // 2. Sync Background Image / Background Color
    const bgImg = sc.backgroundImage || sc.bgImgSrc;
    if (bgImg && typeof bgImg === 'string' && (bgImg.startsWith('data:') || bgImg.startsWith('http') || bgImg.startsWith('/'))) {
      const img = new Image();
      if (bgImg.startsWith('http')) img.crossOrigin = 'anonymous';
      img.src = bgImg;
      img.onload = () => {
        imageRef.current = img;
        drawCanvasRef.current?.();
      };
      img.onerror = () => {
        imageRef.current = null;
        drawCanvasRef.current?.();
      };
    } else {
      imageRef.current = null;
      drawCanvasRef.current?.();
    }
  }, [videoScenes]);

  // Sync Active Scene Index with videoCurrentTime
  useEffect(() => {
    if (!isPlayingVideoTimeline) return;

    let accumulatedTime = 0;
    for (let i = 0; i < videoScenes.length; i++) {
      const sc = videoScenes[i];
      const scDuration = sc.durationSeconds || 5;
      if (videoCurrentTime >= accumulatedTime && videoCurrentTime < accumulatedTime + scDuration) {
        if (activeSceneIndex !== i) {
          switchActiveScene(i);
        }
        break;
      }
      accumulatedTime += scDuration;
    }
  }, [videoCurrentTime, videoScenes, isPlayingVideoTimeline, activeSceneIndex, switchActiveScene]);

  // Magic Eraser State
  const [eraserBrushSize, setEraserBrushSize] = useState<number>(32);
  const [eraserPoints, setEraserPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [isErasing, setIsErasing] = useState<boolean>(false);
  const [eraserCursorPos, setEraserCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Replace Background Modal State
  const [isReplaceBgModalOpen, setIsReplaceBgModalOpen] = useState<boolean>(false);

  // User Uploads & Media Assets State
  const [uploads, setUploads] = useState<StudioUploadItem[]>(() => getStoredStudioUploads(user?.id));
  const [uploadCategory, setUploadCategory] = useState<'all' | 'image' | 'font' | 'pdf'>('all');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  // User Brand Kit State
  const [brandKit, setBrandKit] = useState<StudioBrandKit>(() => getStoredBrandKit(user?.id, siteSettings));
  const [customBrandColorInput, setCustomBrandColorInput] = useState<string>('#f43f5e');

  // Elements & Selection State
  const [elements, setElements] = useState<CanvasElement[]>(() => {
    if (initialElements && initialElements.length > 0) return initialElements;
    try {
      const backupRaw = localStorage.getItem('perplexta_image_editor_session_backup');
      if (backupRaw) {
        const parsed = JSON.parse(backupRaw);
        if (parsed.elements && Array.isArray(parsed.elements) && parsed.elements.length > 0) {
          return parsed.elements;
        }
      }
      const storedEl = localStorage.getItem('rataq_studio_session_elements');
      if (storedEl) {
        const parsed = JSON.parse(storedEl);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return initialElements || [];
  });

  // Keep active video scene elements in sync with canvas elements and auto-save
  useEffect(() => {
    if (studioMode !== 'video') return;
    setVideoScenes(prevScenes => {
      if (!prevScenes[activeSceneIndex]) return prevScenes;
      const currentScene = prevScenes[activeSceneIndex];
      if (currentScene.elements === elements) return prevScenes;

      const updated = [...prevScenes];
      updated[activeSceneIndex] = {
        ...currentScene,
        elements: elements
      };
      return updated;
    });
  }, [elements, activeSceneIndex, studioMode]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState<string>('');

  // Global Brush / Styling State
  const [activeColor, setActiveColor] = useState<string>('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [brushMode, setBrushMode] = useState<'pen' | 'highlighter' | 'marker'>('pen');
  const [brushOpacity, setBrushOpacity] = useState<number>(1);

  // Image Filters State
  const [filters, setFilters] = useState<EditorFilters>(() => {
    if (initialFilters) return initialFilters;
    try {
      const backupRaw = localStorage.getItem('perplexta_image_editor_session_backup');
      if (backupRaw) {
        const parsed = JSON.parse(backupRaw);
        if (parsed.filters) return parsed.filters;
      }
      const storedF = localStorage.getItem('rataq_studio_session_filters');
      if (storedF) {
        const parsed = JSON.parse(storedF);
        if (parsed) return parsed;
      }
    } catch {}
    return DEFAULT_FILTERS;
  });

  // History State Snapshot Interface (Full Comprehensive Undo / Redo System)
  interface HistoryStateSnapshot {
    elements: CanvasElement[];
    pages: StudioPageItem[];
    currentPageIndex: number;
    filters: EditorFilters;
    imageSize: { width: number; height: number };
    selectedId: string | null;
  }

  // History Stack (Undo / Redo)
  const [undoStack, setUndoStack] = useState<HistoryStateSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryStateSnapshot[]>([]);

  // Viewport Navigation (Zoom & Pan) with instant persistent memory
  const [zoom, setZoom] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('rataq_studio_zoomScale') || localStorage.getItem('rataq_studio_user_zoom');
      if (stored) {
        const parsed = parseFloat(stored);
        if (!isNaN(parsed) && parsed >= 0.15 && parsed <= 4.0) return Number(parsed.toFixed(2));
      }
    } catch {}
    return 1;
  });
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Save zoom level to localStorage immediately whenever it changes
  React.useEffect(() => {
    try {
      if (typeof zoom === 'number' && !isNaN(zoom) && zoom > 0) {
        localStorage.setItem('rataq_studio_zoomScale', String(zoom));
        localStorage.setItem('rataq_studio_user_zoom', String(zoom));
      }
    } catch {}
  }, [zoom]);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Interactive Stage Operations (Drawing / Dragging / Resizing)
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentLine, setCurrentLine] = useState<Array<{ x: number; y: number }>>([]);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [elementStartPos, setElementStartPos] = useState<{ x: number; y: number; w: number; h: number; fontSize?: number; rotation?: number } | null>(null);
  const [activeResizeHandle, setActiveResizeHandle] = useState<string | null>(null);
  const [hoveredFrameId, setHoveredFrameId] = useState<string | null>(null);
  const [editingFrameId, setEditingFrameId] = useState<string | null>(null);
  const [cropDragStart, setCropDragStart] = useState<{ x: number; y: number; initX: number; initY: number } | null>(null);

  // Modals & Export Options
  const [pendingTemplatePrompt, setPendingTemplatePrompt] = useState<StudioTemplate | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isResizeModalOpen, setIsResizeModalOpen] = useState<boolean>(false);
  const [customWidth, setCustomWidth] = useState<number>(1080);
  const [customHeight, setCustomHeight] = useState<number>(1080);
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(true);
  const [isPositionMenuOpen, setIsPositionMenuOpen] = useState<boolean>(false);
  const [isFloatingLayerOpen, setIsFloatingLayerOpen] = useState<boolean>(false);

  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'webp' | 'pdf' | 'svg'>('png');
  const [exportQuality, setExportQuality] = useState<number>(0.95);
  const [exportScale, setExportScale] = useState<number>(1);
  const [exportTransparent, setExportTransparent] = useState<boolean>(false);
  const [customFileName, setCustomFileName] = useState<string>('');

  // Design Navigation & Dropdowns
  const [designTitle, setDesignTitle] = useState<string>(artifact.title || 'تصميم جديد');
  const [isShareMenuOpen, setIsShareMenuOpen] = useState<boolean>(false);
  const [isDesignPublic, setIsDesignPublic] = useState<boolean>(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [publishTitle, setPublishTitle] = useState<string>('');
  const [publishDesc, setPublishDesc] = useState<string>('');
  const [publishCategory, setPublishCategory] = useState<'marketing' | 'banner' | 'story' | 'social'>('marketing');
  const [publishPriceType, setPublishPriceType] = useState<'free' | 'pro' | 'points'>('free');
  const [publishPrice, setPublishPrice] = useState<number>(0);
  const [shareMenuTab, setShareMenuTab] = useState<'main' | 'download'>('main');
  const [isFileMenuOpen, setIsFileMenuOpen] = useState<boolean>(false);
  const [isMagicResizeOpen, setIsMagicResizeOpen] = useState<boolean>(false);
  const [isEffectsPopoverOpen, setIsEffectsPopoverOpen] = useState<boolean>(false);
  const [isSpacingPopoverOpen, setIsSpacingPopoverOpen] = useState<boolean>(false);
  const [isPositionDrawerOpen, setIsPositionDrawerOpen] = useState<boolean>(false);
  const [isOpacityPopoverOpen, setIsOpacityPopoverOpen] = useState<boolean>(false);
  const [showRulers, setShowRulers] = useState<boolean>(false);
  const [showMargins, setShowMargins] = useState<boolean>(false);
  const [shapeSearchQuery, setShapeSearchQuery] = useState<string>('');
  const [selectedShapeCategory, setSelectedShapeCategory] = useState<'all' | 'geometry' | 'lines' | 'badges' | 'social' | 'commerce' | 'nature'>('all');
  const [selectedTypoCategory, setSelectedTypoCategory] = useState<'all' | 'offers' | 'social' | 'quotes' | 'modern' | 'news'>('all');

  // Dynamic Alignment Snap Guides State
  const [snapGuides, setSnapGuides] = useState<SnapGuidesState>({});

  // Multi-Page Canvas State (Canva-Standard Multi-Page System)
  const [pages, setPages] = useState<StudioPageItem[]>(() => {
    if (initialPages && initialPages.length > 0) return initialPages;
    try {
      const backupRaw = localStorage.getItem('perplexta_image_editor_session_backup');
      if (backupRaw) {
        const parsed = JSON.parse(backupRaw);
        if (parsed.pages && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
          return parsed.pages;
        }
      }
      const storedPg = localStorage.getItem('rataq_studio_session_pages');
      if (storedPg) {
        const parsed = JSON.parse(storedPg);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return initialPages || [
      {
        id: `page-1`,
        title: isAr ? 'الصفحة 1' : 'Page 1',
        elements: initialElements || [],
        bgImgSrc: artifact.content,
        locked: false
      }
    ];
  });
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(() => initialCurrentPageIndex || 0);

  const [isPagesOverviewOpen, setIsPagesOverviewOpen] = useState<boolean>(false);

  // Image Loading State & Canvas Dimensions Persistence
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>(() => {
    if (initialImageSize && initialImageSize.width > 0 && initialImageSize.height > 0) {
      return initialImageSize;
    }
    try {
      const stored = localStorage.getItem('rataq_studio_session_imageSize');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.width > 0 && parsed.height > 0) return parsed;
      }
    } catch {}
    return { width: 1080, height: 1080 };
  });
  const [imageLoaded, setImageLoaded] = useState<boolean>(true);

  // Synchronized State References for Instantaneous History Snapshots & Saves
  const elementsRef = useRef(elements);
  elementsRef.current = elements;
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const currentPageIndexRef = useRef(currentPageIndex);
  currentPageIndexRef.current = currentPageIndex;
  const imageSizeRef = useRef(imageSize);
  imageSizeRef.current = imageSize;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const designTitleRef = useRef(designTitle);
  designTitleRef.current = designTitle;
  const artifactRef = useRef(artifact);
  artifactRef.current = artifact;
  const projectIdRef = useRef(currentProjId);
  projectIdRef.current = currentProjId;

  const isHydratedRef = useRef(false);

  // Restore session from IndexedDB / localStorage on mount / refresh
  useEffect(() => {
    getStudioSessionFromDB().then((savedSession) => {
      let restoredData = savedSession;
      if (!restoredData) {
        try {
          const backupRaw = localStorage.getItem('perplexta_image_editor_session_backup');
          if (backupRaw) restoredData = JSON.parse(backupRaw);
        } catch {}
      }
      if (restoredData) {
        if (restoredData.elements && Array.isArray(restoredData.elements) && restoredData.elements.length > 0) {
          setElements(restoredData.elements);
        }
        if (restoredData.pages && Array.isArray(restoredData.pages) && restoredData.pages.length > 0) {
          setPages(restoredData.pages);
        }
        if (restoredData.filters) {
          setFilters(restoredData.filters);
        }
        if (!initialImageSize && restoredData.imageSize && restoredData.imageSize.width > 0) {
          setImageSize(restoredData.imageSize);
        }
        if (restoredData.designTitle) {
          setDesignTitle(restoredData.designTitle);
        }
      }
      isHydratedRef.current = true;
    }).catch(() => {
      isHydratedRef.current = true;
    });
  }, [initialImageSize]);

  // Synchronize state when initial props update explicitly (only if not yet hydrated or if initialElements is provided on fresh new design)
  useEffect(() => {
    if (!isHydratedRef.current && initialElements && initialElements.length > 0) {
      setElements(initialElements);
    }
  }, [initialElements]);

  useEffect(() => {
    if (!isHydratedRef.current && initialPages && initialPages.length > 0) {
      setPages(initialPages);
    }
  }, [initialPages]);

  useEffect(() => {
    if (!isHydratedRef.current && initialFilters) {
      setFilters(initialFilters);
    }
  }, [initialFilters]);

  // Push full snapshot to history stack for Complete, Granular Undo/Redo
  const recordHistory = useCallback((overrides?: Partial<HistoryStateSnapshot>) => {
    const snapshot: HistoryStateSnapshot = {
      elements: overrides?.elements ? JSON.parse(JSON.stringify(overrides.elements)) : JSON.parse(JSON.stringify(elementsRef.current)),
      pages: overrides?.pages ? JSON.parse(JSON.stringify(overrides.pages)) : JSON.parse(JSON.stringify(pagesRef.current)),
      currentPageIndex: overrides?.currentPageIndex !== undefined ? overrides.currentPageIndex : currentPageIndexRef.current,
      filters: overrides?.filters ? { ...overrides.filters } : { ...filtersRef.current },
      imageSize: overrides?.imageSize ? { ...overrides.imageSize } : { ...imageSizeRef.current },
      selectedId: overrides?.selectedId !== undefined ? overrides.selectedId : selectedIdRef.current
    };

    setUndoStack(prev => [...prev.slice(-60), snapshot]);
    setRedoStack([]);
  }, []);

  // Smooth Scroll Helper for Multi-Page Focus
  const scrollToPageCard = useCallback((pageIdx: number) => {
    setTimeout(() => {
      const el = document.getElementById(`page-stage-card-${pageIdx}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 30);
  }, []);

  // Center and fit image smoothly to viewport
  const fitImageToContainer = useCallback((imgW: number, imgH: number) => {
    if (!containerRef.current || imgW === 0 || imgH === 0) return;
    const contW = containerRef.current.clientWidth - 48;
    const contH = containerRef.current.clientHeight - 80;
    if (contW <= 0 || contH <= 0) return;
    const scale = Math.min(contW / imgW, contH / imgH, 1.25);
    const finalScale = Math.max(0.12, Math.min(Number((scale * 0.95).toFixed(2)), 3.0));
    setZoom(finalScale);
    try {
      localStorage.setItem('rataq_studio_zoomScale', String(finalScale));
      localStorage.setItem('rataq_studio_user_zoom', String(finalScale));
    } catch {}
    setPan({
      x: (containerRef.current.clientWidth - imgW * finalScale) / 2,
      y: (containerRef.current.clientHeight - imgH * finalScale) / 2
    });
    // Smoothly scroll active page card to nearest view
    scrollToPageCard(currentPageIndexRef.current);
  }, [scrollToPageCard]);

  // Auto-fit canvas to viewport on initial mount & when imageSize changes
  useEffect(() => {
    if (imageSize.width > 0 && imageSize.height > 0) {
      const timer = setTimeout(() => {
        fitImageToContainer(imageSize.width, imageSize.height);
      }, 70);
      return () => clearTimeout(timer);
    }
  }, [imageSize.width, imageSize.height, fitImageToContainer]);

  // Synchronize explicit initialImageSize and auto-fit to container
  useEffect(() => {
    if (initialImageSize && initialImageSize.width > 0 && initialImageSize.height > 0) {
      setImageSize(initialImageSize);
      setCustomWidth(initialImageSize.width);
      setCustomHeight(initialImageSize.height);
      const timer = setTimeout(() => {
        fitImageToContainer(initialImageSize.width, initialImageSize.height);
      }, 70);
      return () => clearTimeout(timer);
    }
  }, [initialImageSize, fitImageToContainer]);

  // Multi-Page Operations (Canva Style)
  const handleUpdateElement = (id: string, updates: Partial<CanvasElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  };



  const handleAddPage = useCallback(() => {
    recordHistory();
    const newPageNum = pages.length + 1;
    const newPage: StudioPageItem = {
      id: `page-${Date.now()}`,
      title: isAr ? `الصفحة ${newPageNum}` : `Page ${newPageNum}`,
      elements: [],
      bgImgSrc: artifact.content,
      locked: false
    };

    setPages(prev => {
      const updated = [...prev];
      updated[currentPageIndex] = {
        ...updated[currentPageIndex],
        elements: JSON.parse(JSON.stringify(elements))
      };
      return [...updated, newPage];
    });

    const newIdx = pages.length;
    setCurrentPageIndex(newIdx);
    setElements([]);
    setSelectedId(null);
    setFilters({ ...DEFAULT_FILTERS });
    scrollToPageCard(newIdx);
    toast.success(isAr ? `✨ تم إضافة صفحة جديدة (${newPageNum})` : `Added Page ${newPageNum}`);
  }, [pages, currentPageIndex, elements, artifact.content, isAr, recordHistory, scrollToPageCard]);

  const handleDuplicatePage = useCallback((idxToDuplicate = currentPageIndex) => {
    recordHistory();
    const target = pages[idxToDuplicate] || pages[currentPageIndex];
    const curElements = idxToDuplicate === currentPageIndex ? elements : target.elements;

    const newPage: StudioPageItem = {
      id: `page-${Date.now()}`,
      title: isAr ? `${target.title || 'صفحة'} (نسخة)` : `${target.title || 'Page'} (Copy)`,
      elements: JSON.parse(JSON.stringify(curElements)),
      bgImgSrc: target.bgImgSrc || artifact.content,
      locked: false
    };

    setPages(prev => {
      const updated = [...prev];
      updated[currentPageIndex] = {
        ...updated[currentPageIndex],
        elements: JSON.parse(JSON.stringify(elements))
      };
      updated.splice(idxToDuplicate + 1, 0, newPage);
      return updated;
    });

    const newIdx = idxToDuplicate + 1;
    setCurrentPageIndex(newIdx);
    setElements(JSON.parse(JSON.stringify(newPage.elements)));
    setSelectedId(null);
    scrollToPageCard(newIdx);
    toast.success(isAr ? 'تم تكرار الصفحة بنجاح مع كافة عناصرها' : 'Page duplicated successfully');
  }, [pages, currentPageIndex, elements, artifact.content, isAr, recordHistory, scrollToPageCard]);

  const handleDeletePage = useCallback((idxToDelete: number) => {
    if (pages.length <= 1) {
      toast.warning(isAr ? 'يجب أن يحتوي التصميم على صفحة واحدة على الأقل' : 'Must have at least one page');
      return;
    }
    recordHistory();
    const updated = pages.filter((_, i) => i !== idxToDelete);
    const nextIdx = Math.min(currentPageIndex >= idxToDelete ? Math.max(0, currentPageIndex - 1) : currentPageIndex, updated.length - 1);

    setPages(updated);
    setCurrentPageIndex(nextIdx);
    setElements(JSON.parse(JSON.stringify(updated[nextIdx].elements)));
    setSelectedId(null);
    scrollToPageCard(nextIdx);
    toast.info(isAr ? 'تم حذف الصفحة' : 'Page deleted');
  }, [pages, currentPageIndex, isAr, recordHistory, scrollToPageCard]);

  const handleSwitchPage = useCallback((targetIdx: number, autoScroll = false) => {
    if (targetIdx < 0 || targetIdx >= pages.length) return;
    setPages(prev => {
      const next = [...prev];
      if (next[currentPageIndex]) {
        next[currentPageIndex] = {
          ...next[currentPageIndex],
          elements: JSON.parse(JSON.stringify(elements))
        };
      }
      return next;
    });
    setCurrentPageIndex(targetIdx);
    const targetPage = pages[targetIdx];
    if (targetPage) {
      setElements(JSON.parse(JSON.stringify(targetPage.elements)));
    }
    setSelectedId(null);
    if (autoScroll) {
      scrollToPageCard(targetIdx);
    }
  }, [currentPageIndex, pages, elements, scrollToPageCard]);

  const handleToggleLockCurrentPage = useCallback(() => {
    setPages(prev => prev.map((p, idx) => idx === currentPageIndex ? { ...p, locked: !p.locked } : p));
  }, [currentPageIndex]);

  // Layer Ordering & Management Helpers
  const handleDuplicateElement = useCallback((id: string) => {
    const target = elements.find(el => el.id === id);
    if (!target) return;
    recordHistory();
    const newId = `${target.type}-${Date.now()}`;
    const clone: CanvasElement = {
      ...JSON.parse(JSON.stringify(target)),
      id: newId,
      x: target.x + 25,
      y: target.y + 25
    };
    setElements(prev => [...prev, clone]);
    setSelectedId(newId);
  }, [elements, recordHistory]);

  // Text Element Creation & Font Size Handlers with Pixel-Accurate Frame Calibration
  const handleAddTextElement = useCallback((type: 'h1' | 'h2' | 'body' = 'h1', customText?: string) => {
    recordHistory();
    const newId = `text-${Date.now()}`;
    let text = customText || (isAr ? 'أضف عنواناً رئيسياً جذاباً' : 'Add Catchy Headline');
    let fontSize = 42;
    let fontWeight = 'bold';
    let maxWidth = (imageSize.width && imageSize.width > 400) ? Math.min(imageSize.width - 60, 480) : 320;

    if (type === 'h2') {
      text = customText || (isAr ? 'عنوان فرعي توضيحي' : 'Descriptive Subtitle');
      fontSize = 28;
      fontWeight = '600';
      maxWidth = Math.min(maxWidth, 380);
    } else if (type === 'body') {
      text = customText || (isAr ? 'اكتب نصك الترويجي أو الوصفي هنا...' : 'Type your body description text here...');
      fontSize = 20;
      fontWeight = 'normal';
      maxWidth = Math.min(maxWidth, 340);
    }

    const metrics = computeTextMetrics(
      text,
      'Tajawal, sans-serif',
      fontSize,
      fontWeight,
      'normal',
      maxWidth
    );

    const newW = metrics.width + 24;
    const newH = metrics.height + 14;
    const newX = Math.max(20, Math.round(((imageSize.width || 800) - newW) / 2));
    const newY = Math.max(20, Math.round(((imageSize.height || 600) - newH) / 2));

    const newEl: CanvasElement = {
      id: newId,
      type: 'text',
      name: type === 'h1' ? (isAr ? 'عنوان رئيسي' : 'Headline') : type === 'h2' ? (isAr ? 'عنوان فرعي' : 'Subtitle') : (isAr ? 'نص عادي' : 'Body Text'),
      x: newX,
      y: newY,
      w: newW,
      h: newH,
      text,
      color: activeColor || '#ffffff',
      strokeWidth: 0,
      fontSize,
      fontFamily: 'Tajawal, sans-serif',
      fontWeight,
      textAlign: 'center',
      textBgColor: 'transparent',
      textShadow: true
    };

    setElements(prev => [...prev, newEl]);
    setSelectedId(newId);
    setActiveTool('select');
  }, [activeColor, imageSize.height, imageSize.width, isAr, recordHistory]);

  const handleUpdateTextFontSize = useCallback((val: number) => {
    if (!selectedId) return;
    const target = elements.find(el => el.id === selectedId);
    if (!target || target.type !== 'text') return;

    const newSize = Math.max(8, Math.min(val, 240));
    recordHistory();
    const metrics = computeTextMetrics(
      target.text || '',
      target.fontFamily || 'Tajawal, sans-serif',
      newSize,
      target.fontWeight || 'bold',
      target.fontStyle || 'normal',
      target.w && target.w > 40 ? target.w - 12 : undefined,
      target.textLineHeight || 1.25,
      !!target.textUppercase
    );

    setElements(prev => prev.map(el => {
      if (el.id === selectedId) {
        return {
          ...el,
          fontSize: newSize,
          w: Math.max(el.w || 100, metrics.width + 16),
          h: Math.max(el.h || 36, metrics.height + 14)
        };
      }
      return el;
    }));
  }, [elements, recordHistory, selectedId]);

  const handleToggleLock = useCallback((id: string) => {
    recordHistory();
    setElements(prev => prev.map(el => el.id === id ? { ...el, locked: !el.locked } : el));
  }, [recordHistory]);

  const handleDeleteElement = useCallback((id: string) => {
    recordHistory();
    setElements(prev => prev.filter(el => el.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId, recordHistory]);

  const handleBringToFront = useCallback((id: string) => {
    recordHistory();
    setElements(prev => {
      const idx = prev.findIndex(el => el.id === id);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const item = prev[idx];
      const rest = prev.filter(el => el.id !== id);
      return [...rest, item];
    });
    setIsPositionMenuOpen(false);
  }, [recordHistory]);

  const handleSendToBack = useCallback((id: string) => {
    recordHistory();
    setElements(prev => {
      const idx = prev.findIndex(el => el.id === id);
      if (idx === -1 || idx === 0) return prev;
      const item = prev[idx];
      const rest = prev.filter(el => el.id !== id);
      return [item, ...rest];
    });
    setIsPositionMenuOpen(false);
  }, [recordHistory]);

  const handleBringForward = useCallback((id: string) => {
    recordHistory();
    setElements(prev => {
      const idx = prev.findIndex(el => el.id === id);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[idx + 1];
      next[idx + 1] = temp;
      return next;
    });
    setIsPositionMenuOpen(false);
  }, []);

  const handleSendBackward = useCallback((id: string) => {
    recordHistory();
    setElements(prev => {
      const idx = prev.findIndex(el => el.id === id);
      if (idx === -1 || idx === 0) return prev;
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[idx - 1];
      next[idx - 1] = temp;
      return next;
    });
    setIsPositionMenuOpen(false);
  }, []);

  const handleAlignElement = useCallback((id: string, alignType: 'center-h' | 'center-v') => {
    recordHistory();
    setElements(prev => prev.map(el => {
      if (el.id !== id) return el;
      if (alignType === 'center-h') {
        return { ...el, x: Math.round((imageSize.width - (el.w || 200)) / 2) };
      } else {
        return { ...el, y: Math.round((imageSize.height - (el.h || 50)) / 2) };
      }
    }));
    setIsPositionMenuOpen(false);
  }, [imageSize, recordHistory]);

  // Immediate flush save function to guarantee every user movement and action is preserved in both localStorage and IndexedDB
  const flushSaveSession = useCallback((overrides?: {
    customElements?: CanvasElement[];
    customFilters?: EditorFilters;
    customPages?: StudioPageItem[];
    customPageIndex?: number;
  }) => {
    const curArtifact = artifactRef.current || {
      id: 'active-studio-design',
      title: designTitleRef.current || (isAr ? 'تصميم جديد' : 'New Design'),
      type: 'image',
      content: ''
    };
    const curProjectId = projectIdRef.current || 'active-studio-project';

    try {
      setAutoSaveStatus('saving');
      const targetElements = overrides?.customElements ?? elementsRef.current;
      const targetFilters = overrides?.customFilters ?? filtersRef.current;
      const targetPages = overrides?.customPages ?? pagesRef.current;
      const targetPageIndex = overrides?.customPageIndex ?? currentPageIndexRef.current;
      const targetImageSize = imageSizeRef.current;
      const targetDesignTitle = designTitleRef.current;

      const cleanElements = sanitizeElementsForStorage(targetElements);
      const cleanPages = sanitizePagesForStorage(targetPages);

      const sessionPayload = {
        projectId: curProjectId,
        artifact: curArtifact,
        elements: cleanElements,
        filters: targetFilters,
        imageSize: targetImageSize,
        designTitle: targetDesignTitle,
        pages: cleanPages,
        currentPageIndex: targetPageIndex
      };

      // 1. Instant save to IndexedDB (asynchronous unlimited persistent store)
      saveStudioSessionToDB(sessionPayload).catch(() => {});

      // 2. Immediate synchronous save to localStorage as instant fallback
      localStorage.setItem('perplexta_image_editor_session_backup', JSON.stringify(sessionPayload));
      try {
        localStorage.setItem('rataq_studio_session_active', 'true');
        localStorage.setItem('rataq_studio_session_timestamp', String(Date.now()));
        if (curProjectId) localStorage.setItem('rataq_studio_session_projectId', curProjectId);
        localStorage.setItem('rataq_studio_session_artifact', JSON.stringify(curArtifact));
        localStorage.setItem('rataq_studio_session_elements', JSON.stringify(cleanElements));
        localStorage.setItem('rataq_studio_session_filters', JSON.stringify(targetFilters));
        localStorage.setItem('rataq_studio_session_imageSize', JSON.stringify(targetImageSize));
        localStorage.setItem('rataq_studio_session_designTitle', targetDesignTitle);
        localStorage.setItem('rataq_studio_session_pages', JSON.stringify(cleanPages));
        localStorage.setItem('rataq_studio_session_currentPageIndex', String(targetPageIndex));
      } catch (quotaErr) {
        try {
          localStorage.setItem('rataq_studio_session_active', 'true');
          localStorage.setItem('rataq_studio_session_timestamp', String(Date.now()));
          if (curProjectId) localStorage.setItem('rataq_studio_session_projectId', curProjectId);
          localStorage.setItem('rataq_studio_session_artifact', JSON.stringify({
            id: curArtifact.id,
            title: curArtifact.title,
            content: curArtifact.content.startsWith('data:') ? '' : curArtifact.content
          }));
          localStorage.setItem('rataq_studio_session_designTitle', targetDesignTitle);
          localStorage.setItem('rataq_studio_session_currentPageIndex', String(targetPageIndex));
        } catch {}
      }

      // 3. Silent real-time save to user account projects if logged in
      if (user && curProjectId) {
        const project: StudioProject = {
          id: curProjectId,
          userId: String(user.id),
          title: targetDesignTitle || (isAr ? 'تصميم جديد' : 'New Design'),
          previewUrl: curArtifact.content,
          width: targetImageSize.width,
          height: targetImageSize.height,
          canvasBackground: curArtifact.content,
          elements: cleanElements,
          filters: targetFilters,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: [isAr ? 'استوديو رينكس' : 'Rinex Studio'],
          isPublic: isDesignPublic
        } as any;
        saveUserStudioProject(user.id, project);
        if (onSaveProject) {
          onSaveProject(project);
        }
      }

      setTimeout(() => {
        setAutoSaveStatus('saved');
      }, 400);
    } catch (e) {
      console.warn('Failed to auto-save studio session:', e);
      setAutoSaveStatus('saved');
    }
  }, [user, isDesignPublic, onSaveProject, isAr]);

  // Load & Apply Full Template (Replace Current Page or Add as New Page)
  const executeApplyTemplateReplace = useCallback((tpl: StudioTemplate) => {
    recordHistory();
    setImageLoaded(true);
    if (tpl.id && (tpl.id.startsWith('m-tpl-') || tpl.category === 'community')) {
      try {
        recordTemplateUse(tpl.id);
      } catch (e) {}
    }

    const targetWidth = tpl.width || 1080;
    const targetHeight = tpl.height || 1080;
    
    // Clean background resolution (ensuring template background photos/images load correctly and are editable)
    let templateBgUrl = '';
    if ((tpl as any).filename) {
      templateBgUrl = `/templates/data/${(tpl as any).filename}`;
    } else if ((tpl as any).canvasBackground && typeof (tpl as any).canvasBackground === 'string') {
      templateBgUrl = safeSvgDataUrl((tpl as any).canvasBackground);
    } else if (tpl.thumbnailUrl && tpl.thumbnailUrl.startsWith('/templates/')) {
      templateBgUrl = tpl.thumbnailUrl;
    } else if (tpl.backgroundColor && typeof tpl.backgroundColor === 'string' && (tpl.backgroundColor.startsWith('#') || tpl.backgroundColor.startsWith('rgb') || tpl.backgroundColor.startsWith('hsl'))) {
      templateBgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${targetWidth}" height="${targetHeight}" viewBox="0 0 ${targetWidth} ${targetHeight}"><rect width="${targetWidth}" height="${targetHeight}" fill="${tpl.backgroundColor}"/></svg>`)}`;
    } else if (tpl.thumbnailUrl) {
      templateBgUrl = tpl.thumbnailUrl;
    } else if ((tpl as any).backgroundUrl || (tpl as any).bgImage) {
      templateBgUrl = safeSvgDataUrl((tpl as any).backgroundUrl || (tpl as any).bgImage);
    } else {
      templateBgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${targetWidth}" height="${targetHeight}" viewBox="0 0 ${targetWidth} ${targetHeight}"><rect width="${targetWidth}" height="${targetHeight}" fill="#0f172a"/></svg>`)}`;
    }

    setElements(JSON.parse(JSON.stringify(tpl.elements || [])));
    setSelectedId(null);
    setPendingTemplatePrompt(null);

    if (templateBgUrl && !templateBgUrl.startsWith('#') && !templateBgUrl.startsWith('rgb')) {
      const img = new Image();
      if (templateBgUrl.startsWith('http')) {
        img.crossOrigin = 'anonymous';
      }
      img.src = templateBgUrl;
      img.onload = () => {
        imageRef.current = img;
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }
      };
      img.onerror = () => {
        imageRef.current = null;
      };
    } else {
      imageRef.current = null;
    }

    setPages(prev => {
      const updated = [...prev];
      if (updated[currentPageIndex]) {
        updated[currentPageIndex] = {
          ...updated[currentPageIndex],
          title: isAr ? `${tpl.titleAr}` : `${tpl.titleEn}`,
          elements: JSON.parse(JSON.stringify(tpl.elements || [])),
          bgImgSrc: templateBgUrl || updated[currentPageIndex].bgImgSrc
        };
      }
      return updated;
    });

    if (tpl.width && tpl.height) {
      const isDimensionChanged = imageSize.width !== tpl.width || imageSize.height !== tpl.height;
      const targetSize = { width: tpl.width, height: tpl.height };
      setImageSize(targetSize);
      setCustomWidth(tpl.width);
      setCustomHeight(tpl.height);
      imageSizeRef.current = targetSize;
      try {
        localStorage.setItem('rataq_studio_session_imageSize', JSON.stringify(targetSize));
      } catch {}
      
      flushSaveSession({
        customElements: JSON.parse(JSON.stringify(tpl.elements || []))
      });
      
      if (isDimensionChanged) {
        toast.success(isAr 
          ? `✨ تم استبدال التصميم الحالي بقالب "${tpl.titleAr}" وتعديل الساحة (${tpl.width} × ${tpl.height})` 
          : `✨ Replaced design with "${tpl.titleEn}" (${tpl.width} × ${tpl.height})`);
      } else {
        toast.success(isAr ? `✨ تم استبدال التصميم الحالي بقالب "${tpl.titleAr}" بنجاح!` : `✨ Replaced design with "${tpl.titleEn}"!`);
      }
    } else {
      flushSaveSession({
        customElements: JSON.parse(JSON.stringify(tpl.elements || []))
      });
      toast.success(isAr ? `✨ تم استبدال التصميم بالقالب بنجاح!` : `✨ Replaced design with template!`);
    }
  }, [currentPageIndex, imageSize, isAr, recordHistory, fitImageToContainer, flushSaveSession]);

  const executeApplyTemplateNewPage = useCallback((tpl: StudioTemplate) => {
    recordHistory();
    setImageLoaded(true);
    if (tpl.id && (tpl.id.startsWith('m-tpl-') || tpl.category === 'community')) {
      try {
        recordTemplateUse(tpl.id);
      } catch (e) {}
    }

    const targetWidth = tpl.width || 1080;
    const targetHeight = tpl.height || 1080;
    
    let templateBgUrl = '';
    if ((tpl as any).filename) {
      templateBgUrl = `/templates/data/${(tpl as any).filename}`;
    } else if ((tpl as any).canvasBackground && typeof (tpl as any).canvasBackground === 'string') {
      templateBgUrl = safeSvgDataUrl((tpl as any).canvasBackground);
    } else if (tpl.thumbnailUrl && tpl.thumbnailUrl.startsWith('/templates/')) {
      templateBgUrl = tpl.thumbnailUrl;
    } else if (tpl.backgroundColor && typeof tpl.backgroundColor === 'string' && (tpl.backgroundColor.startsWith('#') || tpl.backgroundColor.startsWith('rgb') || tpl.backgroundColor.startsWith('hsl'))) {
      templateBgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${targetWidth}" height="${targetHeight}" viewBox="0 0 ${targetWidth} ${targetHeight}"><rect width="${targetWidth}" height="${targetHeight}" fill="${tpl.backgroundColor}"/></svg>`)}`;
    } else if (tpl.thumbnailUrl) {
      templateBgUrl = tpl.thumbnailUrl;
    } else if ((tpl as any).backgroundUrl || (tpl as any).bgImage) {
      templateBgUrl = safeSvgDataUrl((tpl as any).backgroundUrl || (tpl as any).bgImage);
    } else {
      templateBgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${targetWidth}" height="${targetHeight}" viewBox="0 0 ${targetWidth} ${targetHeight}"><rect width="${targetWidth}" height="${targetHeight}" fill="#0f172a"/></svg>`)}`;
    }

    const newPageNum = pages.length + 1;
    const newPage: StudioPageItem = {
      id: `page-${Date.now()}`,
      title: isAr ? `${tpl.titleAr}` : `${tpl.titleEn}`,
      elements: JSON.parse(JSON.stringify(tpl.elements || [])),
      bgImgSrc: templateBgUrl,
      locked: false
    };

    setPages(prev => {
      const updated = [...prev];
      updated[currentPageIndex] = {
        ...updated[currentPageIndex],
        elements: JSON.parse(JSON.stringify(elements))
      };
      return [...updated, newPage];
    });

    const newIdx = pages.length;
    setCurrentPageIndex(newIdx);
    setElements(JSON.parse(JSON.stringify(tpl.elements || [])));
    setSelectedId(null);
    setPendingTemplatePrompt(null);

    if (templateBgUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = templateBgUrl;
      img.onload = () => {
        imageRef.current = img;
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }
      };
    }

    if (tpl.width && tpl.height && (imageSize.width !== tpl.width || imageSize.height !== tpl.height)) {
      const targetSize = { width: tpl.width, height: tpl.height };
      setImageSize(targetSize);
      setCustomWidth(tpl.width);
      setCustomHeight(tpl.height);
      imageSizeRef.current = targetSize;
      try {
        localStorage.setItem('rataq_studio_session_imageSize', JSON.stringify(targetSize));
      } catch {}
    }

    scrollToPageCard(newIdx);

    flushSaveSession({
      customElements: JSON.parse(JSON.stringify(tpl.elements || [])),
      customPages: [...pages, newPage],
      customPageIndex: newIdx
    });

    toast.success(isAr 
      ? `تم إضافة قالب "${tpl.titleAr}" كصفحة جديدة (صفحة ${newPageNum}) بنجاح` 
      : `Added "${tpl.titleEn}" as Page ${newPageNum}`);
  }, [pages, currentPageIndex, elements, imageSize, isAr, recordHistory, fitImageToContainer, scrollToPageCard, flushSaveSession]);

  const handleMovePage = useCallback((fromIdx: number, direction: 'up' | 'down') => {
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= pages.length) return;
    recordHistory();

    const updatedPages = [...pages];
    updatedPages[currentPageIndex] = {
      ...updatedPages[currentPageIndex],
      elements: JSON.parse(JSON.stringify(elements))
    };

    const temp = updatedPages[fromIdx];
    updatedPages[fromIdx] = updatedPages[toIdx];
    updatedPages[toIdx] = temp;

    setPages(updatedPages);

    let newActiveIdx = currentPageIndex;
    if (currentPageIndex === fromIdx) {
      newActiveIdx = toIdx;
    } else if (currentPageIndex === toIdx) {
      newActiveIdx = fromIdx;
    }

    setCurrentPageIndex(newActiveIdx);
    setElements(JSON.parse(JSON.stringify(updatedPages[newActiveIdx].elements)));
    scrollToPageCard(newActiveIdx);
  }, [pages, currentPageIndex, elements, recordHistory, scrollToPageCard]);

  const handleLoadTemplate = useCallback((tpl: StudioTemplate) => {
    if (elements && elements.length > 0) {
      setPendingTemplatePrompt(tpl);
    } else {
      executeApplyTemplateReplace(tpl);
    }
  }, [elements, executeApplyTemplateReplace]);

  // Add SVG Shape to Canvas
  const handleAddSvgShape = useCallback((shape: ShapeItem) => {
    recordHistory();
    const newId = `svg-${shape.id}-${Date.now()}`;
    const newEl: CanvasElement = {
      id: newId,
      type: 'svg',
      name: shape.nameAr,
      x: Math.round((imageSize.width - 120) / 2) || 100,
      y: Math.round((imageSize.height - 120) / 2) || 100,
      w: 120,
      h: 120,
      color: activeColor || '#38bdf8',
      fillColor: activeColor || '#38bdf8',
      strokeColor: 'transparent',
      strokeWidth: 0,
      svgPath: shape.svgPath,
      viewBox: shape.viewBox,
      opacity: 1
    };
    setElements(prev => [...prev, newEl]);
    setSelectedId(newId);
    setActiveTool('select');
  }, [activeColor, imageSize, recordHistory]);

  // Load Typography Preset Pack
  const handleLoadTypographyPreset = useCallback((preset: TypographyPreset) => {
    recordHistory();
    const startY = Math.round((imageSize.height - 200) / 2) || 120;
    const startX = Math.round((imageSize.width - 380) / 2) || 80;
    
    const newElements: CanvasElement[] = preset.elements.map((el, idx) => ({
      id: `typo-${preset.id}-${Date.now()}-${idx}`,
      type: 'text',
      name: el.name || preset.titleAr,
      x: Math.round(startX + ((el as any).offsetX || 0)),
      y: Math.round(startY + ((el as any).offsetY || idx * 50)),
      w: el.w || 360,
      h: el.h || 50,
      text: el.text || '',
      fontSize: el.fontSize || 28,
      fontFamily: el.fontFamily || 'Tajawal, sans-serif',
      fontWeight: el.fontWeight || 'bold',
      color: el.color || '#ffffff',
      textAlign: el.textAlign || 'center',
      textBgColor: el.textBgColor || 'transparent',
      textBgPadding: el.textBgPadding || 0,
      textBgCornerRadius: el.textBgCornerRadius || 0,
      textShadow: el.textShadow || false,
      shadowColor: el.shadowColor || 'rgba(0,0,0,0.85)',
      shadowBlur: el.shadowBlur || 10,
      textStrokeColor: el.textStrokeColor,
      textStrokeWidth: el.textStrokeWidth,
      strokeWidth: 0,
      opacity: 1
    }));

    setElements(prev => [...prev, ...newElements]);
    if (newElements.length > 0) {
      setSelectedId(newElements[0].id);
    }
    setActiveTool('select');
    toast.success(isAr ? `تمت إضافة حزمة خط "${preset.titleAr}" بنجاح!` : `Added "${preset.titleEn}" typography pack!`);
  }, [imageSize, isAr, recordHistory]);

  // Copy Canvas Image to Clipboard
  const handleCopyImageToClipboard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      toast.error(isAr ? 'مساحة العمل غير جاهزة' : 'Canvas not ready');
      return;
    }
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error(isAr ? 'فشل تحويل الصورة' : 'Failed to create image blob');
          return;
        }
        if (navigator.clipboard && (window as any).ClipboardItem) {
          try {
            await navigator.clipboard.write([
              new (window as any).ClipboardItem({ 'image/png': blob })
            ]);
            toast.success(isAr ? 'تم نسخ الصورة إلى الحافظة بنجاح!' : 'Copied image to clipboard!');
            setIsShareMenuOpen(false);
            return;
          } catch (clipErr) {
            console.warn('ClipboardItem error', clipErr);
          }
        }
        // Fallback: download trigger
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${(customFileName.trim() || artifact.title || 'design').replace(/\\s+/g, '_')}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast.info(isAr ? 'تم تنزيل الصورة المنسوخة' : 'Downloaded image copy');
        setIsShareMenuOpen(false);
      }, 'image/png');
    } catch (err) {
      console.error(err);
      toast.error(isAr ? 'تعذر نسخ الصورة' : 'Could not copy image');
    }
  }, [artifact.title, customFileName, isAr]);

  // Comprehensive Universal Undo Handler (تراجع شامل واحترافي)
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;

    const currentSnapshot: HistoryStateSnapshot = {
      elements: JSON.parse(JSON.stringify(elementsRef.current)),
      pages: JSON.parse(JSON.stringify(pagesRef.current)),
      currentPageIndex: currentPageIndexRef.current,
      filters: { ...filtersRef.current },
      imageSize: { ...imageSizeRef.current },
      selectedId: selectedIdRef.current
    };

    const previousSnapshot = undoStack[undoStack.length - 1];

    setRedoStack(prev => [...prev.slice(-60), currentSnapshot]);
    setUndoStack(prev => prev.slice(0, -1));

    // Restore full state
    setElements(JSON.parse(JSON.stringify(previousSnapshot.elements)));
    setPages(JSON.parse(JSON.stringify(previousSnapshot.pages)));
    setCurrentPageIndex(previousSnapshot.currentPageIndex);
    setFilters({ ...previousSnapshot.filters });

    if (previousSnapshot.imageSize && (previousSnapshot.imageSize.width !== imageSizeRef.current.width || previousSnapshot.imageSize.height !== imageSizeRef.current.height)) {
      setImageSize(previousSnapshot.imageSize);
      setCustomWidth(previousSnapshot.imageSize.width);
      setCustomHeight(previousSnapshot.imageSize.height);
    }

    setSelectedId(previousSnapshot.selectedId ?? null);

    flushSaveSession({
      customElements: previousSnapshot.elements,
      customPages: previousSnapshot.pages,
      customPageIndex: previousSnapshot.currentPageIndex,
      customFilters: previousSnapshot.filters
    });
  }, [undoStack, flushSaveSession]);

  // Comprehensive Universal Redo Handler (تقدم شامل واحترافي)
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;

    const currentSnapshot: HistoryStateSnapshot = {
      elements: JSON.parse(JSON.stringify(elementsRef.current)),
      pages: JSON.parse(JSON.stringify(pagesRef.current)),
      currentPageIndex: currentPageIndexRef.current,
      filters: { ...filtersRef.current },
      imageSize: { ...imageSizeRef.current },
      selectedId: selectedIdRef.current
    };

    const nextSnapshot = redoStack[redoStack.length - 1];

    setUndoStack(prev => [...prev.slice(-60), currentSnapshot]);
    setRedoStack(prev => prev.slice(0, -1));

    // Restore full state
    setElements(JSON.parse(JSON.stringify(nextSnapshot.elements)));
    setPages(JSON.parse(JSON.stringify(nextSnapshot.pages)));
    setCurrentPageIndex(nextSnapshot.currentPageIndex);
    setFilters({ ...nextSnapshot.filters });

    if (nextSnapshot.imageSize && (nextSnapshot.imageSize.width !== imageSizeRef.current.width || nextSnapshot.imageSize.height !== imageSizeRef.current.height)) {
      setImageSize(nextSnapshot.imageSize);
      setCustomWidth(nextSnapshot.imageSize.width);
      setCustomHeight(nextSnapshot.imageSize.height);
    }

    setSelectedId(nextSnapshot.selectedId ?? null);

    flushSaveSession({
      customElements: nextSnapshot.elements,
      customPages: nextSnapshot.pages,
      customPageIndex: nextSnapshot.currentPageIndex,
      customFilters: nextSnapshot.filters
    });
  }, [redoStack, flushSaveSession]);

  // Sync elements to pages array for the current page without circular dependency
  useEffect(() => {
    setPages(prev => {
      if (prev[currentPageIndex] && JSON.stringify(prev[currentPageIndex].elements) !== JSON.stringify(elements)) {
        const updated = [...prev];
        updated[currentPageIndex] = {
          ...updated[currentPageIndex],
          elements: JSON.parse(JSON.stringify(elements))
        };
        return updated;
      }
      return prev;
    });
  }, [elements, currentPageIndex]);

  // Debounced auto-save active editor state on modifications to keep screen rock-solid
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      flushSaveSession();
    }, 400);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [elements, filters, imageSize, currentPageIndex, designTitle, currentProjId, artifact, isDesignPublic, flushSaveSession]);

  // Prevent accidental tab closure or sudden refresh during editing & flush state instantly
  useEffect(() => {
    const handleImmediateFlush = () => {
      try {
        flushSaveSession();
      } catch {}
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleImmediateFlush();
      }
    };

    window.addEventListener('beforeunload', handleImmediateFlush);
    window.addEventListener('pagehide', handleImmediateFlush);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleImmediateFlush);
      window.removeEventListener('pagehide', handleImmediateFlush);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [flushSaveSession]);

  // Load uploads from IndexedDB asynchronously to support unlimited large files bypassing 5MB limit
  useEffect(() => {
    getUploadsFromDB(user?.id).then((items) => {
      if (items && items.length > 0) {
        setUploads(items);
      }
    });
  }, [user]);

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Delete, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          const selected = elements.find(el => el.id === selectedId);
          if (selected && !selected.locked) {
            e.preventDefault();
            recordHistory();
            setElements(prev => prev.filter(el => el.id !== selectedId));
            setSelectedId(null);
          }
        }
      } else if (e.key === 'Escape') {
        setSelectedId(null);
        setEditingTextId(null);
        setActiveTool('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, selectedId, elements, isAr, recordHistory]);

  // Resize Canvas to New Dimensions
  const handleApplyResize = useCallback((newW: number, newH: number) => {
    if (newW <= 0 || newH <= 0) return;
    recordHistory();
    const oldW = imageSize.width || newW;
    const oldH = imageSize.height || newH;
    const scaleX = newW / oldW;
    const scaleY = newH / oldH;

    // Scale elements proportionally to fit new canvas
    const scaledElements = elements.map(el => ({
      ...el,
      x: Math.round(el.x * scaleX),
      y: Math.round(el.y * scaleY),
      w: el.w ? Math.round(el.w * scaleX) : el.w,
      h: el.h ? Math.round(el.h * scaleY) : el.h,
      fontSize: el.fontSize ? Math.round(el.fontSize * Math.min(scaleX, scaleY)) : el.fontSize
    }));

    setElements(scaledElements);
    const newSize = { width: newW, height: newH };
    setImageSize(newSize);
    setCustomWidth(newW);
    setCustomHeight(newH);
    imageSizeRef.current = newSize;
    try {
      localStorage.setItem('rataq_studio_session_imageSize', JSON.stringify(newSize));
    } catch {}

    setIsResizeModalOpen(false);
    setTimeout(() => {
      fitImageToContainer(newW, newH);
    }, 50);

    flushSaveSession({
      customElements: scaledElements
    });

    toast.success(isAr ? `تم تعديل أبعاد مساحة العمل إلى (${newW} × ${newH})` : `Canvas resized to (${newW} × ${newH})`);
  }, [imageSize, fitImageToContainer, isAr, recordHistory, elements, flushSaveSession]);

  // Safe window resize listener - smoothly re-fit on window resize
  useEffect(() => {
    const handleWindowResize = () => {
      if (containerRef.current && imageSize.width > 0 && imageSize.height > 0) {
        fitImageToContainer(imageSize.width, imageSize.height);
      }
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [imageSize.width, imageSize.height, fitImageToContainer]);

  // Render Canvas Elements & Photo Filters
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || imageSize.width === 0 || imageSize.height === 0) return;

    canvas.width = imageSize.width;
    canvas.height = imageSize.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply CSS Filters & Post-Production Effects
    ctx.filter = `
      brightness(${filters.brightness}%) 
      contrast(${filters.contrast}%) 
      saturate(${filters.saturation}%) 
      blur(${filters.blur}px) 
      grayscale(${filters.grayscale}%) 
      sepia(${filters.sepia}%)
      hue-rotate(${filters.hueRotate}deg)
      invert(${filters.invert}%)
    `.trim();

    const currentBgImg: any = imageRef.current;
    if (studioMode === 'video') {
      const activeScene = videoScenes[activeSceneIndex];
      if (
        currentBgImg &&
        ((currentBgImg instanceof HTMLImageElement && currentBgImg.complete && currentBgImg.naturalWidth > 0) ||
         (currentBgImg instanceof HTMLCanvasElement))
      ) {
        ctx.drawImage(currentBgImg, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = activeScene?.backgroundColor || '#090d16';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    } else {
      if (
        currentBgImg &&
        ((currentBgImg instanceof HTMLImageElement && currentBgImg.complete && currentBgImg.naturalWidth > 0) ||
         (currentBgImg instanceof HTMLCanvasElement))
      ) {
        ctx.drawImage(currentBgImg, 0, 0, canvas.width, canvas.height);
      } else {
        const curPage = pages[currentPageIndex];
        const pageBg = curPage?.bgImgSrc;
        if (pageBg && typeof pageBg === 'string' && (pageBg.startsWith('#') || pageBg.startsWith('rgb') || pageBg.startsWith('hsl'))) {
          ctx.fillStyle = pageBg;
        } else {
          ctx.fillStyle = '#ffffff';
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    ctx.filter = 'none';

    // Render Canvas Elements in Z-Index Order
    elements.forEach(el => {
      if (el.hidden) return;

      ctx.save();
      ctx.globalAlpha = el.opacity !== undefined ? el.opacity : 1;

      // Apply 360-degree rotation around element center
      if (el.rotation) {
        const cx = el.x + (el.w || 0) / 2;
        const cy = el.y + (el.h || 0) / 2;
        ctx.translate(cx, cy);
        ctx.rotate((el.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }

      // 1. Render Brush Drawing
      if (el.type === 'draw' && el.points && el.points.length > 0) {
        const sw = el.strokeWidth || 4;
        ctx.strokeStyle = el.color;
        ctx.lineWidth = sw;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (el.brushMode === 'highlighter') {
          ctx.globalAlpha = (el.opacity || 0.45) * 0.45;
          ctx.lineWidth = Math.max(12, sw * 2.5);
        } else if (el.brushMode === 'marker') {
          ctx.lineWidth = Math.max(8, sw * 1.8);
        }

        ctx.beginPath();
        el.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      }

      // 2. Render Text Element (Strict Calibrated Frame & Multi-line Auto-wrap)
      else if (el.type === 'text' && el.text) {
        let displayText = el.text;
        if (el.textUppercase) displayText = displayText.toUpperCase();

        const fontSize = el.fontSize || 32;
        const fontFamily = el.fontFamily || 'Tajawal, sans-serif';
        const fontWeight = el.fontWeight || 'bold';
        const fontStyle = el.fontStyle || 'normal';
        const maxWidth = el.w && el.w > 30 ? el.w - 12 : undefined;

        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.textAlign = el.textAlign || 'center';
        ctx.textBaseline = 'top';

        const metrics = computeTextMetrics(
          displayText,
          fontFamily,
          fontSize,
          fontWeight,
          fontStyle,
          maxWidth,
          el.textLineHeight || 1.25,
          false
        );
        const lines = metrics.lines;
        const lineHeight = metrics.lineHeight;
        const pad = el.textBgPadding !== undefined ? el.textBgPadding : 6;
        const rad = el.textBgCornerRadius !== undefined ? el.textBgCornerRadius : 6;

        // Background box matching element bounds or tight line bounds
        if (el.textBgColor && el.textBgColor !== 'transparent') {
          ctx.fillStyle = el.textBgColor;
          ctx.beginPath();
          const bgW = el.w || (metrics.width + pad * 2);
          const bgH = el.h || (metrics.height + pad * 2);
          ctx.roundRect(el.x, el.y, bgW, bgH, rad);
          ctx.fill();
        }

        // When actively editing in textarea, do not render duplicate text on canvas
        if (editingTextId === el.id) {
          ctx.restore();
          return;
        }

        // Drop shadow / 3D Offset
        if (el.textShadow) {
          ctx.shadowColor = el.shadowColor || 'rgba(0, 0, 0, 0.85)';
          ctx.shadowBlur = el.shadowBlur !== undefined ? el.shadowBlur : 8;
          ctx.shadowOffsetX = el.shadowOffsetX !== undefined ? el.shadowOffsetX : 3;
          ctx.shadowOffsetY = el.shadowOffsetY !== undefined ? el.shadowOffsetY : 3;
        }

        // Curved Text Mode
        if (el.textCurve && el.textCurve !== 0 && lines.length === 1) {
          const text = lines[0];
          const radius = (100 / Math.abs(el.textCurve)) * Math.max(el.w || 200, 150);
          const isUpward = el.textCurve > 0;
          const totalAngle = (text.length * (el.fontSize || 32) * 0.55) / radius;

          ctx.save();
          ctx.translate(el.x + (el.w || 200) / 2, isUpward ? el.y + radius : el.y - radius);

          for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const charAngle = -totalAngle / 2 + (i / Math.max(text.length - 1, 1)) * totalAngle;
            ctx.save();
            ctx.rotate(isUpward ? charAngle : -charAngle);
            ctx.translate(0, isUpward ? -radius : radius);

            if (el.textStrokeWidth && el.textStrokeWidth > 0) {
              ctx.strokeStyle = el.textStrokeColor || '#000000';
              ctx.lineWidth = el.textStrokeWidth;
              ctx.strokeText(char, 0, 0);
            }

            ctx.fillStyle = el.color;
            ctx.fillText(char, 0, 0);
            ctx.restore();
          }
          ctx.restore();
        } else {
          // Standard Multi-line Rendering within frame bounds
          const totalTextHeight = lines.length * lineHeight;
          const topOffsetY = el.h && el.h > totalTextHeight ? Math.max(0, (el.h - totalTextHeight) / 2) : 4;

          lines.forEach((line, idx) => {
            let drawX = el.x + 6;
            if (el.textAlign === 'center') drawX = el.x + (el.w || metrics.width + 12) / 2;
            else if (el.textAlign === 'right') drawX = el.x + (el.w || metrics.width + 12) - 6;

            const drawY = el.y + topOffsetY + idx * lineHeight;

            // Optional Letter Spacing
            if (el.textLetterSpacing && el.textLetterSpacing > 0) {
              let currentX = drawX;
              for (let i = 0; i < line.length; i++) {
                const ch = line[i];
                if (el.textStrokeWidth && el.textStrokeWidth > 0) {
                  ctx.strokeStyle = el.textStrokeColor || '#000000';
                  ctx.lineWidth = el.textStrokeWidth;
                  ctx.strokeText(ch, currentX, drawY);
                }
                ctx.fillStyle = el.color;
                ctx.fillText(ch, currentX, drawY);
                currentX += ctx.measureText(ch).width + el.textLetterSpacing;
              }
            } else {
              if (el.textStrokeWidth && el.textStrokeWidth > 0) {
                ctx.strokeStyle = el.textStrokeColor || '#000000';
                ctx.lineWidth = el.textStrokeWidth;
                ctx.strokeText(line, drawX, drawY);
              }
              ctx.fillStyle = el.color;
              ctx.fillText(line, drawX, drawY);
            }
          });
        }
      }

      // 3. Render Rectangle / Rounded Rect
      else if (el.type === 'rect') {
        const sw = el.strokeWidth || 0;
        ctx.strokeStyle = el.strokeColor || el.color;
        ctx.lineWidth = sw;
        ctx.fillStyle = el.fillColor || 'transparent';

        ctx.beginPath();
        if (el.cornerRadius) {
          ctx.roundRect(el.x, el.y, el.w, el.h, el.cornerRadius);
        } else {
          ctx.rect(el.x, el.y, el.w, el.h);
        }
        if (el.fillColor && el.fillColor !== 'transparent') ctx.fill();
        if (sw > 0) ctx.stroke();
      }

      // 4. Render Circle / Ellipse
      else if (el.type === 'circle') {
        const sw = el.strokeWidth || 0;
        ctx.strokeStyle = el.strokeColor || el.color;
        ctx.lineWidth = sw;
        ctx.fillStyle = el.fillColor || 'transparent';

        const rx = Math.abs(el.w) / 2;
        const ry = Math.abs(el.h) / 2;
        const cx = el.x + rx;
        const cy = el.y + ry;

        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (el.fillColor && el.fillColor !== 'transparent') ctx.fill();
        if (sw > 0) ctx.stroke();
      }

      // 5. Render Arrow
      else if (el.type === 'arrow') {
        const sw = el.strokeWidth || 4;
        ctx.strokeStyle = el.color;
        ctx.fillStyle = el.color;
        ctx.lineWidth = sw;
        ctx.lineCap = 'round';

        const headLength = Math.max(16, sw * 3.5);
        const dx = el.w;
        const dy = el.h;
        const angle = Math.atan2(dy, dx);
        const endX = el.x + el.w;
        const endY = el.y + el.h;

        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headLength * Math.cos(angle - Math.PI / 6), endY - headLength * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(endX - headLength * Math.cos(angle + Math.PI / 6), endY - headLength * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }

      // 6. Render Star
      else if (el.type === 'star') {
        const sw = el.strokeWidth || 0;
        ctx.strokeStyle = el.strokeColor || el.color;
        ctx.fillStyle = el.fillColor || el.color;
        ctx.lineWidth = sw;

        const cx = el.x + el.w / 2;
        const cy = el.y + el.h / 2;
        const spikes = 5;
        const outerRadius = Math.min(Math.abs(el.w), Math.abs(el.h)) / 2;
        const innerRadius = outerRadius / 2.2;

        let rot = (Math.PI / 2) * 3;
        const step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
          let x = cx + Math.cos(rot) * outerRadius;
          let y = cy + Math.sin(rot) * outerRadius;
          ctx.lineTo(x, y);
          rot += step;

          x = cx + Math.cos(rot) * innerRadius;
          y = cy + Math.sin(rot) * innerRadius;
          ctx.lineTo(x, y);
          rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        if (el.fillColor && el.fillColor !== 'transparent') ctx.fill();
        if (sw > 0) ctx.stroke();
      }

      // 7. Render Custom Image / Sticker Overlay
      else if (el.type === 'sticker' || el.imgSrc) {
        const stickerImg: any = el.imgElement;
        if (
          stickerImg &&
          ((stickerImg instanceof HTMLImageElement && stickerImg.complete && stickerImg.naturalWidth > 0) ||
           (stickerImg instanceof HTMLCanvasElement))
        ) {
          ctx.drawImage(stickerImg, el.x, el.y, el.w, el.h);
        } else if (el.imgSrc) {
          // Lazily instantiate imgElement if missing or lost during state clone / JSON serialization
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = el.imgSrc;
          img.onload = () => {
            el.imgElement = img;
            drawCanvas();
          };
        }
      }


      // 8. Render Vector SVG Shape
      else if (el.type === 'svg' && el.svgPath) {
        ctx.save();
        ctx.translate(el.x, el.y);
        const scaleFactorX = (el.w || 60) / 24;
        const scaleFactorY = (el.h || 60) / 24;
        ctx.scale(scaleFactorX, scaleFactorY);
        const pathObj = new Path2D(el.svgPath);
        ctx.fillStyle = el.fillColor || el.color;
        ctx.fill(pathObj);
        if (el.strokeWidth && el.strokeWidth > 0) {
          ctx.strokeStyle = el.strokeColor || el.color;
          ctx.lineWidth = el.strokeWidth / Math.max(scaleFactorX, scaleFactorY, 0.1);
          ctx.stroke(pathObj);
        }
        ctx.restore();
      }

      // 9. Render Photo Container Frame (Clipping Image Container)
      else if (el.type === 'frame' || el.frameShape) {
        const shape = el.frameShape || 'circle';
        const frameW = el.w || 200;
        const frameH = el.h || 200;
        const x = el.x;
        const y = el.y;

        // 1. Draw Frame Outer Body / Backdrop for Special Frame Mockups
        if (shape === 'polaroid') {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = 'rgba(0,0,0,0.2)';
          ctx.shadowBlur = 12;
          ctx.shadowOffsetY = 4;
          ctx.beginPath();
          ctx.roundRect(x, y, frameW, frameH, 8);
          ctx.fill();
          ctx.shadowColor = 'transparent';
        } else if (shape === 'phone') {
          ctx.fillStyle = el.color || '#1e293b';
          ctx.shadowColor = 'rgba(0,0,0,0.3)';
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.roundRect(x, y, frameW, frameH, 28);
          ctx.fill();
          ctx.shadowColor = 'transparent';
        } else if (shape === 'laptop') {
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.roundRect(x + frameW * 0.08, y, frameW * 0.84, frameH * 0.8, 8);
          ctx.fill();
          ctx.fillStyle = '#94a3b8';
          ctx.beginPath();
          ctx.roundRect(x, y + frameH * 0.8, frameW, frameH * 0.15, 6);
          ctx.fill();
        } else if (shape === 'browser') {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = 'rgba(0,0,0,0.15)';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.roundRect(x, y, frameW, frameH, 10);
          ctx.fill();
          ctx.shadowColor = 'transparent';
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.roundRect(x, y, frameW, 30, [10, 10, 0, 0]);
          ctx.fill();
          const dotY = y + 15;
          ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(x + 16, dotY, 4, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(x + 28, dotY, 4, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#10b981'; ctx.beginPath(); ctx.arc(x + 40, dotY, 4, 0, Math.PI * 2); ctx.fill();
        } else if (shape === 'gold_luxury') {
          const g = ctx.createLinearGradient(x, y, x + frameW, y + frameH);
          g.addColorStop(0, '#f59e0b');
          g.addColorStop(0.5, '#fef08a');
          g.addColorStop(1, '#d97706');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.roundRect(x - 6, y - 6, frameW + 12, frameH + 12, 12);
          ctx.fill();
        } else if (shape === 'neon_cyber') {
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 18;
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 4;
          createFramePath(ctx, shape, x, y, frameW, frameH);
          ctx.stroke();
          ctx.shadowColor = 'transparent';
        }

        // 1.5 Translucent Ghost Unclipped Image Preview for Active In-Frame Crop Mode
        let ghostFrameImg: any = el.frameImgElement;
        const isGhostValid = ghostFrameImg && (ghostFrameImg instanceof HTMLImageElement || ghostFrameImg instanceof HTMLCanvasElement);
        if (!isGhostValid && el.frameImgSrc) {
          if (previewImageCache.has(el.frameImgSrc)) {
            ghostFrameImg = previewImageCache.get(el.frameImgSrc);
            el.frameImgElement = ghostFrameImg;
            drawCanvas();
          } else {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = el.frameImgSrc;
            img.onload = () => {
              el.frameImgElement = img;
              drawCanvas();
            };
            previewImageCache.set(el.frameImgSrc, img);
            ghostFrameImg = img;
          }
        }

        if (
          editingFrameId === el.id &&
          ghostFrameImg &&
          ((ghostFrameImg instanceof HTMLImageElement && ghostFrameImg.complete && ghostFrameImg.naturalWidth > 0) ||
           (ghostFrameImg instanceof HTMLCanvasElement))
        ) {
          const imgW = (ghostFrameImg as HTMLImageElement).naturalWidth || ghostFrameImg.width || 400;
          const imgH = (ghostFrameImg as HTMLImageElement).naturalHeight || ghostFrameImg.height || 400;

          let areaX = x, areaY = y, areaW = frameW, areaH = frameH;
          if (shape === 'polaroid') {
            const margin = frameW * 0.08;
            areaX = x + margin; areaY = y + margin;
            areaW = frameW - margin * 2; areaH = frameH * 0.72;
          } else if (shape === 'phone') {
            const b = frameW * 0.05;
            areaX = x + b; areaY = y + b; areaW = frameW - b * 2; areaH = frameH - b * 2;
          } else if (shape === 'laptop') {
            areaX = x + frameW * 0.12; areaY = y + frameH * 0.08;
            areaW = frameW * 0.76; areaH = frameH * 0.68;
          } else if (shape === 'browser') {
            areaY = y + 30; areaH = frameH - 30;
          }

          const userScale = el.frameImgScale || 1;
          const scale = Math.max(areaW / imgW, areaH / imgH) * userScale;
          const drawW = imgW * scale;
          const drawH = imgH * scale;

          const offsetX = el.frameImgOffsetX || 0;
          const offsetY = el.frameImgOffsetY || 0;

          const drawX = areaX + (areaW - drawW) / 2 + offsetX;
          const drawY = areaY + (areaH - drawH) / 2 + offsetY;

          ctx.save();
          ctx.globalAlpha = 0.35;
          ctx.drawImage(ghostFrameImg, drawX, drawY, drawW, drawH);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(drawX, drawY, drawW, drawH);
          ctx.restore();
        }

        // 2. Save Context & Create Mask Path for Photo Clipping
        ctx.save();
        createFramePath(ctx, shape, x, y, frameW, frameH);
        ctx.clip();

        // 3. Render Loaded Image or Placeholder Fill inside Frame Path
        let frameImg: any = el.frameImgElement;
        const isFrameImgValid = frameImg && (frameImg instanceof HTMLImageElement || frameImg instanceof HTMLCanvasElement);
        if (!isFrameImgValid && el.frameImgSrc) {
          if (previewImageCache.has(el.frameImgSrc)) {
            frameImg = previewImageCache.get(el.frameImgSrc);
            el.frameImgElement = frameImg;
            drawCanvas();
          } else {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = el.frameImgSrc;
            img.onload = () => {
              el.frameImgElement = img;
              drawCanvas();
            };
            previewImageCache.set(el.frameImgSrc, img);
            frameImg = img;
          }
        }

        if (
          frameImg &&
          ((frameImg instanceof HTMLImageElement && frameImg.complete && frameImg.naturalWidth > 0) ||
           (frameImg instanceof HTMLCanvasElement))
        ) {
          const imgW = (frameImg as HTMLImageElement).naturalWidth || frameImg.width || 400;
          const imgH = (frameImg as HTMLImageElement).naturalHeight || frameImg.height || 400;

          let areaX = x, areaY = y, areaW = frameW, areaH = frameH;
          if (shape === 'polaroid') {
            const margin = frameW * 0.08;
            areaX = x + margin; areaY = y + margin;
            areaW = frameW - margin * 2; areaH = frameH * 0.72;
          } else if (shape === 'phone') {
            const b = frameW * 0.05;
            areaX = x + b; areaY = y + b; areaW = frameW - b * 2; areaH = frameH - b * 2;
          } else if (shape === 'laptop') {
            areaX = x + frameW * 0.12; areaY = y + frameH * 0.08;
            areaW = frameW * 0.76; areaH = frameH * 0.68;
          } else if (shape === 'browser') {
            areaY = y + 30; areaH = frameH - 30;
          }

          const userScale = el.frameImgScale || 1;
          const scale = Math.max(areaW / imgW, areaH / imgH) * userScale;
          const drawW = imgW * scale;
          const drawH = imgH * scale;

          const offsetX = el.frameImgOffsetX || 0;
          const offsetY = el.frameImgOffsetY || 0;

          const drawX = areaX + (areaW - drawW) / 2 + offsetX;
          const drawY = areaY + (areaH - drawH) / 2 + offsetY;

          ctx.drawImage(frameImg, drawX, drawY, drawW, drawH);
        } else {
          // Empty Frame Container Placeholder
          ctx.fillStyle = el.frameBgColor || '#f8fafc';
          ctx.fillRect(x, y, frameW, frameH);

          // Dashed Inner Shape Outline
          ctx.strokeStyle = el.frameBorderColor || el.color || '#6366f1';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 6]);
          createFramePath(ctx, shape, x + 6, y + 6, frameW - 12, frameH - 12);
          ctx.stroke();
          ctx.setLineDash([]);

          // Center Icon & "+ إضافة صورة"
          const cx = x + frameW / 2;
          const cy = y + frameH / 2;
          ctx.fillStyle = el.frameBorderColor || el.color || '#6366f1';
          
          ctx.beginPath();
          ctx.roundRect(cx - 16, cy - 18, 32, 22, 4);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(cx, cy - 7, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = el.frameBorderColor || el.color || '#4338ca';
          ctx.font = 'bold 12px Tajawal, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('+ إضافة صورة', cx, cy + 14);
        }
        ctx.restore();

        // 4. Outer Frame Borders, Rings & Accents
        const borderWidth = el.frameBorderWidth !== undefined ? el.frameBorderWidth : (el.frameImgSrc ? 0 : 2);
        if (borderWidth > 0 && !['polaroid', 'phone', 'laptop', 'browser', 'double_circle', 'dotted_circle', 'neon_cyber', 'gold_luxury', 'circle_3d'].includes(shape)) {
          ctx.strokeStyle = el.frameBorderColor || el.color || '#6366f1';
          ctx.lineWidth = borderWidth;
          if (shape === 'dotted_circle') {
            ctx.setLineDash([5, 5]);
          }
          createFramePath(ctx, shape, x, y, frameW, frameH);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        if (shape === 'double_circle') {
          ctx.strokeStyle = el.frameBorderColor || '#f59e0b';
          ctx.lineWidth = 3;
          const r = Math.min(frameW, frameH) / 2;
          ctx.beginPath();
          ctx.arc(x + frameW / 2, y + frameH / 2, Math.max(2, r - 6), 0, Math.PI * 2);
          ctx.stroke();
        } else if (shape === 'dotted_circle') {
          ctx.save();
          ctx.strokeStyle = el.frameBorderColor || '#ec4899';
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
          const r = Math.min(frameW, frameH) / 2;
          ctx.beginPath();
          ctx.arc(x + frameW / 2, y + frameH / 2, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (shape === 'neon_cyber') {
          ctx.save();
          ctx.strokeStyle = el.frameBorderColor || '#06b6d4';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 12;
          const r = Math.min(frameW, frameH) / 2;
          ctx.beginPath();
          ctx.arc(x + frameW / 2, y + frameH / 2, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (shape === 'gold_luxury') {
          ctx.save();
          const g = ctx.createLinearGradient(x, y, x + frameW, y + frameH);
          g.addColorStop(0, '#f59e0b');
          g.addColorStop(0.5, '#fef08a');
          g.addColorStop(1, '#d97706');
          ctx.strokeStyle = g;
          ctx.lineWidth = 5;
          const r = Math.min(frameW, frameH) / 2;
          ctx.beginPath();
          ctx.arc(x + frameW / 2, y + frameH / 2, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (shape === 'circle_3d') {
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 3;
          const r = Math.min(frameW, frameH) / 2;
          ctx.beginPath();
          ctx.arc(x + frameW / 2, y + frameH / 2, Math.max(2, r - 3), -Math.PI / 4, (3 * Math.PI) / 4);
          ctx.stroke();
          ctx.restore();
        } else if (shape === 'phone') {
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.roundRect(x + frameW / 2 - 24, y + 8, 48, 12, 6);
          ctx.fill();
        }

        // Active Frame Hover / Drop Target Highlight
        if (hoveredFrameId === el.id) {
          ctx.save();
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 4;
          ctx.shadowColor = '#ec4899';
          ctx.shadowBlur = 16;
          ctx.setLineDash([8, 8]);
          createFramePath(ctx, shape, x - 2, y - 2, frameW + 4, frameH + 4);
          ctx.stroke();
          ctx.setLineDash([]);

          const badgeW = 130;
          const badgeH = 26;
          ctx.fillStyle = '#ec4899';
          ctx.beginPath();
          ctx.roundRect(x + frameW / 2 - badgeW / 2, y + frameH / 2 - badgeH / 2, badgeW, badgeH, 13);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px Tajawal, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('✨ أفلت لإدراج الصورة', x + frameW / 2, y + frameH / 2 + 4);
          ctx.restore();
        }

        // Active In-Frame Crop Mode Highlight Indicator
        if (editingFrameId === el.id) {
          ctx.save();
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 3.5;
          ctx.shadowColor = '#0284c7';
          ctx.shadowBlur = 14;
          ctx.setLineDash([6, 6]);
          createFramePath(ctx, shape, x - 2, y - 2, frameW + 4, frameH + 4);
          ctx.stroke();
          ctx.setLineDash([]);

          const badgeW = 165;
          const badgeH = 26;
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.roundRect(x + frameW / 2 - badgeW / 2, y - 32, badgeW, badgeH, 13);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px Tajawal, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('✥ اسحب الصورة للتحريك والضبط', x + frameW / 2, y - 15);
          ctx.restore();
        }
      }

      ctx.restore();
    });

    // Render Active In-Progress Brush Line
    if (isDrawing && currentLine.length > 1) {
      ctx.save();
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (brushMode === 'highlighter') {
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = strokeWidth * 2.5;
      }
      ctx.beginPath();
      currentLine.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.restore();
    }

    // Render Active Magic Eraser Stroke
    if (isErasing && eraserPoints.length > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.65)';
      ctx.fillStyle = 'rgba(244, 63, 94, 0.65)';
      ctx.lineWidth = eraserBrushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      eraserPoints.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.restore();
    }

    // 9. Render Design Safe Margins & Boundary Guides (If showMargins is active)
    if (showMargins) {
      ctx.save();
      const margin = Math.round(Math.min(imageSize.width, imageSize.height) * 0.05) || 40;
      const marginW = imageSize.width - margin * 2;
      const marginH = imageSize.height - margin * 2;

      // Dashed Margin Safe Zone Rectangle
      ctx.strokeStyle = 'rgba(225, 29, 72, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(margin, margin, marginW, marginH);

      // Corner L-Marks
      ctx.setLineDash([]);
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 2;
      const tickLen = 14;

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(margin - tickLen, margin);
      ctx.lineTo(margin, margin);
      ctx.lineTo(margin, margin - tickLen);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(margin + marginW + tickLen, margin);
      ctx.lineTo(margin + marginW, margin);
      ctx.lineTo(margin + marginW, margin - tickLen);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(margin - tickLen, margin + marginH);
      ctx.lineTo(margin, margin + marginH);
      ctx.lineTo(margin, margin + marginH + tickLen);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(margin + marginW + tickLen, margin + marginH);
      ctx.lineTo(margin + marginW, margin + marginH);
      ctx.lineTo(margin + marginW, margin + marginH + tickLen);
      ctx.stroke();

      ctx.restore();
    }

    // 10. Render Active Dynamic Snap Alignment Guides & Center Crosshair
    if (snapGuides.x !== undefined || snapGuides.y !== undefined) {
      ctx.save();

      // Vertical Guide Line
      if (snapGuides.x !== undefined) {
        ctx.beginPath();
        ctx.strokeStyle = snapGuides.isCenterVertical ? '#e11d48' : '#38bdf8';
        ctx.lineWidth = snapGuides.isCenterVertical ? 2 : 1.5;
        ctx.setLineDash(snapGuides.isCenterVertical ? [4, 4] : [3, 3]);
        ctx.moveTo(snapGuides.x, 0);
        ctx.lineTo(snapGuides.x, imageSize.height);
        ctx.stroke();
      }

      // Horizontal Guide Line
      if (snapGuides.y !== undefined) {
        ctx.beginPath();
        ctx.strokeStyle = snapGuides.isCenterHorizontal ? '#e11d48' : '#38bdf8';
        ctx.lineWidth = snapGuides.isCenterHorizontal ? 2 : 1.5;
        ctx.setLineDash(snapGuides.isCenterHorizontal ? [4, 4] : [3, 3]);
        ctx.moveTo(0, snapGuides.y);
        ctx.lineTo(imageSize.width, snapGuides.y);
        ctx.stroke();
      }

      // High-Precision Center Intersection Reticle (عند التقاء خطي المنتصف باللون الأحمر/البراند)
      if (snapGuides.isCenterIntersection) {
        const cx = Math.round(imageSize.width / 2);
        const cy = Math.round(imageSize.height / 2);

        ctx.setLineDash([]);
        
        // Outer Glowing Halo
        ctx.beginPath();
        ctx.arc(cx, cy, 24, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(225, 29, 72, 0.15)';
        ctx.fill();
        ctx.strokeStyle = '#e11d48';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner Circle
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(225, 29, 72, 0.4)';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Central Bullseye Dot
        ctx.beginPath();
        ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#e11d48';
        ctx.fill();

        // Crosshair Ticks
        ctx.strokeStyle = '#e11d48';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 32, cy);
        ctx.lineTo(cx - 10, cy);
        ctx.moveTo(cx + 10, cy);
        ctx.lineTo(cx + 32, cy);
        ctx.moveTo(cx, cy - 32);
        ctx.lineTo(cx, cy - 10);
        ctx.moveTo(cx, cy + 10);
        ctx.lineTo(cx, cy + 32);
        ctx.stroke();

        // Center Pill Badge
        const tagText = isAr ? 'المركز التام (100% Center)' : '100% Canvas Center';
        ctx.font = 'bold 12px Tajawal, sans-serif';
        const tagMetrics = ctx.measureText(tagText);
        const tagW = tagMetrics.width + 16;
        const tagH = 22;
        const tagX = cx - tagW / 2;
        const tagY = cy - 42;

        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        if ((ctx as any).roundRect) {
          (ctx as any).roundRect(tagX, tagY, tagW, tagH, 6);
        } else {
          ctx.rect(tagX, tagY, tagW, tagH);
        }
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tagText, cx, tagY + tagH / 2);
      }

      ctx.restore();
    }
  }, [elements, filters, selectedId, isDrawing, currentLine, isErasing, eraserPoints, eraserBrushSize, activeColor, strokeWidth, brushMode, imageSize, showMargins, snapGuides, isAr]);

  useEffect(() => {
    drawCanvasRef.current = drawCanvas;
    drawCanvas();
  }, [drawCanvas]);

  // Load and Sync Current Page Background Image (Fully isolated between pages - passive fit to prevent scroll locking)
  useEffect(() => {
    const activePage = pages[currentPageIndex];
    const bgSrc = activePage?.bgImgSrc || artifact?.content;
    
    if (!bgSrc) {
      setImageLoaded(true);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = bgSrc;
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      if (imageSize.width === 0 || !imageSize.width) {
        const w = img.naturalWidth || 1080;
        const h = img.naturalHeight || 1080;
        setImageSize({ width: w, height: h });
        setCustomWidth(w);
        setCustomHeight(h);
      } else {
        drawCanvas();
      }
    };
    img.onerror = () => {
      setImageLoaded(true);
      drawCanvas();
    };
  }, [currentPageIndex, pages, artifact?.content, drawCanvas, imageSize.width, imageSize.height]);

  // Coordinate Conversion with Pan & Zoom Compensation
  const getCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom
    };
  };

  // Mouse Handlers on Stage
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.altKey || (activeTool === 'select' && e.shiftKey)) {
      // Pan viewport
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);

    // 0. Magic Eraser Tool
    if (activeTool === 'eraser') {
      const clicked = [...elements].reverse().find(el => {
        if (el.hidden || el.locked) return false;
        const boxX = el.x - 4;
        const boxY = el.y - 4;
        const boxW = (el.w || 80) + 8;
        const boxH = (el.h || 40) + 8;
        return x >= boxX && x <= boxX + boxW && y >= boxY && y <= boxY + boxH;
      });

      if (clicked) {
        recordHistory();
        setElements(prev => prev.filter(el => el.id !== clicked.id));
        if (selectedId === clicked.id) setSelectedId(null);
        toast.success(isAr ? `✨ تم محو العنصر (${clicked.name || 'عنصر'}) سحرياً` : 'Magic erased element!');
        return;
      }

      setIsErasing(true);
      setEraserPoints([{ x, y }]);
      return;
    }

    // 1. Freehand Brush Drawing
    if (activeTool === 'draw') {
      setIsDrawing(true);
      setCurrentLine([{ x, y }]);
      return;
    }

    // 2. Select & Move Existing Element
    if (activeTool === 'select') {
      // Find clicked element in reverse order (top to bottom)
      const clicked = [...elements].reverse().find(el => {
        if (el.hidden || el.locked) return false;
        const boxX = el.x - 8;
        const boxY = el.y - 8;
        const boxW = (el.w || 80) + 16;
        const boxH = (el.h || 40) + 16;
        return x >= boxX && x <= boxX + boxW && y >= boxY && y <= boxY + boxH;
      });

      if (clicked) {
        // In-Frame Inner Photo Pan Mode
        if ((clicked.type === 'frame' || clicked.frameShape) && clicked.frameImgSrc) {
          if (editingFrameId === clicked.id || e.detail === 2) {
            setEditingFrameId(clicked.id);
            setSelectedId(clicked.id);
            setCropDragStart({
              x,
              y,
              initX: clicked.frameImgOffsetX || 0,
              initY: clicked.frameImgOffsetY || 0
            });
            return;
          }
        }

        if (editingFrameId && clicked.id !== editingFrameId) {
          setEditingFrameId(null);
        }

        recordHistory();
        setSelectedId(clicked.id);
        setActiveResizeHandle(null);
        setDragStart({ x, y });
        setElementStartPos({
          x: clicked.x,
          y: clicked.y,
          w: clicked.w,
          h: clicked.h,
          fontSize: clicked.fontSize || 32,
          rotation: clicked.rotation || 0
        });

        // Instant Text Focus & Edit Mode without requiring double-click
        if (clicked.type === 'text') {
          setEditingTextId(clicked.id);
          setEditingTextValue(clicked.text || '');
        } else {
          setEditingTextId(null);
        }
      } else {
        setSelectedId(null);
        setActiveResizeHandle(null);
        setEditingTextId(null);
        setEditingFrameId(null);
      }
      return;
    }

    // 3. Create Text Element directly on Click (Calibrated Exact Frame)
    if (activeTool === 'text') {
      recordHistory();
      const newId = `text-${Date.now()}`;
      const defaultText = isAr ? 'أدخل النص هنا' : 'Your text here';
      const fontSize = 32;
      const metrics = computeTextMetrics(defaultText, 'Tajawal, sans-serif', fontSize, 'bold', 'normal');
      const newW = metrics.width + 24;
      const newH = metrics.height + 14;

      const newEl: CanvasElement = {
        id: newId,
        type: 'text',
        name: isAr ? 'نص جديد' : 'Text',
        x: Math.max(10, Math.round(x - newW / 2)),
        y: Math.max(10, Math.round(y - newH / 2)),
        w: newW,
        h: newH,
        text: defaultText,
        color: activeColor,
        strokeWidth: 0,
        fontSize,
        fontFamily: 'Tajawal, sans-serif',
        fontWeight: 'bold',
        textAlign: 'center',
        textBgColor: 'transparent',
        textShadow: true
      };
      setElements(prev => [...prev, newEl]);
      setSelectedId(newId);
      setEditingTextId(newId);
      setEditingTextValue(newEl.text || '');
      setActiveTool('select');
      return;
    }

    // 4. Create Shape Elements (Rect, Circle, Star, Arrow)
    if (['rect', 'circle', 'arrow', 'star'].includes(activeTool)) {
      recordHistory();
      const newId = `${activeTool}-${Date.now()}`;
      let newEl: CanvasElement = {
        id: newId,
        type: activeTool as any,
        name: isAr ? `شكل (${activeTool})` : `Shape (${activeTool})`,
        x,
        y,
        w: 120,
        h: 120,
        color: activeColor,
        fillColor: activeTool === 'star' ? activeColor : 'transparent',
        strokeColor: activeColor,
        strokeWidth: strokeWidth || 4,
        opacity: 1
      };

      if (activeTool === 'arrow') {
        newEl.w = 140;
        newEl.h = 100;
      }

      setElements(prev => [...prev, newEl]);
      setSelectedId(newId);
      setActiveTool('select');
      setDragStart({ x, y });
      setElementStartPos({ x: newEl.x, y: newEl.y, w: newEl.w, h: newEl.h });
    }
  };

  const handleMouseMove = (e: React.MouseEvent | MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
      return;
    }

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);

    // Track eraser cursor position for glowing halo indicator
    if (activeTool === 'eraser') {
      setEraserCursorPos({ x, y });
      if (isErasing) {
        setEraserPoints(prev => [...prev, { x, y }]);
      }
      return;
    }

    // Freehand drawing in progress
    if (isDrawing) {
      setCurrentLine(prev => [...prev, { x, y }]);
      return;
    }

    // Panning inner photo inside frame
    if (cropDragStart) {
      const targetId = editingFrameId || selectedId;
      if (targetId) {
        const dx = Math.round(x - cropDragStart.x);
        const dy = Math.round(y - cropDragStart.y);
        setElements(prev => prev.map(el => el.id === targetId ? {
          ...el,
          frameImgOffsetX: cropDragStart.initX + dx,
          frameImgOffsetY: cropDragStart.initY + dy
        } : el));
        return;
      }
    }

    // Move or Resize Selected Element
    if (dragStart && elementStartPos && selectedId) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;

      if (activeResizeHandle) {
        if (activeResizeHandle === 'rot') {
          const el = selectedElement;
          if (!el) return;
          const cx = el.x + (el.w || 100) / 2;
          const cy = el.y + (el.h || 40) / 2;
          const rad = Math.atan2(y - cy, x - cx);
          let deg = Math.round((rad * 180) / Math.PI) + 90;
          if (deg < 0) deg += 360;
          if (deg >= 360) deg -= 360;

          // Magnetic snapping at 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°
          if (Math.abs(deg) <= 3 || Math.abs(deg - 360) <= 3) deg = 0;
          else if (Math.abs(deg - 45) <= 3) deg = 45;
          else if (Math.abs(deg - 90) <= 3) deg = 90;
          else if (Math.abs(deg - 135) <= 3) deg = 135;
          else if (Math.abs(deg - 180) <= 3) deg = 180;
          else if (Math.abs(deg - 225) <= 3) deg = 225;
          else if (Math.abs(deg - 270) <= 3) deg = 270;
          else if (Math.abs(deg - 315) <= 3) deg = 315;

          setElements(prev => prev.map(item => item.id === selectedId && !item.locked ? {
            ...item,
            rotation: deg
          } : item));
          return;
        }

        // Compute local dx, dy taking element rotation into account
        const rot = elementStartPos.rotation || 0;
        let localDx = dx;
        let localDy = dy;
        if (rot !== 0) {
          const rad = (-rot * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          localDx = dx * cos - dy * sin;
          localDy = dx * sin + dy * cos;
        }

        let newX = elementStartPos.x;
        let newY = elementStartPos.y;
        let newW = elementStartPos.w;
        let newH = elementStartPos.h;

        const isText = selectedElement?.type === 'text';
        let newFontSize = elementStartPos.fontSize || selectedElement?.fontSize || 32;
        const isCorner = ['nw', 'ne', 'sw', 'se'].includes(activeResizeHandle);

        if (isCorner) {
          // --- PROFESSIONAL CORNER RESIZING (NW, NE, SW, SE) ---
          // Proportional scaling preserving aspect ratio smoothly from both horizontal and vertical mouse movements
          let deltaW = 0;
          let deltaH = 0;

          switch (activeResizeHandle) {
            case 'se': // Bottom-Right corner
              deltaW = localDx;
              deltaH = localDy;
              break;
            case 'sw': // Bottom-Left corner
              deltaW = -localDx;
              deltaH = localDy;
              break;
            case 'ne': // Top-Right corner
              deltaW = localDx;
              deltaH = -localDy;
              break;
            case 'nw': // Top-Left corner
              deltaW = -localDx;
              deltaH = -localDy;
              break;
          }

          const startW = Math.max(elementStartPos.w, 10);
          const startH = Math.max(elementStartPos.h, 10);
          const scaleX = (startW + deltaW) / startW;
          const scaleY = (startH + deltaH) / startH;

          // Dominant scale so dragging either horizontally or vertically responds smoothly
          const relDeltaX = Math.abs(deltaW) / startW;
          const relDeltaY = Math.abs(deltaH) / startH;
          const chosenScale = Math.max(0.05, relDeltaX >= relDeltaY ? scaleX : scaleY);

          if (e.shiftKey && !isText) {
            // Free non-proportional corner stretch when Shift is held
            newW = Math.max(15, startW + deltaW);
            newH = Math.max(15, startH + deltaH);
          } else {
            // Standard professional proportional scaling
            newW = Math.max(15, Math.round(startW * chosenScale));
            newH = Math.max(15, Math.round(startH * chosenScale));
          }

          if (isText) {
            const startFont = elementStartPos.fontSize || 32;
            newFontSize = Math.max(8, Math.min(320, Math.round(startFont * chosenScale)));
            const metrics = computeTextMetrics(
              selectedElement?.text || '',
              selectedElement?.fontFamily || 'Tajawal, sans-serif',
              newFontSize,
              selectedElement?.fontWeight || 'bold',
              selectedElement?.fontStyle || 'normal',
              newW - 12,
              selectedElement?.textLineHeight || 1.25,
              !!selectedElement?.textUppercase
            );
            newW = Math.max(newW, metrics.width + 16);
            newH = Math.max(20, metrics.height + 14);
          }

          // Anchor point positioning according to corner:
          if (activeResizeHandle === 'sw' || activeResizeHandle === 'nw') {
            newX = elementStartPos.x + (elementStartPos.w - newW);
          }
          if (activeResizeHandle === 'ne' || activeResizeHandle === 'nw') {
            newY = elementStartPos.y + (elementStartPos.h - newH);
          }
        } else {
          // --- DIRECTIONAL HORIZONTAL & VERTICAL RESIZING ---
          switch (activeResizeHandle) {
            case 'e': // Right handle: Free Horizontal Resize
              newW = Math.max(15, elementStartPos.w + localDx);
              if (isText) {
                const metrics = computeTextMetrics(
                  selectedElement?.text || '',
                  selectedElement?.fontFamily || 'Tajawal, sans-serif',
                  selectedElement?.fontSize || 32,
                  selectedElement?.fontWeight || 'bold',
                  selectedElement?.fontStyle || 'normal',
                  newW - 12,
                  selectedElement?.textLineHeight || 1.25,
                  !!selectedElement?.textUppercase
                );
                newH = Math.max(20, metrics.height + 14);
              }
              break;

            case 'w': // Left handle: Free Horizontal Resize
              newW = Math.max(15, elementStartPos.w - localDx);
              newX = elementStartPos.x + (elementStartPos.w - newW);
              if (isText) {
                const metrics = computeTextMetrics(
                  selectedElement?.text || '',
                  selectedElement?.fontFamily || 'Tajawal, sans-serif',
                  selectedElement?.fontSize || 32,
                  selectedElement?.fontWeight || 'bold',
                  selectedElement?.fontStyle || 'normal',
                  newW - 12,
                  selectedElement?.textLineHeight || 1.25,
                  !!selectedElement?.textUppercase
                );
                newH = Math.max(20, metrics.height + 14);
              }
              break;

            case 's': // Bottom handle: Free Vertical Resize
              newH = Math.max(15, elementStartPos.h + localDy);
              if (isText) {
                const vScale = Math.max(0.2, newH / Math.max(elementStartPos.h, 1));
                newFontSize = Math.max(8, Math.min(320, Math.round((elementStartPos.fontSize || 32) * vScale)));
                const metrics = computeTextMetrics(
                  selectedElement?.text || '',
                  selectedElement?.fontFamily || 'Tajawal, sans-serif',
                  newFontSize,
                  selectedElement?.fontWeight || 'bold',
                  selectedElement?.fontStyle || 'normal',
                  elementStartPos.w - 12,
                  selectedElement?.textLineHeight || 1.25,
                  !!selectedElement?.textUppercase
                );
                newW = Math.max(elementStartPos.w, metrics.width + 16);
                newH = Math.max(20, metrics.height + 14);
              }
              break;

            case 'n': // Top handle: Free Vertical Resize
              newH = Math.max(15, elementStartPos.h - localDy);
              newY = elementStartPos.y + (elementStartPos.h - newH);
              if (isText) {
                const vScale = Math.max(0.2, newH / Math.max(elementStartPos.h, 1));
                newFontSize = Math.max(8, Math.min(320, Math.round((elementStartPos.fontSize || 32) * vScale)));
                const metrics = computeTextMetrics(
                  selectedElement?.text || '',
                  selectedElement?.fontFamily || 'Tajawal, sans-serif',
                  newFontSize,
                  selectedElement?.fontWeight || 'bold',
                  selectedElement?.fontStyle || 'normal',
                  elementStartPos.w - 12,
                  selectedElement?.textLineHeight || 1.25,
                  !!selectedElement?.textUppercase
                );
                newW = Math.max(elementStartPos.w, metrics.width + 16);
                newH = Math.max(20, metrics.height + 14);
                newY = elementStartPos.y + (elementStartPos.h - newH);
              }
              break;
          }
        }

        setElements(prev => prev.map(el => {
          if (el.id === selectedId && !el.locked) {
            return {
              ...el,
              x: Math.round(newX),
              y: Math.round(newY),
              w: Math.round(newW),
              h: Math.round(newH),
              ...(isText && (isCorner || activeResizeHandle === 's' || activeResizeHandle === 'n') ? { fontSize: newFontSize } : {})
            };
          }
          return el;
        }));
        return;
      }

      // Plain Drag / Move with Smart Magnetic Alignment & Center Snapping
      let targetX = elementStartPos.x + dx;
      let targetY = elementStartPos.y + dy;

      const elW = selectedElement?.w || 100;
      const elH = selectedElement?.h || 40;
      const SNAP_THRESHOLD = Math.max(6, Math.round(8 / Math.max(zoom, 0.2)));

      const margin = Math.round(Math.min(imageSize.width, imageSize.height) * 0.05) || 40;
      const canvasCenterX = Math.round(imageSize.width / 2);
      const canvasCenterY = Math.round(imageSize.height / 2);

      let snapX: number | undefined = undefined;
      let snapY: number | undefined = undefined;
      let isCenterVertical = false;
      let isCenterHorizontal = false;
      let isMargin = false;

      const elCenterX = targetX + elW / 2;
      const elCenterY = targetY + elH / 2;

      // 1. Center X Alignment (Magnetic Snap to Canvas Vertical Center)
      if (Math.abs(elCenterX - canvasCenterX) <= SNAP_THRESHOLD) {
        targetX = canvasCenterX - elW / 2;
        snapX = canvasCenterX;
        isCenterVertical = true;
      }
      // 2. Safe Margin Left Alignment
      else if (Math.abs(targetX - margin) <= SNAP_THRESHOLD) {
        targetX = margin;
        snapX = margin;
        isMargin = true;
      }
      // 3. Safe Margin Right Alignment
      else if (Math.abs(targetX + elW - (imageSize.width - margin)) <= SNAP_THRESHOLD) {
        targetX = imageSize.width - margin - elW;
        snapX = imageSize.width - margin;
        isMargin = true;
      }
      // 4. Canvas Border Left / Right
      else if (Math.abs(targetX) <= SNAP_THRESHOLD) {
        targetX = 0;
        snapX = 0;
      } else if (Math.abs(targetX + elW - imageSize.width) <= SNAP_THRESHOLD) {
        targetX = imageSize.width - elW;
        snapX = imageSize.width;
      }

      // 1. Center Y Alignment (Magnetic Snap to Canvas Horizontal Center)
      if (Math.abs(elCenterY - canvasCenterY) <= SNAP_THRESHOLD) {
        targetY = canvasCenterY - elH / 2;
        snapY = canvasCenterY;
        isCenterHorizontal = true;
      }
      // 2. Safe Margin Top Alignment
      else if (Math.abs(targetY - margin) <= SNAP_THRESHOLD) {
        targetY = margin;
        snapY = margin;
        isMargin = true;
      }
      // 3. Safe Margin Bottom Alignment
      else if (Math.abs(targetY + elH - (imageSize.height - margin)) <= SNAP_THRESHOLD) {
        targetY = imageSize.height - margin - elH;
        snapY = imageSize.height - margin;
        isMargin = true;
      }
      // 4. Canvas Border Top / Bottom
      else if (Math.abs(targetY) <= SNAP_THRESHOLD) {
        targetY = 0;
        snapY = 0;
      } else if (Math.abs(targetY + elH - imageSize.height) <= SNAP_THRESHOLD) {
        targetY = imageSize.height - elH;
        snapY = imageSize.height;
      }

      // 5. Align with Sibling Elements
      if (!isCenterVertical || !isCenterHorizontal) {
        elements.forEach(other => {
          if (other.id === selectedId || other.hidden) return;
          const otherCenterX = other.x + (other.w || 100) / 2;
          const otherCenterY = other.y + (other.h || 40) / 2;

          if (!isCenterVertical && Math.abs(elCenterX - otherCenterX) <= SNAP_THRESHOLD) {
            targetX = otherCenterX - elW / 2;
            snapX = otherCenterX;
          }
          if (!isCenterHorizontal && Math.abs(elCenterY - otherCenterY) <= SNAP_THRESHOLD) {
            targetY = otherCenterY - elH / 2;
            snapY = otherCenterY;
          }
        });
      }

      const isCenterIntersection = isCenterVertical && isCenterHorizontal;

      setSnapGuides({
        x: snapX,
        y: snapY,
        isCenterVertical,
        isCenterHorizontal,
        isCenterIntersection,
        isMargin
      });

      // 6. Detect Frame Container Drop Hover
      if (selectedElement && (selectedElement.type === 'sticker' || selectedElement.imgSrc) && selectedElement.type !== 'frame') {
        const dragCenterX = targetX + elW / 2;
        const dragCenterY = targetY + elH / 2;
        const targetFrame = elements.find(el => el.id !== selectedId && el.type === 'frame' && dragCenterX >= el.x && dragCenterX <= el.x + el.w && dragCenterY >= el.y && dragCenterY <= el.y + el.h);
        setHoveredFrameId(targetFrame ? targetFrame.id : null);
      } else {
        setHoveredFrameId(null);
      }

      setElements(prev => prev.map(el => {
        if (el.id === selectedId && !el.locked) {
          return {
            ...el,
            x: Math.round(targetX),
            y: Math.round(targetY)
          };
        }
        return el;
      }));
    }
  };

  const handleMouseUp = () => {
    setSnapGuides({});
    if (cropDragStart) {
      setCropDragStart(null);
      recordHistory();
      flushSaveSession();
    }
    if (isPanning) {
      setIsPanning(false);
    }

    if (activeResizeHandle) {
      recordHistory();
      flushSaveSession();
      setActiveResizeHandle(null);
    }

    if (dragStart && elementStartPos && selectedId) {
      const movedEl = elements.find(el => el.id === selectedId);
      if (movedEl && (movedEl.type === 'sticker' || movedEl.imgSrc) && movedEl.type !== 'frame') {
        const cx = movedEl.x + movedEl.w / 2;
        const cy = movedEl.y + movedEl.h / 2;
        const targetFrame = elements.find(el => el.id !== movedEl.id && el.type === 'frame' && cx >= el.x && cx <= el.x + el.w && cy >= el.y && cy <= el.y + el.h);
        if (targetFrame) {
          recordHistory();
          const img = new Image();
          img.crossOrigin = 'anonymous';
          if (movedEl.imgSrc) img.src = movedEl.imgSrc;
          const updatedElements = elements.filter(el => el.id !== movedEl.id).map(el => el.id === targetFrame.id ? {
            ...el,
            frameImgSrc: movedEl.imgSrc,
            frameImgElement: img
          } : el);
          setElements(updatedElements);
          flushSaveSession({ customElements: updatedElements });
          setSelectedId(targetFrame.id);
          setHoveredFrameId(null);
          setDragStart(null);
          setElementStartPos(null);
          toast.success(isAr ? 'تم دمج الصورة واستيعابها داخل الإطار بنجاح ✨' : 'Image clipped into frame');
          return;
        }
      }
      if (movedEl && (movedEl.x !== elementStartPos.x || movedEl.y !== elementStartPos.y)) {
        recordHistory();
        flushSaveSession();
      }
    }

    setHoveredFrameId(null);

    if (isDrawing && currentLine.length > 1) {
      recordHistory();
      const newId = `draw-${Date.now()}`;
      const newEl: CanvasElement = {
        id: newId,
        type: 'draw',
        name: isAr ? 'رسم حر' : 'Drawing',
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        color: activeColor,
        strokeWidth,
        points: currentLine,
        brushMode,
        opacity: brushOpacity
      };
      const updatedElements = [...elements, newEl];
      setElements(updatedElements);
      flushSaveSession({ customElements: updatedElements });
      setIsDrawing(false);
      setCurrentLine([]);
    }

    if (isErasing && eraserPoints.length > 0) {
      executeMagicErase(eraserPoints, eraserBrushSize);
      setIsErasing(false);
      setEraserPoints([]);
      flushSaveSession();
    }

    setDragStart(null);
    setElementStartPos(null);
  };

  // Global drag listener to keep resize and move buttery smooth across the entire viewport
  const handleMouseMoveRef = useRef(handleMouseMove);
  handleMouseMoveRef.current = handleMouseMove;
  const handleMouseUpRef = useRef(handleMouseUp);
  handleMouseUpRef.current = handleMouseUp;

  useEffect(() => {
    if (!dragStart && !cropDragStart && !activeResizeHandle && !isPanning && !isDrawing && !isErasing) return;

    const onGlobalMouseMove = (e: MouseEvent) => {
      handleMouseMoveRef.current(e);
    };
    const onGlobalMouseUp = () => {
      handleMouseUpRef.current();
    };

    window.addEventListener('mousemove', onGlobalMouseMove);
    window.addEventListener('mouseup', onGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', onGlobalMouseMove);
      window.removeEventListener('mouseup', onGlobalMouseUp);
    };
  }, [dragStart, cropDragStart, activeResizeHandle, isPanning, isDrawing, isErasing]);

  // Global listener to commit & exit in-frame crop mode when clicking anywhere outside
  useEffect(() => {
    if (!editingFrameId) return;

    const onGlobalClickOutside = (e: MouseEvent) => {
      const container = containerRef.current;
      if (container && container.contains(e.target as Node)) {
        return;
      }
      setEditingFrameId(null);
      recordHistory();
      flushSaveSession();
    };

    window.addEventListener('mousedown', onGlobalClickOutside);
    return () => window.removeEventListener('mousedown', onGlobalClickOutside);
  }, [editingFrameId, flushSaveSession, recordHistory]);

  // Double Click on Stage to edit text inline or enter in-frame photo crop mode
  const handleDoubleClick = (e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    const hitEl = [...elements].reverse().find(el => {
      if (el.hidden || el.locked) return false;
      const boxX = el.x - 8;
      const boxY = el.y - 8;
      const boxW = (el.w || 100) + 16;
      const boxH = (el.h || 40) + 16;
      return x >= boxX && x <= boxX + boxW && y >= boxY && y <= boxY + boxH;
    });

    if (hitEl) {
      if (hitEl.type === 'text') {
        recordHistory();
        setSelectedId(hitEl.id);
        setEditingTextId(hitEl.id);
        setEditingTextValue(hitEl.text || '');
      } else if (hitEl.type === 'frame' || hitEl.frameShape) {
        recordHistory();
        setSelectedId(hitEl.id);
        if (hitEl.frameImgSrc) {
          setEditingFrameId(hitEl.id);
          toast.info(isAr ? 'نمط تعديل موضع الصورة: اسحب الصورة داخل الإطار للتحريك والتعديل ✨' : 'In-frame photo crop mode: Drag photo inside frame to adjust position.');
        } else {
          setActiveSidebarTab('photos');
          setIsSidebarOpen(true);
          toast.info(isAr ? 'اختر صورة من المكتبة لإدراجها داخل الإطار ✨' : 'Select a photo from library to insert into frame');
        }
      }
    }
  };

  // Zoom control helper with clean, steady discrete levels and instantaneous persistence
  const handleZoomChange = useCallback((action: 'in' | 'out' | number) => {
    const ZOOM_STEPS = [0.2, 0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];
    setZoom(prev => {
      let target: number;
      const isZoomIn = action === 'in' || (typeof action === 'number' && action > 1);
      if (isZoomIn) {
        const next = ZOOM_STEPS.find(s => s > prev + 0.01);
        target = next !== undefined ? next : Math.min(3.0, Number((prev + 0.1).toFixed(2)));
      } else {
        const prevStep = [...ZOOM_STEPS].reverse().find(s => s < prev - 0.01);
        target = prevStep !== undefined ? prevStep : Math.max(0.2, Number((prev - 0.1).toFixed(2)));
      }
      target = Math.max(0.2, Math.min(3.0, Number(target.toFixed(2))));
      try {
        localStorage.setItem('rataq_studio_zoomScale', String(target));
        localStorage.setItem('rataq_studio_user_zoom', String(target));
      } catch {}
      return target;
    });
  }, []);

  // Direct Send to Chat & AI Processing
  const handleSendToChat = (customPromptText?: string) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      toast.error(isAr ? 'مساحة العمل غير جاهزة بعد.' : 'Canvas not initialized.');
      return;
    }

    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error(isAr ? 'فشل تحويل الصورة المعدلة.' : 'Failed to export edited image.');
          return;
        }

        const file = new File([blob], `perplexta_edited_${Date.now()}.png`, { type: 'image/png' });

        const defaultPrompt = isAr ? 'حلل هذه الصورة بعد التعديل في استوديو التصميم:' : 'Analyze this edited image from Design Studio:';
        const finalPrompt = customPromptText && customPromptText.trim() ? customPromptText.trim() : defaultPrompt;

        const event = new CustomEvent('inject_image_to_chat', {
          detail: {
            file,
            prompt: finalPrompt
          }
        });

        window.dispatchEvent(event);
        toast.success(isAr ? 'تم إرسال الصورة المعدلة للشات بنجاح!' : 'Sent edited image to chat successfully!');
        if (onClose) onClose();
      }, 'image/png');
    } catch (err: any) {
      console.error('Error sending to chat:', err);
      toast.error(isAr ? 'حدث خطأ أثناء الإرسال للشات.' : 'Error sending image to chat.');
    }
  };

  // Download & Export High-Res Image with Resolution Multiplier and Transparency
  const handleExecuteExport = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    try {
      const scale = exportScale || 1;
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = imageSize.width * scale;
      exportCanvas.height = imageSize.height * scale;
      const exportCtx = exportCanvas.getContext('2d');

      if (!exportCtx) return;

      exportCtx.scale(scale, scale);

      // Draw background unless transparent PNG requested
      if (!exportTransparent || exportFormat !== 'png') {
        if (imageRef.current instanceof HTMLImageElement && imageRef.current.complete && imageRef.current.naturalWidth > 0) {
          exportCtx.filter = `
            brightness(${filters.brightness}%) 
            contrast(${filters.contrast}%) 
            saturate(${filters.saturation}%) 
            blur(${filters.blur}px) 
            grayscale(${filters.grayscale}%) 
            sepia(${filters.sepia}%)
            hue-rotate(${filters.hueRotate}deg)
            invert(${filters.invert}%)
          `.trim();
          exportCtx.drawImage(imageRef.current, 0, 0, imageSize.width, imageSize.height);
          exportCtx.filter = 'none';
        }
      }

      // Draw all elements on export canvas
      elements.forEach(el => {
        if (el.hidden) return;
        exportCtx.save();
        exportCtx.globalAlpha = el.opacity !== undefined ? el.opacity : 1;

        if (el.type === 'draw' && el.points && el.points.length > 0) {
          const sw = el.strokeWidth || 4;
          exportCtx.strokeStyle = el.color;
          exportCtx.lineWidth = sw;
          exportCtx.lineCap = 'round';
          exportCtx.lineJoin = 'round';
          if (el.brushMode === 'highlighter') {
            exportCtx.globalAlpha = (el.opacity || 0.45) * 0.45;
            exportCtx.lineWidth = Math.max(12, sw * 2.5);
          }
          exportCtx.beginPath();
          el.points.forEach((pt, idx) => {
            if (idx === 0) exportCtx.moveTo(pt.x, pt.y);
            else exportCtx.lineTo(pt.x, pt.y);
          });
          exportCtx.stroke();
        } else if (el.type === 'text' && el.text) {
          let displayText = el.text;
          if (el.textUppercase) displayText = displayText.toUpperCase();

          const fontSize = el.fontSize || 32;
          const fontFamily = el.fontFamily || 'Tajawal, sans-serif';
          const fontWeight = el.fontWeight || 'bold';
          const fontStyle = el.fontStyle || 'normal';
          const maxWidth = el.w && el.w > 30 ? el.w - 12 : undefined;

          exportCtx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
          exportCtx.textAlign = el.textAlign || 'center';
          exportCtx.textBaseline = 'top';

          const metrics = computeTextMetrics(
            displayText,
            fontFamily,
            fontSize,
            fontWeight,
            fontStyle,
            maxWidth,
            el.textLineHeight || 1.25,
            false
          );
          const lines = metrics.lines;
          const lineHeight = metrics.lineHeight;
          const pad = el.textBgPadding !== undefined ? el.textBgPadding : 6;
          const rad = el.textBgCornerRadius !== undefined ? el.textBgCornerRadius : 6;

          if (el.textBgColor && el.textBgColor !== 'transparent') {
            exportCtx.fillStyle = el.textBgColor;
            exportCtx.beginPath();
            const bgW = el.w || (metrics.width + pad * 2);
            const bgH = el.h || (metrics.height + pad * 2);
            exportCtx.roundRect(el.x, el.y, bgW, bgH, rad);
            exportCtx.fill();
          }

          if (el.textShadow) {
            exportCtx.shadowColor = el.shadowColor || 'rgba(0, 0, 0, 0.85)';
            exportCtx.shadowBlur = el.shadowBlur !== undefined ? el.shadowBlur : 8;
            exportCtx.shadowOffsetX = el.shadowOffsetX !== undefined ? el.shadowOffsetX : 3;
            exportCtx.shadowOffsetY = el.shadowOffsetY !== undefined ? el.shadowOffsetY : 3;
          }

          const totalTextHeight = lines.length * lineHeight;
          const topOffsetY = el.h && el.h > totalTextHeight ? Math.max(0, (el.h - totalTextHeight) / 2) : 4;

          lines.forEach((line, idx) => {
            let drawX = el.x + 6;
            if (el.textAlign === 'center') drawX = el.x + (el.w || metrics.width + 12) / 2;
            else if (el.textAlign === 'right') drawX = el.x + (el.w || metrics.width + 12) - 6;

            const drawY = el.y + topOffsetY + idx * lineHeight;

            if (el.textStrokeWidth && el.textStrokeWidth > 0) {
              exportCtx.strokeStyle = el.textStrokeColor || '#000000';
              exportCtx.lineWidth = el.textStrokeWidth;
              exportCtx.strokeText(line, drawX, drawY);
            }
            exportCtx.fillStyle = el.color;
            exportCtx.fillText(line, drawX, drawY);
          });
        } else if (el.type === 'rect') {
          const sw = el.strokeWidth || 0;
          exportCtx.strokeStyle = el.strokeColor || el.color;
          exportCtx.lineWidth = sw;
          exportCtx.fillStyle = el.fillColor || 'transparent';
          exportCtx.beginPath();
          if (el.cornerRadius) exportCtx.roundRect(el.x, el.y, el.w, el.h, el.cornerRadius);
          else exportCtx.rect(el.x, el.y, el.w, el.h);
          if (el.fillColor && el.fillColor !== 'transparent') exportCtx.fill();
          if (sw > 0) exportCtx.stroke();
        } else if (el.type === 'circle') {
          const sw = el.strokeWidth || 0;
          exportCtx.strokeStyle = el.strokeColor || el.color;
          exportCtx.lineWidth = sw;
          exportCtx.fillStyle = el.fillColor || 'transparent';
          const rx = Math.abs(el.w) / 2;
          const ry = Math.abs(el.h) / 2;
          exportCtx.beginPath();
          exportCtx.ellipse(el.x + rx, el.y + ry, rx, ry, 0, 0, Math.PI * 2);
          if (el.fillColor && el.fillColor !== 'transparent') exportCtx.fill();
          if (sw > 0) exportCtx.stroke();
        } else if ((el.type === 'sticker' || el.imgSrc) && el.imgElement && el.type !== 'frame') {
          if (el.imgElement instanceof HTMLImageElement && el.imgElement.complete && el.imgElement.naturalWidth > 0) {
            exportCtx.drawImage(el.imgElement, el.x, el.y, el.w, el.h);
          }
        } else if (el.type === 'frame' || el.frameShape) {
          const shape = el.frameShape || 'circle';
          const frameW = el.w || 200;
          const frameH = el.h || 200;
          const x = el.x;
          const y = el.y;

          // 1. Draw Frame Outer Body / Backdrop for Special Frame Mockups
          if (shape === 'polaroid') {
            exportCtx.fillStyle = '#ffffff';
            exportCtx.shadowColor = 'rgba(0,0,0,0.2)';
            exportCtx.shadowBlur = 12;
            exportCtx.shadowOffsetY = 4;
            exportCtx.beginPath();
            exportCtx.roundRect(x, y, frameW, frameH, 8);
            exportCtx.fill();
            exportCtx.shadowColor = 'transparent';
          } else if (shape === 'phone') {
            exportCtx.fillStyle = el.color || '#1e293b';
            exportCtx.shadowColor = 'rgba(0,0,0,0.3)';
            exportCtx.shadowBlur = 16;
            exportCtx.beginPath();
            exportCtx.roundRect(x, y, frameW, frameH, 28);
            exportCtx.fill();
            exportCtx.shadowColor = 'transparent';
          } else if (shape === 'laptop') {
            exportCtx.fillStyle = '#334155';
            exportCtx.beginPath();
            exportCtx.roundRect(x + frameW * 0.08, y, frameW * 0.84, frameH * 0.8, 8);
            exportCtx.fill();
            exportCtx.fillStyle = '#94a3b8';
            exportCtx.beginPath();
            exportCtx.roundRect(x, y + frameH * 0.8, frameW, frameH * 0.15, 6);
            exportCtx.fill();
          } else if (shape === 'browser') {
            exportCtx.fillStyle = '#ffffff';
            exportCtx.shadowColor = 'rgba(0,0,0,0.15)';
            exportCtx.shadowBlur = 10;
            exportCtx.beginPath();
            exportCtx.roundRect(x, y, frameW, frameH, 10);
            exportCtx.fill();
            exportCtx.shadowColor = 'transparent';
            exportCtx.fillStyle = '#e2e8f0';
            exportCtx.beginPath();
            exportCtx.roundRect(x, y, frameW, 30, [10, 10, 0, 0]);
            exportCtx.fill();
            const dotY = y + 15;
            exportCtx.fillStyle = '#ef4444'; exportCtx.beginPath(); exportCtx.arc(x + 16, dotY, 4, 0, Math.PI * 2); exportCtx.fill();
            exportCtx.fillStyle = '#f59e0b'; exportCtx.beginPath(); exportCtx.arc(x + 28, dotY, 4, 0, Math.PI * 2); exportCtx.fill();
            exportCtx.fillStyle = '#10b981'; exportCtx.beginPath(); exportCtx.arc(x + 40, dotY, 4, 0, Math.PI * 2); exportCtx.fill();
          } else if (shape === 'gold_luxury') {
            const g = exportCtx.createLinearGradient(x, y, x + frameW, y + frameH);
            g.addColorStop(0, '#f59e0b');
            g.addColorStop(0.5, '#fef08a');
            g.addColorStop(1, '#d97706');
            exportCtx.fillStyle = g;
            exportCtx.beginPath();
            exportCtx.roundRect(x - 6, y - 6, frameW + 12, frameH + 12, 12);
            exportCtx.fill();
          }

          // 2. Save Context & Create Mask Path for Photo Clipping
          exportCtx.save();
          createFramePath(exportCtx, shape, x, y, frameW, frameH);
          exportCtx.clip();

          // 3. Render Loaded Image or Placeholder Fill inside Frame Path
          let frameImg: any = el.frameImgElement;
          const isFrameImgValid = frameImg && (frameImg instanceof HTMLImageElement || frameImg instanceof HTMLCanvasElement);
          if (!isFrameImgValid && el.frameImgSrc) {
            if (previewImageCache.has(el.frameImgSrc)) {
              frameImg = previewImageCache.get(el.frameImgSrc);
              el.frameImgElement = frameImg;
            } else {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.src = el.frameImgSrc;
              previewImageCache.set(el.frameImgSrc, img);
              frameImg = img;
            }
          }

          if (
            frameImg &&
            ((frameImg instanceof HTMLImageElement && frameImg.complete && frameImg.naturalWidth > 0) ||
             frameImg instanceof HTMLCanvasElement)
          ) {
            const imgW = (frameImg as HTMLImageElement).naturalWidth || frameImg.width || 400;
            const imgH = (frameImg as HTMLImageElement).naturalHeight || frameImg.height || 400;

            let areaX = x, areaY = y, areaW = frameW, areaH = frameH;
            if (shape === 'polaroid') {
              const margin = frameW * 0.08;
              areaX = x + margin; areaY = y + margin;
              areaW = frameW - margin * 2; areaH = frameH * 0.72;
            } else if (shape === 'phone') {
              const b = frameW * 0.05;
              areaX = x + b; areaY = y + b; areaW = frameW - b * 2; areaH = frameH - b * 2;
            } else if (shape === 'laptop') {
              areaX = x + frameW * 0.12; areaY = y + frameH * 0.08;
              areaW = frameW * 0.76; areaH = frameH * 0.68;
            } else if (shape === 'browser') {
              areaY = y + 30; areaH = frameH - 30;
            }

            const userScale = el.frameImgScale || 1;
            const scale = Math.max(areaW / imgW, areaH / imgH) * userScale;
            const drawW = imgW * scale;
            const drawH = imgH * scale;

            const offsetX = el.frameImgOffsetX || 0;
            const offsetY = el.frameImgOffsetY || 0;

            const drawX = areaX + (areaW - drawW) / 2 + offsetX;
            const drawY = areaY + (areaH - drawH) / 2 + offsetY;

            exportCtx.drawImage(frameImg, drawX, drawY, drawW, drawH);
          } else {
            exportCtx.fillStyle = el.frameBgColor || '#f8fafc';
            exportCtx.fillRect(x, y, frameW, frameH);

            exportCtx.strokeStyle = el.frameBorderColor || el.color || '#6366f1';
            exportCtx.lineWidth = 2;
            exportCtx.setLineDash([6, 6]);
            createFramePath(exportCtx, shape, x + 6, y + 6, frameW - 12, frameH - 12);
            exportCtx.stroke();
            exportCtx.setLineDash([]);

            const cx = x + frameW / 2;
            const cy = y + frameH / 2;
            exportCtx.fillStyle = el.frameBorderColor || el.color || '#6366f1';
            
            exportCtx.beginPath();
            exportCtx.roundRect(cx - 16, cy - 18, 32, 22, 4);
            exportCtx.fill();
            exportCtx.fillStyle = '#ffffff';
            exportCtx.beginPath();
            exportCtx.arc(cx, cy - 7, 5, 0, Math.PI * 2);
            exportCtx.fill();

            exportCtx.fillStyle = el.frameBorderColor || el.color || '#4338ca';
            exportCtx.font = 'bold 12px Tajawal, sans-serif';
            exportCtx.textAlign = 'center';
            exportCtx.fillText('+ إضافة صورة', cx, cy + 14);
          }
          exportCtx.restore();

          // 4. Draw Outer Frame Borders, Rings & Accents
          const borderWidth = el.frameBorderWidth !== undefined ? el.frameBorderWidth : (el.frameImgSrc ? 0 : 2);
          if (borderWidth > 0 && !['polaroid', 'phone', 'laptop', 'browser', 'double_circle', 'dotted_circle', 'neon_cyber', 'gold_luxury', 'circle_3d'].includes(shape)) {
            exportCtx.strokeStyle = el.frameBorderColor || el.color || '#6366f1';
            exportCtx.lineWidth = borderWidth;
            createFramePath(exportCtx, shape, x, y, frameW, frameH);
            exportCtx.stroke();
          }

          if (shape === 'double_circle') {
            exportCtx.strokeStyle = el.frameBorderColor || '#f59e0b';
            exportCtx.lineWidth = 3;
            const r = Math.min(frameW, frameH) / 2;
            exportCtx.beginPath();
            exportCtx.arc(x + frameW / 2, y + frameH / 2, Math.max(2, r - 6), 0, Math.PI * 2);
            exportCtx.stroke();
          } else if (shape === 'dotted_circle') {
            exportCtx.save();
            exportCtx.strokeStyle = el.frameBorderColor || '#ec4899';
            exportCtx.lineWidth = 3;
            exportCtx.setLineDash([5, 5]);
            const r = Math.min(frameW, frameH) / 2;
            exportCtx.beginPath();
            exportCtx.arc(x + frameW / 2, y + frameH / 2, r, 0, Math.PI * 2);
            exportCtx.stroke();
            exportCtx.restore();
          } else if (shape === 'neon_cyber') {
            exportCtx.save();
            exportCtx.strokeStyle = el.frameBorderColor || '#06b6d4';
            exportCtx.lineWidth = 4;
            exportCtx.shadowColor = '#06b6d4';
            exportCtx.shadowBlur = 12;
            const r = Math.min(frameW, frameH) / 2;
            exportCtx.beginPath();
            exportCtx.arc(x + frameW / 2, y + frameH / 2, r, 0, Math.PI * 2);
            exportCtx.stroke();
            exportCtx.restore();
          } else if (shape === 'gold_luxury') {
            exportCtx.save();
            const g = exportCtx.createLinearGradient(x, y, x + frameW, y + frameH);
            g.addColorStop(0, '#f59e0b');
            g.addColorStop(0.5, '#fef08a');
            g.addColorStop(1, '#d97706');
            exportCtx.strokeStyle = g;
            exportCtx.lineWidth = 5;
            const r = Math.min(frameW, frameH) / 2;
            exportCtx.beginPath();
            exportCtx.arc(x + frameW / 2, y + frameH / 2, r, 0, Math.PI * 2);
            exportCtx.stroke();
            exportCtx.restore();
          } else if (shape === 'circle_3d') {
            exportCtx.save();
            exportCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            exportCtx.lineWidth = 3;
            const r = Math.min(frameW, frameH) / 2;
            exportCtx.beginPath();
            exportCtx.arc(x + frameW / 2, y + frameH / 2, Math.max(2, r - 3), -Math.PI / 4, (3 * Math.PI) / 4);
            exportCtx.stroke();
            exportCtx.restore();
          } else if (shape === 'phone') {
            exportCtx.fillStyle = '#000000';
            exportCtx.beginPath();
            exportCtx.roundRect(x + frameW / 2 - 24, y + 8, 48, 12, 6);
            exportCtx.fill();
        }
        } else if (el.type === 'svg' && el.svgPath) {
          exportCtx.save();
          exportCtx.translate(el.x, el.y);
          const scaleFactorX = (el.w || 60) / 24;
          const scaleFactorY = (el.h || 60) / 24;
          exportCtx.scale(scaleFactorX, scaleFactorY);
          const pathObj = new Path2D(el.svgPath);
          exportCtx.fillStyle = el.fillColor || el.color;
          exportCtx.fill(pathObj);
          if (el.strokeWidth && el.strokeWidth > 0) {
            exportCtx.strokeStyle = el.strokeColor || el.color;
            exportCtx.lineWidth = el.strokeWidth / Math.max(scaleFactorX, scaleFactorY, 0.1);
            exportCtx.stroke(pathObj);
          }
          exportCtx.restore();
        }

        exportCtx.restore();
      });

      const fileName = (customFileName.trim() || artifact.title || 'perplexta_design').replace(/\s+/g, '_');



      // 1. PDF Export Mode
      if (exportFormat === 'pdf') {
        const imgData = exportCanvas.toDataURL('image/jpeg', 0.95);
        // Printable HTML / Print Window
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>${fileName}.pdf</title>
                <style>
                  @page { size: auto; margin: 0; }
                  body { margin: 0; display: flex; justify-content: center; align-items: center; background: #fff; }
                  img { width: 100%; max-width: 100vw; height: auto; object-fit: contain; }
                </style>
              </head>
              <body>
                <img src="${imgData}" onload="window.print();" />
              </body>
            </html>
          `);
          printWindow.document.close();
        } else {
          // Fallback direct image trigger
          const a = document.createElement('a');
          a.href = imgData;
          a.download = `${fileName}_${scale}x.jpg`;
          a.click();
        }
        setIsExportModalOpen(false);
        setIsShareMenuOpen(false);
        toast.success(isAr ? 'تم تجهيز ملف PDF للطباعة والحفظ!' : 'Prepared PDF document for print/save!');
        return;
      }

      // 2. SVG Export Mode
      if (exportFormat === 'svg') {
        const imgData = exportCanvas.toDataURL('image/png');
        const svgContent = `<?xml version="1.0" standalone="no"?>
<svg width="${exportCanvas.width}" height="${exportCanvas.height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <image width="${exportCanvas.width}" height="${exportCanvas.height}" xlink:href="${imgData}" />
</svg>`;
        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}_${scale}x.svg`;
        a.click();
        URL.revokeObjectURL(url);
        setIsExportModalOpen(false);
        setIsShareMenuOpen(false);
        toast.success(isAr ? 'تم تصدير ملف SVG بنجاح!' : 'Exported SVG successfully!');
        return;
      }

      // 3. Raster Image Export (PNG, JPEG, WebP)
      const mime = exportFormat === 'jpeg' ? 'image/jpeg' : exportFormat === 'webp' ? 'image/webp' : 'image/png';
      const dataUrl = exportCanvas.toDataURL(mime, exportQuality);
      const a = document.createElement('a');
      a.href = dataUrl;
      const ext = exportFormat === 'jpeg' ? 'jpg' : exportFormat;
      a.download = `${fileName}_${scale}x.${ext}`;
      a.click();
      setIsExportModalOpen(false);
      setIsShareMenuOpen(false);
      toast.success(isAr ? `تم تصدير التصميم بدقة (${exportCanvas.width} × ${exportCanvas.height})!` : `Exported at (${exportCanvas.width} × ${exportCanvas.height})!`);
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error(isAr ? 'حدث خطأ أثناء التصدير' : 'Export failed');
    }
  };

  // Clear All Modifications
  const handleExecuteClearAll = () => {
    recordHistory();
    setElements([]);
    setSelectedId(null);
    setFilters(DEFAULT_FILTERS);
    setIsClearModalOpen(false);
    toast.success(isAr ? 'تم مسح كافة التعديلات بنجاح' : 'All modifications cleared');
  };

  // Add Custom Sticker / Overlay Image (with natural aspect ratio and frame drag support)
  const handleAddSticker = (url: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      recordHistory();

      // 1. Target selected frame or the most recent empty frame on canvas
      let targetFrame = (selectedElement && selectedElement.type === 'frame') ? selectedElement : null;
      if (!targetFrame) {
        targetFrame = elements.slice().reverse().find(el => el.type === 'frame' && !el.frameImgSrc) || null;
      }

      if (targetFrame) {
        const updatedElements = elements.map(el => el.id === targetFrame!.id ? {
          ...el,
          frameImgSrc: url,
          frameImgElement: img
        } : el);
        setElements(updatedElements);
        flushSaveSession({ customElements: updatedElements });
        setSelectedId(targetFrame.id);
        toast.success(isAr ? 'تم استيعاب الصورة وقصها داخل الإطار بنجاح ✨' : 'Image clipped into frame successfully');
        return;
      }

      const newId = `sticker-${Date.now()}`;
      const baseSize = Math.min(imageSize.width, imageSize.height) * 0.4 || 200;
      const naturalAspect = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
      let w = baseSize;
      let h = baseSize;
      if (naturalAspect >= 1) {
        h = Math.round(baseSize / naturalAspect);
      } else {
        w = Math.round(baseSize * naturalAspect);
      }
      const newEl: CanvasElement = {
        id: newId,
        type: 'sticker',
        name: isAr ? 'إطار صورة / ملصق' : 'Image Frame',
        x: Math.round((imageSize.width - w) / 2) || 50,
        y: Math.round((imageSize.height - h) / 2) || 50,
        w,
        h,
        color: '#ffffff',
        strokeWidth: 0,
        imgSrc: url,
        imgElement: img,
        opacity: 1
      };
      const updatedElements = [...elements, newEl];
      setElements(updatedElements);
      flushSaveSession({ customElements: updatedElements });
      setSelectedId(newId);
      setActiveTool('select');
      toast.success(isAr ? 'تمت إضافة إطار الصورة إلى التصميم' : 'Added image frame to canvas');
    };
  };

  // Set Selected Image as Main Canvas Background
  const handleSetImageAsBackground = (el: CanvasElement) => {
    const src = el.imgSrc || (el.imgElement ? el.imgElement.src : null);
    if (!src) {
      toast.error(isAr ? 'لا توجد صورة صالحة لتعيينها كخلفية' : 'No valid image to set as background');
      return;
    }
    recordHistory();
    const newImg = new Image();
    newImg.crossOrigin = 'anonymous';
    newImg.src = src;
    newImg.onload = () => {
      imageRef.current = newImg;
      setPages(prev => prev.map((p, idx) => idx === currentPageIndex ? { ...p, bgImgSrc: src } : p));
      // Remove the foreground layer since it is now the background
      setElements(prev => prev.filter(item => item.id !== el.id));
      setSelectedId(null);
      drawCanvas();
      toast.success(isAr ? '✨ تم استبدال خلفية مساحة العمل بهذه الصورة بنجاح' : 'Replaced canvas background with this image');
    };
    newImg.onerror = () => {
      toast.error(isAr ? 'تعذر تعيين الصورة كخلفية لمساحة العمل' : 'Failed to set image as canvas background');
    };
  };

  // Replace Canvas Background with specific Image URL
  const handleApplyBackgroundUrl = (url: string, name?: string) => {
    recordHistory();
    const newImg = new Image();
    newImg.crossOrigin = 'anonymous';
    newImg.src = url;
    newImg.onload = () => {
      imageRef.current = newImg;
      setPages(prev => prev.map((p, idx) => idx === currentPageIndex ? { ...p, bgImgSrc: url } : p));
      drawCanvas();
      setIsReplaceBgModalOpen(false);
      toast.success(isAr ? `✨ تم استبدال الخلفية بنجاح (${name || 'صورة مخصصة'})` : 'Canvas background replaced successfully');
    };
    newImg.onerror = () => {
      toast.error(isAr ? 'تعذر تحميل الصورة كخلفية' : 'Failed to load background image');
    };
  };

  // Upload New Background File from Computer
  const handleUploadNewBackground = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            handleApplyBackgroundUrl(ev.target.result as string, file.name);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  // Magic Eraser Implementation (Inpainting & Smart Object Removal)
  const executeMagicErase = (points: Array<{ x: number; y: number }>, brushSize: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    recordHistory();

    // 1. Clean up overlapping layer elements
    const halfBrush = brushSize / 2;
    let erasedElementCount = 0;
    setElements(prev => {
      const next = prev.filter(el => {
        const boxX = el.x;
        const boxY = el.y;
        const boxW = el.w || 80;
        const boxH = el.h || 40;
        const overlaps = points.some(pt => 
          pt.x >= boxX - halfBrush && pt.x <= boxX + boxW + halfBrush &&
          pt.y >= boxY - halfBrush && pt.y <= boxY + boxH + halfBrush
        );
        if (overlaps) erasedElementCount++;
        return !overlaps;
      });
      return next;
    });

    // 2. Perform Content-Aware Inpainting / Patch Healing on base background image
    try {
      const offscreen = document.createElement('canvas');
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) return;

      offCtx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);

      let minX = Math.min(...points.map(p => p.x)) - brushSize;
      let minY = Math.min(...points.map(p => p.y)) - brushSize;
      let maxX = Math.max(...points.map(p => p.x)) + brushSize;
      let maxY = Math.max(...points.map(p => p.y)) + brushSize;

      minX = Math.max(0, Math.floor(minX));
      minY = Math.max(0, Math.floor(minY));
      maxX = Math.min(canvas.width, Math.ceil(maxX));
      maxY = Math.min(canvas.height, Math.ceil(maxY));

      const patchW = maxX - minX;
      const patchH = maxY - minY;

      if (patchW > 0 && patchH > 0) {
        // Create mask for the stroke
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        const maskCtx = maskCanvas.getContext('2d');
        if (maskCtx) {
          maskCtx.fillStyle = '#000000';
          maskCtx.fillRect(0, 0, canvas.width, canvas.height);
          maskCtx.strokeStyle = '#ffffff';
          maskCtx.fillStyle = '#ffffff';
          maskCtx.lineWidth = brushSize;
          maskCtx.lineCap = 'round';
          maskCtx.lineJoin = 'round';
          maskCtx.beginPath();
          points.forEach((pt, idx) => {
            if (idx === 0) maskCtx.moveTo(pt.x, pt.y);
            else maskCtx.lineTo(pt.x, pt.y);
          });
          maskCtx.stroke();
        }

        const imgData = offCtx.getImageData(minX, minY, patchW, patchH);
        const maskData = maskCtx?.getImageData(minX, minY, patchW, patchH);

        if (maskData) {
          const pixels = imgData.data;
          const maskPixels = maskData.data;

          // Multi-pass seamless neighborhood blending
          for (let pass = 0; pass < 3; pass++) {
            for (let py = 0; py < patchH; py++) {
              for (let px = 0; px < patchW; px++) {
                const idx = (py * patchW + px) * 4;
                if (maskPixels[idx] > 50) { // masked pixel (to erase)
                  let rSum = 0, gSum = 0, bSum = 0, count = 0;
                  const sampleOffsets = [
                    [-brushSize, 0], [brushSize, 0], [0, -brushSize], [0, brushSize],
                    [-Math.round(brushSize * 0.7), -Math.round(brushSize * 0.7)],
                    [Math.round(brushSize * 0.7), -Math.round(brushSize * 0.7)],
                    [-Math.round(brushSize * 0.7), Math.round(brushSize * 0.7)],
                    [Math.round(brushSize * 0.7), Math.round(brushSize * 0.7)]
                  ];

                  for (const [ox, oy] of sampleOffsets) {
                    const nx = Math.min(patchW - 1, Math.max(0, px + ox));
                    const ny = Math.min(patchH - 1, Math.max(0, py + oy));
                    const nIdx = (ny * patchW + nx) * 4;
                    if (maskPixels[nIdx] < 50) {
                      rSum += pixels[nIdx];
                      gSum += pixels[nIdx + 1];
                      bSum += pixels[nIdx + 2];
                      count++;
                    }
                  }

                  if (count > 0) {
                    pixels[idx] = Math.round(rSum / count);
                    pixels[idx + 1] = Math.round(gSum / count);
                    pixels[idx + 2] = Math.round(bSum / count);
                  }
                }
              }
            }
          }
          offCtx.putImageData(imgData, minX, minY);
        }

        const newImg = new Image();
        newImg.src = offscreen.toDataURL('image/png');
        newImg.onload = () => {
          imageRef.current = newImg;
          drawCanvas();
          if (erasedElementCount > 0) {
            toast.success(isAr ? `✨ تم المحو السحري وإزالة ${erasedElementCount} عنصر وترميم الخلفية بنجاح` : '✨ Magic Inpainted successfully!');
          } else {
            toast.success(isAr ? '✨ تم المحو السحري وترميم الخلفية بنجاح' : '✨ Magic Erased and Inpainted successfully!');
          }
        };
      }
    } catch (err) {
      console.error('Magic erase error', err);
      toast.error(isAr ? 'تعذر إتمام المحو السحري' : 'Failed to magic erase');
    }
  };

  // Upload Local Image Overlay
  const handleUploadOverlay = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            handleAddSticker(ev.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  // Uploads & Brand Kit Persistence & Synchronization
  const updateUploads = (updater: (prev: StudioUploadItem[]) => StudioUploadItem[]) => {
    setUploads(prev => {
      const next = updater(prev);
      saveStoredStudioUploads(user?.id, next);
      return next;
    });
  };

  const updateBrandKit = (updater: (prev: StudioBrandKit) => StudioBrandKit) => {
    setBrandKit(prev => {
      const next = updater(prev);
      saveStoredBrandKit(user?.id, next);
      return next;
    });
  };

  // Auto-register any stored custom fonts in the document on mount
  useEffect(() => {
    const customFontsToRegister = [
      ...(brandKit.fonts.customFonts || []),
      ...uploads.filter(u => u.type === 'font').map(u => ({
        id: u.id,
        name: u.fontFamily || u.name.replace(/\.[^/.]+$/, ''),
        url: u.url,
        format: 'woff2'
      }))
    ];
    customFontsToRegister.forEach(f => {
      if (f.name && f.url) {
        registerDynamicCustomFont(f.name, f.url);
      }
    });
  }, [brandKit.fonts.customFonts, uploads]);

  // Multi-type File Upload Handler (Images, Fonts, PDFs)
  const handleUploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const newItems: StudioUploadItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${Math.round(file.size / 1024)} KB`;

      // 1. Font files (TTF, OTF, WOFF, WOFF2)
      if (['ttf', 'otf', 'woff', 'woff2'].includes(ext)) {
        const fontName = file.name.replace(/\.[^/.]+$/, '').trim();
        const reader = new FileReader();
        await new Promise<void>((resolve) => {
          reader.onload = async (e) => {
            const result = e.target?.result as string;
            await registerDynamicCustomFont(fontName, result);
            newItems.push({
              id: `upload-font-${Date.now()}-${i}`,
              name: file.name,
              type: 'font',
              fontFamily: fontName,
              url: result,
              size: sizeStr,
              createdAt: Date.now()
            });
            // Also add to brand kit customFonts
            updateBrandKit(bk => ({
              ...bk,
              fonts: {
                ...bk.fonts,
                customFonts: [
                  ...bk.fonts.customFonts.filter(f => f.name !== fontName),
                  { id: `font-${Date.now()}-${i}`, name: fontName, url: result, format: ext }
                ]
              }
            }));
            resolve();
          };
          reader.readAsDataURL(file);
        });
      }
      // 2. PDF files
      else if (file.type === 'application/pdf' || ext === 'pdf') {
        const reader = new FileReader();
        await new Promise<void>((resolve) => {
          reader.onload = (e) => {
            const result = e.target?.result as string;
            newItems.push({
              id: `upload-pdf-${Date.now()}-${i}`,
              name: file.name,
              type: 'pdf',
              url: result,
              size: sizeStr,
              pageCount: 1,
              createdAt: Date.now()
            });
            resolve();
          };
          reader.readAsDataURL(file);
        });
      }
      // 3. Image files (JPG, PNG, WebP, SVG, GIF)
      else if (file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext)) {
        const reader = new FileReader();
        await new Promise<void>((resolve) => {
          reader.onload = (e) => {
            const result = e.target?.result as string;
            newItems.push({
              id: `upload-img-${Date.now()}-${i}`,
              name: file.name,
              type: 'image',
              url: result,
              size: sizeStr,
              createdAt: Date.now()
            });
            resolve();
          };
          reader.readAsDataURL(file);
        });
      }
    }

    if (newItems.length > 0) {
      updateUploads(prev => [...newItems, ...prev]);
      toast.success(isAr ? `تم رفع ${newItems.length} ملف بنجاح` : `Uploaded ${newItems.length} file(s)`);
    } else {
      toast.error(isAr ? 'لم يتم التعرف على صيغة الملفات' : 'Unrecognized file format');
    }
    setIsUploading(false);
  };

  // Insert PDF Preview Card to Canvas
  const handleInsertPdfPreview = (item: StudioUploadItem) => {
    if (item.thumbnail) {
      handleAddSticker(item.thumbnail);
    } else {
      const c = document.createElement('canvas');
      c.width = 600;
      c.height = 800;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 600, 800);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 6;
        ctx.strokeRect(15, 15, 570, 770);
        
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(50, 50, 140, 40);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('PDF DOC', 68, 78);
        
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 30px Tajawal, sans-serif';
        ctx.fillText(item.name.substring(0, 26), 50, 150);
        
        ctx.fillStyle = '#94a3b8';
        for (let i = 0; i < 9; i++) {
          ctx.fillRect(50, 200 + i * 45, 500, 14);
        }
        const dataUrl = c.toDataURL('image/png');
        handleAddSticker(dataUrl);
      }
    }
    toast.success(isAr ? 'تم إدراج مستند PDF في التصميم' : 'Inserted PDF to canvas');
  };

  // Insert Brand Logo into Canvas
  const handleInsertBrandLogo = (logoUrl: string) => {
    handleAddSticker(logoUrl);
    toast.success(isAr ? 'تم إدراج شعار الهوية في مساحة العمل' : 'Brand logo inserted to canvas');
  };

  // Brand Logo Upload & Replacement
  const handleBrandLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          const url = ev.target.result as string;
          updateBrandKit(prev => ({
            ...prev,
            logos: [
              {
                id: `logo-${Date.now()}`,
                titleAr: file.name.replace(/\.[^/.]+$/, ''),
                titleEn: file.name.replace(/\.[^/.]+$/, ''),
                type: 'primary',
                url
              },
              ...prev.logos
            ]
          }));
          toast.success(isAr ? 'تمت إضافة شعار العلامة التجارية بنجاح' : 'Brand logo uploaded successfully');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Brand Font Upload
  const handleBrandFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fontName = file.name.replace(/\.[^/.]+$/, '').trim();
      const ext = file.name.split('.').pop()?.toLowerCase() || 'woff2';
      const reader = new FileReader();
      reader.onload = async (ev) => {
        if (ev.target?.result) {
          const url = ev.target.result as string;
          await registerDynamicCustomFont(fontName, url);
          updateBrandKit(prev => ({
            ...prev,
            fonts: {
              ...prev.fonts,
              heading: `'${fontName}', sans-serif`,
              customFonts: [
                ...prev.fonts.customFonts.filter(f => f.name !== fontName),
                { id: `font-${Date.now()}`, name: fontName, url, format: ext }
              ]
            }
          }));
          toast.success(isAr ? `تم رفع الخط (${fontName}) وتعيينه كخط عناوين رئيسي` : `Font (${fontName}) uploaded and set as heading`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Project to User Account & Private Portfolio
  const handleSaveProjectToAccount = () => {
    if (!user) {
      toast.error(isAr ? 'حفاظاً على أمان بياناتك، يرجى تسجيل الدخول أولاً لتحديد مالك آمن لمشروعك وحفظه' : 'For security, please log in to set an owner and save your project');
      setIsAuthModalOpen(true);
      return;
    }
    try {
      let previewUrl = artifact.content;
      if (canvasRef.current) {
        previewUrl = canvasRef.current.toDataURL('image/png', 0.85);
      }
      
      const project: StudioProject = {
        id: currentProjId || artifact.id || `project-${Date.now()}`,
        userId: String(user.id),
        title: designTitle || artifact.title || (isAr ? 'تصميم جديد' : 'New Design'),
        previewUrl,
        width: imageSize.width,
        height: imageSize.height,
        canvasBackground: artifact.content,
        elements,
        filters,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: [isAr ? 'استوديو رينكس' : 'Rinex Studio']
      };

      saveUserStudioProject(user.id, project);
      if (onSaveProject) {
        onSaveProject(project);
      }
      toast.success(isAr ? `تم حفظ مشروع "${project.title}" في حسابك الشخصي بنجاح ☁️` : `Project "${project.title}" saved to your personal portfolio ☁️`);
    } catch (err) {
      console.error('Save project error', err);
      toast.error(isAr ? 'تعذر حفظ المشروع' : 'Failed to save project');
    }
  };

  // Apply Brand Color to Active Element or Canvas
  const handleApplyBrandColor = (color: string) => {
    if (selectedId) {
      recordHistory();
      setElements(prev => prev.map(el => {
        if (el.id !== selectedId) return el;
        if (el.type === 'text') return { ...el, color };
        return { ...el, color, fillColor: color };
      }));
    } else {
      setActiveColor(color);
    }
  };

  // Add Brand Styled Typography Block
  const handleAddBrandText = (type: 'heading' | 'subheading' | 'body') => {
    recordHistory();
    const newId = `brand-text-${type}-${Date.now()}`;
    const font = type === 'heading' 
      ? brandKit.fonts.heading 
      : (type === 'subheading' ? brandKit.fonts.subheading : brandKit.fonts.body);
    const size = type === 'heading' ? 46 : (type === 'subheading' ? 28 : 18);
    const color = type === 'heading' ? (brandKit.colors.primary || '#ffffff') : '#ffffff';
    const textSample = type === 'heading'
      ? (isAr ? `${brandKit.brandName} - عنوان رسمي` : `${brandKit.brandNameEn || 'Brand'} - Headline`)
      : (type === 'subheading' ? (isAr ? 'عنوان فرعي بهوية علامتك التجارية' : 'Subheading with brand identity') : (isAr ? 'نص توضيحي بأسلوب وخط الهوية التجارية المعتمدة.' : 'Body text styled with official brand typography.'));

    const newEl: CanvasElement = {
      id: newId,
      type: 'text',
      name: isAr ? `نص (${type === 'heading' ? 'عنوان' : 'فرعي'})` : `Brand ${type}`,
      x: (imageSize.width - 340) / 2 || 70,
      y: (imageSize.height - 80) / 2 || 90,
      w: 340,
      h: 55,
      text: textSample,
      color,
      strokeWidth: 0,
      fontSize: size,
      fontFamily: font,
      fontWeight: type === 'body' ? 'normal' : 'bold',
      textAlign: 'center',
      textShadow: true
    };
    setElements(prev => [...prev, newEl]);
    setSelectedId(newId);
    setActiveTool('select');
  };

  // 1-Click Font Application to Active Selection or New Text Insertion
  const handleApplyFont = (fontFamily: string, fontName?: string) => {
    recordHistory();
    if (selectedElement && selectedElement.type === 'text') {
      setElements(prev => prev.map(el => el.id === selectedId ? { ...el, fontFamily } : el));
    } else {
      const newId = `text-${Date.now()}`;
      const newEl: CanvasElement = {
        id: newId,
        type: 'text',
        name: fontName || 'نص احترافي',
        x: (imageSize.width - 340) / 2 || 100,
        y: (imageSize.height - 70) / 2 || 100,
        w: 340,
        h: 70,
        text: fontPreviewText.trim() || (isAr ? 'اكتب نصك الاحترافي هنا' : 'Heading Typography Text'),
        color: '#ffffff',
        strokeWidth: 0,
        fontSize: 36,
        fontFamily: fontFamily,
        fontWeight: 'bold',
        textAlign: 'center',
        textShadow: true,
        shadowColor: 'rgba(0,0,0,0.7)',
        shadowBlur: 8
      };
      setElements(prev => [...prev, newEl]);
      setSelectedId(newId);
      setActiveTool('select');
    }
  };

  // Drop Target Handler for External Images & Dragged Gallery Photos
  const processDroppedImage = (url: string, clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const canvasX = (clientX - rect.left) / zoom;
      const canvasY = (clientY - rect.top) / zoom;

      const hitFrame = elements.slice().reverse().find(el => 
        el.type === 'frame' &&
        canvasX >= el.x && canvasX <= el.x + el.w &&
        canvasY >= el.y && canvasY <= el.y + el.h
      );

      if (hitFrame) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        img.onload = () => {
          recordHistory();
          const updatedElements = elements.map(el => el.id === hitFrame.id ? {
            ...el,
            frameImgSrc: url,
            frameImgElement: img
          } : el);
          setElements(updatedElements);
          flushSaveSession({ customElements: updatedElements });
          setSelectedId(hitFrame.id);
          toast.success(isAr ? 'تم إسقاط الصورة واستيعابها داخل الإطار بنجاح ✨' : 'Photo dropped into frame successfully');
        };
        return;
      }
    }

    handleAddSticker(url);
  };

  // 1-Click Photo & Media Application
  const handleApplyPhoto = (photo: StudioPhotoItem, asBackground: boolean = false) => {
    recordHistory();
    if (asBackground) {
      const newImg = new Image();
      newImg.crossOrigin = 'anonymous';
      newImg.src = photo.url;
      newImg.onload = () => {
        imageRef.current = newImg;
        setPages(prev => prev.map((p, pIdx) => pIdx === currentPageIndex ? { ...p, bgImgSrc: photo.url } : p));
        drawCanvas();
      };
    } else {
      handleAddSticker(photo.url);
    }
  };

  // 1-Click Background & Wallpapers Application (AI, Tech, Textures, Gradients, Solids)
  const handleApplyBackground = (bg: StudioBackgroundItem, asLayer: boolean = false) => {
    recordHistory();
    if (asLayer && (bg.type === 'image' || bg.type === 'texture')) {
      const newId = `bg-layer-${Date.now()}`;
      const newEl: CanvasElement = {
        id: newId,
        type: 'sticker',
        name: isAr ? bg.titleAr : bg.titleEn,
        x: 0,
        y: 0,
        w: imageSize.width || 800,
        h: imageSize.height || 800,
        color: '#ffffff',
        strokeWidth: 0,
        imgSrc: bg.value,
        opacity: bgOpacity
      };
      setElements(prev => [newEl, ...prev]);
      setSelectedId(newId);
      setActiveTool('select');
      return;
    }

    if (bg.type === 'image' || bg.type === 'texture') {
      handleApplyBackgroundUrl(bg.value, isAr ? bg.titleAr : bg.titleEn);
    } else if (bg.type === 'color') {
      const canvas = document.createElement('canvas');
      canvas.width = imageSize.width || 1080;
      canvas.height = imageSize.height || 1080;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = bg.value;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        const newImg = new Image();
        newImg.src = dataUrl;
        newImg.onload = () => {
          imageRef.current = newImg;
          setPages(prev => prev.map((p, pIdx) => pIdx === currentPageIndex ? { ...p, bgImgSrc: dataUrl } : p));
          drawCanvas();
        };
      }
    } else if (bg.type === 'gradient') {
      const canvas = document.createElement('canvas');
      canvas.width = imageSize.width || 1080;
      canvas.height = imageSize.height || 1080;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        if (bg.id === 'bg-grad-sunset') {
          g.addColorStop(0, '#f59e0b');
          g.addColorStop(1, '#ef4444');
        } else if (bg.id === 'bg-grad-cyber') {
          g.addColorStop(0, '#8b5cf6');
          g.addColorStop(1, '#ec4899');
        } else if (bg.id === 'bg-grad-ocean') {
          g.addColorStop(0, '#0284c7');
          g.addColorStop(1, '#0d9488');
        } else if (bg.id === 'bg-grad-gold') {
          g.addColorStop(0, '#18181b');
          g.addColorStop(0.5, '#78350f');
          g.addColorStop(1, '#f59e0b');
        } else if (bg.id === 'bg-grad-mesh') {
          g.addColorStop(0, '#0f172a');
          g.addColorStop(0.5, '#1e1b4b');
          g.addColorStop(1, '#311042');
        } else if (bg.id === 'bg-grad-aurora') {
          g.addColorStop(0, '#052e16');
          g.addColorStop(0.4, '#065f46');
          g.addColorStop(1, '#0ea5e9');
        } else if (bg.id === 'bg-grad-space') {
          g.addColorStop(0, '#020617');
          g.addColorStop(0.5, '#0f172a');
          g.addColorStop(1, '#1e1b4b');
        } else {
          g.addColorStop(0, '#fce7f3');
          g.addColorStop(1, '#e0e7ff');
        }
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        const newImg = new Image();
        newImg.src = dataUrl;
        newImg.onload = () => {
          imageRef.current = newImg;
          setPages(prev => prev.map((p, pIdx) => pIdx === currentPageIndex ? { ...p, bgImgSrc: dataUrl } : p));
          drawCanvas();
        };
      }
    }
  };

  // 1-Click Element & Shape & Frame Application
  const handleApplyElement = (item: StudioElementItem, overrideX?: number, overrideY?: number) => {
    recordHistory();
    const newId = `element-${Date.now()}`;
    if (item.category === 'frames' || item.type === 'frame' || item.frameShape) {
      const shape = item.frameShape || 'circle';
      let defaultW = 220;
      let defaultH = 220;
      if (shape === 'polaroid') { defaultW = 220; defaultH = 270; }
      else if (shape === 'phone') { defaultW = 180; defaultH = 360; }
      else if (shape === 'laptop') { defaultW = 340; defaultH = 220; }
      else if (shape === 'browser') { defaultW = 320; defaultH = 220; }
      else if (shape === 'ticket') { defaultW = 280; defaultH = 140; }
      else if (shape === 'pill') { defaultW = 260; defaultH = 130; }
      else if (shape === 'arch') { defaultW = 200; defaultH = 280; }
      else if (shape === 'oval') { defaultW = 250; defaultH = 175; }

      const spawnX = overrideX !== undefined ? overrideX : (Math.round((imageSize.width - defaultW) / 2) || 100);
      const spawnY = overrideY !== undefined ? overrideY : (Math.round((imageSize.height - defaultH) / 2) || 100);

      const newEl: CanvasElement = {
        id: newId,
        type: 'frame',
        frameShape: shape,
        name: isAr ? item.titleAr : item.titleEn,
        x: spawnX,
        y: spawnY,
        w: defaultW,
        h: defaultH,
        color: item.defaultColor || '#6366f1',
        fillColor: '#f8fafc',
        strokeColor: item.defaultColor || '#6366f1',
        strokeWidth: 3,
        frameBorderColor: item.defaultColor || '#6366f1',
        frameBorderWidth: 3,
        frameBgColor: '#f8fafc',
        frameImgScale: 1,
        frameImgOffsetX: 0,
        frameImgOffsetY: 0
      };
      setElements(prev => {
        const next = [...prev, newEl];
        flushSaveSession({ customElements: next });
        return next;
      });
      setSelectedId(newId);
      setActiveTool('select');
      toast.success(isAr ? `تمت إضافة إطار (${item.titleAr}) - اختر صورة لإدراجها بداخله` : `Added frame (${item.titleEn}) - select a photo to insert`);
    } else if (item.type === 'svg' && item.svgPath) {
      const spawnX = overrideX !== undefined ? overrideX : ((imageSize.width - 90) / 2 || 100);
      const spawnY = overrideY !== undefined ? overrideY : ((imageSize.height - 90) / 2 || 100);
      const newEl: CanvasElement = {
        id: newId,
        type: 'svg',
        name: isAr ? item.titleAr : item.titleEn,
        x: spawnX,
        y: spawnY,
        w: 90,
        h: 90,
        color: item.defaultColor || '#ffffff',
        fillColor: item.defaultColor || '#ffffff',
        strokeWidth: 0,
        svgPath: item.svgPath
      };
      setElements(prev => [...prev, newEl]);
      setSelectedId(newId);
      setActiveTool('select');
    } else if (item.type === 'shape') {
      const spawnX = overrideX !== undefined ? overrideX : ((imageSize.width - 160) / 2 || 100);
      const spawnY = overrideY !== undefined ? overrideY : ((imageSize.height - 160) / 2 || 100);
      const newEl: CanvasElement = {
        id: newId,
        type: item.id.includes('circle') ? 'circle' : 'rect',
        name: isAr ? item.titleAr : item.titleEn,
        x: spawnX,
        y: spawnY,
        w: 160,
        h: 160,
        color: item.defaultColor || '#3b82f6',
        fillColor: item.defaultColor || '#3b82f6',
        strokeWidth: 0,
        cornerRadius: item.id.includes('rect') ? 16 : undefined
      };
      setElements(prev => [...prev, newEl]);
      setSelectedId(newId);
      setActiveTool('select');
    }
  };

  // 1-Click Text Special Effects Application
  const handleApplyTextEffect = (effect: StudioEffectPreset) => {
    recordHistory();
    setSelectedEffectId(effect.id);
    if (selectedElement && selectedElement.type === 'text') {
      setElements(prev => prev.map(el => {
        if (el.id !== selectedId) return el;
        if (effect.id === 'none') {
          return { ...el, textShadow: false, textStrokeWidth: 0, textBgColor: undefined, isNeon: false, isGlitch: false, isTypewriter: false };
        } else if (effect.id === 'shadow') {
          return { ...el, textShadow: true, shadowColor: 'rgba(0,0,0,0.85)', shadowBlur: 14 };
        } else if (effect.id === 'lift') {
          return { ...el, textShadow: true, shadowColor: 'rgba(255,255,255,0.6)', shadowBlur: 20 };
        } else if (effect.id === 'hollow') {
          return { ...el, color: 'transparent', textStrokeColor: el.color === 'transparent' ? '#ffffff' : el.color, textStrokeWidth: 2 };
        } else if (effect.id === 'outline') {
          return { ...el, textStrokeColor: '#000000', textStrokeWidth: 3 };
        } else if (effect.id === 'neon') {
          return { ...el, color: '#ffffff', textShadow: true, shadowColor: '#38bdf8', shadowBlur: 24, isNeon: true };
        } else if (effect.id === 'background') {
          return { ...el, textBgColor: 'rgba(15,23,42,0.9)', textBgPadding: 12, textBgCornerRadius: 8 };
        } else if (effect.id === 'glitch') {
          return { ...el, textShadow: true, shadowColor: '#ef4444', shadowBlur: 10, isGlitch: true };
        }
        return el;
      }));
    }
  };

  // 1-Click Animation Application
  const handleApplyAnimation = (anim: StudioAnimationPreset) => {
    recordHistory();
    setSelectedAnimationId(anim.id);
    setIsAnimationPlaying(true);
    if (selectedElement) {
      setElements(prev => prev.map(el => el.id === selectedId ? { 
        ...el, 
        animationType: anim.id, 
        animationDuration: animationSpeed,
        animationDirection: animationDirection
      } : el));
    }
    setTimeout(() => setIsAnimationPlaying(false), 2000);
  };

  // 1-Click Color Palette Application
  const handleApplyPalette = (pal: StudioPaletteItem) => {
    recordHistory();
    if (selectedElement) {
      const primaryCol = pal.colors[0];
      setElements(prev => prev.map(el => el.id === selectedId ? { ...el, color: primaryCol, fillColor: primaryCol } : el));
    } else {
      // Apply primary color to canvas background
      const bgCol = pal.colors[pal.colors.length - 1] || pal.colors[0];
      const canvas = document.createElement('canvas');
      canvas.width = imageSize.width || 1080;
      canvas.height = imageSize.height || 1080;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = bgCol;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        const newImg = new Image();
        newImg.src = dataUrl;
        newImg.onload = () => {
          imageRef.current = newImg;
          setPages(prev => prev.map((p, pIdx) => pIdx === currentPageIndex ? { ...p, bgImgSrc: dataUrl } : p));
          drawCanvas();
        };
      }
    }
  };

  // Dynamically computed fonts including user-uploaded custom fonts
  const availableFontOptions = useMemo(() => {
    const base = [
      { value: 'Tajawal, sans-serif', label: 'Tajawal (عربي عصري)' },
      { value: 'Cairo, sans-serif', label: 'Cairo (عربي هندسي)' },
      { value: 'Alexandria, sans-serif', label: 'Alexandria (عصري)' },
      { value: 'Almarai, sans-serif', label: 'Almarai (رسمي)' },
      { value: 'Amiri, serif', label: 'Amiri (كلاسيكي نَسخ)' },
      { value: 'Changa, sans-serif', label: 'Changa (عريض)' },
      { value: 'Lalezar, cursive', label: 'Lalezar (ملصقات)' },
      { value: 'Inter, sans-serif', label: 'Inter (Modern)' },
      { value: 'Playfair Display, serif', label: 'Playfair (Serif)' },
      { value: 'JetBrains Mono, monospace', label: 'JetBrains Mono (Code)' },
      { value: 'monospace', label: 'Monospace' }
    ];
    const customList = [
      ...(brandKit.fonts.customFonts || []),
      ...uploads.filter(u => u.type === 'font').map(u => ({
        id: u.id,
        name: u.fontFamily || u.name.replace(/\.[^/.]+$/, ''),
        url: u.url,
        format: 'woff2'
      }))
    ];
    const uniqueCustom = new Map<string, { value: string; label: string }>();
    customList.forEach(f => {
      if (f.name && !uniqueCustom.has(f.name)) {
        uniqueCustom.set(f.name, {
          value: `'${f.name}', sans-serif`,
          label: `✨ ${f.name} (خط مخصص)`
        });
      }
    });
    return [...Array.from(uniqueCustom.values()), ...base];
  }, [brandKit.fonts.customFonts, uploads]);

  const selectedElement = useMemo(() => {
    return elements.find(el => el.id === selectedId);
  }, [elements, selectedId]);

  const presetColors = ['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#ffffff', '#000000'];

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--surface-page)] text-[var(--text-primary)] relative select-none min-h-0 overflow-hidden font-sans">
      
      {/* 1. Sleek Unified Top Control Bar */}
      <header className="h-12 bg-[var(--surface-card)] border-b border-[var(--border-main)] pe-3 sm:pe-4 flex items-center justify-between shrink-0 z-30 select-none">
        
        {/* Start Anchor: Exactly 64px wide slot matching the refined sidebar rail underneath */}
        <div className="flex items-center h-full">
          <div className="w-[64px] min-w-[64px] max-w-[64px] h-full flex items-center justify-center border-e border-[var(--border-main)] shrink-0">
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="group/exit-btn relative h-8.5 w-8.5 rounded-shape-sm overflow-hidden border border-[var(--border-default)] hover:border-[var(--accent-foreground)]/60 bg-transparent hover:bg-[var(--surface-subtle)] transition-all duration-fast flex items-center justify-center flex-shrink-0 cursor-pointer active:scale-95 shadow-2xs before:absolute before:-inset-1.5 before:content-['']"
                title={isAr ? 'الخروج والعودة' : 'Exit / Back'}
                aria-label={isAr ? 'الخروج والعودة' : 'Exit / Back'}
              >
                {/* Normal Logo (Brand visual identity) */}
                <div className="w-full h-full p-1 flex items-center justify-center transition-all duration-base group-hover/exit-btn:opacity-0 group-hover/exit-btn:scale-75">
                  <img 
                    src={siteLogoUrl} 
                    alt={isAr ? "شعار رينكس" : "Rinex"} 
                    className="w-full h-full object-contain rounded-xs"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/brand/default-logo.svg';
                    }}
                  />
                </div>

                {/* Glassy Outward Exit Arrow on Hover (matching main page sidebar toggle pattern) */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 scale-75 group-hover/exit-btn:opacity-100 group-hover/exit-btn:scale-100 transition-all duration-fast pointer-events-none bg-[var(--surface-subtle)]">
                  <div className="w-6 h-6 rounded-shape-xs bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--text-primary)] hover:text-rose-500 flex items-center justify-center shadow-2xs">
                    {dir === 'rtl' ? <ChevronRight size={14} className="stroke-[2.5]" /> : <ChevronLeft size={14} className="stroke-[2.5]" />}
                  </div>
                </div>
              </button>
            ) : (
              <div className="h-8.5 w-8.5 rounded-shape-sm overflow-hidden border border-[var(--border-default)] bg-[var(--surface-card)] flex items-center justify-center p-1 shadow-2xs shrink-0">
                <img 
                  src={siteLogoUrl} 
                  alt={isAr ? "شعار رينكس" : "Rinex"} 
                  className="w-full h-full object-contain rounded-xs"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/brand/default-logo.svg';
                  }}
                />
              </div>
            )}
          </div>

          {/* Section: Title 'رينكس' + Dimensions Badge positioned on the right above the sidebar */}
          <div className="flex items-center gap-2 px-2 sm:px-3">
            <h1 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] leading-none tracking-tight">
              {isAr ? 'رينكس' : 'Rinex'}
            </h1>

            {/* Canvas Dimensions Badge & Resize Trigger (موقع الأبعاد على اليمين فوق الشريط الجانبي) */}
            <button
              type="button"
              onClick={() => setIsResizeModalOpen(true)}
              className="h-8.5 px-2.5 rounded-shape-sm bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-main)] hover:border-[var(--border-accent)] text-[11px] font-mono font-bold text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 shrink-0"
              title={isAr ? 'تغيير أبعاد ومقاسات مساحة العمل' : 'Resize Canvas Dimensions'}
            >
              <LayoutTemplate size={12} className="text-[var(--accent)]" />
              <span>{imageSize.width} × {imageSize.height}</span>
            </button>

            {/* Smart Studio Mode Segmented Switcher (Image Poster vs Video Motion Studio) */}
            <div className="h-8.5 p-0.5 rounded-shape-sm bg-[var(--surface-subtle)] border border-[var(--border-main)] flex items-center gap-0.5 shadow-2xs shrink-0">
              <button
                type="button"
                onClick={() => {
                  setStudioMode('image');
                  try { localStorage.setItem('rataq_studio_session_isVideo', 'false'); } catch (e) {}
                  toast.info(isAr ? 'تم فتح محرر الصور والبوسترات الثابتة' : 'Switched to Image Studio');
                }}
                className={`h-7 px-2.5 rounded-shape-xs text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  studioMode === 'image'
                    ? 'bg-[var(--surface-card)] text-[var(--accent)] border border-[var(--border-accent)]/50 shadow-2xs font-extrabold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title={isAr ? 'محرر الصور والبوسترات الثابتة' : 'Image Poster Studio'}
              >
                <FileImage size={12} />
                <span>{isAr ? 'صور وبوسترات' : 'Poster'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStudioMode('video');
                  try { localStorage.setItem('rataq_studio_session_isVideo', 'true'); } catch (e) {}
                  toast.success(isAr ? 'تم فتح محرر الفيديو والمونتاج (Rinex Video Studio)' : 'Switched to Video Studio');
                }}
                className={`h-7 px-2.5 rounded-shape-xs text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  studioMode === 'video'
                    ? 'bg-[var(--accent)] text-slate-950 font-black shadow-2xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title={isAr ? 'محرر الفيديو والمونتاج التفاعلي (Rinex Video Studio)' : 'Rinex Video Motion Studio'}
              >
                <Play size={12} className={studioMode === 'video' ? 'fill-current text-slate-950' : ''} />
                <span>{isAr ? 'فيديو ومونتاج' : 'Video Studio'}</span>
              </button>
            </div>


            {/* Silent Calm Save Indicator */}
            <div 
              className="hidden lg:flex items-center gap-1.5 px-2.5 h-8.5 rounded-shape-sm bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[11px] font-medium text-[var(--text-secondary)] shadow-2xs select-none shrink-0"
              title={isAr ? 'يتم حفظ جميع التعديلات سحابياً ومحلياً تلقائياً' : 'All edits are saved continuously'}
            >
              <Cloud size={13} className="text-[var(--fg-success)] shrink-0" />
              <span>{isAr ? 'محفوظ سحابياً' : 'Cloud Saved'}</span>
            </div>

            {onToggleFullscreen && (
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="touch-target-44 h-8.5 w-8.5 ms-0.5 rounded-shape-sm border border-[var(--border-default)] hover:border-[var(--border-accent)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                title={isFullscreen ? (isAr ? 'خروج من الشاشة الكاملة' : 'Exit Fullscreen') : (isAr ? 'ملء الشاشة' : 'Fullscreen')}
              >
                {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons: Unified vertical baseline & h-8.5 height */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Conditional Send to Chat with Prompt Input - Only rendered when inside Image Chat conversation */}
          {isInChat && (
            <div className="h-8.5 px-1 flex items-center gap-1.5 rounded-shape-sm bg-[var(--surface-subtle)] border border-[var(--border-main)] shadow-2xs">
              <input
                type="text"
                value={chatPromptInput}
                onChange={(e) => setChatPromptInput(e.target.value)}
                placeholder={isAr ? 'اكتب طلباً أو توجيهاً للشات مع الصورة...' : 'Prompt for AI with image...'}
                className="h-7 px-2 text-xs bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none w-36 sm:w-56"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendToChat(chatPromptInput);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => handleSendToChat(chatPromptInput)}
                className="h-7 px-3 rounded-shape-xs bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] hover:opacity-90 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 shrink-0"
                title={isAr ? 'إرسال الصورة والتوجيه للشات مباشرة' : 'Send Image & Prompt to Chat'}
              >
                <Send size={12} />
                <span>{isAr ? 'إرسال للشات' : 'Send'}</span>
              </button>
            </div>
          )}

          {/* Dynamic Creator Hub / Registration CTA next to Share button */}
          {user ? (
            isUserRegisteredCreator ? (
              <button
                type="button"
                onClick={() => navigate('/settings/creators-hub')}
                className="h-8.5 px-3 rounded-shape-sm bg-gradient-to-r from-purple-600 to-[var(--accent)] text-slate-950 hover:brightness-110 font-black text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
                title={isAr ? 'لوحة تحكم الأرباح والإحصائيات الخاصة بك' : 'Your Creator Earnings & Analytics Dashboard'}
              >
                <Award size={13} className="text-slate-950 fill-current" />
                <span className="hidden sm:inline">{isAr ? 'لوحة المبدع' : 'Creator Dashboard'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsRegistrationModalOpen(true)}
                className="h-8.5 px-3 rounded-shape-sm bg-gradient-to-r from-amber-500 via-[var(--accent)] to-purple-600 text-slate-950 hover:brightness-110 font-black text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
                title={isAr ? 'انضم لشبكة صناع محتوى رينكس وابدأ الربح ($50 مكافأة)' : 'Join Rinex Creators Network & Earn ($50 Bonus)'}
              >
                <Sparkles size={12} className="animate-pulse text-slate-950 fill-current" />
                <span className="hidden sm:inline">{isAr ? 'سجل كمبدع ($50)' : 'Become Creator ($50)'}</span>
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={() => {
                toast.info(isAr ? 'يرجى تسجيل الدخول أولاً لتسجيل حسابك كمبدع معتمد' : 'Please sign in first to register as a creator');
                setIsAuthModalOpen(true);
              }}
              className="h-8.5 px-3 rounded-shape-sm bg-gradient-to-r from-amber-500 via-[var(--accent)] to-purple-600 text-slate-950 hover:brightness-110 font-black text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
              title={isAr ? 'سجل كمبدع معتمد وابدأ الربح ($50 مكافأة)' : 'Become Creator ($50)'}
            >
              <Sparkles size={12} className="text-slate-950 fill-current" />
              <span className="hidden sm:inline">{isAr ? 'سجل كمبدع ($50)' : 'Become Creator ($50)'}</span>
            </button>
          )}

          {/* Professional Share Dropdown Menu (Gold standard for Header controls) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsShareMenuOpen(prev => !prev);
                setShareMenuTab('main');
              }}
              className={`h-8.5 px-3.5 rounded-shape-sm text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 border ${
                isShareMenuOpen
                  ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] border-transparent ring-2 ring-[var(--accent)]/30'
                  : 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] hover:opacity-95 border-transparent'
              }`}
              title={isAr ? 'قائمة المشاركة والتصدير الاحترافية' : 'Share & Export'}
            >
              <Share2 size={13} className="text-white" />
              <span>{isAr ? 'مشاركة' : 'Share'}</span>
              <ChevronDown size={12} className={`transition-transform duration-200 text-white/80 ${isShareMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Card */}
            {isShareMenuOpen && (
              <>
                {/* Backdrop to dismiss on outside click */}
                <div 
                  className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[0.5px]" 
                  onClick={() => setIsShareMenuOpen(false)} 
                />

                <div 
                  className="fixed sm:absolute top-[60px] sm:top-full start-4 sm:start-auto end-4 sm:end-0 mt-1.5 w-[calc(100vw-32px)] sm:w-96 rounded-shape-md bg-[var(--surface-card)] border border-[var(--border-default)] shadow-2xl z-50 overflow-hidden text-[var(--text-primary)] animate-in fade-in zoom-in-95 duration-150"
                  onClick={e => e.stopPropagation()}
                >
                  {/* VIEW 1: QUICK SHARE & EXPORT OPTIONS */}
                  {shareMenuTab === 'main' && (
                    <div className="p-3.5 space-y-3">
                      {/* Dropdown Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-shape-xs bg-[var(--bg-accent-muted)] text-[var(--fg-accent)] flex items-center justify-center">
                            <Share2 size={13} />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[var(--text-primary)]">
                              {isAr ? 'مشاركة وتصدير التصميم' : 'Share & Export'}
                            </h4>
                            <span className="text-[9.5px] text-[var(--text-muted)] block font-mono">
                              {imageSize.width} × {imageSize.height} px
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsShareMenuOpen(false)}
                          className="w-6 h-6 rounded-shape-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] flex items-center justify-center cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      {/* NEW: Design Link & Privacy Settings Section */}
                      <div className="p-3 bg-[var(--surface-subtle)] rounded-shape-md border border-[var(--border-default)] space-y-2.5">
                        {/* Privacy Toggle */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-[var(--text-secondary)]">
                            {isAr ? 'خصوصية الرابط:' : 'Link Privacy:'}
                          </span>
                          <div className="flex items-center gap-1 p-0.5 bg-[var(--surface-card)] rounded-shape-sm border border-[var(--border-default)]">
                            <button
                              type="button"
                              onClick={() => {
                                setIsDesignPublic(false);
                                toast.success(isAr ? 'تم تعديل خصوصية التصميم لـ (خاص)' : 'Privacy updated to Private');
                              }}
                              className={`px-2 py-1 rounded-shape-xs text-[9.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                                !isDesignPublic
                                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                  : 'text-[var(--text-muted)] border border-transparent'
                              }`}
                            >
                              <Lock size={10} />
                              <span>{isAr ? 'خاص' : 'Private'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsDesignPublic(true);
                                toast.success(isAr ? 'تم تعديل خصوصية التصميم لـ (مشاركة عامة)' : 'Privacy updated to Public');
                              }}
                              className={`px-2 py-1 rounded-shape-xs text-[9.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                                isDesignPublic
                                  ? 'bg-[var(--sys-color-primary)]/10 text-[var(--sys-color-primary)] border border-[var(--sys-color-primary)]/20'
                                  : 'text-[var(--text-muted)] border border-transparent'
                              }`}
                            >
                              <Globe size={10} />
                              <span>{isAr ? 'عام' : 'Public'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Link Display & Copy Button */}
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-shape-sm px-2 py-1 flex items-center gap-1.5 overflow-hidden text-[10.5px] font-mono select-all">
                            <Link2 size={11} className="text-[var(--fg-accent)] shrink-0" />
                            <span className="truncate text-[var(--text-secondary)]">
                              {`${window.location.origin}/image-studio?project=${projectId || 'new'}`}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/image-studio?project=${projectId || 'new'}`);
                              toast.success(isAr ? 'تم نسخ رابط التصميم بنجاح' : 'Design link copied successfully');
                            }}
                            className="h-7.5 px-2.5 rounded-shape-sm bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] hover:opacity-90 font-bold text-[10px] cursor-pointer transition-colors flex items-center gap-1 shrink-0"
                          >
                            <Copy size={11} />
                            <span>{isAr ? 'نسخ' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Main Action 1: Download with format selector preview */}
                      <button
                        type="button"
                        onClick={() => setShareMenuTab('download')}
                        className="w-full p-2.5 rounded-shape-sm bg-[var(--bg-accent-muted)] hover:opacity-95 border border-[var(--border-accent)]/40 flex items-center justify-between transition-all cursor-pointer group text-start"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-shape-xs bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] flex items-center justify-center shadow-2xs">
                            <Download size={15} />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                              <span>{isAr ? 'تنزيل على الجهاز' : 'Download Design'}</span>
                              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-shape-xs bg-[var(--surface-card)] text-[var(--fg-accent)] font-extrabold border border-[var(--border-default)]">
                                {exportFormat.toUpperCase()}
                              </span>
                            </div>
                            <span className="text-[10px] text-[var(--text-secondary)] block">
                              {isAr ? 'PNG، JPG، PDF، SVG، WebP' : 'High quality file exports'}
                            </span>
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-[var(--fg-accent)] group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5 transition-transform" />
                      </button>

                      {/* Quick Action List */}
                      <div className="space-y-1.5 pt-1">
                        {/* Copy to Clipboard */}
                        <button
                          type="button"
                          onClick={handleCopyImageToClipboard}
                          className="w-full p-2 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] flex items-center justify-between transition-colors cursor-pointer text-start"
                        >
                          <div className="flex items-center gap-2">
                            <Copy size={13} className="text-amber-500" />
                            <span className="text-xs font-semibold text-[var(--text-secondary)]">
                              {isAr ? 'نسخ كصورة للحافظة' : 'Copy Image to Clipboard'}
                            </span>
                          </div>
                          <span className="text-[9.5px] text-[var(--text-muted)] font-mono">PNG</span>
                        </button>

                        {/* Direct Send to Chat */}
                        <button
                          type="button"
                          onClick={() => {
                            handleSendToChat();
                            setIsShareMenuOpen(false);
                          }}
                          className="w-full p-2 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] flex items-center justify-between transition-colors cursor-pointer text-start"
                        >
                          <div className="flex items-center gap-2">
                            <Send size={13} className="text-[var(--fg-success)]" />
                            <span className="text-xs font-semibold text-[var(--text-secondary)]">
                              {isAr ? 'إرسال مباشر للشات' : 'Send Directly to Chat'}
                            </span>
                          </div>
                          <span className="text-[9.5px] text-[var(--text-muted)]">AI Chat</span>
                        </button>

                        {/* Resize Dimensions */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsShareMenuOpen(false);
                            setIsResizeModalOpen(true);
                          }}
                          className="w-full p-2 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] flex items-center justify-between transition-colors cursor-pointer text-start"
                        >
                          <div className="flex items-center gap-2">
                            <LayoutTemplate size={13} className="text-[var(--fg-accent)]" />
                            <span className="text-xs font-semibold text-[var(--text-secondary)]">
                              {isAr ? 'تغيير أبعاد ومقاسات مساحة العمل' : 'Resize Canvas'}
                            </span>
                          </div>
                          <span className="text-[9.5px] font-mono text-[var(--text-muted)]">
                            {imageSize.width}×{imageSize.height}
                          </span>
                        </button>

                        {/* Publish as Public Template to Creator Ecosystem */}
                        <button
                          type="button"
                          onClick={() => {
                            if (!user) {
                              toast.error(isAr ? 'حفاظاً على أمان بياناتك، يرجى تسجيل الدخول أولاً لنشر القوالب باسمك' : 'Please log in to publish templates');
                              return;
                            }
                            setIsShareMenuOpen(false);
                            setPublishTitle(designTitle);
                            setIsPublishModalOpen(true);
                          }}
                          className="w-full p-2 rounded-shape-xs bg-gradient-to-r from-[color-mix(in_oklab,var(--accent)_10%,transparent)] to-[color-mix(in_oklab,var(--accent)_15%,transparent)] hover:brightness-105 border border-[color-mix(in_oklab,var(--accent)_30%,transparent)] flex items-center justify-between transition-all cursor-pointer text-start"
                        >
                          <div className="flex items-center gap-2">
                            <Award size={13} className="text-[var(--accent)]" />
                            <span className="text-xs font-bold text-[var(--accent)]">
                              {isAr ? 'نشر كقالب عام في رينكس' : 'Publish as Public Template'}
                            </span>
                          </div>
                          <span className="text-[9px] font-black uppercase text-[var(--accent)] px-1.5 py-0.5 rounded-shape-xs bg-[var(--surface-card)] border border-[color-mix(in_oklab,var(--accent)_20%,transparent)]">
                            {isAr ? 'أرباح' : 'EARN'}
                          </span>
                        </button>
                      </div>

                      {/* Footer Link */}
                      <div className="pt-2 border-t border-[var(--border-main)] flex items-center justify-between text-[10px]">
                        <span className="text-[var(--text-muted)]">
                          {isAr ? 'خيار متقدم للطباعة والمقاسات' : 'Advanced scaling & print'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsShareMenuOpen(false);
                            setIsExportModalOpen(true);
                          }}
                          className="font-bold text-[var(--fg-accent)] hover:underline cursor-pointer"
                        >
                          {isAr ? 'النافذة الموسعة ←' : 'Full Modal →'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* VIEW 2: IN-DROPDOWN DOWNLOAD SETTINGS */}
                  {shareMenuTab === 'download' && (
                    <div className="p-3.5 space-y-3 animate-in slide-in-from-end-4 duration-150">
                      {/* Back button & Title */}
                      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
                        <button
                          type="button"
                          onClick={() => setShareMenuTab('main')}
                          className="flex items-center gap-1 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                          <ChevronLeft size={14} className="rtl:rotate-180" />
                          <span>{isAr ? 'رجوع' : 'Back'}</span>
                        </button>
                        <h4 className="text-xs font-bold text-[var(--text-primary)]">
                          {isAr ? 'خيارات التنزيل' : 'Download Settings'}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setIsShareMenuOpen(false)}
                          className="w-6 h-6 rounded-shape-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] flex items-center justify-center cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      {/* File Format Selection */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-[var(--text-secondary)] flex items-center justify-between">
                          <span>{isAr ? 'نوع الملف (Format):' : 'File Type:'}</span>
                          <span className="text-[9.5px] font-mono text-[var(--fg-accent)] font-bold">
                            {exportFormat === 'png' ? (isAr ? 'موصى به' : 'Recommended') : ''}
                          </span>
                        </label>
                        <div className="grid grid-cols-5 gap-1">
                          {(['png', 'jpeg', 'webp', 'pdf', 'svg'] as const).map(fmt => (
                            <button
                              key={fmt}
                              type="button"
                              onClick={() => setExportFormat(fmt)}
                              className={`py-1.5 px-1 rounded-shape-xs border text-[10px] font-bold uppercase transition-all cursor-pointer text-center ${
                                exportFormat === fmt
                                  ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] border-transparent shadow-2xs font-extrabold'
                                  : 'bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border-[var(--border-default)] text-[var(--text-secondary)]'
                              }`}
                            >
                              {fmt === 'jpeg' ? 'JPG' : fmt.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Resolution Scale Multipliers */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-[var(--text-secondary)]">
                            {isAr ? 'الحجم والدقة:' : 'Size & Scale:'}
                          </span>
                          <span className="font-mono text-[10.5px] font-bold text-[var(--fg-accent)]">
                            {imageSize.width * exportScale} × {imageSize.height * exportScale} px
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { scale: 1, label: isAr ? '1x (قياسي)' : '1x (Normal)' },
                            { scale: 2, label: isAr ? '2x (عالي HD)' : '2x (Retina)' },
                            { scale: 3, label: isAr ? '3x (فائق طباعة)' : '3x (Print 300DPI)' }
                          ].map(item => (
                            <button
                              key={item.scale}
                              type="button"
                              onClick={() => setExportScale(item.scale)}
                              className={`py-1 px-1.5 rounded-shape-xs border text-[10px] font-bold transition-all cursor-pointer text-center ${
                                exportScale === item.scale
                                  ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] border-transparent shadow-2xs'
                                  : 'bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border-[var(--border-default)] text-[var(--text-secondary)]'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Transparent Background Toggle for PNG, SVG, WEBP */}
                      {['png', 'webp', 'svg'].includes(exportFormat) && (
                        <label className="flex items-center gap-2 p-2 bg-[var(--surface-subtle)] rounded-shape-xs border border-[var(--border-default)] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={exportTransparent}
                            onChange={(e) => setExportTransparent(e.target.checked)}
                            className="w-3.5 h-3.5 rounded-shape-xs accent-[var(--fg-accent)] cursor-pointer"
                          />
                          <div className="flex-1">
                            <span className="text-[10.5px] font-bold text-[var(--text-primary)] block">
                              {isAr ? 'خلفية شفافة (بدون الصورة الأصلية)' : 'Transparent Background'}
                            </span>
                            <span className="text-[9px] text-[var(--text-muted)] block">
                              {isAr ? 'تصدير النصوص والأشكال فقط كملف مفرغ' : 'Export only vector elements'}
                            </span>
                          </div>
                        </label>
                      )}

                      {/* File Name Input */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[var(--text-secondary)] block">
                          {isAr ? 'اسم الملف (اختياري):' : 'File Name (Optional):'}
                        </label>
                        <input
                          type="text"
                          value={customFileName}
                          placeholder={artifact.title || 'perplexta_design'}
                          onChange={(e) => setCustomFileName(e.target.value)}
                          className="w-full h-7 px-2 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-shape-xs text-[11px] font-bold"
                        />
                      </div>

                      {/* Execute Download Button */}
                      <button
                        type="button"
                        onClick={handleExecuteExport}
                        className="w-full h-9 rounded-shape-sm bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] hover:opacity-90 text-xs font-extrabold cursor-pointer transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.98]"
                      >
                        <Download size={14} />
                        <span>{isAr ? `تنزيل بصيغة ${exportFormat.toUpperCase()}` : `Download ${exportFormat.toUpperCase()}`}</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. Workspace Body: Left Sidebar + Drawer Panel + Canvas Stage */}
      <div className="flex-1 flex flex-row h-full min-h-0 overflow-hidden relative">
        
        {/* Main Icon Sidebar - Refined Compact Low-Noise Navigation */}
        <aside className="w-[64px] bg-[var(--surface-card)] border-e border-[var(--border-main)] flex flex-col items-center py-2 justify-between shrink-0 z-20 select-none">
          <div className="flex flex-col items-center gap-1 w-full px-1 overflow-y-auto custom-scrollbar flex-1 pb-1 pt-0.5">
            {(
              studioMode === 'video' ? [
                { id: 'create', labelAr: 'مشهد جديد', labelEn: 'New Scene', icon: <Plus size={18} />, isSpecial: true },
                { id: 'templates', labelAr: 'قوالب فيديو', labelEn: 'Video Templates', icon: <LayoutTemplate size={16} /> },
                { id: 'animations', labelAr: 'حركات أنيميشن', labelEn: 'Animations', icon: <Play size={16} /> },
                { id: 'transitions', labelAr: 'انتقالات', labelEn: 'Transitions', icon: <Sparkles size={16} /> },
                { id: 'audio', labelAr: 'مسار صوت', labelEn: 'Audio Track', icon: <Volume2 size={16} /> },
                { id: 'elements', labelAr: 'عناصر', labelEn: 'Elements', icon: <Shapes size={16} /> },
                { id: 'fonts', labelAr: 'الخطوط', labelEn: 'Fonts', icon: <Type size={16} /> },
                { id: 'photos', labelAr: 'ميديا', labelEn: 'Clips', icon: <ImageIcon size={16} /> },
                { id: 'uploads', labelAr: 'التحميلات', labelEn: 'Uploads', icon: <Upload size={16} />, count: uploads.length },
                { id: 'layers', labelAr: 'طبقات', labelEn: 'Layers', icon: <Layers size={16} />, count: elements.length },
                { id: 'projects', labelAr: 'مشاريعي', labelEn: 'Projects', icon: <FolderOpen size={16} />, count: userProjects.length },
              ] : [
                { id: 'create', labelAr: 'إنشاء', labelEn: 'Create', icon: <Plus size={18} />, isSpecial: true },
                { id: 'projects', labelAr: 'مشاريعي', labelEn: 'Projects', icon: <FolderOpen size={16} />, count: userProjects.length },
                { id: 'templates', labelAr: 'قوالب', labelEn: 'Templates', icon: <LayoutTemplate size={16} /> },
                { id: 'fonts', labelAr: 'الخطوط', labelEn: 'Fonts', icon: <Type size={16} /> },
                { id: 'elements', labelAr: 'عناصر', labelEn: 'Elements', icon: <Shapes size={16} /> },
                { id: 'photos', labelAr: 'صور', labelEn: 'Photos', icon: <ImageIcon size={16} /> },
                { id: 'background', labelAr: 'خلفية', labelEn: 'Background', icon: <Palette size={16} /> },
                { id: 'colors', labelAr: 'ألوان', labelEn: 'Colors', icon: <Pipette size={16} /> },
                { id: 'effects', labelAr: 'تأثيرات', labelEn: 'Text FX', icon: <Wand2 size={16} /> },
                { id: 'uploads', labelAr: 'التحميلات', labelEn: 'Uploads', icon: <Upload size={16} />, count: uploads.length },
                { id: 'brand', labelAr: 'الهوية', labelEn: 'Brand', icon: <Crown size={16} /> },
                { id: 'layers', labelAr: 'طبقات', labelEn: 'Layers', icon: <Layers size={16} />, count: elements.length },
              ]
            ).map(tab => {
              const isActive = activeSidebarTab === tab.id && isSidebarOpen;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveSidebarTab(tab.id as any);
                    setIsSidebarOpen(true);
                    if ((tab as any).onSelect) (tab as any).onSelect();
                  }}
                  className={`group relative flex flex-col items-center justify-center gap-0.5 w-[54px] h-[46px] rounded-shape-sm transition-colors duration-150 cursor-pointer outline-none focus:outline-none ${
                    tab.isSpecial
                      ? isActive
                        ? 'bg-[var(--accent)] text-slate-950 font-black shadow-xs'
                        : 'bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] hover:bg-[var(--accent)] text-[var(--accent)] hover:text-slate-950 font-black'
                      : isActive
                        ? 'bg-[var(--surface-subtle)] text-[var(--accent)] font-bold'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]'
                  }`}
                  title={isAr ? tab.labelAr : tab.labelEn}
                >
                  <span className={`transition-transform duration-150 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`}>
                    {tab.icon}
                  </span>
                  <span className="text-[9.5px] leading-tight font-medium tracking-tight truncate max-w-[50px]">
                    {isAr ? tab.labelAr : tab.labelEn}
                  </span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="absolute top-1 end-1 px-1 min-w-[13px] h-[13px] rounded-full bg-[var(--accent)] text-[7.5px] font-bold text-white flex items-center justify-center shadow-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="w-full px-1 pt-2.5 border-t border-[var(--border-main)] flex flex-col items-center justify-center">
            {user ? (
              <button
                type="button"
                onClick={() => toast.success(isAr ? `مسجل الدخول باسم: ${user.name}` : `Logged in as: ${user.name}`)}
                className="group relative flex items-center justify-center w-11 h-11 rounded-shape-sm hover:bg-[var(--surface-subtle)] transition-all cursor-pointer border border-transparent touch-target-44"
                title={isAr ? `الملف الشخصي: ${user.name}` : `Profile: ${user.name}`}
              >
                <div 
                  className="w-8 h-8 rounded-shape-sm overflow-hidden border flex items-center justify-center bg-[var(--surface-subtle)] shadow-2xs transition-colors duration-fast"
                  style={{ 
                    borderColor: user.subscription?.plan_color || 'var(--border-accent)'
                  }}
                >
                  {user.avatar ? (
                    <img 
                      src={resolveImageUrl(user.avatar, 'avatar')} 
                      alt={user.name} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User size={16} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors duration-fast" />
                  )}
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="group relative flex flex-col items-center justify-center gap-0.5 w-11 h-11 rounded-shape-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-all cursor-pointer border border-transparent touch-target-44"
                title={isAr ? 'تسجيل الدخول' : 'Sign In'}
              >
                <LogIn size={16} className="text-[var(--accent)]" />
                <span className="text-[8.5px] leading-none font-bold">
                  {isAr ? 'دخول' : 'Sign In'}
                </span>
              </button>
            )}
          </div>
        </aside>

        {/* Secondary Properties Drawer */}
        {isSidebarOpen && (
          <div className="w-80 sm:w-88 bg-[var(--surface-card)] border-e border-[var(--border-main)] flex flex-col shrink-0 z-20 h-full max-h-full overflow-hidden select-none animate-in slide-in-from-right-4 duration-150">
            
             {/* Drawer Header */}
            <div className="h-12 px-3 border-b border-[var(--border-main)] bg-[var(--surface-subtle)]/60 flex items-center justify-between shrink-0">
              <h2 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span className="w-6 h-6 rounded-shape-xs bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] border border-[color-mix(in_oklab,var(--accent)_25%,transparent)] text-[var(--accent)] flex items-center justify-center shrink-0">
                  {activeSidebarTab === 'create' && <PlusCircle size={13} />}
                  {activeSidebarTab === 'projects' && <FolderOpen size={13} />}
                  {activeSidebarTab === 'templates' && <LayoutTemplate size={13} />}
                  {activeSidebarTab === 'fonts' && <Type size={13} />}
                  {activeSidebarTab === 'elements' && <Shapes size={13} />}
                  {activeSidebarTab === 'photos' && <ImageIcon size={13} />}
                  {activeSidebarTab === 'background' && <Palette size={13} />}
                  {activeSidebarTab === 'colors' && <Pipette size={13} />}
                  {activeSidebarTab === 'animations' && <Play size={13} />}
                  {activeSidebarTab === 'transitions' && <Sparkles size={13} />}
                  {activeSidebarTab === 'audio' && <Volume2 size={13} />}
                  {activeSidebarTab === 'effects' && <Wand2 size={13} />}
                  {activeSidebarTab === 'brand' && <Crown size={13} />}
                  {activeSidebarTab === 'uploads' && <Upload size={13} />}
                  {activeSidebarTab === 'layers' && <Layers size={13} />}
                  {activeSidebarTab === 'magic_eraser' && <Sparkles size={13} className="text-amber-400" />}
                </span>
                <span>
                  {activeSidebarTab === 'create' && (isAr ? 'ابتكار تصميم جديد' : 'Create a New Design')}
                  {activeSidebarTab === 'projects' && (isAr ? 'مشاريعي وتصميماتي' : 'My Designs & Projects')}
                  {activeSidebarTab === 'templates' && (isAr ? 'قوالب التصميم الجاهزة' : 'Design Templates')}
                  {activeSidebarTab === 'fonts' && (isAr ? 'الخطوط وفنون الطباعة' : 'Fonts & Typography')}
                  {activeSidebarTab === 'elements' && (isAr ? 'العناصر والأيقونات الاحترافية' : 'Pro Elements & Icons')}
                  {activeSidebarTab === 'photos' && (isAr ? 'مكتبة الصور والوسائط' : 'Photos & Media Library')}
                  {activeSidebarTab === 'background' && (isAr ? 'الخلفيات والتدرجات' : 'Backgrounds & Gradients')}
                  {activeSidebarTab === 'colors' && (isAr ? 'تناسق الألوان والباليتات' : 'Color Palettes & Harmonies')}
                  {activeSidebarTab === 'animations' && (isAr ? 'التأثيرات الحركية والتحريك' : 'Animations & Motion FX')}
                  {activeSidebarTab === 'transitions' && (isAr ? 'الانتقالات السينمائية بين المشاهد' : 'Cinematic Scene Transitions')}
                  {activeSidebarTab === 'audio' && (isAr ? 'مسار الصوت والموسيقى' : 'Audio Track & Soundtrack')}
                  {activeSidebarTab === 'effects' && (isAr ? 'تأثيرات النصوص والآلة الكاتبة' : 'Text FX & Typewriter')}
                  {activeSidebarTab === 'brand' && (isAr ? 'العلامة التجارية والهوية' : 'Brand Kit Identity')}
                  {activeSidebarTab === 'uploads' && (isAr ? 'التحميلات والوسائط' : 'Uploads & Media')}
                  {activeSidebarTab === 'layers' && (isAr ? 'شجرة إدارة الطبقات' : 'Layers Hierarchy')}
                  {activeSidebarTab === 'magic_eraser' && (isAr ? 'الممحاة السحرية الذكية' : 'Smart Magic Eraser')}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="w-7 h-7 rounded-shape-xs bg-[var(--surface-card)] hover:bg-[var(--surface-subtle)] border border-[var(--border-default)] hover:border-[var(--border-accent)] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                title={isAr ? 'إغلاق اللوحة' : 'Close Drawer'}
              >
                <X size={13} />
              </button>
            </div>

            <div className={`flex-1 min-h-0 ${(activeSidebarTab === 'templates' || activeSidebarTab === 'projects' || activeSidebarTab === 'create') ? 'h-full flex flex-col p-0 overflow-hidden' : 'overflow-y-auto custom-scrollbar p-2.5 space-y-3'}`}>
              
              {/* TAB: CREATE (ابتكار تصميم جديد) */}
              {activeSidebarTab === 'create' && (
                <div className="flex flex-col h-full min-h-0 overflow-hidden text-[var(--text-primary)]">
                  {/* Sticky Header: Custom Dimensions & Category Filter Pills (Borderless, seamless integration like Templates tab) */}
                  <div className="p-2.5 sm:px-3 sm:py-2.5 border-b border-[var(--border-main)]/70 bg-[var(--surface-subtle)]/40 shrink-0 space-y-2">
                    {/* Custom Dimensions Form */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                        <span className="flex items-center gap-1.5">
                          <Sliders size={12} className="text-[var(--accent)]" />
                          <span>{isAr ? 'حجم مخصص' : 'Custom Dimensions'}</span>
                        </span>
                        <span className="text-[10px] font-mono text-[var(--text-muted)] font-normal">
                          {customCanvasWidth} × {customCanvasHeight} px
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <input
                            type="number"
                            min="40"
                            max="8000"
                            value={customCanvasWidth}
                            onChange={(e) => setCustomCanvasWidth(parseInt(e.target.value, 10) || 1080)}
                            className="w-full h-8 px-2.5 bg-[var(--surface-card)] border border-[var(--border-default)] focus:border-[var(--accent)] rounded-shape-xs text-xs font-mono font-bold text-[var(--text-primary)] focus:outline-none transition-colors"
                            placeholder={isAr ? 'العرض' : 'Width'}
                          />
                          <span className="absolute end-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-[var(--text-muted)] pointer-events-none">
                            {isAr ? 'عرض' : 'W'}
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min="40"
                            max="8000"
                            value={customCanvasHeight}
                            onChange={(e) => setCustomCanvasHeight(parseInt(e.target.value, 10) || 1080)}
                            className="w-full h-8 px-2.5 bg-[var(--surface-card)] border border-[var(--border-default)] focus:border-[var(--accent)] rounded-shape-xs text-xs font-mono font-bold text-[var(--text-primary)] focus:outline-none transition-colors"
                            placeholder={isAr ? 'الارتفاع' : 'Height'}
                          />
                          <span className="absolute end-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-[var(--text-muted)] pointer-events-none">
                            {isAr ? 'ارتفاع' : 'H'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          handleCreateNewDesign(customCanvasWidth, customCanvasHeight, isAr ? 'تصميم مخصص جديد' : 'Custom Design');
                          setTimeout(() => {
                            fitImageToContainer(customCanvasWidth, customCanvasHeight);
                          }, 60);
                        }}
                        className="w-full h-8 rounded-shape-xs bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] hover:opacity-90 text-xs font-extrabold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1.5 active:scale-[0.98] mt-0.5"
                      >
                        <Plus size={13} />
                        <span>{isAr ? 'ابتكار تصميم مخصص جديد' : 'Create Custom Design'}</span>
                      </button>
                    </div>

                    {/* Filter Category Chips Bar (Same borderless pill style as templates tab) */}
                    <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5 text-[11px] no-scrollbar pt-0.5">
                      {[
                        { id: 'all', label: isAr ? 'الكل' : 'All' },
                        { id: 'post', label: isAr ? 'منشورات' : 'Posts' },
                        { id: 'story', label: isAr ? 'ستوري وقصص' : 'Stories' },
                        { id: 'banner', label: isAr ? 'أغلفة وبنرات' : 'Banners' },
                        { id: 'print', label: isAr ? 'طباعة وهوية' : 'Print & Identity' }
                      ].map(cat => {
                        const isSelected = createPresetCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCreatePresetCategory(cat.id)}
                            className={`px-2 py-0.5 rounded-shape-xs text-[10px] font-medium whitespace-nowrap transition-all cursor-pointer border active:scale-95 shadow-2xs ${
                              isSelected
                                ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-2xs'
                                : 'bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border-[var(--border-default)]'
                            }`}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Preset Formats List - Full height, completely borderless rows along the entire sidebar without margins */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-0 min-h-0 space-y-0 pb-6 border-none">
                    {[
                      { id: 'insta-post', w: 1080, h: 1080, ratio: '1:1', category: 'post', titleAr: 'منشور إنستغرام (مربع 1:1)', titleEn: 'Instagram Post (1:1)', desc: '1080 × 1080 px', icon: <Camera size={14} className="text-pink-500" /> },
                      { id: 'insta-portrait', w: 1080, h: 1350, ratio: '4:5', category: 'post', titleAr: 'منشور إنستغرام (عمودي 4:5)', titleEn: 'Instagram Portrait (4:5)', desc: '1080 × 1350 px', icon: <Camera size={14} className="text-pink-600" /> },
                      { id: 'fb-post', w: 1200, h: 630, ratio: '1.91:1', category: 'post', titleAr: 'منشور فيسبوك عريض', titleEn: 'Facebook Post', desc: '1200 × 630 px', icon: <Camera size={14} className="text-blue-500" /> },
                      { id: 'twitter-post', w: 1600, h: 900, ratio: '16:9', category: 'post', titleAr: 'منشور إكس / تويتر', titleEn: 'Twitter / X Post', desc: '1600 × 900 px', icon: <Monitor size={14} className="text-sky-400" /> },
                      { id: 'linkedin-post', w: 1200, h: 627, ratio: '1.91:1', category: 'post', titleAr: 'منشور لينكد إن احترافي', titleEn: 'LinkedIn Post', desc: '1200 × 627 px', icon: <Monitor size={14} className="text-blue-700" /> },
                      { id: 'pinterest-pin', w: 1000, h: 1500, ratio: '2:3', category: 'post', titleAr: 'تصميم بينتريست (Pin 2:3)', titleEn: 'Pinterest Pin (2:3)', desc: '1000 × 1500 px', icon: <Smartphone size={14} className="text-red-600" /> },

                      { id: 'insta-story', w: 1080, h: 1920, ratio: '9:16', category: 'story', titleAr: 'ستوري وقصة رأسية (9:16)', titleEn: 'Instagram Story (9:16)', desc: '1080 × 1920 px', icon: <Smartphone size={14} className="text-purple-500" /> },
                      { id: 'tiktok-post', w: 1080, h: 1920, ratio: '9:16', category: 'story', titleAr: 'تيك توك وشورتس (9:16)', titleEn: 'TikTok & Shorts (9:16)', desc: '1080 × 1920 px', icon: <Smartphone size={14} className="text-rose-500" /> },
                      { id: 'fb-story', w: 1080, h: 1920, ratio: '9:16', category: 'story', titleAr: 'ستوري فيسبوك (9:16)', titleEn: 'Facebook Story', desc: '1080 × 1920 px', icon: <Smartphone size={14} className="text-blue-400" /> },
                      { id: 'snapchat-ad', w: 1080, h: 1920, ratio: '9:16', category: 'story', titleAr: 'إعلان سناب شات / ستوري', titleEn: 'Snapchat Story (9:16)', desc: '1080 × 1920 px', icon: <Smartphone size={14} className="text-amber-400" /> },
                      { id: 'whatsapp-status', w: 1080, h: 1920, ratio: '9:16', category: 'story', titleAr: 'حالة واتساب (9:16)', titleEn: 'WhatsApp Status', desc: '1080 × 1920 px', icon: <Smartphone size={14} className="text-emerald-500" /> },

                      { id: 'yt-banner', w: 1920, h: 1080, ratio: '16:9', category: 'banner', titleAr: 'غلاف يوتيوب عريض (16:9)', titleEn: 'YouTube Wide Banner (16:9)', desc: '1920 × 1080 px', icon: <Monitor size={14} className="text-red-500" /> },
                      { id: 'yt-thumb', w: 1280, h: 720, ratio: '16:9', category: 'banner', titleAr: 'صورة يوتيوب مصغرة (16:9)', titleEn: 'YouTube Thumbnail', desc: '1280 × 720 px', icon: <Tv size={14} className="text-red-400" /> },
                      { id: 'twitter-banner', w: 1500, h: 500, ratio: '3:1', category: 'banner', titleAr: 'غلاف تويتر / إكس (3:1)', titleEn: 'Twitter / X Banner', desc: '1500 × 500 px', icon: <Monitor size={14} className="text-sky-400" /> },
                      { id: 'fb-cover', w: 820, h: 312, ratio: '2.6:1', category: 'banner', titleAr: 'غلاف صفحة فيسبوك', titleEn: 'Facebook Page Cover', desc: '820 × 312 px', icon: <Monitor size={14} className="text-blue-600" /> },
                      { id: 'linkedin-banner', w: 1128, h: 376, ratio: '3:1', category: 'banner', titleAr: 'بانر لينكد إن للشركات', titleEn: 'LinkedIn Company Banner', desc: '1128 × 376 px', icon: <Monitor size={14} className="text-blue-600" /> },

                      { id: 'logo', w: 500, h: 500, ratio: '1:1', category: 'print', titleAr: 'شعار / لوجو العلامة', titleEn: 'Brand Logo / Square Icon', desc: '500 × 500 px', icon: <Crown size={14} className="text-amber-500" /> },
                      { id: 'square-2k', w: 2000, h: 2000, ratio: '1:1', category: 'print', titleAr: 'مربع فائق الدقة (2K HD)', titleEn: 'Square 2K HD', desc: '2000 × 2000 px', icon: <Crown size={14} className="text-indigo-400" /> },
                      { id: 'a4-print', w: 2480, h: 3508, ratio: 'A4', category: 'print', titleAr: 'مستند طباعة (A4)', titleEn: 'A4 Print Document', desc: '2480 × 3508 px', icon: <FileText size={14} className="text-indigo-400" /> },
                      { id: 'business-card', w: 1050, h: 600, ratio: '7:4', category: 'print', titleAr: 'بطاقة عمل شخصية', titleEn: 'Business Card', desc: '1050 × 600 px', icon: <CreditCard size={14} className="text-amber-500" /> }
                    ]
                      .filter(format => createPresetCategory === 'all' || format.category === createPresetCategory)
                      .map((format) => (
                        <button
                          key={format.id}
                          type="button"
                          onClick={() => {
                            handleCreateNewDesign(format.w, format.h, isAr ? format.titleAr : format.titleEn);
                            setTimeout(() => {
                              fitImageToContainer(format.w, format.h);
                            }, 60);
                          }}
                          className="w-full px-4 sm:px-4.5 py-3 sm:py-3.5 bg-transparent hover:bg-[var(--surface-subtle)] border-none transition-all cursor-pointer text-start flex items-center justify-between group active:bg-[var(--surface-subtle)]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-shape-xs bg-[var(--surface-subtle)] group-hover:bg-[var(--surface-card)] flex items-center justify-center shrink-0 transition-colors shadow-2xs">
                              {format.icon}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-[var(--text-primary)] block truncate">
                                {isAr ? format.titleAr : format.titleEn}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9.5px] text-[var(--text-muted)] font-mono">
                                  {format.desc}
                                </span>
                                <span className="px-1 py-0.2 rounded-2xs bg-[var(--surface-subtle)] text-[8.5px] font-mono font-bold text-[var(--accent)]">
                                  {format.ratio}
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity pr-1 shrink-0">
                            {isAr ? 'إنشاء +' : 'Create +'}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* TAB: PROJECTS (مشاريعي وتصميماتي) */}
              {activeSidebarTab === 'projects' && (
                <div className="flex flex-col h-full min-h-0 overflow-hidden">
                  {/* Search Bar & Header */}
                  <div className="p-3 border-b border-[var(--border-main)]/70 bg-[var(--surface-subtle)]/50 shrink-0 space-y-2">
                    <div className="relative w-full">
                      <Search size={13} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                      <input
                        type="text"
                        value={projectSearchQuery}
                        onChange={(e) => setProjectSearchQuery(e.target.value)}
                        placeholder={isAr ? 'بحث في مشاريعك وتصاميمك...' : 'Search your designs...'}
                        className="w-full h-8.5 ps-8 pe-3 rounded-shape-sm bg-[var(--surface-card)] border border-[var(--border-main)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                  </div>

                  {/* Projects List Container */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5">
                    {!user && (
                      <div className="p-2.5 rounded-shape-xs bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Lock size={12} className="text-[var(--accent)] shrink-0" />
                          <span className="text-[10px] text-[var(--text-secondary)] truncate">
                            {isAr ? 'سجل دخولك لحفظ تصاميمك سحابياً' : 'Sign in to sync your cloud designs'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAuthModalOpen(true)}
                          className="px-2 py-0.5 rounded-shape-xs bg-[var(--accent)] text-slate-950 font-bold text-[9px] shrink-0 cursor-pointer"
                        >
                          {isAr ? 'دخول' : 'Sign In'}
                        </button>
                      </div>
                    )}

                    {userProjects.filter(p => !projectSearchQuery.trim() || p.title.toLowerCase().includes(projectSearchQuery.toLowerCase())).length === 0 ? (
                      <div className="p-8 text-center rounded-shape-md bg-[var(--surface-subtle)] border border-[var(--border-default)] space-y-2">
                        <FolderOpen className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
                        <h4 className="text-xs font-bold text-[var(--text-primary)]">
                          {isAr ? 'لا توجد مشاريع' : 'No projects found'}
                        </h4>
                        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                          {isAr 
                            ? 'لم تقم بإنشاء مشاريع بعد، أو لا توجد نتائج للبحث.' 
                            : 'No saved designs under your account yet.'}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {userProjects
                          .filter(p => !projectSearchQuery.trim() || p.title.toLowerCase().includes(projectSearchQuery.toLowerCase()))
                          .map((proj) => {
                            const isCurrent = currentProjId === proj.id;
                            const hasValidImg = proj.previewUrl && !proj.previewUrl.startsWith('#') && !proj.previewUrl.startsWith('linear-gradient') && !proj.previewUrl.startsWith('rgb');
                            return (
                              <div
                                key={proj.id}
                                className={`group relative aspect-square w-full rounded-shape-sm border overflow-hidden transition-all shadow-2xs cursor-pointer active:scale-[0.98] select-none ${
                                  isCurrent 
                                    ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/50' 
                                    : 'border-[var(--border-default)] hover:border-[var(--border-accent)] bg-[var(--surface-card)]'
                                }`}
                                onClick={() => handleOpenProjectInternally(proj)}
                              >
                                {/* Full Square Cover Thumbnail Image or Solid Canvas Background */}
                                {hasValidImg ? (
                                  <img
                                    src={safeSvgDataUrl(proj.previewUrl)}
                                    alt={proj.title}
                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    onError={(e) => {
                                      const target = e.currentTarget as HTMLImageElement;
                                      target.style.display = 'none';
                                      if (target.parentElement) {
                                        target.parentElement.style.background = 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)';
                                      }
                                    }}
                                  />
                                ) : (
                                  <div 
                                    className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-3 text-center"
                                    style={{ background: proj.canvasBackground || 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}
                                  >
                                    <FolderOpen size={24} className="text-white/40 mb-1" />
                                    <span className="text-[10px] font-bold text-white/80 line-clamp-2">{proj.title}</span>
                                  </div>
                                )}

                                {/* Balanced Vignette / Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/35 pointer-events-none group-hover:from-black/95 transition-colors" />

                                {/* Top Badges (Pins at top of the square) */}
                                <div className="absolute top-1.5 start-1.5 end-1.5 flex items-center justify-between z-10 pointer-events-none">
                                  {isCurrent ? (
                                    <span className="px-1.5 py-0.5 text-[8px] font-extrabold rounded-shape-xs bg-[var(--accent)] text-white shadow-xs flex items-center gap-0.5">
                                      <CheckCheck size={9} />
                                      <span>{isAr ? 'مفتوح' : 'Open'}</span>
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold bg-black/65 text-slate-200 rounded-shape-xs backdrop-blur-xs">
                                      {proj.width > proj.height ? '16:9' : proj.width < proj.height ? '9:16' : '1:1'}
                                    </span>
                                  )}

                                  <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 bg-black/75 text-white rounded-shape-xs backdrop-blur-xs">
                                    {proj.width}×{proj.height}
                                  </span>
                                </div>

                                {/* Bottom Info Bar inside the square */}
                                <div className="absolute bottom-0 inset-x-0 p-2 z-10 flex flex-col justify-end space-y-0.5">
                                  <h4 className="text-[10.5px] font-bold text-white truncate drop-shadow-md">
                                    {proj.title}
                                  </h4>

                                  {/* Creator Attribution & Layers */}
                                  <div className="flex items-center justify-between text-[8.5px] text-amber-300 font-medium truncate">
                                    <span className="truncate flex items-center gap-1">
                                      <User size={10} className="shrink-0" />
                                      <span className="truncate">{user?.name || (isAr ? 'تصميمي الخاص' : 'My Design')}</span>
                                    </span>
                                    <span className="text-slate-300 font-mono text-[8px] shrink-0">
                                      {proj.elements?.length || 0} {isAr ? 'طبقات' : 'L'}
                                    </span>
                                  </div>
                                </div>

                                {/* Hover Action Overlays for duplicate/delete */}
                                <div className="absolute top-1.5 end-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--surface-card)]/90 backdrop-blur-xs p-0.5 rounded-shape-xs border border-[var(--border-default)] z-20" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDuplicateProjectInternally(proj.id);
                                    }}
                                    className="p-1 rounded-shape-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
                                    title={isAr ? 'تكرار' : 'Duplicate'}
                                  >
                                    <Copy size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteProjectInternally(proj.id);
                                    }}
                                    className="p-1 rounded-shape-xs text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                    title={isAr ? 'حذف' : 'Delete'}
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 0: TEMPLATES (RATAQ SOVEREIGN ENGINE - REALTIME AUTO-MATCHING & BORDERLESS FULL-HEIGHT VERTICAL SIDEBAR) */}
              {activeSidebarTab === 'templates' && (
                <div className="flex flex-col h-full min-h-0 overflow-hidden">
                  {/* Sticky Header: Search Bar & Category Pills */}
                  <div className="p-2 sm:px-3 sm:py-2.5 border-b border-[var(--border-main)]/70 bg-[var(--surface-subtle)]/50 shrink-0 space-y-2">
                    {/* Search Bar */}
                    <div className="relative w-full">
                      <Search size={13} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                      <input
                        type="text"
                        value={templateSearchQuery}
                        onChange={(e) => setTemplateSearchQuery(e.target.value)}
                        placeholder={isAr ? 'ابحث في كافة القوالب والتصاميم...' : 'Search templates...'}
                        className="w-full ps-8 pe-7 py-1.5 rounded-shape-xs bg-[var(--surface-card)] border border-[var(--border-default)] focus:border-[var(--accent)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none transition-colors"
                      />
                      {templateSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setTemplateSearchQuery('')}
                          className="absolute end-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Category Filter Chips Bar without creators category (all creator templates are integrated) */}
                    <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5 text-[11px] no-scrollbar">
                      {[
                        { id: 'all', label: isAr ? 'الكل' : 'All' },
                        { id: 'marketing', label: isAr ? 'تسويق وإعلان' : 'Marketing' },
                        { id: 'social', label: isAr ? 'سوشيال ميديا' : 'Social' },
                        { id: 'story', label: isAr ? 'ستوري وقصص' : 'Stories' },
                        { id: 'posts', label: isAr ? 'منشورات' : 'Posts' },
                        { id: 'quotes', label: isAr ? 'اقتباسات' : 'Quotes' },
                        { id: 'tech', label: isAr ? 'تقنية' : 'Tech' },
                        { id: 'fitness', label: isAr ? 'رياضة' : 'Fitness' },
                        { id: 'fashion', label: isAr ? 'أزياء' : 'Fashion' },
                        { id: 'banner', label: isAr ? 'بنرات' : 'Banners' },
                        { id: 'real_estate', label: isAr ? 'عقارات' : 'Real Estate' }
                      ].map(cat => {
                        const isSelected = selectedTemplateCat === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedTemplateCat(cat.id)}
                            className={`px-2 py-0.5 rounded-shape-xs text-[10px] font-medium whitespace-nowrap transition-all cursor-pointer border active:scale-95 shadow-2xs ${
                              isSelected
                                ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-2xs'
                                : 'bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border-[var(--border-default)]'
                            }`}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Template Cards List - Clean 2-column square grid extending to bottom */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-2.5 min-h-0 border-0 content-start auto-rows-max grid grid-cols-2 gap-2 pb-4">
                    {(() => {
                      const communityTpls = communityTemplates;
                      const curatedTpls = CURATED_PUBLIC_TEMPLATES.map(c => {
                        const isVertical = c.dimensions.includes('1920');
                        const isBanner = c.dimensions.includes('720') || c.dimensions.includes('630');
                        const width = isVertical ? 1080 : (isBanner ? 1280 : 1080);
                        const height = isVertical ? 1920 : (c.dimensions.includes('720') ? 720 : (c.dimensions.includes('630') ? 630 : 1080));
                        const aspectRatio: '1:1' | '9:16' | '16:9' | '1.91:1' | '4:5' = isVertical ? '9:16' : (isBanner ? '16:9' : '1:1');
                        return {
                          id: c.id,
                          titleAr: c.titleAr,
                          titleEn: c.titleEn,
                          category: (c.category === 'reels' || c.category === 'story' ? 'story' : 'marketing') as any,
                          thumbnailUrl: c.src,
                          backgroundColor: c.canvasBackground || '#090d16',
                          width,
                          height,
                          aspectRatio,
                          elements: c.elements || [],
                          rating: 4.9,
                          usesCount: 3100
                        } as StudioTemplate;
                      });
                      let allUnifiedTemplates = [...communityTpls, ...curatedTpls, ...RATAQ_TEMPLATES];

                      if (templateSearchQuery.trim()) {
                        const q = templateSearchQuery.trim().toLowerCase();
                        allUnifiedTemplates = allUnifiedTemplates.filter(t => 
                          t.titleAr.toLowerCase().includes(q) ||
                          t.titleEn.toLowerCase().includes(q) ||
                          t.category.toLowerCase().includes(q) ||
                          (t.creatorName && t.creatorName.toLowerCase().includes(q))
                        );
                      }

                      // 1. Force strict filter by active canvas aspect ratio to prevent distraction and ensure compatibility
                      const canvasWidth = imageSize.width || 1080;
                      const canvasHeight = imageSize.height || 1080;
                      const canvasRatio = canvasWidth / canvasHeight;

                      let list = allUnifiedTemplates.filter(t => {
                        const tRatio = t.width / t.height;
                        return Math.abs(canvasRatio - tRatio) <= 0.05;
                      });

                      if (selectedTemplateCat === 'reels') {
                        list = list.filter(t => 
                          t.category === 'story' || t.aspectRatio === '9:16' || t.id.includes('reel') || t.id.includes('remotion') || t.titleAr.includes('ريلز') || t.titleAr.includes('فيديو')
                        );
                      } else if (selectedTemplateCat === 'youtube') {
                        list = list.filter(t => 
                          t.aspectRatio === '16:9' || t.id.includes('yt') || t.id.includes('youtube') || t.titleAr.includes('يوتيوب')
                        );
                      } else if (selectedTemplateCat === 'remotion') {
                        list = list.filter(t => 
                          t.id.includes('remotion') || (t as any).tag?.includes('Remotion') || (t as any).tags?.includes('remotion') || t.titleEn.toLowerCase().includes('remotion')
                        );
                      } else if (selectedTemplateCat !== 'all') {
                        list = list.filter(t => t.category === selectedTemplateCat);
                      }

                      // Prioritize exact pixel dimension matches first
                      list.sort((a, b) => {
                        const aMatch = (a.width === canvasWidth && a.height === canvasHeight) ? 1 : 0;
                        const bMatch = (b.width === canvasWidth && b.height === canvasHeight) ? 1 : 0;
                        return bMatch - aMatch;
                      });

                      if (list.length === 0) {
                        return (
                          <div className="p-6 rounded-shape-sm bg-[var(--surface-subtle)] border border-[var(--border-default)] text-center space-y-2.5 col-span-2">
                            <Info size={24} className="mx-auto text-[var(--text-muted)]" />
                            <p className="text-xs font-bold text-[var(--text-primary)]">
                              {templateSearchQuery 
                                ? (isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'No templates match your search') 
                                : (isAr ? 'لا توجد قوالب في هذه الفئة' : 'No templates found in this category')}
                            </p>
                            <div className="flex items-center justify-center gap-2 pt-1">
                              {templateSearchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setTemplateSearchQuery('')}
                                  className="px-2.5 py-1 text-[10.5px] font-bold rounded-shape-xs bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer active:scale-95"
                                >
                                  {isAr ? 'إلغاء البحث' : 'Clear Search'}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTemplateCat('all');
                                  setTemplateSearchQuery('');
                                }}
                                className="px-3 py-1 text-[10.5px] font-bold rounded-shape-xs bg-[var(--accent)] text-white shadow-2xs cursor-pointer active:scale-95"
                              >
                                {isAr ? 'عرض جميع القوالب' : 'Show All Templates'}
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return list.map((tpl) => {
                        const isExactSizeMatch = tpl.width === imageSize.width && tpl.height === imageSize.height;

                        return (
                          <div
                            key={tpl.id}
                            className={`group relative aspect-square w-full rounded-shape-sm border overflow-hidden transition-all shadow-2xs cursor-pointer active:scale-[0.98] select-none ${
                              isExactSizeMatch 
                                ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/50' 
                                : 'border-[var(--border-default)] hover:border-[var(--border-accent)]'
                            }`}
                            onClick={() => handleLoadTemplate(tpl)}
                          >
                            {/* Full Square Cover Thumbnail Image */}
                            <img
                              src={safeSvgDataUrl(tpl.thumbnailUrl)}
                              alt={tpl.titleAr}
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                const target = e.currentTarget as HTMLImageElement;
                                target.style.display = 'none';
                                if (target.parentElement) {
                                  target.parentElement.style.background = tpl.backgroundColor || 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)';
                                }
                              }}
                            />

                            {/* Balanced Vignette / Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/35 pointer-events-none group-hover:from-black/95 transition-colors" />

                            {/* Top Badges (Pins at top of the square) */}
                            <div className="absolute top-1.5 start-1.5 end-1.5 flex items-center justify-between z-10 pointer-events-none">
                              {isExactSizeMatch ? (
                                <span className="px-1.5 py-0.5 text-[8px] font-extrabold rounded-shape-xs bg-[var(--fg-success)] text-white shadow-xs flex items-center gap-0.5">
                                  <CheckCheck size={9} />
                                  <span>{isAr ? 'مطابق' : 'Match'}</span>
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold bg-black/65 text-slate-200 rounded-shape-xs backdrop-blur-xs">
                                  {tpl.aspectRatio}
                                </span>
                              )}

                              <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 bg-black/75 text-white rounded-shape-xs backdrop-blur-xs">
                                {tpl.width}×{tpl.height}
                              </span>
                            </div>

                            {/* Bottom Info Bar inside the square */}
                            <div className="absolute bottom-0 inset-x-0 p-2 z-10 flex flex-col justify-end space-y-0.5">
                              <h4 className="text-[10.5px] font-bold text-white truncate drop-shadow-md">
                                {isAr ? tpl.titleAr : tpl.titleEn}
                              </h4>

                              {/* Creator Attribution */}
                              <div className="flex items-center justify-between text-[8.5px] text-amber-300 font-medium truncate">
                                <span className="truncate flex items-center gap-1">
                                  <User size={10} className="shrink-0" />
                                  <span className="truncate">{tpl.creatorName || (isAr ? 'فريق رينكس' : 'Rinex Team')}</span>
                                </span>
                                <span className="text-slate-300 font-mono text-[8px] shrink-0">
                                  {tpl.elements.length} {isAr ? 'طبقات' : 'L'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* TAB: BRAND KIT (العلامة التجارية) */}
              {activeSidebarTab === 'fonts' && (
                <div className="flex flex-col h-full min-h-0 overflow-hidden">
                  {/* Sticky Header: Search Bar & Category Chips */}
                  <div className="p-2 sm:px-3 sm:py-2.5 border-b border-[var(--border-main)]/70 bg-[var(--surface-subtle)]/50 shrink-0 space-y-2">
                    {/* Search Bar */}
                    <div className="relative w-full">
                      <Search size={13} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                      <input
                        type="text"
                        value={fontSearchQuery}
                        onChange={(e) => setFontSearchQuery(e.target.value)}
                        placeholder={isAr ? 'ابحث في أسماء الخطوط العربية واللاتينية...' : 'Search fonts...'}
                        className="w-full ps-8 pe-7 py-1.5 rounded-shape-xs bg-[var(--surface-card)] border border-[var(--border-default)] focus:border-[var(--accent)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none transition-colors"
                      />
                      {fontSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setFontSearchQuery('')}
                          className="absolute end-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Category Filter Chips */}
                    <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5 text-[9.5px]">
                      {[
                        { id: 'all', label: isAr ? 'الكل' : 'All' },
                        { id: 'arabic', label: isAr ? 'عربي حديث' : 'Modern' },
                        { id: 'kufi', label: isAr ? 'كوفي' : 'Kufic' },
                        { id: 'naskh', label: isAr ? 'نَسخ ورقعة' : 'Calligraphy' },
                        { id: 'display', label: isAr ? 'عناوين' : 'Display' },
                        { id: 'english', label: isAr ? 'لاتيني' : 'Latin' },
                        { id: 'brand', label: isAr ? 'الهوية' : 'Brand' },
                      ].map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedFontCat(cat.id as any)}
                          className={`px-2.5 py-1 rounded-shape-full font-bold whitespace-nowrap cursor-pointer transition-all ${
                            selectedFontCat === cat.id
                              ? 'bg-[var(--accent)] text-white shadow-xs'
                              : 'bg-[var(--surface-card)] hover:bg-[var(--surface-inset)] text-[var(--text-secondary)] border border-[var(--border-main)]'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clean, Sleek Professional Font List */}
                  <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {(() => {
                      const filteredFonts = STUDIO_FONTS.filter(f => {
                        const matchesSearch = !fontSearchQuery || 
                          f.name.toLowerCase().includes(fontSearchQuery.toLowerCase()) ||
                          f.fontFamily.toLowerCase().includes(fontSearchQuery.toLowerCase());
                        const matchesCat = selectedFontCat === 'all' || f.category === selectedFontCat || (selectedFontCat === 'brand' && f.isPopular);
                        return matchesSearch && matchesCat;
                      });

                      if (filteredFonts.length === 0) {
                        return (
                          <div className="text-center py-10 px-3 text-[var(--text-muted)] space-y-2">
                            <Type size={28} className="mx-auto opacity-40 text-[var(--accent)]" />
                            <p className="text-xs font-bold">{isAr ? 'لم يتم العثور على خطوط مطابقة' : 'No matching fonts found'}</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-1">
                          {filteredFonts.map(font => {
                            const isSelectedInCanvas = selectedElement?.type === 'text' && selectedElement.fontFamily === font.fontFamily;
                            return (
                              <button
                                key={font.id}
                                type="button"
                                onClick={() => handleApplyFont(font.fontFamily, font.name)}
                                className={`w-full py-2 px-3 rounded-shape-sm border transition-all duration-150 cursor-pointer flex items-center justify-between gap-2 text-start ${
                                  isSelectedInCanvas
                                    ? 'bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] border-[var(--accent)] shadow-2xs font-bold text-[var(--accent)]'
                                    : 'bg-[var(--surface-card)] hover:bg-[var(--surface-inset)] border-[var(--border-main)] hover:border-[var(--accent)]/50 text-[var(--text-primary)]'
                                }`}
                              >
                                {/* Font Preview Title */}
                                <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                                  <span 
                                    className="text-sm sm:text-base font-bold truncate leading-snug"
                                    style={{ fontFamily: font.fontFamily }}
                                  >
                                    {font.name} {isAr ? '— خط تجريبي' : '— Sample Font'}
                                  </span>
                                </div>

                                {/* Category Tag & Active Indicator */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {font.badge && (
                                    <span className="px-1.5 py-0.5 rounded-shape-xs bg-[var(--surface-subtle)] text-[8px] font-bold text-[var(--text-muted)] border border-[var(--border-default)]">
                                      {font.badge}
                                    </span>
                                  )}
                                  {isSelectedInCanvas ? (
                                    <div className="w-5 h-5 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-xs">
                                      <Check size={11} strokeWidth={3} />
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-[var(--text-muted)] font-mono opacity-60">
                                      {font.category}
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* TAB: PRO ELEMENTS (العناصر والأيقونات الاحترافية) */}
              {activeSidebarTab === 'elements' && (
                <div className="flex flex-col h-full min-h-0 overflow-hidden">
                  {/* Sticky Header: Search Bar & Category Filter */}
                  <div className="p-2 sm:px-3 sm:py-2.5 border-b border-[var(--border-main)]/70 bg-[var(--surface-subtle)]/50 shrink-0 space-y-2">
                    <div className="relative w-full">
                      <Search size={13} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                      <input
                        type="text"
                        value={elementSearchQuery}
                        onChange={(e) => setElementSearchQuery(e.target.value)}
                        placeholder={isAr ? 'ابحث في أيقونات التواصل، الإطارات، والشارات...' : 'Search elements...'}
                        className="w-full ps-8 pe-7 py-1.5 rounded-shape-xs bg-[var(--surface-card)] border border-[var(--border-default)] focus:border-[var(--accent)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none transition-colors"
                      />
                      {elementSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setElementSearchQuery('')}
                          className="absolute end-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 text-[9.5px]">
                      {[
                        { id: 'all', label: isAr ? 'الكل' : 'All' },
                        { id: 'social', label: isAr ? 'أيقونات التواصل' : 'Social Media' },
                        { id: 'app_icons', label: isAr ? 'أيقونات الواجهات' : 'App Icons' },
                        { id: 'badges', label: isAr ? 'شارات تسويقية' : 'Sales Badges' },
                        { id: 'shapes', label: isAr ? 'أشكال أساسية' : 'Basic Shapes' },
                        { id: 'frames', label: isAr ? 'إطارات' : 'Frames' }
                      ].map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedElementCat(cat.id as any)}
                          className={`px-2.5 py-1 rounded-shape-full font-bold whitespace-nowrap cursor-pointer transition-all ${
                            selectedElementCat === cat.id
                              ? 'bg-[var(--accent)] text-white shadow-xs'
                              : 'bg-[var(--surface-card)] hover:bg-[var(--surface-inset)] text-[var(--text-secondary)] border border-[var(--border-main)]'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Elements Grid */}
                  <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2 sm:p-2.5">
                    <div className="grid grid-cols-3 gap-2">
                      {STUDIO_ELEMENTS
                        .filter(el => {
                          const matchesSearch = !elementSearchQuery || 
                            el.titleAr.includes(elementSearchQuery) || 
                            el.titleEn.toLowerCase().includes(elementSearchQuery.toLowerCase());
                          const matchesCat = selectedElementCat === 'all' || el.category === selectedElementCat;
                          return matchesSearch && matchesCat;
                        })
                        .map(item => (
                          <button
                            key={item.id}
                            type="button"
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'element', item }));
                              e.dataTransfer.effectAllowed = 'copy';
                            }}
                            onClick={() => handleApplyElement(item)}
                            className="group p-2.5 rounded-shape-sm bg-[var(--surface-card)] hover:bg-[var(--surface-inset)] border border-[var(--border-main)] hover:border-[var(--accent)] flex flex-col items-center justify-center gap-2 cursor-pointer transition-all shadow-2xs hover:shadow-xs active:scale-95 relative"
                          >
                            {item.category === 'frames' && (
                              <span className="absolute top-1 end-1 px-1 py-0.2 text-[7.5px] font-bold rounded-shape-full bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                                {isAr ? 'إطار' : 'Frame'}
                              </span>
                            )}
                            <div className="w-10 h-10 flex items-center justify-center">
                              {item.category === 'frames' || item.type === 'frame' ? (
                                (() => {
                                  const shape = item.frameShape || 'circle';
                                  const isCircle = ['circle', 'double_circle', 'gold_luxury', 'neon_cyber', 'dotted_circle', 'circle_3d'].includes(shape);
                                  
                                  if (isCircle) {
                                    return (
                                      <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 relative ${
                                        shape === 'gold_luxury'
                                          ? 'border-2 border-amber-500 bg-amber-500/10 shadow-xs'
                                          : shape === 'neon_cyber'
                                          ? 'border-2 border-cyan-400 bg-cyan-400/10 shadow-[0_0_8px_rgba(34,211,238,0.5)]'
                                          : shape === 'double_circle'
                                          ? 'border-2 border-amber-400 bg-amber-400/10 ring-2 ring-amber-300 ring-offset-1'
                                          : shape === 'dotted_circle'
                                          ? 'border-2 border-dotted border-pink-500 bg-pink-500/10'
                                          : 'border-2 border-dashed border-[var(--accent)] bg-[var(--surface-subtle)]'
                                      }`}>
                                        <Circle size={18} className="fill-[var(--accent)]/20 text-[var(--accent)]" />
                                      </div>
                                    );
                                  } else if (shape === 'oval') {
                                    return (
                                      <div className="w-10 h-7 rounded-full border-2 border-dashed border-[var(--accent)] bg-[var(--surface-subtle)] flex items-center justify-center text-[var(--accent)] group-hover:scale-110 transition-transform">
                                        <Circle size={16} className="fill-[var(--accent)]/20" />
                                      </div>
                                    );
                                  } else if (shape === 'arch') {
                                    return (
                                      <div className="w-7 h-9 rounded-t-full border-2 border-dashed border-[var(--accent)] bg-[var(--surface-subtle)] flex items-center justify-center text-[var(--accent)] group-hover:scale-110 transition-transform">
                                        <Circle size={14} className="fill-[var(--accent)]/20" />
                                      </div>
                                    );
                                  } else if (shape === 'heart') {
                                    return (
                                      <div className="w-8 h-8 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                                        <Heart size={26} className="fill-rose-500/20 stroke-[2.5]" />
                                      </div>
                                    );
                                  } else if (shape === 'star') {
                                    return (
                                      <div className="w-8 h-8 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                                        <Star size={26} className="fill-amber-500/20 stroke-[2.5]" />
                                      </div>
                                    );
                                  } else if (shape === 'phone') {
                                    return (
                                      <div className="w-5 h-9 rounded-xs border-2 border-slate-700 bg-slate-800 text-slate-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Smartphone size={14} />
                                      </div>
                                    );
                                  } else if (shape === 'polaroid') {
                                    return (
                                      <div className="w-7 h-9 rounded-2xs border border-slate-300 bg-white shadow-xs p-0.5 flex flex-col items-center justify-between group-hover:scale-110 transition-transform">
                                        <div className="w-full h-5 bg-slate-100 border border-dashed border-slate-400 flex items-center justify-center">
                                          <ImageIcon size={10} className="text-slate-500" />
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div className="w-8 h-8 rounded-shape-xs border-2 border-dashed border-[var(--accent)] bg-[var(--surface-subtle)] flex items-center justify-center text-[var(--accent)] group-hover:scale-110 transition-transform">
                                        <Square size={20} className="fill-[var(--accent)]/20" />
                                      </div>
                                    );
                                  }
                                })()
                              ) : item.type === 'svg' && item.svgPath ? (
                                <svg viewBox={item.viewBox || "0 0 24 24"} className="w-8 h-8 group-hover:scale-110 transition-transform" fill={item.defaultColor || "currentColor"}>
                                  <path d={item.svgPath} />
                                </svg>
                              ) : item.id.includes('circle') ? (
                                <Circle size={32} className="text-purple-500 group-hover:scale-110 transition-transform" />
                              ) : item.id.includes('badge') ? (
                                <Star size={32} className="text-amber-500 group-hover:scale-110 transition-transform" />
                              ) : item.id.includes('arrow') ? (
                                <ArrowUpRight size={32} className="text-[var(--fg-success)] group-hover:scale-110 transition-transform" />
                              ) : (
                                <Square size={32} className="text-blue-500 group-hover:scale-110 transition-transform" />
                              )}
                            </div>
                            <span className="text-[9.5px] font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate text-center w-full">
                              {isAr ? item.titleAr : item.titleEn}
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: PHOTOS & MEDIA (مكتبة الصور والوسائط) */}
              {activeSidebarTab === 'photos' && (
                <div className="flex flex-col h-full min-h-0 overflow-hidden">
                  <div className="p-2 sm:px-3 sm:py-2.5 border-b border-[var(--border-main)]/70 bg-[var(--surface-subtle)]/50 shrink-0 space-y-2">
                    <div className="relative w-full">
                      <Search size={13} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                      <input
                        type="text"
                        value={photoSearchQuery}
                        onChange={(e) => setPhotoSearchQuery(e.target.value)}
                        placeholder={isAr ? 'ابحث في مكتبة الصور عالية الدقة...' : 'Search stock photos...'}
                        className="w-full ps-8 pe-7 py-1.5 rounded-shape-xs bg-[var(--surface-card)] border border-[var(--border-default)] focus:border-[var(--accent)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none transition-colors"
                      />
                      {photoSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setPhotoSearchQuery('')}
                          className="absolute end-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 text-[9.5px]">
                      {[
                        { id: 'all', label: isAr ? 'الكل' : 'All' },
                        { id: 'business', label: isAr ? 'أعمال وتقنية' : 'Business' },
                        { id: 'tech', label: isAr ? 'ذكاء اصطناعي' : 'Tech & AI' },
                        { id: 'nature', label: isAr ? 'طبيعة ومناظر' : 'Nature' },
                        { id: 'abstract', label: isAr ? 'تجريدي 3D' : 'Abstract 3D' }
                      ].map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedPhotoCat(cat.id as any)}
                          className={`px-2.5 py-1 rounded-shape-full font-bold whitespace-nowrap cursor-pointer transition-all ${
                            selectedPhotoCat === cat.id
                              ? 'bg-[var(--accent)] text-white shadow-xs'
                              : 'bg-[var(--surface-card)] hover:bg-[var(--surface-inset)] text-[var(--text-secondary)] border border-[var(--border-main)]'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2 sm:p-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      {STUDIO_PHOTOS
                        .filter(ph => {
                          const matchesSearch = !photoSearchQuery || 
                            ph.titleAr.includes(photoSearchQuery) || 
                            ph.titleEn.toLowerCase().includes(photoSearchQuery.toLowerCase());
                          const matchesCat = selectedPhotoCat === 'all' || ph.category === selectedPhotoCat;
                          return matchesSearch && matchesCat;
                        })
                        .map(photo => (
                          <div
                            key={photo.id}
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', photo.url);
                            }}
                            className="group relative aspect-video rounded-shape-sm overflow-hidden border border-[var(--border-main)] bg-[var(--surface-subtle)] hover:border-[var(--accent)] transition-all cursor-grab active:cursor-grabbing shadow-2xs"
                          >
                            <img
                              src={photo.url}
                              alt={isAr ? photo.titleAr : photo.titleEn}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 gap-1">
                              <span className="text-[9px] font-bold text-white truncate">
                                {isAr ? photo.titleAr : photo.titleEn}
                              </span>
                              <div className="grid grid-cols-2 gap-1 pt-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleApplyPhoto(photo, false);
                                  }}
                                  className="py-1 px-1 rounded-shape-xs bg-[var(--accent)] text-white text-[8px] font-bold flex items-center justify-center gap-0.5 cursor-pointer"
                                >
                                  <Plus size={9} />
                                  <span>{isAr ? 'إدراج' : 'Insert'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleApplyPhoto(photo, true);
                                  }}
                                  className="py-1 px-1 rounded-shape-xs bg-white/25 hover:bg-white/40 text-white text-[8px] font-bold flex items-center justify-center gap-0.5 cursor-pointer backdrop-blur-xs"
                                >
                                  <span>{isAr ? 'خلفية' : 'Bg'}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: COLOR PALETTES (الألوان والباليتات المتناسقة) */}
              {activeSidebarTab === 'colors' && (
                <div className="space-y-3 p-1">
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {isAr ? 'باليتات ألوان احترافية متناسقة جاهزة للتطبيق بضغطة زر:' : 'Curated harmonic color palettes ready to apply:'}
                  </p>

                  <div className="space-y-2.5">
                    {STUDIO_PALETTES.map(pal => (
                      <div
                        key={pal.id}
                        onClick={() => handleApplyPalette(pal)}
                        className="p-3 rounded-shape-sm bg-[var(--surface-card)] hover:bg-[var(--surface-inset)] border border-[var(--border-main)] hover:border-[var(--accent)] cursor-pointer transition-all shadow-2xs group space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                            {isAr ? pal.titleAr : pal.titleEn}
                          </span>
                          <span className="text-[9px] text-[var(--text-muted)] group-hover:text-[var(--accent)] font-medium">
                            {isAr ? 'تطبيق ⚡' : 'Apply ⚡'}
                          </span>
                        </div>
                        <div className="flex items-center h-7 rounded-shape-xs overflow-hidden border border-white/10 shadow-2xs">
                          {pal.colors.map((c, cIdx) => (
                            <div key={cIdx} className="flex-1 h-full hover:scale-110 transition-transform" style={{ backgroundColor: c }} title={c} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}



              {/* TAB: ANIMATIONS & MOTION FX (التأثيرات الحركية) */}
              {activeSidebarTab === 'animations' && (
                <div className="space-y-3.5 p-1">
                  <div className="p-2.5 rounded-shape-sm bg-[var(--surface-subtle)] border border-[var(--border-default)] space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                      <span>{isAr ? 'إعدادات وسرعة الحركة:' : 'Animation Settings:'}</span>
                      <span className="font-mono text-[var(--accent)]">{animationSpeed}s</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="3"
                      step="0.1"
                      value={animationSpeed}
                      onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                      className="w-full accent-[var(--accent)] cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[var(--text-secondary)] block">
                      {isAr ? 'قوالب الحركات الاحترافية:' : 'Motion Presets:'}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {STUDIO_ANIMATIONS.map(anim => (
                        <button
                          key={anim.id}
                          type="button"
                          onClick={() => handleApplyAnimation(anim)}
                          className={`p-2.5 rounded-shape-sm border flex flex-col items-start gap-1 text-start transition-all cursor-pointer shadow-2xs ${
                            selectedAnimationId === anim.id
                              ? 'bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] border-[var(--accent)]'
                              : 'bg-[var(--surface-card)] hover:bg-[var(--surface-inset)] border-[var(--border-main)]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 w-full justify-between">
                            <span className="text-base">{anim.icon}</span>
                            {selectedAnimationId === anim.id && (
                              <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-[var(--text-primary)] truncate w-full">
                            {isAr ? anim.titleAr : anim.titleEn}
                          </span>
                          <span className="text-[8.5px] text-[var(--text-muted)] line-clamp-2">
                            {anim.descriptionAr}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: TEXT EFFECTS & TYPEWRITER (تأثيرات النصوص والآلة الكاتبة) */}
              {activeSidebarTab === 'effects' && (
                <div className="space-y-3.5 p-1">
                  {/* Typewriter Special Simulation Card */}
                  <div className="p-3 rounded-shape-sm bg-[var(--surface-card)] border border-[var(--accent)] shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <span className="text-base">⌨️</span>
                        <span>{isAr ? 'حركة الآلة الكاتبة الحية' : 'Typewriter Effect'}</span>
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-shape-xs bg-[var(--accent)] text-white font-bold">
                        {isAr ? 'مباشر' : 'LIVE'}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {isAr ? 'كتابة النص حرفاً بحرف بشكل سينمائي جذاب:' : 'Type characters one by one in real-time:'}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0">{isAr ? 'السرعة:' : 'Speed:'}</span>
                      <input
                        type="range"
                        min="5"
                        max="40"
                        value={typewriterSpeed}
                        onChange={(e) => setTypewriterSpeed(parseInt(e.target.value))}
                        className="flex-1 accent-[var(--accent)] cursor-pointer"
                      />
                      <span className="text-[10px] font-mono text-[var(--accent)]">{typewriterSpeed}/s</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        recordHistory();
                        if (selectedElement && selectedElement.type === 'text') {
                          setElements(prev => prev.map(el => el.id === selectedId ? { ...el, isTypewriter: true, typewriterSpeed } : el));
                          toast.success(isAr ? 'تم تطبيق حركة الآلة الكاتبة' : 'Applied typewriter effect');
                        } else {
                          toast.info(isAr ? 'حدد نصاً لتطبيق الآلة الكاتبة عليه' : 'Select a text element');
                        }
                      }}
                      className="w-full py-1.5 rounded-shape-xs bg-[var(--accent)] text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-opacity hover:opacity-90 shadow-2xs"
                    >
                      <Sparkles size={13} />
                      <span>{isAr ? 'تطبيق الآلة الكاتبة على النص المحدد' : 'Apply Typewriter FX'}</span>
                    </button>
                  </div>

                  {/* Text Special Effects Grid */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[var(--text-secondary)] block">
                      {isAr ? 'أنماط وتأثيرات النصوص البصرية:' : 'Visual Text Styles:'}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {STUDIO_TEXT_EFFECTS.map(fx => (
                        <button
                          key={fx.id}
                          type="button"
                          onClick={() => handleApplyTextEffect(fx)}
                          className={`p-2.5 rounded-shape-sm border flex flex-col items-start gap-1 text-start transition-all cursor-pointer shadow-2xs ${
                            selectedEffectId === fx.id
                              ? 'bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] border-[var(--accent)]'
                              : 'bg-[var(--surface-card)] hover:bg-[var(--surface-inset)] border-[var(--border-main)]'
                          }`}
                        >
                          <span className="text-xs font-mono font-bold text-[var(--fg-accent)]">{fx.icon}</span>
                          <span className="text-[10px] font-bold text-[var(--text-primary)] truncate w-full">
                            {isAr ? fx.titleAr : fx.titleEn}
                          </span>
                          <span className="text-[8.5px] text-[var(--text-muted)] line-clamp-2">
                            {fx.descriptionAr}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: BRAND KIT (العلامة التجارية) */}
              {activeSidebarTab === 'brand' && (
                <div className="space-y-4">
                  {/* Brand Overview & Name */}
                  <div className="p-3 rounded-shape-sm bg-[var(--surface-subtle)] border border-[var(--border-default)] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <Crown size={13} className="text-[var(--fg-accent)]" />
                        <span>{isAr ? 'بيانات علامتك التجارية' : 'Brand Identity'}</span>
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-shape-xs bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] font-bold text-[var(--accent)] font-mono">
                        {isAr ? 'مخصص' : 'PRO KIT'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9.5px] font-bold text-[var(--text-muted)]">
                        {isAr ? 'اسم العلامة / النشاط:' : 'Brand / Business Name:'}
                      </label>
                      <input
                        type="text"
                        value={brandKit.brandName}
                        onChange={(e) => updateBrandKit(prev => ({ ...prev, brandName: e.target.value }))}
                        placeholder={isAr ? 'أدخل اسم علامتك' : 'Enter brand name'}
                        className="w-full h-8 px-2.5 rounded-shape-xs bg-[var(--surface-card)] border border-[var(--border-default)] focus:border-[var(--border-accent)] text-xs font-bold text-[var(--text-primary)] outline-none"
                      />
                    </div>
                  </div>

                  {/* Section 1: Brand Logos */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <Sparkles size={13} className="text-[var(--fg-accent)]" />
                        <span>{isAr ? 'شعارات العلامة التجارية' : 'Brand Logos'}</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => brandLogoInputRef.current?.click()}
                        className="h-6 px-2 text-[10px] font-bold rounded-shape-xs bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] hover:opacity-90 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <Plus size={11} />
                        <span>{isAr ? 'رفع شعار' : 'Upload Logo'}</span>
                      </button>
                      <input 
                        ref={brandLogoInputRef} 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleBrandLogoUpload} 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {brandKit.logos.map((logoItem) => (
                        <div 
                          key={logoItem.id}
                          className="group relative rounded-shape-sm border border-[var(--border-default)] hover:border-[var(--border-accent)] bg-[var(--surface-subtle)] p-2 flex flex-col items-center justify-between text-center transition-all shadow-2xs"
                        >
                          <div className="w-full h-16 rounded-xs bg-[repeating-conic-gradient(#cbd5e1_0%_25%,transparent_0%_50%)] bg-[length:12px_12px] dark:bg-[repeating-conic-gradient(#334155_0%_25%,transparent_0%_50%)] flex items-center justify-center p-1 overflow-hidden">
                            <img 
                              src={logoItem.url} 
                              alt={logoItem.titleAr} 
                              className="max-h-full max-w-full object-contain" 
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/brand/default-logo.svg'; }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-[var(--text-secondary)] mt-1.5 truncate max-w-full">
                            {isAr ? logoItem.titleAr : logoItem.titleEn}
                          </span>
                          <div className="w-full grid grid-cols-2 gap-1 mt-1.5">
                            <button
                              type="button"
                              onClick={() => handleInsertBrandLogo(logoItem.url)}
                              className="h-6 text-[9.5px] font-bold rounded-shape-xs bg-[var(--surface-card)] hover:bg-[var(--surface-subtle)] border border-[var(--border-default)] hover:border-[var(--border-accent)] text-[var(--text-primary)] transition-all cursor-pointer flex items-center justify-center"
                              title={isAr ? 'إدراج كشعار' : 'Insert to canvas'}
                            >
                              {isAr ? 'إدراج' : 'Insert'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleAddSticker(logoItem.url);
                                toast.success(isAr ? 'تمت إضافة الشعار كعلامة مائية' : 'Added as watermark');
                              }}
                              className="h-6 text-[9.5px] font-bold rounded-shape-xs bg-[var(--surface-card)] hover:bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer flex items-center justify-center"
                              title={isAr ? 'إدراج كعلامة مائية' : 'Watermark'}
                            >
                              {isAr ? 'مائي' : 'Watermark'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 2: Brand Color Palette */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <Palette size={13} className="text-[var(--fg-accent)]" />
                        <span>{isAr ? 'لوحة ألوان الهوية (Color Palette)' : 'Brand Color Palette'}</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleApplyBrandColor(brandKit.colors.primary)}
                        className="text-[10px] font-bold text-[var(--accent)] hover:underline cursor-pointer"
                      >
                        {isAr ? 'تطبيق الأساسي' : 'Apply Primary'}
                      </button>
                    </div>

                    {/* Standard Brand Roles */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { key: 'primary', label: isAr ? 'الأساسي' : 'Primary', color: brandKit.colors.primary },
                        { key: 'secondary', label: isAr ? 'الثانوي' : 'Secondary', color: brandKit.colors.secondary },
                        { key: 'accent', label: isAr ? 'التمييز' : 'Accent', color: brandKit.colors.accent },
                        { key: 'dark', label: isAr ? 'الداكن' : 'Dark', color: brandKit.colors.dark },
                        { key: 'light', label: isAr ? 'الفاتح' : 'Light', color: brandKit.colors.light }
                      ].map((item) => (
                        <div key={item.key} className="flex flex-col items-center gap-1">
                          <label 
                            className="relative w-full aspect-square rounded-shape-sm border border-[var(--border-default)] hover:border-[var(--border-accent)] cursor-pointer shadow-2xs overflow-hidden transition-transform hover:scale-105"
                            style={{ backgroundColor: item.color }}
                            title={`${item.label}: ${item.color} (انقر للتطبيق، أو اختر لوناً)`}
                            onClick={() => handleApplyBrandColor(item.color)}
                          >
                            <input
                              type="color"
                              value={item.color}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateBrandKit(prev => ({
                                  ...prev,
                                  colors: { ...prev.colors, [item.key]: val }
                                }));
                              }}
                              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer pointer-events-none"
                            />
                          </label>
                          <span className="text-[9px] font-bold text-[var(--text-muted)] truncate max-w-full">
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Custom Added Swatches */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-secondary)]">
                        <span>{isAr ? 'ألوان فرعية وإضافية:' : 'Custom Swatches:'}</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="color"
                            value={customBrandColorInput}
                            onChange={(e) => setCustomBrandColorInput(e.target.value)}
                            className="w-5 h-5 rounded cursor-pointer border border-[var(--border-default)]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!brandKit.colors.custom.includes(customBrandColorInput)) {
                                updateBrandKit(prev => ({
                                  ...prev,
                                  colors: {
                                    ...prev.colors,
                                    custom: [...prev.colors.custom, customBrandColorInput]
                                  }
                                }));
                                toast.success(isAr ? 'تمت إضافة اللون إلى باليت الهوية' : 'Color added to brand kit');
                              }
                            }}
                            className="h-5 px-1.5 text-[9px] font-bold rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--text-primary)] cursor-pointer"
                          >
                            + {isAr ? 'إضافة' : 'Add'}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {brandKit.colors.custom.map((c, idx) => (
                          <div key={idx} className="relative group/swatch">
                            <button
                              type="button"
                              onClick={() => handleApplyBrandColor(c)}
                              className="w-7 h-7 rounded-shape-xs border border-[var(--border-default)] hover:scale-110 transition-transform shadow-2xs cursor-pointer"
                              style={{ backgroundColor: c }}
                              title={`${c} - انقر لتطبيقه على العنصر`}
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateBrandKit(prev => ({
                                  ...prev,
                                  colors: {
                                    ...prev.colors,
                                    custom: prev.colors.custom.filter((_, i) => i !== idx)
                                  }
                                }));
                              }}
                              className="absolute -top-1 -end-1 w-3.5 h-3.5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/swatch:opacity-100 transition-opacity text-[8px] cursor-pointer shadow-xs"
                              title="حذف"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Brand Fonts & Typography */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <Type size={13} className="text-[var(--fg-accent)]" />
                        <span>{isAr ? 'خطوط الهوية المعتمدة' : 'Official Brand Fonts'}</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => brandFontInputRef.current?.click()}
                        className="h-6 px-2 text-[10px] font-bold rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] hover:border-[var(--border-accent)] text-[var(--text-primary)] transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <Plus size={11} />
                        <span>{isAr ? 'رفع خط (TTF/WOFF)' : 'Upload Font'}</span>
                      </button>
                      <input
                        ref={brandFontInputRef}
                        type="file"
                        accept=".ttf,.otf,.woff,.woff2"
                        className="hidden"
                        onChange={handleBrandFontUpload}
                      />
                    </div>

                    {/* Font Configuration Selectors */}
                    <div className="space-y-2 bg-[var(--surface-subtle)]/70 p-2.5 rounded-shape-sm border border-[var(--border-default)] text-[11px]">
                      {/* Heading Font */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-secondary)]">
                          <span>{isAr ? 'خط العناوين الرئيسية (Heading):' : 'Heading Font:'}</span>
                          <span className="font-mono text-[9px] text-[var(--accent)]">{brandKit.fonts.heading.split(',')[0]}</span>
                        </div>
                        <SelectDropdown
                          size="sm"
                          variant="subtle"
                          usePortal={true}
                          value={brandKit.fonts.heading}
                          onChange={(val) => updateBrandKit(prev => ({ ...prev, fonts: { ...prev.fonts, heading: val } }))}
                          options={availableFontOptions}
                        />
                      </div>

                      {/* Subheading Font */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-secondary)]">
                          <span>{isAr ? 'خط العناوين الفرعية (Subheading):' : 'Subheading Font:'}</span>
                          <span className="font-mono text-[9px] text-[var(--accent)]">{brandKit.fonts.subheading.split(',')[0]}</span>
                        </div>
                        <SelectDropdown
                          size="sm"
                          variant="subtle"
                          usePortal={true}
                          value={brandKit.fonts.subheading}
                          onChange={(val) => updateBrandKit(prev => ({ ...prev, fonts: { ...prev.fonts, subheading: val } }))}
                          options={availableFontOptions}
                        />
                      </div>

                      {/* Body Font */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-secondary)]">
                          <span>{isAr ? 'خط النصوص والفقرات (Body):' : 'Body Text Font:'}</span>
                          <span className="font-mono text-[9px] text-[var(--accent)]">{brandKit.fonts.body.split(',')[0]}</span>
                        </div>
                        <SelectDropdown
                          size="sm"
                          variant="subtle"
                          usePortal={true}
                          value={brandKit.fonts.body}
                          onChange={(val) => updateBrandKit(prev => ({ ...prev, fonts: { ...prev.fonts, body: val } }))}
                          options={availableFontOptions}
                        />
                      </div>
                    </div>

                    {/* Quick Add Brand Text Buttons */}
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-bold text-[var(--text-muted)]">
                        {isAr ? 'إدراج فوري لنصوص بالهوية:' : 'Insert brand text:'}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleAddBrandText('heading')}
                        className="w-full py-2 px-3 rounded-shape-xs bg-[var(--surface-card)] hover:bg-[var(--surface-subtle)] border border-[var(--border-default)] hover:border-[var(--border-accent)] text-start font-bold text-xs text-[var(--text-primary)] transition-all cursor-pointer flex items-center justify-between shadow-2xs"
                      >
                        <span style={{ fontFamily: brandKit.fonts.heading }}>+ {isAr ? 'إضافة عنوان بهوية البراند' : 'Add Brand Heading'}</span>
                        <Crown size={13} className="text-[var(--fg-accent)]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddBrandText('subheading')}
                        className="w-full py-1.5 px-3 rounded-shape-xs bg-[var(--surface-card)] hover:bg-[var(--surface-subtle)] border border-[var(--border-default)] hover:border-[var(--border-accent)] text-start font-medium text-[11px] text-[var(--text-secondary)] transition-all cursor-pointer flex items-center justify-between shadow-2xs"
                      >
                        <span style={{ fontFamily: brandKit.fonts.subheading }}>+ {isAr ? 'إضافة عنوان فرعي بهوية البراند' : 'Add Brand Subtitle'}</span>
                        <Type size={12} className="text-[var(--text-muted)]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddBrandText('body')}
                        className="w-full py-1.5 px-3 rounded-shape-xs bg-[var(--surface-card)] hover:bg-[var(--surface-subtle)] border border-[var(--border-default)] hover:border-[var(--border-accent)] text-start text-[10.5px] text-[var(--text-muted)] transition-all cursor-pointer flex items-center justify-between shadow-2xs"
                      >
                        <span style={{ fontFamily: brandKit.fonts.body }}>+ {isAr ? 'إضافة نص فقرة بهوية البراند' : 'Add Brand Body Text'}</span>
                        <Type size={11} className="text-[var(--text-muted)]" />
                      </button>
                    </div>
                  </div>

                  {/* Save & Reset Actions */}
                  <div className="pt-2 flex items-center gap-2 border-t border-[var(--border-default)]">
                    <button
                      type="button"
                      onClick={() => {
                        saveStoredBrandKit(user?.id, brandKit);
                        toast.success(isAr ? 'تم حفظ الهوية التجارية بنجاح' : 'Brand kit saved successfully');
                      }}
                      className="flex-1 h-8 rounded-shape-xs bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] hover:opacity-90 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Save size={13} />
                      <span>{isAr ? 'حفظ الهوية التجارية' : 'Save Brand Kit'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBrandKit(DEFAULT_BRAND_KIT);
                        saveStoredBrandKit(user?.id, DEFAULT_BRAND_KIT);
                        toast.success(isAr ? 'تمت استعادة هوية رينكس الافتراضية' : 'Restored default brand kit');
                      }}
                      className="h-8 px-2.5 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] font-bold text-xs transition-all cursor-pointer"
                      title={isAr ? 'استعادة الافتراضي' : 'Reset'}
                    >
                      <RefreshCw size={12} />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: UPLOADS (التحميلات والوسائط) */}
              {activeSidebarTab === 'uploads' && (
                <div className="space-y-3.5">
                  {/* Category Filter Chips */}
                  <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 text-[10px]">
                    {[
                      { id: 'all', label: isAr ? 'الكل' : 'All', count: uploads.length },
                      { id: 'image', label: isAr ? 'صور' : 'Images', count: uploads.filter(u => u.type === 'image').length },
                      { id: 'font', label: isAr ? 'خطوط' : 'Fonts', count: uploads.filter(u => u.type === 'font').length },
                      { id: 'pdf', label: isAr ? 'PDF' : 'PDFs', count: uploads.filter(u => u.type === 'pdf').length }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setUploadCategory(cat.id as any)}
                        className={`px-2 py-1 rounded-shape-full font-bold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1 ${
                          uploadCategory === cat.id
                            ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] shadow-2xs'
                            : 'bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-default)]'
                        }`}
                      >
                        <span>{cat.label}</span>
                        <span className="text-[9px] opacity-75">({cat.count})</span>
                      </button>
                    ))}
                  </div>

                  {/* Drag & Drop Upload Zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                    onDragLeave={() => setIsDraggingOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingOver(false);
                      if (e.dataTransfer.files) handleUploadFiles(e.dataTransfer.files);
                    }}
                    onClick={() => fileUploadInputRef.current?.click()}
                    className={`p-4 border-2 border-dashed rounded-shape-md flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all ${
                      isDraggingOver
                        ? 'border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] scale-[1.01]'
                        : 'border-[var(--border-default)] hover:border-[var(--border-accent)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-shape-sm bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] text-[var(--accent)] flex items-center justify-center shadow-2xs">
                      {isUploading ? <RefreshCw size={20} className="animate-spin" /> : <UploadCloud size={20} />}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-[var(--text-primary)]">
                        {isUploading
                          ? (isAr ? 'جاري رفع الملفات ومعالجتها...' : 'Uploading files...')
                          : (isAr ? 'اسحب وأفلت الملفات هنا أو تصفح جهازك' : 'Drag & drop files or browse')}
                      </p>
                      <p className="text-[9.5px] text-[var(--text-muted)]">
                        {isAr ? 'صور (PNG, JPG, SVG) • خطوط (TTF/WOFF) • مستندات PDF' : 'Images, Fonts (TTF/WOFF), PDFs'}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 text-[10px] font-bold rounded-shape-xs bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] shadow-2xs mt-1">
                      {isAr ? 'تصفح ملفات جهازك' : 'Browse Local Files'}
                    </span>
                    <input
                      ref={fileUploadInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.ttf,.otf,.woff,.woff2,.svg"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) handleUploadFiles(e.target.files);
                      }}
                    />
                  </div>

                  {/* Uploaded Items List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-secondary)]">
                      <span>{isAr ? 'الملفات المرفوعة بحسابك:' : 'Your Uploaded Files:'}</span>
                      {uploads.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(isAr ? 'هل أنت متأكد من تفريغ كافة التحميلات؟' : 'Clear all uploads?')) {
                              updateUploads(() => []);
                              toast.success(isAr ? 'تم تفريغ التحميلات' : 'Cleared uploads');
                            }
                          }}
                          className="text-[9.5px] text-rose-500 hover:underline cursor-pointer"
                        >
                          {isAr ? 'تفريغ الكل' : 'Clear all'}
                        </button>
                      )}
                    </div>

                    {uploads.filter(u => uploadCategory === 'all' || u.type === uploadCategory).length === 0 ? (
                      <div className="p-6 text-center border border-[var(--border-default)] rounded-shape-sm bg-[var(--surface-subtle)] text-[var(--text-muted)] space-y-1.5">
                        <FolderOpen size={24} className="mx-auto opacity-40" />
                        <p className="text-xs font-bold text-[var(--text-primary)]">
                          {isAr ? 'لا توجد ملفات في هذا القسم' : 'No files in this category'}
                        </p>
                        <p className="text-[10px]">
                          {isAr ? 'قم برفع ملفات جديدة من جهازك للبدء في استخدامها داخل التصميم' : 'Upload files from your device to use in canvas'}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 max-h-[380px] overflow-y-auto custom-scrollbar p-0.5">
                        {uploads
                          .filter(u => uploadCategory === 'all' || u.type === uploadCategory)
                          .map((item) => (
                            <div
                              key={item.id}
                              draggable={item.type === 'image'}
                              onDragStart={(e) => {
                                if (item.type === 'image') {
                                  e.dataTransfer.setData('text/plain', item.url);
                                }
                              }}
                              className="group p-2 rounded-shape-sm border border-[var(--border-default)] hover:border-[var(--border-accent)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] transition-all shadow-2xs flex items-center justify-between gap-2.5 cursor-grab active:cursor-grabbing"
                            >
                              {/* Left Thumbnail / Icon */}
                              <div className="w-12 h-12 rounded-shape-xs overflow-hidden bg-slate-900 flex-shrink-0 flex items-center justify-center border border-[var(--border-default)]">
                                {item.type === 'image' && (
                                  <img 
                                    src={item.url} 
                                    alt={item.name} 
                                    className="w-full h-full object-contain p-0.5" 
                                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/brand/default-logo.svg'; }}
                                  />
                                )}
                                {item.type === 'font' && (
                                  <span className="text-sm font-black text-amber-400 font-mono">Aa</span>
                                )}

                                {item.type === 'pdf' && (
                                  <div className="w-full h-full flex flex-col items-center justify-center bg-rose-950/40 text-rose-400">
                                    <FileText size={18} />
                                    <span className="text-[7.5px] font-bold font-mono">PDF</span>
                                  </div>
                                )}
                              </div>

                              {/* Center File Info & Quick Action */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-[var(--text-primary)] truncate block" title={item.name}>
                                    {item.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[9px] text-[var(--text-muted)] font-mono mt-0.5">
                                  <span className="px-1 py-0.2 rounded-2xs bg-[var(--surface-card)] border border-[var(--border-default)]">
                                    {item.type.toUpperCase()}
                                  </span>
                                  {item.size && <span>{item.size}</span>}
                                  {item.duration && <span>{item.duration}</span>}
                                </div>

                                {/* Font Preview Sample */}
                                {item.type === 'font' && (
                                  <div 
                                    className="text-[11px] text-[var(--fg-accent)] font-bold truncate mt-1"
                                    style={{ fontFamily: item.fontFamily || item.name }}
                                  >
                                    أبجد هوز 123 ABC
                                  </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  {item.type === 'image' && (
                                    <button
                                      type="button"
                                      onClick={() => handleAddSticker(item.url)}
                                      className="px-2 py-0.5 text-[9.5px] font-bold rounded-shape-xs bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] hover:opacity-90 transition-all cursor-pointer shadow-2xs"
                                    >
                                      + {isAr ? 'إدراج في التصميم' : 'Insert to Canvas'}
                                    </button>
                                  )}

                                  {item.type === 'font' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (selectedId) {
                                            recordHistory();
                                            setElements(prev => prev.map(el => el.id === selectedId ? { ...el, fontFamily: item.fontFamily || item.name } : el));
                                          } else {
                                            handleAddBrandText('heading');
                                          }
                                        }}
                                        className="px-2 py-0.5 text-[9.5px] font-bold rounded-shape-xs bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] hover:opacity-90 transition-all cursor-pointer shadow-2xs"
                                      >
                                        {isAr ? 'تطبيق الخط' : 'Apply Font'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          recordHistory();
                                          const newId = `text-custom-${Date.now()}`;
                                          const newEl: CanvasElement = {
                                            id: newId,
                                            type: 'text',
                                            name: item.name,
                                            x: (imageSize.width - 300) / 2 || 80,
                                            y: (imageSize.height - 80) / 2 || 100,
                                            w: 300,
                                            h: 50,
                                            text: isAr ? `نص بخط ${item.name}` : `Text with ${item.name}`,
                                            color: '#ffffff',
                                            strokeWidth: 0,
                                            fontSize: 36,
                                            fontFamily: item.fontFamily || item.name,
                                            fontWeight: 'bold',
                                            textAlign: 'center',
                                            textShadow: true
                                          };
                                          setElements(prev => [...prev, newEl]);
                                          setSelectedId(newId);
                                          setActiveTool('select');
                                        }}
                                        className="px-2 py-0.5 text-[9.5px] font-bold rounded-shape-xs bg-[var(--surface-card)] hover:bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] cursor-pointer"
                                      >
                                        + {isAr ? 'نص جديد' : 'New text'}
                                      </button>
                                    </>
                                  )}


                                  {item.type === 'pdf' && (
                                    <button
                                      type="button"
                                      onClick={() => handleInsertPdfPreview(item)}
                                      className="px-2 py-0.5 text-[9.5px] font-bold rounded-shape-xs bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] hover:opacity-90 transition-all cursor-pointer shadow-2xs"
                                    >
                                      + {isAr ? 'إدراج المستند في التصميم' : 'Insert to Canvas'}
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Right Delete Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  updateUploads(prev => prev.filter(u => u.id !== item.id));
                                  toast.success(isAr ? 'تم حذف الملف' : 'Deleted file');
                                }}
                                className="w-7 h-7 rounded-shape-xs flex items-center justify-center text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title={isAr ? 'حذف الملف' : 'Delete file'}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: TRANSITIONS (RINEX MOTION VIDEO STUDIO) */}
              {activeSidebarTab === 'transitions' && (
                <div className="p-4 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                  <div className="p-3 rounded-shape-sm bg-[var(--surface-subtle)] border border-[var(--border-default)] space-y-1">
                    <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <Sparkles size={14} className="text-[var(--accent)]" />
                      <span>{isAr ? 'انتقالات المشاهد السينمائية' : 'Cinematic Scene Transitions'}</span>
                    </h4>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {isAr 
                        ? `المشهد الحالي: ${activeSceneIndex + 1} من ${videoScenes.length} | حدد تأثير الانتقال للمشهد التالي`
                        : `Active scene: ${activeSceneIndex + 1} of ${videoScenes.length} | Choose transition effect`}
                    </p>
                  </div>

                  {/* Apply To All Scenes Top Action */}
                  <div className="flex items-center justify-between gap-2 p-2 rounded-shape-xs bg-[var(--surface-subtle)] border border-[var(--border-main)]">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)]">
                      {isAr ? 'تطبيق توحيد الانتقال:' : 'Batch Apply Transition:'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const activeTr = videoScenes[activeSceneIndex]?.transitionToNext || {
                          type: 'dissolve',
                          durationSeconds: 0.5,
                          direction: 'right'
                        };
                        const updated = videoScenes.map(sc => ({
                          ...sc,
                          transitionToNext: { ...activeTr }
                        }));
                        setVideoScenes(updated);
                        toast.success(isAr ? 'تم تطبيق نفس تأثير الانتقال على كافة مشاهد الفيديو' : 'Applied transition to all scenes');
                      }}
                      className="h-7 px-2.5 rounded-shape-xs bg-[var(--accent)] text-slate-950 font-extrabold text-[10px] flex items-center gap-1 shadow-2xs hover:brightness-110 cursor-pointer active:scale-95 transition-all"
                      title={isAr ? 'تطبيق هذا الانتقال وإعداده على كافة مشاهد المشروع' : 'Apply to all scenes'}
                    >
                      <Sparkles size={11} className="fill-current text-slate-950" />
                      <span>{isAr ? 'تطبيق على كل المشاهد' : 'Apply to All Scenes'}</span>
                    </button>
                  </div>

                  {/* Expanded Transitions Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'none', labelAr: 'قطع مباشر', labelEn: 'Cut / None', descAr: 'انتقال فوري بدون تأثير' },
                      { id: 'dissolve', labelAr: 'إذابة متقاطعة', labelEn: 'Dissolve', descAr: 'تلاشي وتداخل ناعم بين المشهدين' },
                      { id: 'fade', labelAr: 'تلاشي للأسود', labelEn: 'Fade Black', descAr: 'انتقال سينمائي عبر شاشة سوداء' },
                      { id: 'fadeWhite', labelAr: 'تلاشي للأبيض', labelEn: 'Fade White', descAr: 'وميض ضوئي ناعم للأبيض' },
                      { id: 'slide', labelAr: 'انزلاق اتجاهي', labelEn: 'Slide', descAr: 'دفع وإزاحة حركية للمشهد' },
                      { id: 'wipe', labelAr: 'مسح خطي', labelEn: 'Wipe', descAr: 'مسح تدريجي بأشعة سريعة' },
                      { id: 'zoom', labelAr: 'تكبير بؤري', labelEn: 'Focal Zoom', descAr: 'اندفاع وتعمق بصري نحو المركز' },
                      { id: 'flip', labelAr: 'قلب 3D', labelEn: '3D Flip', descAr: 'دوران ثلاثي الأبعاد للمشهد' },
                      { id: 'circle', labelAr: 'انكشاف دائري', labelEn: 'Circle Reveal', descAr: 'انبثاق بؤري على شكل دائرة' },
                      { id: 'split', labelAr: 'انقسام ثنائي', labelEn: 'Dual Split', descAr: 'انقسام الشاشة من المنتصف' },
                      { id: 'bounce', labelAr: 'دفع مرن', labelEn: 'Elastic Push', descAr: 'حركة دخول مرنة مع ارتداد' },
                      { id: 'glitch', labelAr: 'وميض جليتش', labelEn: 'Cyber Glitch', descAr: 'تأثير تشويش رقمي عصري' },
                    ].map((tr) => {
                      const currentTr = videoScenes[activeSceneIndex]?.transitionToNext?.type || 'dissolve';
                      const isSelected = currentTr === tr.id;

                      return (
                        <button
                          key={tr.id}
                          type="button"
                          onClick={() => {
                            const updated = [...videoScenes];
                            if (updated[activeSceneIndex]) {
                              updated[activeSceneIndex].transitionToNext = {
                                type: tr.id as any,
                                durationSeconds: updated[activeSceneIndex].transitionToNext?.durationSeconds || 0.5,
                                direction: updated[activeSceneIndex].transitionToNext?.direction || 'right'
                              };
                              setVideoScenes(updated);
                              toast.success(isAr ? `تم تطبيق انتقال "${tr.labelAr}"` : `Applied ${tr.labelEn} transition`);
                            }
                          }}
                          className={`p-2.5 rounded-shape-sm border text-start transition-all cursor-pointer flex flex-col gap-1.5 ${
                            isSelected
                              ? 'bg-[var(--accent)] text-slate-950 border-[var(--accent)] font-extrabold shadow-md scale-[1.02]'
                              : 'bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border-[var(--border-default)] text-[var(--text-primary)]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold truncate max-w-[110px]">{isAr ? tr.labelAr : tr.labelEn}</span>
                            {isSelected && <Check size={13} className="text-slate-950 stroke-[3] shrink-0" />}
                          </div>
                          <span className={`text-[9.5px] leading-tight ${isSelected ? 'text-slate-900 font-bold' : 'text-[var(--text-muted)]'}`}>
                            {tr.descAr}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Transition Duration Slider & Direction controls */}
                  {videoScenes[activeSceneIndex]?.transitionToNext?.type !== 'none' && (
                    <div className="space-y-3 pt-3 border-t border-[var(--border-main)]">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                          <span>{isAr ? 'مدة الانتقال:' : 'Transition Duration:'}</span>
                          <span className="font-mono text-[var(--accent)] font-extrabold bg-[var(--surface-subtle)] px-2 py-0.5 rounded-shape-xs border border-[var(--border-default)]">
                            {videoScenes[activeSceneIndex]?.transitionToNext?.durationSeconds || 0.5}s
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="3.0"
                          step="0.1"
                          value={videoScenes[activeSceneIndex]?.transitionToNext?.durationSeconds || 0.5}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            const updated = [...videoScenes];
                            if (updated[activeSceneIndex]?.transitionToNext) {
                              updated[activeSceneIndex].transitionToNext!.durationSeconds = val;
                              setVideoScenes(updated);
                            }
                          }}
                          className="w-full h-1.5 bg-[var(--surface-inset)] rounded-shape-full appearance-none cursor-pointer accent-[var(--accent)]"
                        />
                      </div>

                      {/* 4-Way Direction Controls */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-[var(--text-primary)] block">
                          {isAr ? 'اتجاه الحركة:' : 'Transition Direction:'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {[
                            { id: 'left', icon: <ChevronLeft size={13} />, labelAr: 'يسار' },
                            { id: 'right', icon: <ChevronRight size={13} />, labelAr: 'يمين' },
                            { id: 'top', icon: <ChevronUp size={13} />, labelAr: 'أعلى' },
                            { id: 'bottom', icon: <ChevronDown size={13} />, labelAr: 'أسفل' },
                          ].map((dirItem) => {
                            const currentDir = videoScenes[activeSceneIndex]?.transitionToNext?.direction || 'right';
                            const isDirActive = currentDir === dirItem.id;

                            return (
                              <button
                                key={dirItem.id}
                                type="button"
                                onClick={() => {
                                  const updated = [...videoScenes];
                                  if (updated[activeSceneIndex]?.transitionToNext) {
                                    updated[activeSceneIndex].transitionToNext!.direction = dirItem.id as any;
                                    setVideoScenes(updated);
                                  }
                                }}
                                className={`flex-1 h-7 rounded-shape-xs border text-[10.5px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                                  isDirActive
                                    ? 'bg-[var(--accent)] text-slate-950 border-[var(--accent)] font-extrabold shadow-2xs'
                                    : 'bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border-[var(--border-default)] text-[var(--text-secondary)]'
                                }`}
                              >
                                {dirItem.icon}
                                <span>{dirItem.labelAr}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: AUDIO TRACK & SOUNDTRACK (RINEX MOTION VIDEO STUDIO) */}
              {activeSidebarTab === 'audio' && (
                <div className="p-4 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                  {/* Active Track Card */}
                  <div className="p-3.5 rounded-shape-md bg-[var(--surface-subtle)] border border-[var(--border-default)] space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-8 h-8 rounded-shape-xs bg-[var(--accent)] text-slate-950 flex items-center justify-center shrink-0 font-bold shadow-xs">
                          <Volume2 size={16} />
                        </div>
                        <div className="truncate">
                          <span className="text-[10px] font-bold text-[var(--accent)] block uppercase tracking-wider">
                            {isAr ? 'مسار الصوت المعتمد' : 'Active Track'}
                          </span>
                          <h4 className="text-xs font-black text-[var(--text-primary)] truncate">
                            {activeAudioTrack ? (isAr ? activeAudioTrack.titleAr : activeAudioTrack.titleEn) : (isAr ? 'بدون صوت' : 'No Audio Selected')}
                          </h4>
                        </div>
                      </div>

                      {activeAudioTrack && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveAudioTrack(null);
                            toast.info(isAr ? 'تم إزالة المسار الصوتي' : 'Audio track removed');
                          }}
                          className="p-1.5 rounded-shape-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs transition-colors cursor-pointer"
                          title={isAr ? 'إزالة الصوت' : 'Remove Audio'}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    {/* Volume Slider & Mute Toggle */}
                    {activeAudioTrack && (
                      <div className="space-y-2 pt-2 border-t border-[var(--border-default)]">
                        <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-secondary)]">
                          <span className="flex items-center gap-1.5">
                            <Volume2 size={13} className="text-[var(--accent)]" />
                            <span>{isAr ? 'مستوى الصوت:' : 'Volume:'}</span>
                          </span>
                          <span className="font-mono text-[var(--fg-accent)]">
                            {activeAudioTrack.isMuted ? '0%' : `${Math.round(activeAudioTrack.volume * 100)}%`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveAudioTrack({
                                ...activeAudioTrack,
                                isMuted: !activeAudioTrack.isMuted
                              });
                            }}
                            className={`p-1.5 rounded-shape-xs border text-xs font-bold transition-all cursor-pointer ${
                              activeAudioTrack.isMuted
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                : 'bg-[var(--surface-card)] text-[var(--text-primary)] border-[var(--border-default)]'
                            }`}
                          >
                            {activeAudioTrack.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                          </button>

                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={activeAudioTrack.isMuted ? 0 : activeAudioTrack.volume}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setActiveAudioTrack({
                                ...activeAudioTrack,
                                volume: val,
                                isMuted: val === 0
                              });
                            }}
                            className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Upload Custom Audio File */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                      <span>{isAr ? 'رفع مقطع صوتي مخصص:' : 'Upload Custom Audio:'}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">MP3, WAV, AAC</span>
                    </h4>

                    <label className="flex items-center justify-center gap-2 p-3 rounded-shape-sm border-2 border-dashed border-[var(--border-default)] hover:border-[var(--accent)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] text-[var(--text-primary)] transition-all cursor-pointer text-xs font-bold shadow-2xs">
                      <Upload size={14} className="text-[var(--accent)]" />
                      <span>{isAr ? 'اختر ملف صوت من جهازك' : 'Browse Audio File'}</span>
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            const name = file.name.replace(/\.[^/.]+$/, '');
                            setActiveAudioTrack({
                              id: `custom-audio-${Date.now()}`,
                              titleAr: name,
                              titleEn: name,
                              url,
                              volume: 0.8,
                              isMuted: false
                            });
                            toast.success(isAr ? `تمت إضافة المقطع الصوتي "${name}"` : `Added audio "${name}"`);
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Royalty-Free Soundtrack Library */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <Sparkles size={13} className="text-[var(--accent)]" />
                      <span>{isAr ? 'مكتبة الموسيقى الترويجية المرخصة:' : 'Royalty-Free Audio Library:'}</span>
                    </h4>

                    <div className="space-y-2">
                      {ROYALTY_FREE_AUDIO_LIBRARY.map((tr) => {
                        const isSelected = activeAudioTrack?.id === tr.id;

                        return (
                          <div
                            key={tr.id}
                            className={`p-3 rounded-shape-sm border text-start transition-all flex items-center justify-between gap-2.5 ${
                              isSelected
                                ? 'bg-[color-mix(in_oklab,var(--accent)_12%,var(--surface-card))] border-[var(--accent)] ring-1 ring-[var(--accent)]/40 shadow-xs'
                                : 'bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border-[var(--border-default)] text-[var(--text-primary)]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className={`w-8 h-8 rounded-shape-xs flex items-center justify-center shrink-0 text-xs font-bold ${
                                isSelected ? 'bg-[var(--accent)] text-slate-950 font-black' : 'bg-[var(--surface-card)] text-[var(--text-muted)]'
                              }`}>
                                <Music size={14} />
                              </div>
                              <div className="min-w-0">
                                <h5 className="text-xs font-bold text-[var(--text-primary)] truncate">
                                  {isAr ? tr.titleAr : tr.titleEn}
                                </h5>
                                <span className="text-[10px] text-[var(--text-muted)] block font-mono">
                                  ⏱ {tr.duration} • {tr.category.toUpperCase()}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveAudioTrack({
                                  id: tr.id,
                                  titleAr: tr.titleAr,
                                  titleEn: tr.titleEn,
                                  url: tr.url,
                                  volume: 0.8,
                                  isMuted: false
                                });
                                toast.success(isAr ? `تم تطبيق ${tr.titleAr}` : `Selected ${tr.titleEn}`);
                              }}
                              className={`h-7 px-2.5 rounded-shape-xs text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                                isSelected
                                  ? 'bg-[var(--accent)] text-slate-950 font-black'
                                  : 'bg-[var(--surface-card)] hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-default)]'
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check size={12} className="stroke-[3]" />
                                  <span>{isAr ? 'نشط' : 'Active'}</span>
                                </>
                              ) : (
                                <>
                                  <Plus size={12} />
                                  <span>{isAr ? 'تطبيق' : 'Apply'}</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: MAGIC ERASER */}
              {activeSidebarTab === 'magic_eraser' && (
                <div className="space-y-4">
                  {/* Status Card */}
                  <div className="p-3 rounded-shape-sm bg-[var(--bg-accent-muted)] border border-[var(--border-accent)]/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--fg-accent)] flex items-center gap-1.5">
                        <Sparkles size={14} className="text-amber-400 animate-pulse" />
                        <span>{isAr ? 'الممحاة السحرية مفعلة' : 'Magic Eraser Active'}</span>
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full bg-[var(--accent)] text-[9px] font-bold text-white">
                        AI Inpaint
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      {isAr
                        ? 'مرر الممحاة على أي كائن أو شعار أو جزء غير مرغوب فيه في مساحة العمل لمسحه سحرياً وترميم الخلفية بنقاوة تامة.'
                        : 'Brush over any unwanted object or spot on canvas to erase it and blend background seamlessly.'}
                    </p>
                  </div>

                  {/* Mode / Active Tool Switcher */}
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-[var(--surface-subtle)] rounded-shape-sm border border-[var(--border-default)]">
                    <button
                      type="button"
                      onClick={() => setActiveTool('eraser')}
                      className={`h-8 rounded-shape-xs text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeTool === 'eraser'
                          ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] shadow-2xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-card)]'
                      }`}
                    >
                      <Sparkles size={13} />
                      <span>{isAr ? 'تفعيل الممحاة' : 'Eraser Tool'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTool('select')}
                      className={`h-8 rounded-shape-xs text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeTool === 'select'
                          ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] shadow-2xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-card)]'
                      }`}
                    >
                      <MousePointer size={13} />
                      <span>{isAr ? 'أداة التحديد' : 'Select Tool'}</span>
                    </button>
                  </div>

                  {/* Brush Size Slider */}
                  <div className="space-y-2 p-3 bg-[var(--surface-subtle)] rounded-shape-sm border border-[var(--border-default)]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[var(--text-primary)]">
                        {isAr ? 'قطر الممحاة (Brush Size):' : 'Eraser Diameter:'}
                      </span>
                      <span className="font-mono font-bold text-[var(--fg-accent)] text-xs">
                        {eraserBrushSize} px
                      </span>
                    </div>

                    <input
                      type="range"
                      min="8"
                      max="120"
                      value={eraserBrushSize}
                      onChange={(e) => setEraserBrushSize(parseInt(e.target.value) || 28)}
                      className="w-full h-1.5 bg-[var(--surface-inset)] rounded-full appearance-none cursor-pointer accent-[var(--fg-accent)]"
                    />

                    {/* Live Size Preview Circle */}
                    <div className="h-16 flex items-center justify-center bg-[var(--surface-card)] rounded-shape-xs border border-[var(--border-default)] overflow-hidden">
                      <div
                        style={{ width: `${eraserBrushSize}px`, height: `${eraserBrushSize}px` }}
                        className="rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center shadow-xs transition-all duration-75"
                      >
                        <span className="text-[8.5px] font-mono font-bold text-rose-500">
                          {eraserBrushSize}
                        </span>
                      </div>
                    </div>

                    {/* Quick Size Presets */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      {[14, 28, 48, 80].map(sz => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setEraserBrushSize(sz)}
                          className={`py-1 rounded-shape-xs border text-[10px] font-mono font-bold cursor-pointer transition-all ${
                            eraserBrushSize === sz
                              ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] border-transparent'
                              : 'bg-[var(--surface-card)] hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)]'
                          }`}
                        >
                          {sz}px
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Erase Actions */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] block">
                      {isAr ? 'إجراءات محو سريعة:' : 'Quick Eraser Actions:'}
                    </span>

                    {/* Erase currently selected element */}
                    {selectedElement && (
                      <button
                        type="button"
                        onClick={() => {
                          recordHistory();
                          setElements(prev => prev.filter(el => el.id !== selectedElement.id));
                          setSelectedId(null);
                          toast.success(isAr ? '✨ تم محو العنصر المحدد سحرياً' : 'Magic erased selected element');
                        }}
                        className="w-full h-8.5 rounded-shape-sm bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
                      >
                        <Trash2 size={13} />
                        <span>{isAr ? `محو "${selectedElement.name || 'العنصر المحدد'}" فوراً` : 'Erase Selected Element'}</span>
                      </button>
                    )}

                    {/* Replace Background Button */}
                    <button
                      type="button"
                      onClick={() => setIsReplaceBgModalOpen(true)}
                      className="w-full h-8.5 rounded-shape-sm bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] hover:border-[var(--border-accent)] text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
                    >
                      <Palette size={13} className="text-[var(--fg-accent)]" />
                      <span>{isAr ? 'استبدال خلفية التصميم...' : 'Replace Background...'}</span>
                    </button>

                    {/* Clear Drawings Button */}
                    {elements.filter(el => el.type === 'draw').length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          recordHistory();
                          setElements(prev => prev.filter(el => el.type !== 'draw'));
                          toast.success(isAr ? 'تم مسح كافة الرسومات اليدوية' : 'Cleared drawings');
                        }}
                        className="w-full h-8 rounded-shape-sm bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-secondary)] transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Trash2 size={12} />
                        <span>{isAr ? 'مسح كافة الرسومات اليدوية' : 'Clear Freehand Drawings'}</span>
                      </button>
                    )}
                  </div>

                  {/* Pro Tip Box */}
                  <div className="p-2.5 rounded-shape-xs bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[10.5px] text-[var(--text-muted)] space-y-1">
                    <span className="font-bold text-[var(--text-primary)] block">
                      {isAr ? 'إرشادات الحصول على أفضل رتوش:' : 'Pro Inpainting Tip:'}
                    </span>
                    <p className="leading-relaxed">
                      {isAr
                        ? 'اختر حجماً للممحاة يغطي الكائن بقليل مع هوامشه الخارجية، وسيتم تعويض البكسلات المفقودة تلقائياً من الألوان المحيطة بنعومة فائقة.'
                        : 'Choose an eraser size slightly larger than the object. Pixels will be smoothly diffused from surrounding areas.'}
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 1: TEXT TOOLS */}
              {activeSidebarTab === 'text' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {isAr ? 'انقر لإدراج نمط نص جاهز:' : 'Click to insert text block:'}
                  </p>

                  <button
                    type="button"
                    onClick={() => handleAddTextElement('h1')}
                    className="w-full py-2.5 px-3 rounded-shape-sm bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] hover:border-[var(--border-accent)] text-start font-bold text-sm text-[var(--text-primary)] transition-all cursor-pointer flex items-center justify-between shadow-2xs active:scale-[0.99]"
                  >
                    <span>{isAr ? 'إضافة عنوان رئيسي (H1)' : 'Add a heading'}</span>
                    <Type size={16} className="text-[var(--fg-accent)]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddTextElement('h2')}
                    className="w-full py-2 px-3 rounded-shape-sm bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] hover:border-[var(--border-accent)] text-start font-semibold text-xs text-[var(--text-secondary)] transition-all cursor-pointer flex items-center justify-between shadow-2xs active:scale-[0.99]"
                  >
                    <span>{isAr ? 'إضافة عنوان فرعي (H2)' : 'Add a subheading'}</span>
                    <Type size={14} className="text-[var(--text-muted)]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddTextElement('body')}
                    className="w-full py-2 px-3 rounded-shape-sm bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] hover:border-[var(--border-accent)] text-start text-[11px] text-[var(--text-muted)] transition-all cursor-pointer flex items-center justify-between shadow-2xs active:scale-[0.99]"
                  >
                    <span>{isAr ? 'إضافة نص تفصيلي' : 'Add a body text'}</span>
                    <Type size={12} className="text-[var(--text-muted)]" />
                  </button>

                  {/* Typography Preset Packs (Font Pairings) */}
                  <div className="pt-2 border-t border-[var(--border-main)] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[var(--text-secondary)]">
                        {isAr ? 'حزم وتنسيقات نصوص جاهزة (Typography):' : 'Typography Packs:'}
                      </span>
                    </div>

                    {/* Typo Category Filter Chips */}
                    <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 text-[9.5px]">
                      {[
                        { id: 'all', label: isAr ? 'الكل' : 'All' },
                        { id: 'offers', label: isAr ? 'عروض وتخفيضات' : 'Offers' },
                        { id: 'modern', label: isAr ? 'أعمال وتقنية' : 'Business' },
                        { id: 'social', label: isAr ? 'مناسبات وزفاف' : 'Events' },
                        { id: 'quotes', label: isAr ? 'حكم واقتباسات' : 'Quotes' },
                        { id: 'news', label: isAr ? 'أخبار عاجلة' : 'News' }
                      ].map(tc => (
                        <button
                          key={tc.id}
                          type="button"
                          onClick={() => setSelectedTypoCategory(tc.id as any)}
                          className={`px-2 py-0.5 rounded-shape-full font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                            selectedTypoCategory === tc.id
                              ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)]'
                              : 'bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {tc.label}
                        </button>
                      ))}
                    </div>

                    {/* Typo Presets Grid */}
                    <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar p-0.5">
                      {RATAQ_TYPOGRAPHY
                        .filter(tp => selectedTypoCategory === 'all' || tp.category === selectedTypoCategory)
                        .map(preset => (
                          <div
                            key={preset.id}
                            onClick={() => handleLoadTypographyPreset(preset)}
                            className="p-2.5 rounded-shape-sm bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] hover:border-[var(--border-accent)] cursor-pointer transition-all shadow-2xs group text-start"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-[var(--fg-accent)] group-hover:underline">
                                {isAr ? preset.titleAr : preset.titleEn}
                              </span>
                              <span className="text-[9px] font-mono text-[var(--text-muted)] px-1 rounded-shape-xs bg-[var(--surface-inset)]">
                                {preset.elements.length} {isAr ? 'طبقات' : 'layers'}
                              </span>
                            </div>
                            <div className="text-xs font-extrabold text-[var(--text-primary)] truncate font-sans py-0.5">
                              {preset.previewText}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Preset Text Badges */}
                  <div className="pt-2 border-t border-[var(--border-main)] space-y-2">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] block">
                      {isAr ? 'شارات ونصوص احترافية سريعة:' : 'Preset Text Badges:'}
                    </span>
                    <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto custom-scrollbar p-0.5">
                      {[
                        { label: 'شركة فيرال لينك اب', sub: 'VIRAL LINK UP', color: '#38bdf8', bg: 'rgba(15,23,42,0.9)', font: 'Cairo, sans-serif', size: 28, stroke: '#0284c7', strokeW: 1 },
                        { label: 'عرض خاص ومحدود', sub: 'SPECIAL OFFER', color: '#ef4444', bg: '#000000', font: 'Tajawal, sans-serif', size: 26, stroke: '#f59e0b', strokeW: 1 },
                        { label: 'خصم 50%', sub: '50% DISCOUNT', color: '#f59e0b', bg: '#000000', font: 'Tajawal, sans-serif', size: 26 },
                        { label: 'PERPLEXTA PRO', sub: 'STUDIO SUITE', color: '#38bdf8', bg: 'rgba(15,23,42,0.85)', font: 'Inter, sans-serif', size: 28, stroke: '#ffffff', strokeW: 1 },
                        { label: 'Just Keep Trying', sub: 'NEVER GIVE UP', color: '#fbbf24', bg: 'rgba(93, 53, 176, 0.85)', font: 'Playfair Display, serif', size: 26 },
                        { label: 'See The Good', sub: 'POSITIVE VIBES', color: '#a78bfa', bg: 'rgba(15,23,42,0.9)', font: 'Playfair Display, serif', size: 26 },
                        { label: 'Save The Date', sub: 'WEDDING INVITATION', color: '#fcd34d', bg: 'rgba(88, 28, 135, 0.85)', font: 'Amiri, serif', size: 28 },
                        { label: 'End of Season Sale', sub: 'BIGGEST DISCOUNTS', color: '#ec4899', bg: '#000000', font: 'Inter, sans-serif', size: 24 },
                        { label: 'صنع بريادة وإتقان', sub: 'CRAFTED WITH PRIDE', color: '#10b981', bg: 'rgba(6, 78, 59, 0.9)', font: 'Cairo, sans-serif', size: 24 },
                        { label: 'حصري ومميز VIP', sub: 'VIP EXCLUSIVE', color: '#10b981', bg: '#000000', font: 'Tajawal, sans-serif', size: 24 }
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            recordHistory();
                            const newId = `badge-${Date.now()}-${idx}`;
                            const newEl: CanvasElement = {
                              id: newId,
                              type: 'text',
                              name: preset.label,
                              x: (imageSize.width - 260) / 2 || 100,
                              y: 60 + (idx % 4) * 45,
                              w: 260,
                              h: 45,
                              text: preset.label,
                              color: preset.color,
                              strokeWidth: 0,
                              textStrokeColor: preset.stroke,
                              textStrokeWidth: preset.strokeW,
                              fontSize: preset.size || 26,
                              fontFamily: preset.font || 'Tajawal, sans-serif',
                              fontWeight: 'bold',
                              textAlign: 'center',
                              textBgColor: preset.bg,
                              textBgPadding: 10,
                              textBgCornerRadius: 8,
                              textShadow: true,
                              shadowColor: 'rgba(0,0,0,0.85)',
                              shadowBlur: 10
                            };
                            setElements(prev => [...prev, newEl]);
                            setSelectedId(newId);
                            setActiveTool('select');
                          }}
                          className="p-2.5 rounded-shape-sm bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] hover:border-[var(--border-accent)] text-start transition-all cursor-pointer shadow-2xs"
                        >
                          <div className="text-[11px] font-bold text-[var(--text-primary)] truncate" style={{ color: preset.color }}>
                            {preset.label}
                          </div>
                          {preset.sub && (
                            <div className="text-[9px] font-mono text-[var(--text-muted)] truncate mt-0.5">
                              {preset.sub}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SHAPES & ELEMENTS */}
              {activeSidebarTab === 'shapes' && (
                <div className="space-y-3">
                  {/* Search Shapes & Vectors Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      value={shapeSearchQuery}
                      onChange={e => setShapeSearchQuery(e.target.value)}
                      placeholder={isAr ? 'بحث في العناصر والرموز والأشكال...' : 'Search elements, shapes & icons...'}
                      className="w-full h-8 ps-7 pe-7 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-shape-xs text-xs font-medium placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--fg-accent)]"
                    />
                    <Shapes size={13} className="absolute start-2 top-2.5 text-[var(--text-muted)] pointer-events-none" />
                    {shapeSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setShapeSearchQuery('')}
                        className="absolute end-2 top-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <p className="text-[10px] text-[var(--text-muted)]">
                    {isAr ? 'أشكال أساسية قابلة للرسم والتعديل:' : 'Basic editable canvas shapes:'}
                  </p>

                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTool('rect');
                      }}
                      className="p-2 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] flex flex-col items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Square size={18} className="text-[var(--fg-accent)]" />
                      <span className="text-[9.5px] font-bold">{isAr ? 'مستطيل' : 'Rect'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTool('circle');
                      }}
                      className="p-2 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] flex flex-col items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Circle size={18} className="text-[var(--fg-success)]" />
                      <span className="text-[9.5px] font-bold">{isAr ? 'دائرة' : 'Circle'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTool('arrow');
                      }}
                      className="p-2 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] flex flex-col items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ArrowUpRight size={18} className="text-amber-500" />
                      <span className="text-[9.5px] font-bold">{isAr ? 'سهم' : 'Arrow'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTool('star');
                      }}
                      className="p-2 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] flex flex-col items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Star size={18} className="text-yellow-400" />
                      <span className="text-[9.5px] font-bold">{isAr ? 'نجمة' : 'Star'}</span>
                    </button>
                  </div>

                  {/* RATAQ Vector SVG Shapes Grid */}
                  <div className="pt-2 border-t border-[var(--border-main)] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[var(--text-secondary)]">
                        {isAr ? 'مكتبة الرموز والفيكتور (Elements Library):' : 'Vector Symbols & Elements:'}
                      </span>
                    </div>

                    {/* Shape Category Filters */}
                    <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 text-[9.5px]">
                      {[
                        { id: 'all', label: isAr ? 'الكل' : 'All' },
                        { id: 'geometry', label: isAr ? 'هندسة' : 'Geometry' },
                        { id: 'lines', label: isAr ? 'خطوط وأسهم' : 'Lines' },
                        { id: 'badges', label: isAr ? 'شارات وأختام' : 'Badges' },
                        { id: 'social', label: isAr ? 'سوشيال ويب' : 'Social' },
                        { id: 'commerce', label: isAr ? 'متجر وتسوق' : 'Store' },
                        { id: 'nature', label: isAr ? 'طبيعة وعناصر' : 'Nature' }
                      ].map(sc => (
                        <button
                          key={sc.id}
                          type="button"
                          onClick={() => setSelectedShapeCategory(sc.id as any)}
                          className={`px-2 py-0.5 rounded-shape-full font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                            selectedShapeCategory === sc.id
                              ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)]'
                              : 'bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {sc.label}
                        </button>
                      ))}
                    </div>

                    {/* Shapes Grid with Search Filtering */}
                    <div className="grid grid-cols-4 gap-1.5 max-h-[260px] overflow-y-auto custom-scrollbar p-0.5">
                      {RATAQ_SHAPES
                        .filter(s => {
                          const matchesCat = selectedShapeCategory === 'all' || s.category === selectedShapeCategory;
                          const q = shapeSearchQuery.trim().toLowerCase();
                          const matchesSearch = !q || s.nameAr.toLowerCase().includes(q) || s.nameEn.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
                          return matchesCat && matchesSearch;
                        })
                        .map((shape) => (
                          <button
                            key={shape.id}
                            type="button"
                            onClick={() => handleAddSvgShape(shape)}
                            className="p-2 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] hover:border-[var(--border-accent)] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group shadow-2xs"
                            title={isAr ? shape.nameAr : shape.nameEn}
                          >
                            <svg 
                              viewBox={shape.viewBox || '0 0 24 24'} 
                              className="w-6 h-6 text-[var(--fg-accent)] group-hover:scale-110 transition-transform fill-current"
                            >
                              <path d={shape.svgPath} />
                            </svg>
                            <span className="text-[8px] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-primary)] truncate max-w-full">
                              {isAr ? shape.nameAr : shape.nameEn}
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Active Shape Color & Stroke */}
                  <div className="pt-2 border-t border-[var(--border-main)] space-y-2">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)] block">
                      {isAr ? 'لون وسُمك الأشكال:' : 'Shape Color & Stroke:'}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {presetColors.map(col => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setActiveColor(col)}
                          className={`w-6 h-6 rounded-full border border-[var(--border-default)] cursor-pointer transition-transform flex items-center justify-center ${
                            activeColor === col ? 'scale-110 ring-2 ring-[var(--fg-accent)]' : ''
                          }`}
                          style={{ backgroundColor: col }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: BACKGROUNDS & WALLPAPERS (مكتبة الخلفيات الضخمة والمتطورة) */}
              {activeSidebarTab === 'background' && (
                <div className="flex flex-col h-full min-h-0 overflow-hidden">
                  {/* Sticky Header: Search Bar & Categories Navigation */}
                  <div className="p-3 border-b border-[var(--border-main)] bg-[var(--surface-card)] space-y-2.5 shrink-0">
                    {/* Search Input */}
                    <div className="relative">
                      <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                      <input
                        type="text"
                        value={bgSearchQuery}
                        onChange={(e) => setBgSearchQuery(e.target.value)}
                        placeholder={isAr ? 'بحث في مكتبة الخلفيات (ذكاء اصطناعي، رخام، تكنولوجيا...)' : 'Search backgrounds (AI, marble, tech, gradients)...'}
                        className="w-full h-8 ps-8 pe-7 bg-[var(--surface-subtle)] border border-[var(--border-default)] focus:border-[var(--border-accent)] rounded-shape-xs text-xs font-bold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:font-normal outline-none transition-all"
                      />
                      {bgSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setBgSearchQuery('')}
                          className="absolute end-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Horizontal Category Scroll Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-[11px] font-bold">
                      {[
                        { id: 'all', labelAr: 'الكل', labelEn: 'All' },
                        { id: 'trending', labelAr: 'الرائج', labelEn: 'Trending' },
                        { id: 'ai', labelAr: 'ذكاء اصطناعي', labelEn: 'AI & Future' },
                        { id: 'tech', labelAr: 'تكنولوجيا', labelEn: 'Technology' },
                        { id: 'wallpaper', labelAr: 'ورق حائط', labelEn: 'Wallpapers' },
                        { id: 'texture', labelAr: 'خامات وملمس', labelEn: 'Textures' },
                        { id: 'abstract', labelAr: 'تجريدي', labelEn: '3D Abstract' },
                        { id: 'nature', labelAr: 'طبيعة وفضاء', labelEn: 'Nature & Space' },
                        { id: 'luxury', labelAr: 'فخامة وذهب', labelEn: 'Luxury & Gold' },
                        { id: 'gradient', labelAr: 'تدرجات لونية', labelEn: 'Gradients' },
                        { id: 'solid', labelAr: 'ألوان سادة', labelEn: 'Solid Colors' }
                      ].map((cat) => {
                        const isCatActive = selectedBgCat === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedBgCat(cat.id as any)}
                            className={`px-2.5 py-1 rounded-shape-xs whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center gap-1 font-bold ${
                              isCatActive
                                ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] shadow-2xs font-extrabold'
                                : 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-card)] border border-[var(--border-default)]'
                            }`}
                          >
                            <span>{isAr ? cat.labelAr : cat.labelEn}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Quick Background Actions & Upload */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-[var(--border-main)]">
                      <button
                        type="button"
                        onClick={handleUploadNewBackground}
                        className="h-7.5 px-2 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] hover:border-[var(--border-accent)] text-[10.5px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-95"
                      >
                        <UploadCloud size={13} className="text-[var(--fg-accent)]" />
                        <span>{isAr ? 'رفع خلفية خاصة' : 'Upload Bg'}</span>
                      </button>

                      {selectedElement && (selectedElement.type === 'sticker' || selectedElement.imgSrc) ? (
                        <button
                          type="button"
                          onClick={() => handleSetImageAsBackground(selectedElement)}
                          className="h-7.5 px-2 rounded-shape-xs bg-[var(--bg-accent-muted)] hover:bg-[var(--fg-accent)] text-[var(--fg-accent)] hover:text-white border border-[var(--border-accent)]/40 text-[10.5px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs active:scale-95 truncate"
                        >
                          <ImageIcon size={12} />
                          <span className="truncate">{isAr ? 'تعيين العنصر المحدد' : 'Set Active'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            // Reset canvas background to clean white
                            recordHistory();
                            const canvas = document.createElement('canvas');
                            canvas.width = imageSize.width || 1080;
                            canvas.height = imageSize.height || 1080;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                              ctx.fillStyle = '#ffffff';
                              ctx.fillRect(0, 0, canvas.width, canvas.height);
                              const dataUrl = canvas.toDataURL('image/png');
                              const newImg = new Image();
                              newImg.src = dataUrl;
                              newImg.onload = () => {
                                imageRef.current = newImg;
                                setPages(prev => prev.map((p, pIdx) => pIdx === currentPageIndex ? { ...p, bgImgSrc: dataUrl } : p));
                                drawCanvas();
                              };
                            }
                          }}
                          className="h-7.5 px-2 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] text-[10.5px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-95"
                        >
                          <RefreshCw size={12} />
                          <span>{isAr ? 'إعادة ضبط بيضاء' : 'Reset White'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scrollable Backgrounds Catalog Grid */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 min-h-0">
                    {/* Backgrounds Items List */}
                    {(() => {
                      const filteredBgList = STUDIO_BACKGROUNDS.filter(bg => {
                        const matchesCat = 
                          selectedBgCat === 'all' ? true :
                          selectedBgCat === 'trending' ? (bg.isTrending || bg.category === 'ai' || bg.category === 'wallpaper') :
                          bg.category === selectedBgCat;

                        const q = bgSearchQuery.trim().toLowerCase();
                        const matchesQuery = !q || 
                          bg.titleAr.toLowerCase().includes(q) || 
                          bg.titleEn.toLowerCase().includes(q) ||
                          (bg.tags && bg.tags.some(t => t.toLowerCase().includes(q)));

                        return matchesCat && matchesQuery;
                      });

                      if (filteredBgList.length === 0) {
                        return (
                          <div className="py-12 flex flex-col items-center justify-center text-center text-[var(--text-muted)] space-y-2">
                            <Palette size={32} className="opacity-30 stroke-1" />
                            <p className="text-xs font-bold">{isAr ? 'لا توجد خلفيات مطابقة للبحث' : 'No backgrounds matching search'}</p>
                            <button
                              type="button"
                              onClick={() => {
                                setBgSearchQuery('');
                                setSelectedBgCat('all');
                              }}
                              className="text-[11px] font-bold text-[var(--fg-accent)] hover:underline cursor-pointer"
                            >
                              {isAr ? 'إعادة عرض كافة الخلفيات' : 'Show all backgrounds'}
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-2 gap-2.5">
                          {filteredBgList.map((bg) => {
                            const isGradient = bg.type === 'gradient';
                            const isColor = bg.type === 'color';
                            const isImageOrTexture = bg.type === 'image' || bg.type === 'texture';

                            return (
                              <div
                                key={bg.id}
                                className="group relative rounded-shape-sm border border-[var(--border-default)] hover:border-[var(--border-accent)] bg-[var(--surface-subtle)] overflow-hidden transition-all duration-200 hover:shadow-md flex flex-col text-start cursor-pointer"
                                onClick={() => handleApplyBackground(bg, false)}
                              >
                                {/* Thumbnail / Visual Canvas Preview */}
                                <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/5 flex items-center justify-center">
                                  {isImageOrTexture && (
                                    <img
                                      src={bg.previewBg}
                                      alt={isAr ? bg.titleAr : bg.titleEn}
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                      loading="lazy"
                                    />
                                  )}
                                  {isGradient && (
                                    <div
                                      className="w-full h-full transition-transform duration-300 group-hover:scale-105"
                                      style={{ background: bg.value }}
                                    />
                                  )}
                                  {isColor && (
                                    <div
                                      className="w-full h-full border border-black/5"
                                      style={{ backgroundColor: bg.value }}
                                    />
                                  )}

                                  {/* Badge Indicator */}
                                  {bg.isTrending && (
                                    <span className="absolute top-1.5 start-1.5 px-1.5 py-0.5 rounded-shape-xs bg-amber-500/90 backdrop-blur-xs text-white font-bold text-[9px] shadow-xs tracking-wider">
                                      {isAr ? 'رائج' : 'TRENDING'}
                                    </span>
                                  )}

                                  {bg.category === 'ai' && !bg.isTrending && (
                                    <span className="absolute top-1.5 start-1.5 px-1.5 py-0.5 rounded-shape-xs bg-indigo-600/90 backdrop-blur-xs text-white font-bold text-[9px] shadow-xs tracking-wider">
                                      AI
                                    </span>
                                  )}

                                  {bg.category === 'luxury' && (
                                    <span className="absolute top-1.5 start-1.5 px-1.5 py-0.5 rounded-shape-xs bg-amber-700/90 backdrop-blur-xs text-amber-100 font-bold text-[9px] shadow-xs tracking-wider">
                                      VIP
                                    </span>
                                  )}

                                  {/* Hover Overlay with Quick Action Buttons */}
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1.5 p-2 backdrop-blur-[2px]">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleApplyBackground(bg, false);
                                      }}
                                      className="w-full py-1 px-2 rounded-shape-xs bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] font-bold text-[10px] shadow-sm hover:brightness-110 active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <Check size={11} />
                                      <span>{isAr ? 'تعيين كخلفية' : 'Set as Bg'}</span>
                                    </button>

                                    {isImageOrTexture && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleApplyBackground(bg, true);
                                        }}
                                        className="w-full py-1 px-2 rounded-shape-xs bg-white/20 hover:bg-white/30 text-white border border-white/30 font-bold text-[10px] shadow-sm active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                                      >
                                        <Plus size={11} />
                                        <span>{isAr ? '+ كطبقة' : '+ As Layer'}</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Title & Category Footer */}
                                <div className="p-2 flex flex-col justify-between flex-1 bg-[var(--surface-card)]">
                                  <span className="text-[11px] font-bold text-[var(--text-primary)] line-clamp-1 leading-tight">
                                    {isAr ? bg.titleAr : bg.titleEn}
                                  </span>
                                  <div className="flex items-center justify-between mt-1 text-[9.5px] text-[var(--text-muted)]">
                                    <span className="capitalize font-mono">
                                      {bg.category}
                                    </span>
                                    <span className="font-bold text-[var(--fg-accent)]">
                                      {isGradient ? 'GRADIENT' : isColor ? 'SOLID' : 'HD 4K'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* TAB 3: BRUSH & FREEHAND */}
              {activeSidebarTab === 'brush' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-secondary)] block">
                      {isAr ? 'نمط الفرشاة:' : 'Brush Mode:'}
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setBrushMode('pen')}
                        className={`p-2 rounded-shape-xs border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          brushMode === 'pen' ? 'bg-[var(--bg-accent-muted)] text-[var(--fg-accent)] border-[var(--border-accent)]' : 'bg-[var(--surface-subtle)] border-[var(--border-default)] text-[var(--text-muted)]'
                        }`}
                      >
                        <Edit3 size={15} />
                        <span className="text-[10px]">{isAr ? 'قلم' : 'Pen'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBrushMode('highlighter')}
                        className={`p-2 rounded-shape-xs border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          brushMode === 'highlighter' ? 'bg-[var(--bg-accent-muted)] text-[var(--fg-accent)] border-[var(--border-accent)]' : 'bg-[var(--surface-subtle)] border-[var(--border-default)] text-[var(--text-muted)]'
                        }`}
                      >
                        <Highlighter size={15} />
                        <span className="text-[10px]">{isAr ? 'فسفوري' : 'Highlighter'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBrushMode('marker')}
                        className={`p-2 rounded-shape-xs border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          brushMode === 'marker' ? 'bg-[var(--bg-accent-muted)] text-[var(--fg-accent)] border-[var(--border-accent)]' : 'bg-[var(--surface-subtle)] border-[var(--border-default)] text-[var(--text-muted)]'
                        }`}
                      >
                        <Edit3 size={15} className="stroke-[3px]" />
                        <span className="text-[10px]">{isAr ? 'ماركر' : 'Marker'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Size Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                      <span>{isAr ? 'حجم رأس الفرشاة:' : 'Brush Size:'}</span>
                      <span className="font-mono font-bold">{strokeWidth}px</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="32"
                      value={strokeWidth}
                      onChange={e => setStrokeWidth(parseInt(e.target.value))}
                      className="w-full h-1 bg-[var(--surface-subtle)] rounded-shape-full appearance-none cursor-pointer accent-[var(--fg-accent)]"
                    />
                  </div>

                  {/* Color Palette */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[var(--text-secondary)] block">
                      {isAr ? 'لون الفرشاة:' : 'Brush Color:'}
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {presetColors.map(col => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setActiveColor(col)}
                          className={`w-6 h-6 rounded-full border border-[var(--border-default)] cursor-pointer transition-transform flex items-center justify-center ${
                            activeColor === col ? 'scale-110 ring-2 ring-[var(--fg-accent)]' : ''
                          }`}
                          style={{ backgroundColor: col }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: FILTERS & COLOR GRADING */}
              {activeSidebarTab === 'filters' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {isAr ? 'المعايرة والتحريك الاحترافي:' : 'Grading & Professional Animation:'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        recordHistory();
                        setFilters(DEFAULT_FILTERS);
                      }}
                      className="text-[10px] font-bold text-[var(--fg-accent)] hover:underline cursor-pointer"
                    >
                      {isAr ? 'إعادة ضبط' : 'Reset'}
                    </button>
                  </div>



                  {/* Standard Filters */}
                  <div className="space-y-3.5">

                  {/* Brightness */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
                      <span>{isAr ? 'السطوع' : 'Brightness'}</span>
                      <span className="font-mono font-bold">{filters.brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="180"
                      value={filters.brightness}
                      onChange={e => setFilters(prev => ({ ...prev, brightness: parseInt(e.target.value) }))}
                      className="w-full h-1 bg-[var(--surface-subtle)] rounded-shape-full appearance-none cursor-pointer accent-[var(--fg-accent)]"
                    />
                  </div>

                  {/* Contrast */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
                      <span>{isAr ? 'التباين' : 'Contrast'}</span>
                      <span className="font-mono font-bold">{filters.contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="180"
                      value={filters.contrast}
                      onChange={e => setFilters(prev => ({ ...prev, contrast: parseInt(e.target.value) }))}
                      className="w-full h-1 bg-[var(--surface-subtle)] rounded-shape-full appearance-none cursor-pointer accent-[var(--fg-accent)]"
                    />
                  </div>

                  {/* Saturation */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
                      <span>{isAr ? 'تشبع الألوان' : 'Saturation'}</span>
                      <span className="font-mono font-bold">{filters.saturation}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={filters.saturation}
                      onChange={e => setFilters(prev => ({ ...prev, saturation: parseInt(e.target.value) }))}
                      className="w-full h-1 bg-[var(--surface-subtle)] rounded-shape-full appearance-none cursor-pointer accent-[var(--fg-accent)]"
                    />
                  </div>

                  {/* Blur */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
                      <span>{isAr ? 'التمويه / النعومة' : 'Blur'}</span>
                      <span className="font-mono font-bold">{filters.blur}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="12"
                      value={filters.blur}
                      onChange={e => setFilters(prev => ({ ...prev, blur: parseInt(e.target.value) }))}
                      className="w-full h-1 bg-[var(--surface-subtle)] rounded-shape-full appearance-none cursor-pointer accent-[var(--fg-accent)]"
                    />
                  </div>

                  {/* Grayscale */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
                      <span>{isAr ? 'أبيض وأسود' : 'Grayscale'}</span>
                      <span className="font-mono font-bold">{filters.grayscale}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filters.grayscale}
                      onChange={e => setFilters(prev => ({ ...prev, grayscale: parseInt(e.target.value) }))}
                      className="w-full h-1 bg-[var(--surface-subtle)] rounded-shape-full appearance-none cursor-pointer accent-[var(--fg-accent)]"
                    />
                  </div>

                  {/* Sepia */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
                      <span>{isAr ? 'سيبيا / عتيق' : 'Sepia'}</span>
                      <span className="font-mono font-bold">{filters.sepia}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filters.sepia}
                      onChange={e => setFilters(prev => ({ ...prev, sepia: parseInt(e.target.value) }))}
                      className="w-full h-1 bg-[var(--surface-subtle)] rounded-shape-full appearance-none cursor-pointer accent-[var(--fg-accent)]"
                    />
                  </div>
                </div> {/* Closing space-y-3.5 */}
              </div>
            )}

              {/* TAB 5: LAYERS TREE */}
              {activeSidebarTab === 'layers' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {isAr ? `الطبقات (${elements.length}):` : `Layers (${elements.length}):`}
                    </span>
                  </div>

                  {elements.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[var(--text-muted)] rounded-shape-sm border border-dashed border-[var(--border-default)]">
                      {isAr ? 'لا توجد طبقات مضافة بعد. أضف نصوصاً أو أشكالاً للبدء.' : 'No layers added yet. Add text or shapes to start.'}
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[380px] overflow-y-auto custom-scrollbar">
                      {[...elements].reverse().map((el) => (
                        <div
                          key={el.id}
                          onClick={() => {
                            setSelectedId(el.id);
                            setActiveTool('select');
                          }}
                          className={`p-2 rounded-shape-sm border flex items-center justify-between text-xs transition-colors cursor-pointer ${
                            selectedId === el.id
                              ? 'bg-[var(--bg-accent-muted)] border-[var(--border-accent)] text-[var(--fg-accent)] font-bold shadow-2xs'
                              : 'bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border-[var(--border-default)] text-[var(--text-secondary)]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {el.type === 'text' && <Type size={13} className="shrink-0 text-[var(--fg-accent)]" />}
                            {el.type === 'rect' && <Square size={13} className="shrink-0 text-blue-400" />}
                            {el.type === 'circle' && <Circle size={13} className="shrink-0 text-[var(--fg-success)]" />}
                            {el.type === 'arrow' && <ArrowUpRight size={13} className="shrink-0 text-amber-400" />}
                            {el.type === 'star' && <Star size={13} className="shrink-0 text-yellow-400" />}
                            {el.type === 'draw' && <Edit3 size={13} className="shrink-0 text-pink-400" />}
                            {el.type === 'sticker' && <ImageIcon size={13} className="shrink-0 text-purple-400" />}
                            <span className="truncate max-w-[120px]">
                              {el.text || el.name || el.type}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Visibility Toggle */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setElements(prev => prev.map(item => item.id === el.id ? { ...item, hidden: !item.hidden } : item));
                              }}
                              className="p-1 hover:text-[var(--text-primary)] text-[var(--text-muted)] cursor-pointer"
                              title={el.hidden ? (isAr ? 'إظهار' : 'Show') : (isAr ? 'إخفاء' : 'Hide')}
                            >
                              {el.hidden ? <EyeOff size={12} className="text-rose-400" /> : <Eye size={12} />}
                            </button>

                            {/* Lock Toggle */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setElements(prev => prev.map(item => item.id === el.id ? { ...item, locked: !item.locked } : item));
                              }}
                              className="p-1 hover:text-[var(--text-primary)] text-[var(--text-muted)] cursor-pointer"
                              title={el.locked ? (isAr ? 'إلغاء القفل' : 'Unlock') : (isAr ? 'قفل' : 'Lock')}
                            >
                              {el.locked ? <Lock size={12} className="text-amber-400" /> : <Unlock size={12} />}
                            </button>

                            {/* Delete Layer */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                recordHistory();
                                setElements(prev => prev.filter(item => item.id !== el.id));
                                if (selectedId === el.id) setSelectedId(null);
                              }}
                              className="p-1 hover:text-rose-500 text-[var(--text-muted)] cursor-pointer"
                              title={isAr ? 'حذف الطبقة' : 'Delete layer'}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: STICKERS & IMAGE OVERLAYS */}
              {activeSidebarTab === 'stickers' && (
                <div className="space-y-3.5">
                  <button
                    type="button"
                    onClick={handleUploadOverlay}
                    className="w-full py-3 px-3 rounded-shape-sm bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border-2 border-dashed border-[var(--border-accent)] hover:border-[var(--fg-accent)] text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 shadow-2xs"
                  >
                    <Upload size={18} className="text-[var(--fg-accent)]" />
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {isAr ? 'رفع صورة أو شعار (PNG/JPG)' : 'Upload Custom Image/Logo'}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {isAr ? 'ستتم إضافتها كطبقة فوق التصميم' : 'Will be added as layer'}
                    </span>
                  </button>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[var(--text-secondary)] block">
                      {isAr ? 'شارات وملصقات سريعة:' : 'Quick Badges:'}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { title: isAr ? 'علامة التميز والجودة' : 'Gold Star Quality', text: 'FIVE STAR QUALITY' },
                        { title: isAr ? 'موثق ومعتمد رسمي' : 'Verified Brand', text: 'OFFICIALLY VERIFIED' },
                        { title: isAr ? 'شحن وتوصيل سريع' : 'Fast Shipping', text: 'FAST EXPRESS SHIPPING' },
                        { title: isAr ? 'ضمان رسمي 100%' : '100% Guarantee', text: '100% OFFICIAL GUARANTEE' }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            recordHistory();
                            const newId = `sticker-badge-${Date.now()}`;
                            const newEl: CanvasElement = {
                              id: newId,
                              type: 'text',
                              name: item.title,
                              x: (imageSize.width - 240) / 2 || 100,
                              y: 100 + idx * 35,
                              w: 240,
                              h: 40,
                              text: item.text,
                              color: '#ffffff',
                              strokeWidth: 0,
                              fontSize: 22,
                              fontFamily: 'Tajawal, sans-serif',
                              fontWeight: 'bold',
                              textAlign: 'center',
                              textBgColor: 'rgba(0,0,0,0.85)',
                              textShadow: true
                            };
                            setElements(prev => [...prev, newEl]);
                            setSelectedId(newId);
                            setActiveTool('select');
                          }}
                          className="p-2.5 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] text-xs font-bold text-center transition-colors cursor-pointer truncate"
                        >
                          {item.title}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Main Canvas Viewport Area */}
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
          
          {/* Permanent Fixed-Height Top Sub-Toolbar (Dedicated Design Header - الهيدر المخصص للتصميم) */}
          <div className="h-11 bg-[var(--surface-card)] border-b border-[var(--border-main)] px-3 flex items-center justify-between shrink-0 z-20 overflow-x-auto custom-scrollbar select-none text-xs gap-2.5">
            {/* Undo / Redo in Dedicated Design Header (زر الرجوع والتقدم للتصميم) */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-8 px-0.5 flex items-center gap-0.5 bg-[var(--surface-subtle)] rounded-shape-xs border border-[var(--border-default)] shadow-2xs">
                <button
                  type="button"
                  disabled={undoStack.length === 0}
                  onClick={handleUndo}
                  className="touch-target-44 w-7 h-7 rounded-shape-xs flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--surface-card)] transition-colors cursor-pointer"
                  title={isAr ? 'تراجع (Ctrl+Z)' : 'Undo (Ctrl+Z)'}
                >
                  <Undo2 size={13} />
                </button>
                <button
                  type="button"
                  disabled={redoStack.length === 0}
                  onClick={handleRedo}
                  className="touch-target-44 w-7 h-7 rounded-shape-xs flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--surface-card)] transition-colors cursor-pointer"
                  title={isAr ? 'إعادة (Ctrl+Y)' : 'Redo (Ctrl+Y)'}
                >
                  <Redo2 size={13} />
                </button>
              </div>
              <div className="w-px h-5 bg-[var(--border-default)] shrink-0 hidden sm:block" />
            </div>

            {selectedElement ? (
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                {/* Text Properties */}
                {selectedElement.type === 'text' && (
                  <>
                    {/* Font Family Button (Connected to Fonts Sidebar) */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSidebarTab('fonts');
                        setIsSidebarOpen(true);
                      }}
                      className="h-8 px-2.5 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-inset)] border border-[var(--border-default)] hover:border-[var(--accent)] text-xs font-bold text-[var(--text-primary)] flex items-center justify-between gap-2 shrink-0 cursor-pointer transition-colors shadow-2xs group min-w-[140px] max-w-[200px]"
                      title={isAr ? 'فتح شريط الخطوط وتغيير نوع الخط' : 'Open Fonts Sidebar to change font'}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <Type size={13} className="text-[var(--accent)] shrink-0" />
                        <span 
                          className="truncate text-[11px]" 
                          style={{ fontFamily: selectedElement.fontFamily || 'Tajawal, sans-serif' }}
                        >
                          {availableFontOptions.find(f => f.value === selectedElement.fontFamily)?.label?.replace(/✨\s*/, '') || selectedElement.fontFamily?.split(',')[0]?.replace(/['"]/g, '') || 'Tajawal'}
                        </span>
                      </div>
                      <ChevronDown size={12} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] shrink-0 transition-transform group-hover:translate-y-0.5" />
                    </button>

                    {/* Font Size with Calibrated Resizing */}
                    <div className="flex items-center gap-1 shrink-0 bg-[var(--surface-subtle)] p-0.5 px-1.5 rounded-shape-xs border border-[var(--border-default)]">
                      <span className="text-[10px] text-[var(--text-muted)]">{isAr ? 'الحجم:' : 'Size:'}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateTextFontSize((selectedElement.fontSize || 32) - 2)}
                        className="w-5 h-5 rounded-shape-xs bg-[var(--surface-card)] hover:bg-[var(--surface-inset)] border border-[var(--border-default)] flex items-center justify-center text-xs font-bold cursor-pointer text-[var(--text-primary)]"
                        title={isAr ? 'تصغير الخط' : 'Decrease font size'}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={selectedElement.fontSize || 32}
                        onChange={e => handleUpdateTextFontSize(parseInt(e.target.value) || 32)}
                        className="w-10 h-5 px-0.5 text-center bg-[var(--surface-card)] border border-[var(--border-default)] rounded-shape-xs text-xs font-bold text-[var(--text-primary)]"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateTextFontSize((selectedElement.fontSize || 32) + 2)}
                        className="w-5 h-5 rounded-shape-xs bg-[var(--surface-card)] hover:bg-[var(--surface-inset)] border border-[var(--border-default)] flex items-center justify-center text-xs font-bold cursor-pointer text-[var(--text-primary)]"
                        title={isAr ? 'تكبير الخط' : 'Increase font size'}
                      >
                        +
                      </button>
                    </div>

                    {/* Color */}
                    <div className="flex items-center gap-1.5 shrink-0 bg-[var(--surface-subtle)] p-0.5 px-1.5 rounded-shape-xs border border-[var(--border-default)]">
                      <span className="text-[10px] text-[var(--text-muted)]">{isAr ? 'اللون:' : 'Color:'}</span>
                      <input
                        type="color"
                        value={selectedElement.color || '#ffffff'}
                        onFocus={() => recordHistory()}
                        onChange={e => {
                          setElements(prev => prev.map(el => el.id === selectedId ? { ...el, color: e.target.value } : el));
                        }}
                        className="w-5 h-5 rounded-shape-xs border border-black/20 p-0 cursor-pointer"
                      />
                    </div>

                    {/* Formatting Toggles: Bold, Italic, Underline, Uppercase */}
                    <div className="flex items-center gap-0.5 p-0.5 bg-[var(--surface-subtle)] rounded-shape-xs border border-[var(--border-default)] shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          recordHistory();
                          const nextWeight = selectedElement.fontWeight === 'bold' ? 'normal' : 'bold';
                          setElements(prev => prev.map(el => el.id === selectedId ? { ...el, fontWeight: nextWeight } : el));
                        }}
                        className={`px-2 h-6 rounded-shape-xs font-bold text-[11px] cursor-pointer transition-colors ${
                          selectedElement.fontWeight === 'bold' ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                        title={isAr ? 'عريض' : 'Bold'}
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          recordHistory();
                          const nextStyle = selectedElement.fontStyle === 'italic' ? 'normal' : 'italic';
                          setElements(prev => prev.map(el => el.id === selectedId ? { ...el, fontStyle: nextStyle } : el));
                        }}
                        className={`px-2 h-6 rounded-shape-xs italic text-[11px] font-serif cursor-pointer transition-colors ${
                          selectedElement.fontStyle === 'italic' ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                        title={isAr ? 'مائل' : 'Italic'}
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          recordHistory();
                          setElements(prev => prev.map(el => el.id === selectedId ? { ...el, textUnderline: !el.textUnderline } : el));
                        }}
                        className={`px-2 h-6 rounded-shape-xs underline text-[11px] font-bold cursor-pointer transition-colors ${
                          selectedElement.textUnderline ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                        title={isAr ? 'تسطير' : 'Underline'}
                      >
                        U
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          recordHistory();
                          setElements(prev => prev.map(el => el.id === selectedId ? { ...el, textUppercase: !el.textUppercase } : el));
                        }}
                        className={`px-1.5 h-6 rounded-shape-xs text-[10px] font-bold cursor-pointer transition-colors ${
                          selectedElement.textUppercase ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                        title={isAr ? 'أحرف كبيرة' : 'Uppercase'}
                      >
                        TT
                      </button>
                    </div>

                    {/* Alignment with Clean Icons */}
                    <div className="flex items-center gap-0.5 p-0.5 bg-[var(--surface-subtle)] rounded-shape-xs border border-[var(--border-default)] shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          recordHistory();
                          setElements(prev => prev.map(el => el.id === selectedId ? { ...el, textAlign: 'right' } : el));
                        }}
                        className={`p-1 h-6 w-6 rounded-shape-xs flex items-center justify-center cursor-pointer transition-colors ${
                          (selectedElement.textAlign || 'center') === 'right' ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                        title={isAr ? 'محاذاة لليمين' : 'Align Right'}
                      >
                        <AlignRight size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          recordHistory();
                          setElements(prev => prev.map(el => el.id === selectedId ? { ...el, textAlign: 'center' } : el));
                        }}
                        className={`p-1 h-6 w-6 rounded-shape-xs flex items-center justify-center cursor-pointer transition-colors ${
                          (selectedElement.textAlign || 'center') === 'center' ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                        title={isAr ? 'توسيط' : 'Align Center'}
                      >
                        <AlignCenter size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          recordHistory();
                          setElements(prev => prev.map(el => el.id === selectedId ? { ...el, textAlign: 'left' } : el));
                        }}
                        className={`p-1 h-6 w-6 rounded-shape-xs flex items-center justify-center cursor-pointer transition-colors ${
                          (selectedElement.textAlign || 'center') === 'left' ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                        title={isAr ? 'محاذاة لليسار' : 'Align Left'}
                      >
                        <AlignLeft size={13} />
                      </button>
                    </div>

                    {/* Text Outline / Stroke */}
                    <div className="flex items-center gap-1 shrink-0 bg-[var(--surface-subtle)] p-0.5 px-1.5 rounded-shape-xs border border-[var(--border-default)]">
                      <span className="text-[10px] text-[var(--text-muted)]">{isAr ? 'الحدود:' : 'Stroke:'}</span>
                      <input
                        type="color"
                        value={selectedElement.textStrokeColor || '#000000'}
                        onFocus={() => recordHistory()}
                        onChange={e => {
                          setElements(prev => prev.map(el => el.id === selectedId ? { ...el, textStrokeColor: e.target.value } : el));
                        }}
                        className="w-4 h-4 border-0 p-0 rounded-shape-xs cursor-pointer"
                      />
                      <input
                        type="number"
                        min="0"
                        max="15"
                        value={selectedElement.textStrokeWidth || 0}
                        onFocus={() => recordHistory()}
                        onChange={e => {
                          const val = Math.max(0, Math.min(parseInt(e.target.value) || 0, 15));
                          setElements(prev => prev.map(el => el.id === selectedId ? { ...el, textStrokeWidth: val } : el));
                        }}
                        className="w-8 h-5 px-0.5 text-center bg-[var(--surface-card)] border border-[var(--border-default)] rounded-shape-xs text-[10px] font-bold"
                      />
                    </div>

                    {/* Text Background Box */}
                    <div className="flex items-center gap-1 shrink-0 bg-[var(--surface-subtle)] p-0.5 px-1.5 rounded-shape-xs border border-[var(--border-default)]">
                      <span className="text-[10px] text-[var(--text-muted)]">{isAr ? 'الخلفية:' : 'BG:'}</span>
                      <input
                        type="color"
                        value={selectedElement.textBgColor && selectedElement.textBgColor !== 'transparent' ? selectedElement.textBgColor : '#000000'}
                        onFocus={() => recordHistory()}
                        onChange={e => {
                          setElements(prev => prev.map(el => el.id === selectedId ? { ...el, textBgColor: e.target.value } : el));
                        }}
                        className="w-4 h-4 border-0 p-0 rounded-shape-xs cursor-pointer"
                      />
                      {selectedElement.textBgColor && selectedElement.textBgColor !== 'transparent' && (
                        <button
                          type="button"
                          onClick={() => {
                            recordHistory();
                            setElements(prev => prev.map(el => el.id === selectedId ? { ...el, textBgColor: 'transparent' } : el));
                          }}
                          className="text-[9px] font-bold text-rose-400 hover:text-rose-500 cursor-pointer"
                          title={isAr ? 'إزالة الخلفية' : 'Remove BG'}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Curved Text Arc Slider */}
                    <div className="flex items-center gap-1 shrink-0 bg-[var(--surface-subtle)] p-0.5 px-1.5 rounded-shape-xs border border-[var(--border-default)]">
                      <span className="text-[10px] text-[var(--text-muted)]">{isAr ? 'انحناء:' : 'Curve:'}</span>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={selectedElement.textCurve || 0}
                        onPointerDown={() => recordHistory()}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          setElements(prev => prev.map(el => el.id === selectedId ? { ...el, textCurve: val } : el));
                        }}
                        className="w-14 h-1 bg-[var(--surface-inset)] rounded-shape-full appearance-none cursor-pointer accent-[var(--fg-accent)]"
                      />
                      <span className="text-[9px] font-mono text-[var(--text-muted)] w-5 text-center">
                        {selectedElement.textCurve || 0}
                      </span>
                    </div>
                  </>
                )}

                {/* Shape Color Properties */}
                {['rect', 'circle', 'arrow', 'star'].includes(selectedElement.type) && (
                  <>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-[var(--text-muted)]">{isAr ? 'اللون:' : 'Color:'}</span>
                      <input
                        type="color"
                        value={selectedElement.color || '#ef4444'}
                        onFocus={() => recordHistory()}
                        onChange={e => {
                          setElements(prev => prev.map(el => el.id === selectedId ? { ...el, color: e.target.value, strokeColor: e.target.value } : el));
                        }}
                        className="w-5 h-5 rounded-shape-xs border-0 p-0 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-[var(--text-muted)]">{isAr ? 'السمك:' : 'Stroke:'}</span>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={selectedElement.strokeWidth || 4}
                        onFocus={() => recordHistory()}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          setElements(prev => prev.map(el => el.id === selectedId ? { ...el, strokeWidth: val } : el));
                        }}
                        className="w-12 h-6 px-1 text-center bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-shape-xs text-xs font-bold"
                      />
                    </div>
                  </>
                )}

                {/* Image / Sticker Element Properties */}
                {(selectedElement.type === 'sticker' || selectedElement.imgSrc) && (
                  <>
                    {/* Replace Background with this Image button */}
                    <button
                      type="button"
                      onClick={() => handleSetImageAsBackground(selectedElement)}
                      className="h-7 px-2.5 rounded-shape-xs bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] hover:opacity-90 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
                      title={isAr ? 'تعيين هذه الصورة كخلفية لمساحة العمل' : 'Set as Canvas Background'}
                    >
                      <ImageIcon size={12} />
                      <span>{isAr ? 'استبدال الخلفية بهذه الصورة' : 'Set as Background'}</span>
                    </button>

                    {/* Replace Background Options modal button */}
                    <button
                      type="button"
                      onClick={() => setIsReplaceBgModalOpen(true)}
                      className="h-7 px-2 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                      title={isAr ? 'خيارات استبدال الخلفية' : 'Background Options'}
                    >
                      <Palette size={12} />
                      <span className="hidden sm:inline">{isAr ? 'خيارات الخلفية' : 'Bg Options'}</span>
                    </button>

                    {/* Magic Eraser button */}
                    <button
                      type="button"
                      onClick={() => {
                        recordHistory();
                        setElements(prev => prev.filter(el => el.id !== selectedElement.id));
                        setSelectedId(null);
                        toast.success(isAr ? '✨ تم محو العنصر سحرياً بنجاح' : 'Magic erased element!');
                      }}
                      className="h-7 px-2 rounded-shape-xs bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                      title={isAr ? 'محو سحري للعنصر' : 'Magic Erase Element'}
                    >
                      <Sparkles size={12} />
                      <span>{isAr ? 'محو سحري' : 'Magic Erase'}</span>
                    </button>

                    {/* Opacity slider */}
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-[var(--text-muted)]">{isAr ? 'الشفافية:' : 'Opacity:'}</span>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={Math.round((selectedElement.opacity !== undefined ? selectedElement.opacity : 1) * 100)}
                        onChange={e => {
                          const val = (parseInt(e.target.value) || 100) / 100;
                          setElements(prev => prev.map(el => el.id === selectedId ? { ...el, opacity: val } : el));
                        }}
                        className="w-14 h-1 bg-[var(--surface-inset)] rounded-shape-full appearance-none cursor-pointer accent-[var(--fg-accent)]"
                      />
                      <span className="text-[9px] font-mono text-[var(--text-muted)] w-6 text-center">
                        {Math.round((selectedElement.opacity !== undefined ? selectedElement.opacity : 1) * 100)}%
                      </span>
                    </div>
                  </>
                )}

                {/* Photo Container Frame Properties */}
                {selectedElement.type === 'frame' && (
                  <>
                    {/* Add / Replace Photo in Frame */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSidebarOpen(true);
                        setActiveSidebarTab('photos');
                        toast.info(isAr ? 'اختر أي صورة من المكتبة لإدراجها داخل الإطار المختار' : 'Select any stock photo or upload to insert into frame');
                      }}
                      className="h-7 px-2.5 rounded-shape-xs bg-[var(--accent)] text-white hover:opacity-90 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
                      title={isAr ? 'إدراج أو استبدال الصورة داخل الإطار' : 'Insert / Replace Image in Frame'}
                    >
                      <ImageIcon size={12} />
                      <span>{selectedElement.frameImgSrc ? (isAr ? 'استبدال صورة الإطار' : 'Replace Photo') : (isAr ? '+ إدراج صورة للإطار' : '+ Insert Photo')}</span>
                    </button>

                    {/* Frame Photo Zoom Scale Slider */}
                    {selectedElement.frameImgSrc && (
                      <div className="flex items-center gap-1 shrink-0 bg-[var(--surface-subtle)] px-2 py-0.5 rounded-shape-xs border border-[var(--border-default)]">
                        <span className="text-[10px] font-bold text-[var(--text-secondary)]">{isAr ? 'تكبير الصورة:' : 'Zoom:'}</span>
                        <input
                          type="range"
                          min="50"
                          max="250"
                          value={Math.round((selectedElement.frameImgScale || 1) * 100)}
                          onChange={e => {
                            const val = (parseInt(e.target.value) || 100) / 100;
                            setElements(prev => prev.map(el => el.id === selectedId ? { ...el, frameImgScale: val } : el));
                          }}
                          className="w-16 h-1 bg-[var(--surface-inset)] rounded-shape-full appearance-none cursor-pointer accent-[var(--fg-accent)]"
                        />
                        <span className="text-[9px] font-mono font-bold text-[var(--text-muted)] w-8 text-center">
                          {Math.round((selectedElement.frameImgScale || 1) * 100)}%
                        </span>
                      </div>
                    )}

                    {/* Frame Border Color */}
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-[var(--text-muted)]">{isAr ? 'لون الإطار:' : 'Border Color:'}</span>
                      <input
                        type="color"
                        value={selectedElement.frameBorderColor || selectedElement.color || '#6366f1'}
                        onFocus={() => recordHistory()}
                        onChange={e => {
                          setElements(prev => prev.map(el => el.id === selectedId ? { ...el, frameBorderColor: e.target.value, color: e.target.value } : el));
                        }}
                        className="w-5 h-5 rounded-shape-xs border-0 p-0 cursor-pointer"
                      />
                    </div>

                    {/* Frame Border Width */}
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-[var(--text-muted)]">{isAr ? 'السُمك:' : 'Width:'}</span>
                      <input
                        type="number"
                        min="0"
                        max="24"
                        value={selectedElement.frameBorderWidth !== undefined ? selectedElement.frameBorderWidth : 3}
                        onFocus={() => recordHistory()}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          setElements(prev => prev.map(el => el.id === selectedId ? { ...el, frameBorderWidth: val } : el));
                        }}
                        className="w-10 h-6 px-1 text-center bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-shape-xs text-xs font-bold"
                      />
                    </div>

                    {/* Clear Frame Image */}
                    {selectedElement.frameImgSrc && (
                      <button
                        type="button"
                        onClick={() => {
                          recordHistory();
                          const updated = elements.map(el => el.id === selectedId ? { ...el, frameImgSrc: undefined, frameImgElement: undefined } : el);
                          setElements(updated);
                          flushSaveSession({ customElements: updated });
                          toast.success(isAr ? 'تم تفريغ الصورة من الإطار' : 'Cleared image from frame');
                        }}
                        className="h-7 px-2 rounded-shape-xs bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                        title={isAr ? 'إزالة الصورة وإبقاء الإطار فارغاً' : 'Clear Photo'}
                      >
                        <Trash2 size={12} />
                        <span>{isAr ? 'تفريغ الإطار' : 'Clear Photo'}</span>
                      </button>
                    )}
                  </>
                )}

                <div className="ms-auto flex items-center gap-1 shrink-0">
                  {/* Duplicate Element */}
                  <button
                    type="button"
                    onClick={() => {
                      recordHistory();
                      const newId = `${selectedElement.type}-${Date.now()}`;
                      const clone = {
                        ...selectedElement,
                        id: newId,
                        x: selectedElement.x + 20,
                        y: selectedElement.y + 20
                      };
                      setElements(prev => [...prev, clone]);
                      setSelectedId(newId);
                    }}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    title={isAr ? 'تكرار العنصر' : 'Duplicate'}
                  >
                    <Copy size={13} />
                  </button>

                  {/* Delete Element */}
                  <button
                    type="button"
                    onClick={() => {
                      recordHistory();
                      setElements(prev => prev.filter(el => el.id !== selectedId));
                      setSelectedId(null);
                    }}
                    className="p-1 text-rose-500 hover:text-rose-400 cursor-pointer"
                    title={isAr ? 'حذف العنصر' : 'Delete'}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ) : (
              /* Global Studio Canvas Bar (Displayed when no element is selected) */
              <div className="flex items-center justify-between flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Quick Add Headline Text */}
                  <button
                    type="button"
                    onClick={() => handleAddTextElement('h1')}
                    className="h-8 px-3 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] hover:border-[var(--border-accent)] text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
                    title={isAr ? 'إدراج عنوان رئيسي بإطار دقيق' : 'Add Headline'}
                  >
                    <Type size={14} className="text-[var(--fg-accent)]" />
                    <span>{isAr ? '+ عنوان رئيسي' : '+ Headline'}</span>
                  </button>

                  {/* Quick Add Subheading */}
                  <button
                    type="button"
                    onClick={() => handleAddTextElement('h2')}
                    className="h-8 px-2.5 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] hover:border-[var(--border-accent)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hidden sm:flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
                    title={isAr ? 'إدراج عنوان فرعي' : 'Add Subheading'}
                  >
                    <Type size={13} className="text-[var(--text-muted)]" />
                    <span>{isAr ? '+ عنوان فرعي' : '+ Subtitle'}</span>
                  </button>

                  {/* Quick Add Body Text */}
                  <button
                    type="button"
                    onClick={() => handleAddTextElement('body')}
                    className="h-8 px-2.5 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] hover:border-[var(--border-accent)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hidden md:flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
                    title={isAr ? 'إدراج فقرة نصية' : 'Add Body Text'}
                  >
                    <Type size={12} className="text-[var(--text-muted)]" />
                    <span>{isAr ? '+ نص فقرة' : '+ Body'}</span>
                  </button>
                </div>

                {/* Right / End info: Layer counter badge */}
                <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                  <span className="px-2.5 py-1 rounded-shape-xs bg-[var(--surface-subtle)] border border-[var(--border-default)] font-mono text-[10px] font-bold text-[var(--text-secondary)] flex items-center gap-1.5 shadow-2xs">
                    <Layers size={11} className="text-[var(--fg-accent)]" />
                    <span>{elements.length} {isAr ? 'عناصر / طبقات' : 'layers'}</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Pan & Zoom Vertical Scrollable Canvas Stage Viewport (Multi-Page Stage) */}
          <div 
            ref={containerRef}
            className="flex-1 relative bg-[var(--surface-inset)] overflow-auto min-w-0 custom-scrollbar p-4 md:p-8 flex flex-col items-center select-none"
          >
            {!imageLoaded && (
              <div className="flex flex-col items-center gap-3 text-[var(--text-muted)] animate-pulse m-auto">
                <RefreshCw className="animate-spin text-[var(--fg-accent)]" size={26} />
                <span className="text-xs font-bold">{isAr ? 'جاري تحميل لوحة التصميم...' : 'Loading Visual Design Stage...'}</span>
              </div>
            )}

            {imageLoaded && (
              <div className="w-fit min-w-full flex flex-col items-center justify-center gap-12 py-6 m-auto min-h-full">
                {pages.map((pageItem, pageIdx) => {
                  const isActive = pageIdx === currentPageIndex;

                  return (
                    <div 
                      key={pageItem.id}
                      id={`page-stage-card-${pageIdx}`}
                      className={`flex flex-col items-center relative ${isActive ? 'z-10' : 'z-0'}`}
                      onClick={() => {
                        if (!isActive) handleSwitchPage(pageIdx, false);
                      }}
                    >
                      {/* On-Canvas Header Toolbar for this Page */}
                      <div 
                        className={`w-full max-w-full h-9 mb-2.5 bg-[var(--surface-card)] border rounded-shape-xs px-3 flex items-center justify-between gap-2 shadow-md text-xs font-bold select-none text-[var(--text-primary)] pointer-events-auto transition-colors ${
                          isActive 
                            ? 'border-[var(--fg-accent)] ring-2 ring-[var(--fg-accent)]/20 shadow-lg' 
                            : 'border-[var(--border-default)] opacity-90 hover:opacity-100'
                        }`}
                        style={{ width: `${(imageSize.width || 800) * zoom}px` }}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {studioMode === 'video' ? (
                          <>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-[var(--accent)] animate-pulse" />
                              <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                                🎬 {isAr 
                                  ? `المشهد ${activeSceneIndex + 1} من ${videoScenes.length}` 
                                  : `Scene ${activeSceneIndex + 1} of ${videoScenes.length}`}
                              </span>
                              <span className="px-1.5 py-0.5 text-[9px] font-black rounded-shape-xs bg-[var(--accent)] text-slate-950 shrink-0">
                                {videoScenes[activeSceneIndex]?.durationSeconds || 5}s
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Scene Background Color Picker */}
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-shape-xs bg-[var(--surface-subtle)] border border-[var(--border-default)]">
                                <Palette size={13} className="text-[var(--text-secondary)]" />
                                <input
                                  type="color"
                                  value={videoScenes[activeSceneIndex]?.backgroundColor || '#090d16'}
                                  onChange={(e) => {
                                    const col = e.target.value;
                                    imageRef.current = null;
                                    setVideoScenes(prev => {
                                      const updated = [...prev];
                                      if (updated[activeSceneIndex]) {
                                        updated[activeSceneIndex] = {
                                          ...updated[activeSceneIndex],
                                          backgroundColor: col,
                                          backgroundImage: undefined,
                                          bgImgSrc: undefined
                                        };
                                      }
                                      return updated;
                                    });
                                    drawCanvas();
                                  }}
                                  className="w-4 h-4 rounded-full border-0 cursor-pointer bg-transparent"
                                  title={isAr ? 'تغيير لون خلفية المشهد' : 'Change Scene Color'}
                                />
                              </div>

                              {/* Single Unified Professional Add Media Button */}
                              <label className="px-3 py-1 rounded-shape-xs bg-[var(--accent)] text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs hover:brightness-110 active:scale-95">
                                <Plus size={13} className="stroke-[3]" />
                                <ImageIcon size={13} />
                                <span>{isAr ? 'إضافة ميديا' : 'Add Media'}</span>
                                <input
                                  type="file"
                                  accept="image/*,video/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (ev) => {
                                        if (ev.target?.result) {
                                          const mediaUrl = ev.target.result as string;
                                          const img = new Image();
                                          img.src = mediaUrl;
                                          img.onload = () => {
                                            imageRef.current = img;
                                            setVideoScenes(prev => {
                                              const updated = [...prev];
                                              if (updated[activeSceneIndex]) {
                                                updated[activeSceneIndex] = {
                                                  ...updated[activeSceneIndex],
                                                  backgroundImage: mediaUrl,
                                                  bgImgSrc: mediaUrl
                                                };
                                              }
                                              return updated;
                                            });
                                            drawCanvas();
                                            toast.success(isAr ? `تم رفع الميديا للمشهد ${activeSceneIndex + 1} بنجاح` : `Media added to scene ${activeSceneIndex + 1}`);
                                          };
                                          img.onerror = () => {
                                            setVideoScenes(prev => {
                                              const updated = [...prev];
                                              if (updated[activeSceneIndex]) {
                                                updated[activeSceneIndex] = {
                                                  ...updated[activeSceneIndex],
                                                  backgroundImage: mediaUrl,
                                                  bgImgSrc: mediaUrl
                                                };
                                              }
                                              return updated;
                                            });
                                            toast.success(isAr ? `تم رفع الميديا للمشهد ${activeSceneIndex + 1} بنجاح` : `Media added to scene ${activeSceneIndex + 1}`);
                                          };
                                        }
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isActive ? 'bg-[var(--fg-accent)] animate-pulse' : 'bg-slate-400'}`} />
                              <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                                {isAr 
                                  ? `صفحة ${pageIdx + 1} من ${pages.length}: ${pageItem.title || ''}` 
                                  : `Page ${pageIdx + 1} of ${pages.length}: ${pageItem.title || ''}`}
                              </span>
                              {isActive && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-shape-xs bg-[var(--fg-accent)] text-white shrink-0">
                                  {isAr ? 'نشطة' : 'Active'}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {/* Move Up */}
                              <button
                                type="button"
                                onClick={() => handleMovePage(pageIdx, 'up')}
                                disabled={pageIdx === 0}
                                className="p-1 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                                title={isAr ? 'نقل للأعلى' : 'Move Up'}
                              >
                                <ChevronUp size={13} />
                              </button>

                              {/* Move Down */}
                              <button
                                type="button"
                                onClick={() => handleMovePage(pageIdx, 'down')}
                                disabled={pageIdx === pages.length - 1}
                                className="p-1 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                                title={isAr ? 'نقل للأسفل' : 'Move Down'}
                              >
                                <ChevronDown size={13} />
                              </button>

                              <div className="w-px h-3.5 bg-[var(--border-default)] mx-0.5" />

                              {/* Duplicate Page */}
                              <button
                                type="button"
                                onClick={() => handleDuplicatePage(pageIdx)}
                                className="px-2 py-1 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                title={isAr ? 'تكرار الصفحة' : 'Duplicate'}
                              >
                                <Copy size={11} />
                                <span className="hidden sm:inline">{isAr ? 'تكرار' : 'Copy'}</span>
                              </button>

                              {/* Delete Page */}
                              {pages.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeletePage(pageIdx)}
                                  className="px-2 py-1 rounded-shape-xs bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  title={isAr ? 'حذف الصفحة' : 'Delete'}
                                >
                                  <Trash2 size={11} />
                                  <span className="hidden sm:inline">{isAr ? 'حذف' : 'Delete'}</span>
                                </button>
                              )}

                              {/* Add Page Below */}
                              <button
                                type="button"
                                onClick={handleAddPage}
                                className="px-2.5 py-1 rounded-shape-xs bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs ms-1"
                                title={isAr ? 'إضافة صفحة جديدة أسفل هذه الصفحة' : 'Add New Page Below'}
                              >
                                <Plus size={11} />
                                <span>{isAr ? 'صفحة جديدة' : 'Add Page'}</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Page Canvas Frame */}
                      <div
                        style={{
                          width: `${(imageSize.width || 800) * zoom}px`,
                          height: `${(imageSize.height || 800) * zoom}px`
                        }}
                        className={`relative rounded-shape-xs overflow-hidden shadow-2xl transition-colors ${
                          isActive 
                            ? 'ring-2 ring-[var(--fg-accent)] ring-offset-2 ring-offset-[var(--surface-inset)]' 
                            : 'border border-[var(--border-default)] hover:border-[var(--fg-accent)]/80 cursor-pointer group'
                        }`}
                      >
                        {isActive ? (
                          /* Interactive Active Page Canvas */
                          <div
                            style={{
                              width: `${imageSize.width}px`,
                              height: `${imageSize.height}px`,
                              transform: `scale(${zoom})`,
                              transformOrigin: '0 0',
                              cursor: isPanning ? 'grabbing' : activeTool === 'select' ? 'default' : 'crosshair'
                            }}
                            className="absolute left-0 top-0 select-none"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={() => {
                              if (!activeResizeHandle && !dragStart && !cropDragStart && !isPanning && !isDrawing) {
                                handleMouseUp();
                              }
                            }}
                            onDoubleClick={handleDoubleClick}
                            onWheel={(e) => {
                              if (editingFrameId) {
                                e.preventDefault();
                                const delta = e.deltaY < 0 ? 0.05 : -0.05;
                                setElements(prev => prev.map(el => el.id === editingFrameId ? {
                                  ...el,
                                  frameImgScale: Math.max(0.3, Math.min(4, Number(((el.frameImgScale || 1) + delta).toFixed(2))))
                                } : el));
                              }
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'copy';
                              const canvas = canvasRef.current;
                              if (canvas) {
                                const rect = canvas.getBoundingClientRect();
                                const canvasX = (e.clientX - rect.left) / zoom;
                                const canvasY = (e.clientY - rect.top) / zoom;
                                const hitFrame = elements.slice().reverse().find(el => 
                                  el.type === 'frame' &&
                                  canvasX >= el.x && canvasX <= el.x + el.w &&
                                  canvasY >= el.y && canvasY <= el.y + el.h
                                );
                                setHoveredFrameId(hitFrame ? hitFrame.id : null);
                              }
                            }}
                            onDragLeave={() => setHoveredFrameId(null)}
                             onDrop={(e) => {
                              e.preventDefault();
                              setHoveredFrameId(null);
                              
                              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                const file = e.dataTransfer.files[0];
                                if (file.type.startsWith('image/')) {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    if (ev.target?.result) {
                                      processDroppedImage(ev.target.result as string, e.clientX, e.clientY);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                  return;
                                }
                              }

                              const plainData = e.dataTransfer.getData('text/plain');
                              if (plainData) {
                                try {
                                  const parsed = JSON.parse(plainData);
                                  if (parsed.type === 'element' && parsed.item) {
                                    const canvas = canvasRef.current;
                                    if (canvas) {
                                      const rect = canvas.getBoundingClientRect();
                                      const dropX = Math.round((e.clientX - rect.left) / zoom - 100);
                                      const dropY = Math.round((e.clientY - rect.top) / zoom - 100);
                                      handleApplyElement(parsed.item, dropX, dropY);
                                      return;
                                    }
                                  }
                                } catch {}
                                processDroppedImage(plainData, e.clientX, e.clientY);
                              }
                            }}
                          >
                            <canvas 
                              ref={canvasRef} 
                              className="block select-none pointer-events-auto rounded-shape-xs bg-[var(--surface-card)]"
                              style={{ imageRendering: 'auto' }}
                            />

                            {/* Seamless Inline Textarea for Direct In-Place Typing */}
                            {elements.map(el => {
                              if (el.type !== 'text' || editingTextId !== el.id) return null;
                              return (
                                <textarea
                                  key={`edit-${el.id}`}
                                  value={editingTextValue}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditingTextValue(val);
                                    const metrics = computeTextMetrics(
                                      val,
                                      el.fontFamily || 'Tajawal, sans-serif',
                                      el.fontSize || 32,
                                      el.fontWeight || 'bold',
                                      el.fontStyle || 'normal',
                                      el.w && el.w > 40 ? el.w - 12 : undefined,
                                      el.textLineHeight || 1.25,
                                      !!el.textUppercase
                                    );
                                    setElements(prev => prev.map(item => item.id === el.id ? {
                                      ...item,
                                      text: val,
                                      w: Math.max(item.w || 100, metrics.width + 16),
                                      h: Math.max(item.h || 36, metrics.height + 14)
                                    } : item));
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.ctrlKey) {
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  onBlur={() => {
                                    const metrics = computeTextMetrics(
                                      editingTextValue,
                                      el.fontFamily || 'Tajawal, sans-serif',
                                      el.fontSize || 32,
                                      el.fontWeight || 'bold',
                                      el.fontStyle || 'normal',
                                      el.w && el.w > 40 ? el.w - 12 : undefined,
                                      el.textLineHeight || 1.25,
                                      !!el.textUppercase
                                    );
                                    setElements(prev => prev.map(item => item.id === el.id ? {
                                      ...item,
                                      text: editingTextValue,
                                      w: Math.max(item.w || 100, metrics.width + 16),
                                      h: Math.max(item.h || 36, metrics.height + 14)
                                    } : item));
                                  }}
                                  autoFocus
                                  style={{
                                    position: 'absolute',
                                    left: `${el.x}px`,
                                    top: `${el.y}px`,
                                    width: `${Math.max(el.w || 120, 120)}px`,
                                    height: `${Math.max(el.h || 40, 40)}px`,
                                    transform: el.rotation ? `rotate(${el.rotation}deg)` : 'none',
                                    transformOrigin: 'center center',
                                    font: `${el.fontStyle || 'normal'} ${el.fontWeight || 'bold'} ${el.fontSize || 32}px ${el.fontFamily || 'Tajawal, sans-serif'}`,
                                    color: el.color,
                                    background: el.textBgColor && el.textBgColor !== 'transparent' ? el.textBgColor : 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    resize: 'none',
                                    overflow: 'hidden',
                                    whiteSpace: 'pre-wrap',
                                    padding: '4px 6px',
                                    lineHeight: `${(el.fontSize || 32) * (el.textLineHeight || 1.25)}px`,
                                    textAlign: el.textAlign || 'center',
                                    letterSpacing: el.textLetterSpacing ? `${el.textLetterSpacing}px` : undefined,
                                    zIndex: 42,
                                    borderRadius: '0px',
                                    boxShadow: 'none',
                                    caretColor: 'var(--fg-accent, #38bdf8)'
                                  }}
                                  className="custom-scrollbar text-[var(--text-primary)] placeholder-transparent select-text"
                                  placeholder=""
                                />
                              );
                            })}

                            {/* Floating Action Bar (Dynamic Visibility & Smart Boundary Clamping) */}
                            {selectedElement && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: (selectedElement.y || 0) < 65 
                                    ? `${(selectedElement.y || 0) + (selectedElement.h || 40) + 16}px`
                                    : `${Math.max(10, (selectedElement.y || 0) - 52)}px`,
                                  left: `${Math.max(120, Math.min((imageSize.width || 800) - 120, (selectedElement.x || 0) + (selectedElement.w || 120) / 2))}px`,
                                  transform: 'translateX(-50%)',
                                  zIndex: 55
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 p-1.5 bg-[var(--surface-card)] border border-[var(--border-accent)]/60 rounded-shape-full shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 select-none text-[var(--text-primary)] pointer-events-auto"
                              >
                                {/* Duplicate */}
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicateElement(selectedElement.id);
                                  }}
                                  className="w-8 h-8 rounded-shape-full bg-[var(--bg-accent-muted)] hover:bg-[var(--fg-accent)] text-[var(--fg-accent)] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-90"
                                  title={isAr ? 'مضاعفة / تكرار هذا العنصر (+)' : 'Duplicate this element (+)'}
                                >
                                  <Plus size={16} />
                                </button>

                                {/* Delete */}
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteElement(selectedElement.id);
                                  }}
                                  className="w-8 h-8 rounded-shape-full bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-90"
                                  title={isAr ? 'حذف هذا العنصر' : 'Delete Element'}
                                >
                                  <Trash2 size={15} />
                                </button>

                                <div className="w-px h-4 bg-[var(--border-default)] mx-0.5" />

                                {/* Frame Inner Photo Crop Toggle Button */}
                                {(selectedElement.type === 'frame' || selectedElement.frameShape) && selectedElement.frameImgSrc && (
                                  <>
                                    <button
                                      type="button"
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        recordHistory();
                                        if (editingFrameId === selectedElement.id) {
                                          setEditingFrameId(null);
                                          toast.success(isAr ? 'تم حفظ موضع الصورة داخل الإطار' : 'Frame photo position saved');
                                        } else {
                                          setEditingFrameId(selectedElement.id);
                                          toast.info(isAr ? 'نمط تعديل موضع وحجم الصورة: اسحب الصورة داخل الإطار للتحريك' : 'Drag photo inside frame to adjust position');
                                        }
                                      }}
                                      className={`px-3 py-1 rounded-shape-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                                        editingFrameId === selectedElement.id
                                          ? 'bg-emerald-500 text-white ring-2 ring-emerald-300'
                                          : 'bg-sky-600 hover:bg-sky-500 text-white'
                                      }`}
                                      title={isAr ? 'ضبط موضع وحجم الصورة داخل الإطار (أو دبل كليك)' : 'Adjust photo position inside frame'}
                                    >
                                      <Move size={14} />
                                      <span>{editingFrameId === selectedElement.id ? (isAr ? 'تم الضبط ✅' : 'Done') : (isAr ? 'ضبط موضع الصورة' : 'Crop Photo')}</span>
                                    </button>

                                    <div className="w-px h-4 bg-[var(--border-default)] mx-0.5" />
                                  </>
                                )}

                                {/* Text Specific Fast Controls */}
                                {selectedElement.type === 'text' && (
                                  <>
                                    <button
                                      type="button"
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        recordHistory();
                                        setEditingTextId(selectedElement.id);
                                        setEditingTextValue(selectedElement.text || '');
                                      }}
                                      className="w-8 h-8 rounded-shape-full hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                                      title={isAr ? 'تعديل هذا النص مباشرة' : 'Edit Text'}
                                    >
                                      <Edit3 size={15} />
                                    </button>

                                    <div className="w-px h-4 bg-[var(--border-default)] mx-0.5" />
                                  </>
                                )}


                                {/* Layer Order Popover */}
                                <div className="relative">
                                  <button
                                    type="button"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsFloatingLayerOpen(!isFloatingLayerOpen);
                                    }}
                                    className={`w-8 h-8 rounded-shape-full flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
                                      isFloatingLayerOpen 
                                        ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)]' 
                                        : 'hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                                    title={isAr ? 'ترتيب الطبقات والمحاذاة' : 'Layer Position & Align'}
                                  >
                                    <Layers size={15} />
                                  </button>

                                  {isFloatingLayerOpen && (
                                    <div 
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onClick={(e) => e.stopPropagation()}
                                      className={`absolute ${
                                        (selectedElement?.y || 0) < 240 ? 'top-full mt-2 origin-top' : 'bottom-full mb-2 origin-bottom'
                                      } start-1/2 -translate-x-1/2 w-48 p-1.5 rounded-shape-sm bg-[var(--surface-card)] border border-[var(--border-default)] shadow-2xl z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100`}
                                    >
                                      <button
                                        type="button"
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => { e.stopPropagation(); handleBringToFront(selectedElement.id); setIsFloatingLayerOpen(false); }}
                                        className="w-full px-2.5 py-1.5 rounded-shape-xs hover:bg-[var(--surface-subtle)] text-start text-xs font-semibold flex items-center justify-between cursor-pointer"
                                      >
                                        <span>{isAr ? 'إلى المقدمة' : 'Bring to Front'}</span>
                                        <ChevronsUp size={13} className="text-[var(--fg-accent)]" />
                                      </button>
                                      <button
                                        type="button"
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => { e.stopPropagation(); handleBringForward(selectedElement.id); setIsFloatingLayerOpen(false); }}
                                        className="w-full px-2.5 py-1.5 rounded-shape-xs hover:bg-[var(--surface-subtle)] text-start text-xs font-semibold flex items-center justify-between cursor-pointer"
                                      >
                                        <span>{isAr ? 'تقديم طبقة للأمام' : 'Bring Forward'}</span>
                                        <ChevronUp size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => { e.stopPropagation(); handleSendBackward(selectedElement.id); setIsFloatingLayerOpen(false); }}
                                        className="w-full px-2.5 py-1.5 rounded-shape-xs hover:bg-[var(--surface-subtle)] text-start text-xs font-semibold flex items-center justify-between cursor-pointer"
                                      >
                                        <span>{isAr ? 'تأخير طبقة للخلف' : 'Send Backward'}</span>
                                        <ChevronDown size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => { e.stopPropagation(); handleSendToBack(selectedElement.id); setIsFloatingLayerOpen(false); }}
                                        className="w-full px-2.5 py-1.5 rounded-shape-xs hover:bg-[var(--surface-subtle)] text-start text-xs font-semibold flex items-center justify-between cursor-pointer"
                                      >
                                        <span>{isAr ? 'إلى المؤخرة' : 'Send to Back'}</span>
                                        <ChevronsDown size={13} />
                                      </button>
                                      <div className="h-px bg-[var(--border-default)] my-0.5" />
                                      <button
                                        type="button"
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => { e.stopPropagation(); handleAlignElement(selectedElement.id, 'center-h'); setIsFloatingLayerOpen(false); }}
                                        className="w-full px-2.5 py-1.5 rounded-shape-xs hover:bg-[var(--surface-subtle)] text-start text-xs font-semibold flex items-center justify-between cursor-pointer"
                                      >
                                        <span>{isAr ? 'توسيط أفقي' : 'Center Horizontally'}</span>
                                        <Move size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => { e.stopPropagation(); handleAlignElement(selectedElement.id, 'center-v'); setIsFloatingLayerOpen(false); }}
                                        className="w-full px-2.5 py-1.5 rounded-shape-xs hover:bg-[var(--surface-subtle)] text-start text-xs font-semibold flex items-center justify-between cursor-pointer"
                                      >
                                        <span>{isAr ? 'توسيط رأسي' : 'Center Vertically'}</span>
                                        <Move size={12} />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Lock / Unlock */}
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleLock(selectedElement.id);
                                  }}
                                  className={`w-8 h-8 rounded-shape-full flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
                                    selectedElement.locked 
                                      ? 'bg-amber-500 text-white' 
                                      : 'hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                  }`}
                                  title={selectedElement.locked ? (isAr ? 'إلغاء قفل العنصر' : 'Unlock Element') : (isAr ? 'قفل العنصر لمنع التحريك' : 'Lock Element')}
                                >
                                  {selectedElement.locked ? <Lock size={14} /> : <Unlock size={14} />}
                                </button>

                                {/* Set as Background */}
                                {(selectedElement.type === 'sticker' || selectedElement.imgSrc) && (
                                  <>
                                    <div className="w-px h-4 bg-[var(--border-default)] mx-0.5" />
                                    <button
                                      type="button"
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSetImageAsBackground(selectedElement);
                                      }}
                                      className="w-8 h-8 rounded-shape-full bg-[var(--bg-accent-muted)] hover:bg-[var(--fg-accent)] text-[var(--fg-accent)] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-90"
                                      title={isAr ? 'استبدال خلفية التصميم بهذه الصورة' : 'Replace Background with this Image'}
                                    >
                                      <ImageIcon size={15} />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}

                             {/* Single Crisp Selection Frame & Multi-Direction Handles */}
                            {selectedElement && (() => {
                              const isFrameEl = selectedElement.type === 'frame' || Boolean(selectedElement.frameShape);
                              const frameShapeName = selectedElement.frameShape || 'circle';
                              const isCircleFrameShape = isFrameEl && ['circle', 'double_circle', 'gold_luxury', 'neon_cyber', 'dotted_circle', 'circle_3d'].includes(frameShapeName);
                              const isPillFrameShape = isFrameEl && frameShapeName === 'pill';
                              const isArchFrameShape = isFrameEl && frameShapeName === 'arch';
                              const isOvalFrameShape = isFrameEl && frameShapeName === 'oval';

                              let borderClasses = "border-2 border-[var(--fg-accent,#38bdf8)] rounded-xs select-none shadow-xs";
                              if (isFrameEl) {
                                if (isCircleFrameShape || isPillFrameShape || isOvalFrameShape) {
                                  borderClasses = "border-2 border-dashed border-[var(--fg-accent,#38bdf8)] rounded-full select-none shadow-xs";
                                } else if (isArchFrameShape) {
                                  borderClasses = "border-2 border-dashed border-[var(--fg-accent,#38bdf8)] rounded-t-full select-none shadow-xs";
                                } else {
                                  borderClasses = "border-2 border-dashed border-[var(--fg-accent,#38bdf8)] rounded-xs select-none shadow-xs";
                                }
                              }

                              return (
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: `${selectedElement.x}px`,
                                    top: `${selectedElement.y}px`,
                                    width: `${selectedElement.w || 100}px`,
                                    height: `${selectedElement.h || 40}px`,
                                    transform: selectedElement.rotation ? `rotate(${selectedElement.rotation}deg)` : 'none',
                                    transformOrigin: 'center center',
                                    zIndex: 40,
                                    pointerEvents: 'none'
                                  }}
                                  className={borderClasses}
                                >
                                  {/* Center Drag Trigger (Active when not typing inside text) */}
                                  {!selectedElement.locked && activeTool === 'select' && editingTextId !== selectedElement.id && (
                                    <div
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setActiveResizeHandle(null);
                                        const coords = getCanvasCoords(e.clientX, e.clientY);

                                        if ((selectedElement.type === 'frame' || selectedElement.frameShape) && selectedElement.frameImgSrc) {
                                          if (editingFrameId === selectedElement.id || e.detail === 2) {
                                            setEditingFrameId(selectedElement.id);
                                            setCropDragStart({
                                              x: coords.x,
                                              y: coords.y,
                                              initX: selectedElement.frameImgOffsetX || 0,
                                              initY: selectedElement.frameImgOffsetY || 0
                                            });
                                            return;
                                          }
                                        }

                                        setDragStart(coords);
                                        setElementStartPos({
                                          x: selectedElement.x,
                                          y: selectedElement.y,
                                          w: selectedElement.w || 100,
                                          h: selectedElement.h || 40,
                                          fontSize: selectedElement.fontSize || 32,
                                          rotation: selectedElement.rotation || 0
                                        });
                                      }}
                                      onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        if ((selectedElement.type === 'frame' || selectedElement.frameShape) && selectedElement.frameImgSrc) {
                                          setEditingFrameId(selectedElement.id);
                                          toast.info(isAr ? '✨ نمط تحريك الصورة: اسحب الصورة داخل الإطار لتعديل موضعها' : '✨ Photo move mode: Drag photo inside frame to position it');
                                        }
                                      }}
                                      className="absolute inset-0 pointer-events-auto cursor-move"
                                      title={
                                        (selectedElement.type === 'frame' || selectedElement.frameShape) && selectedElement.frameImgSrc
                                          ? (editingFrameId === selectedElement.id
                                              ? (isAr ? 'اسحب الصورة داخل الإطار لتعديل موضعها' : 'Drag photo inside frame')
                                              : (isAr ? 'انقر مرتين لقص وتحريك الصورة داخل الإطار، أو اسحب لنقل الإطار' : 'Double click to move photo inside frame, or drag to move frame'))
                                          : (isAr ? 'اسحب لنقل العنصر في مساحة العمل' : 'Drag to move')
                                      }
                                    />
                                  )}

                                {!selectedElement.locked && activeTool === 'select' && (
                                  <>
                                    {/* Dynamic Flexible Rotation Handle (Positioned opposite to floating toolbar to avoid any collision) */}
                                    {(() => {
                                      const isToolbarOnTop = (selectedElement.y || 0) >= 65;
                                      const isRotAtBottom = isToolbarOnTop;

                                      return (
                                        <div 
                                          className={`absolute ${isRotAtBottom ? '-bottom-9' : '-top-9'} start-1/2 -translate-x-1/2 flex ${isRotAtBottom ? 'flex-col-reverse' : 'flex-col'} items-center pointer-events-auto cursor-grab active:cursor-grabbing z-50 group`}
                                          onMouseDown={(e) => {
                                            e.stopPropagation();
                                            recordHistory();
                                            setActiveResizeHandle('rot');
                                            const coords = getCanvasCoords(e.clientX, e.clientY);
                                            setDragStart(coords);
                                            setElementStartPos({
                                              x: selectedElement.x,
                                              y: selectedElement.y,
                                              w: selectedElement.w || 100,
                                              h: selectedElement.h || 40,
                                              fontSize: selectedElement.fontSize || 32,
                                              rotation: selectedElement.rotation || 0
                                            });
                                          }}
                                          title={isAr ? 'تدوير العنصر دائرياً (360°)' : 'Rotate element (360°)'}
                                        >
                                          <div className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 border-2 border-[var(--fg-accent,#38bdf8)] shadow-lg flex items-center justify-center text-[var(--fg-accent,#38bdf8)] group-hover:scale-115 transition-transform">
                                            <RotateCw size={13} className="transition-transform group-hover:rotate-45" />
                                          </div>
                                          <div className="w-0.5 h-3 bg-[var(--fg-accent,#38bdf8)]" />
                                        </div>
                                      );
                                    })()}

                                    {/* 4 Corner Resize Handles (NW, NE, SW, SE) - Professional Proportional 2D Scaling */}
                                    {[
                                      { handle: 'nw', style: { top: -6, left: -6 }, cursor: 'cursor-nwse-resize', titleAr: 'تكبير وتصغير متناسب احترافي (الزاوية العلوية)', titleEn: 'Top-Left Proportional Corner Resize' },
                                      { handle: 'ne', style: { top: -6, right: -6 }, cursor: 'cursor-nesw-resize', titleAr: 'تكبير وتصغير متناسب احترافي (الزاوية العلوية)', titleEn: 'Top-Right Proportional Corner Resize' },
                                      { handle: 'sw', style: { bottom: -6, left: -6 }, cursor: 'cursor-nesw-resize', titleAr: 'تكبير وتصغير متناسب احترافي (الزاوية السفلية)', titleEn: 'Bottom-Left Proportional Corner Resize' },
                                      { handle: 'se', style: { bottom: -6, right: -6 }, cursor: 'cursor-nwse-resize', titleAr: 'تكبير وتصغير متناسب احترافي (الزاوية السفلية)', titleEn: 'Bottom-Right Proportional Corner Resize' }
                                    ].map(h => (
                                      <div
                                        key={h.handle}
                                        style={h.style}
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          recordHistory();
                                          setActiveResizeHandle(h.handle);
                                          const coords = getCanvasCoords(e.clientX, e.clientY);
                                          setDragStart(coords);
                                          setElementStartPos({
                                            x: selectedElement.x,
                                            y: selectedElement.y,
                                            w: selectedElement.w || 100,
                                            h: selectedElement.h || 40,
                                            fontSize: selectedElement.fontSize || 32,
                                            rotation: selectedElement.rotation || 0
                                          });
                                        }}
                                        className={`absolute w-3.5 h-3.5 rounded-full bg-white border-2 border-[var(--fg-accent,#38bdf8)] shadow-md ${h.cursor} pointer-events-auto hover:scale-130 transition-transform z-50 before:absolute before:-inset-2 before:content-[''] flex items-center justify-center`}
                                        title={isAr ? h.titleAr : h.titleEn}
                                      >
                                        <div className="w-1 h-1 rounded-full bg-[var(--fg-accent,#38bdf8)]" />
                                      </div>
                                    ))}

                                    {/* 4 Side Directional Handles (N, S, W, E) for Horizontal & Vertical Resizing */}
                                    {[
                                      { handle: 'n', style: { top: -5, left: '50%', transform: 'translateX(-50%)', width: 26, height: 7 }, cursor: 'cursor-ns-resize', titleAr: 'تكبير وتصغير عامودي (الارتفاع)', titleEn: 'Vertical Resize (Height)' },
                                      { handle: 's', style: { bottom: -5, left: '50%', transform: 'translateX(-50%)', width: 26, height: 7 }, cursor: 'cursor-ns-resize', titleAr: 'تكبير وتصغير عامودي (الارتفاع)', titleEn: 'Vertical Resize (Height)' },
                                      { handle: 'w', style: { top: '50%', left: -5, transform: 'translateY(-50%)', width: 7, height: 26 }, cursor: 'cursor-ew-resize', titleAr: 'تكبير وتصغير أفقي (العرض)', titleEn: 'Horizontal Resize (Width)' },
                                      { handle: 'e', style: { top: '50%', right: -5, transform: 'translateY(-50%)', width: 7, height: 26 }, cursor: 'cursor-ew-resize', titleAr: 'تكبير وتصغير أفقي (العرض)', titleEn: 'Horizontal Resize (Width)' }
                                    ].map(h => (
                                      <div
                                        key={h.handle}
                                        style={h.style}
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          recordHistory();
                                          setActiveResizeHandle(h.handle);
                                          const coords = getCanvasCoords(e.clientX, e.clientY);
                                          setDragStart(coords);
                                          setElementStartPos({
                                            x: selectedElement.x,
                                            y: selectedElement.y,
                                            w: selectedElement.w || 100,
                                            h: selectedElement.h || 40,
                                            fontSize: selectedElement.fontSize || 32,
                                            rotation: selectedElement.rotation || 0
                                          });
                                        }}
                                        className={`absolute bg-white border-2 border-[var(--fg-accent,#38bdf8)] rounded-full shadow-xs ${h.cursor} pointer-events-auto hover:scale-120 transition-transform z-50 before:absolute before:-inset-2 before:content-[''] flex items-center justify-center`}
                                        title={isAr ? h.titleAr : h.titleEn}
                                      >
                                        <div className={h.handle === 'n' || h.handle === 's' ? 'w-2.5 h-0.5 bg-[var(--fg-accent,#38bdf8)] rounded-full' : 'w-0.5 h-2.5 bg-[var(--fg-accent,#38bdf8)] rounded-full'} />
                                      </div>
                                    ))}

                                    {/* Real-time Dimensions & Rotation Angle Tooltip */}
                                    {(activeResizeHandle || dragStart) && (
                                      <div className="absolute -bottom-8 start-1/2 -translate-x-1/2 px-2.5 py-1 rounded-shape-xs bg-slate-900/95 text-[11px] font-mono font-bold text-white whitespace-nowrap shadow-xl pointer-events-none z-50 border border-white/20 flex items-center gap-2">
                                        <span>{Math.round(selectedElement.w || 0)} × {Math.round(selectedElement.h || 0)} px</span>
                                        {selectedElement.rotation ? (
                                          <span className="text-[var(--fg-accent,#38bdf8)] border-s border-white/20 ps-1.5">{selectedElement.rotation}°</span>
                                        ) : null}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })()}

                            {/* Eraser Cursor Halo */}
                            {activeTool === 'eraser' && eraserCursorPos && (
                              <div
                                style={{
                                  position: 'absolute',
                                  left: `${eraserCursorPos.x}px`,
                                  top: `${eraserCursorPos.y}px`,
                                  width: `${eraserBrushSize}px`,
                                  height: `${eraserBrushSize}px`,
                                  transform: 'translate(-50%, -50%)',
                                  pointerEvents: 'none',
                                  border: '2px solid rgba(244, 63, 94, 0.9)',
                                  boxShadow: '0 0 14px rgba(244, 63, 94, 0.5), inset 0 0 6px rgba(244, 63, 94, 0.3)',
                                  borderRadius: '9999px',
                                  zIndex: 60
                                }}
                              />
                            )}
                          </div>
                        ) : (
                          /* Inactive Page Preview - Clean intentional click to activate without scroll disruption */
                          <div 
                            className="w-full h-full relative bg-white overflow-hidden cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSwitchPage(pageIdx, false);
                            }}
                          >
                            <PageCanvasPreview 
                              elements={pageItem.elements} 
                              imageSize={imageSize} 
                              bgImgSrc={pageItem.bgImgSrc} 
                              defaultBgImg={imageRef.current} 
                              filters={filters} 
                            />
                          </div>
                        )}
                      </div>

                      {/* Bottom Add Page Divider Bar (Hidden in Video Studio Mode) */}
                      {studioMode !== 'video' && (
                        <div 
                          className="w-full h-10 mt-3 flex items-center justify-center pointer-events-auto"
                          style={{ width: `${(imageSize.width || 800) * zoom}px` }}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <div className="w-full h-0 border-t-2 border-dashed border-[var(--border-accent)]/50 relative flex items-center justify-center">
                            <button
                              type="button"
                              onClick={handleAddPage}
                              className="px-4 py-1.5 rounded-shape-full bg-[var(--surface-card)] hover:bg-[var(--fg-accent)] text-[var(--text-primary)] hover:text-white border border-[var(--border-accent)] shadow-md text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer group"
                            >
                              <Plus size={14} className="text-[var(--fg-success)] group-hover:text-white" />
                              <span>{isAr ? 'إضافة صفحة جديدة أسفل هذه الصفحة' : 'Add New Page Below'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RINEX MOTION VIDEO STUDIO - MULTI-SCENE TIMELINE ENGINE */}
          {studioMode === 'video' && (
            <div className="bg-slate-950/95 border-t border-[var(--border-main)] p-2.5 space-y-2 shrink-0 z-30 select-none animate-in slide-in-from-bottom-3 duration-150 shadow-2xl">
              {/* Video Timeline Control Ribbon */}
              <div className="flex items-center justify-between gap-2 px-1">
                {/* Play/Pause & Timecode */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPlayingVideoTimeline(!isPlayingVideoTimeline)}
                    className="h-8 px-3 rounded-shape-xs bg-[var(--accent)] text-slate-950 hover:brightness-110 font-black text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
                    title={isPlayingVideoTimeline ? (isAr ? 'إيقاف مؤقت' : 'Pause Video') : (isAr ? 'تشغيل الفيديو والمعاينة' : 'Play Timeline')}
                  >
                    {isPlayingVideoTimeline ? <Pause size={13} className="fill-current text-slate-950" /> : <Play size={13} className="fill-current text-slate-950" />}
                    <span>{isPlayingVideoTimeline ? (isAr ? 'إيقاف' : 'Pause') : (isAr ? 'تشغيل' : 'Play')}</span>
                  </button>

                  {/* Timecode Scrubber Display */}
                  <div className="h-8 px-3 rounded-shape-xs bg-slate-900 border border-slate-800 text-[11px] font-mono font-bold text-slate-200 flex items-center gap-1.5 shadow-2xs">
                    <Clock size={12} className="text-[var(--accent)]" />
                    <span>
                      00:{Math.floor(videoCurrentTime).toString().padStart(2, '0')} / 00:
                      {Math.floor(
                        videoScenes.reduce((acc, sc) => acc + (sc.durationSeconds || 5), 0)
                      ).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {/* Center Actions: Add Scene, Duplicate Scene, Cinematic Preview */}
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
                  {/* Add Blank Scene */}
                  <button
                    type="button"
                    onClick={() => {
                      const newScene = {
                        id: `scene-${Date.now()}`,
                        durationSeconds: 4.0,
                        backgroundColor: ['#090d16', '#1e1b4b', '#022c22', '#31124b', '#172554', '#3b0764'][videoScenes.length % 6],
                        elements: [],
                        transitionToNext: { type: 'dissolve' as const, durationSeconds: 0.5, direction: 'right' as const }
                      };
                      const updated = [...videoScenes, newScene];
                      setVideoScenes(updated);
                      switchActiveScene(updated.length - 1, updated);
                      toast.success(isAr ? 'تمت إضافة مشهد جديد للمخطط الزمني' : 'Added new scene to timeline');
                    }}
                    className="h-8 px-2.5 rounded-shape-xs bg-[var(--surface-card)] hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-default)] text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0"
                    title={isAr ? 'إضافة مشهد فارغ جديد للمخطط الزمني' : 'Add New Scene'}
                  >
                    <Plus size={13} className="text-[var(--accent)] stroke-[3]" />
                    <span>{isAr ? 'مشهد جديد' : 'Add Scene'}</span>
                  </button>

                  {/* Duplicate Active Scene */}
                  <button
                    type="button"
                    onClick={() => {
                      const current = videoScenes[activeSceneIndex];
                      if (!current) return;
                      const clonedScene = {
                        id: `scene-${Date.now()}`,
                        durationSeconds: current.durationSeconds || 4.0,
                        backgroundColor: current.backgroundColor || '#0f172a',
                        backgroundImage: current.backgroundImage,
                        bgImgSrc: current.bgImgSrc,
                        elements: JSON.parse(JSON.stringify(elements || current.elements || [])),
                        transitionToNext: current.transitionToNext ? { ...current.transitionToNext } : { type: 'dissolve' as const, durationSeconds: 0.5, direction: 'right' as const }
                      };
                      const nextIndex = activeSceneIndex + 1;
                      const updated = [...videoScenes];
                      updated.splice(nextIndex, 0, clonedScene);
                      setVideoScenes(updated);
                      switchActiveScene(nextIndex, updated);
                      toast.success(isAr ? `تم نسخ وتكرار المشهد ${activeSceneIndex + 1} بنجاح` : 'Duplicated scene successfully');
                    }}
                    className="h-8 px-2.5 rounded-shape-xs bg-[var(--surface-card)] hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-default)] text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0"
                    title={isAr ? 'نسخ وتكرار المشهد الحالي بكافة عناصره وخلفيته' : 'Duplicate Active Scene'}
                  >
                    <Copy size={13} className="text-sky-400" />
                    <span className="hidden sm:inline">{isAr ? 'تكرار المشهد' : 'Duplicate'}</span>
                  </button>

                  {/* Fullscreen Video Preview Trigger */}
                  <button
                    type="button"
                    onClick={() => setIsFullscreenVideoPreview(true)}
                    className="h-8 px-3 rounded-shape-xs bg-gradient-to-r from-purple-600 to-[var(--accent)] text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
                    title={isAr ? 'معاينة سينمائية بملء الشاشة مع الانتقالات الحية' : 'Fullscreen Cinematic Preview'}
                  >
                    <Maximize2 size={13} />
                    <span>{isAr ? 'معاينة سينمائية' : 'Cinematic Preview'}</span>
                  </button>
                </div>

                {/* Right Actions: Export MP4 */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsExportVideoModalOpen(true)}
                    className="h-8 px-3 rounded-shape-xs bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] hover:opacity-90 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
                    title={isAr ? 'تصدير وتحميل الفيديو بصيغة MP4' : 'Export MP4 Video'}
                  >
                    <Download size={13} />
                    <span>{isAr ? 'تصدير MP4' : 'Export MP4'}</span>
                  </button>
                </div>
              </div>

              {/* Multi-Scene Video Tracks & Transitions Scrubber */}
              <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1 px-0.5">
                {videoScenes.map((sc, idx) => {
                  const isActive = idx === activeSceneIndex;

                  return (
                    <React.Fragment key={sc.id}>
                      {/* Scene Block Card */}
                      <div
                        onClick={() => switchActiveScene(idx)}
                        className={`relative group shrink-0 rounded-shape-sm p-1.5 border-2 transition-all cursor-pointer flex flex-col justify-between select-none shadow-md overflow-hidden ${
                          isActive
                            ? 'border-[var(--accent)] bg-slate-900 ring-2 ring-[var(--accent)]/30 w-44 h-24'
                            : 'border-slate-800 hover:border-slate-700 bg-slate-900/80 w-40 h-24'
                        }`}
                        style={{ backgroundColor: sc.backgroundColor || '#0f172a' }}
                      >
                        {/* Thumbnail Live PageCanvasPreview Backdrop */}
                        <div className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity pointer-events-none overflow-hidden">
                          <PageCanvasPreview
                            elements={sc.elements || []}
                            imageSize={imageSize}
                            bgImgSrc={sc.backgroundImage || sc.bgImgSrc}
                            bgColor={sc.backgroundColor || '#0f172a'}
                            filters={filters}
                          />
                        </div>

                        {/* Scene Number & Duration Editor */}
                        <div className="flex items-center justify-between gap-1 z-10 relative">
                          <span className="px-1.5 py-0.5 rounded-shape-xs bg-slate-950/85 text-[9px] font-bold text-white border border-white/10 backdrop-blur-xs flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[var(--accent)] animate-pulse' : 'bg-slate-400'}`} />
                            <span>{isAr ? `مشهد ${idx + 1}` : `Scene ${idx + 1}`}</span>
                          </span>

                          {/* Quick Duration Controller */}
                          <div 
                            className="flex items-center gap-0.5 bg-slate-950/85 rounded-shape-xs px-1 py-0.5 border border-white/10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                const newDur = Math.max(1, Number(((sc.durationSeconds || 4) - 1).toFixed(1)));
                                const updated = [...videoScenes];
                                updated[idx].durationSeconds = newDur;
                                setVideoScenes(updated);
                              }}
                              className="w-3.5 h-3.5 rounded-xs hover:bg-white/20 text-slate-300 text-[10px] font-bold flex items-center justify-center cursor-pointer"
                              title={isAr ? 'تقليل مدة المشهد (-1 ثانية)' : 'Decrease duration'}
                            >
                              -
                            </button>
                            <span className="text-[9px] font-black text-[var(--accent)] font-mono px-0.5">
                              {sc.durationSeconds}s
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const newDur = Number(((sc.durationSeconds || 4) + 1).toFixed(1));
                                const updated = [...videoScenes];
                                updated[idx].durationSeconds = newDur;
                                setVideoScenes(updated);
                              }}
                              className="w-3.5 h-3.5 rounded-xs hover:bg-white/20 text-slate-300 text-[10px] font-bold flex items-center justify-center cursor-pointer"
                              title={isAr ? 'زيادة مدة المشهد (+1 ثانية)' : 'Increase duration'}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Scene Tools: Reorder, Copy, Delete */}
                        <div className="flex items-center justify-between text-[9px] text-slate-300 font-bold z-10 relative pt-1">
                          <span className="truncate max-w-[70px] text-slate-200 bg-slate-950/70 px-1 py-0.5 rounded-xs">
                            {sc.elements?.length || 0} {isAr ? 'عناصر' : 'els'}
                          </span>

                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/85 p-0.5 rounded-xs border border-white/10">
                            {/* Move Left */}
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updated = [...videoScenes];
                                  const temp = updated[idx];
                                  updated[idx] = updated[idx - 1];
                                  updated[idx - 1] = temp;
                                  setVideoScenes(updated);
                                  switchActiveScene(idx - 1, updated);
                                }}
                                className="p-0.5 rounded-xs hover:bg-white/20 text-slate-300"
                                title={isAr ? 'تقديم المشهد للأمام' : 'Move Left'}
                              >
                                {isAr ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
                              </button>
                            )}

                            {/* Move Right */}
                            {idx < videoScenes.length - 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updated = [...videoScenes];
                                  const temp = updated[idx];
                                  updated[idx] = updated[idx + 1];
                                  updated[idx + 1] = temp;
                                  setVideoScenes(updated);
                                  switchActiveScene(idx + 1, updated);
                                }}
                                className="p-0.5 rounded-xs hover:bg-white/20 text-slate-300"
                                title={isAr ? 'تأخير المشهد للخلف' : 'Move Right'}
                              >
                                {isAr ? <ChevronLeft size={11} /> : <ChevronRight size={11} />}
                              </button>
                            )}

                            {/* Duplicate Scene */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const clonedScene = {
                                  id: `scene-${Date.now()}`,
                                  durationSeconds: sc.durationSeconds || 4.0,
                                  backgroundColor: sc.backgroundColor || '#0f172a',
                                  backgroundImage: sc.backgroundImage,
                                  bgImgSrc: sc.bgImgSrc,
                                  elements: JSON.parse(JSON.stringify(sc.elements || [])),
                                  transitionToNext: sc.transitionToNext ? { ...sc.transitionToNext } : { type: 'dissolve' as const, durationSeconds: 0.5, direction: 'right' as const }
                                };
                                const updated = [...videoScenes];
                                updated.splice(idx + 1, 0, clonedScene);
                                setVideoScenes(updated);
                                switchActiveScene(idx + 1, updated);
                                toast.success(isAr ? `تم نسخ المشهد ${idx + 1}` : 'Scene duplicated');
                              }}
                              className="p-0.5 rounded-xs hover:bg-sky-500/20 text-sky-400"
                              title={isAr ? 'نسخ هذا المشهد' : 'Duplicate Scene'}
                            >
                              <Copy size={11} />
                            </button>

                            {/* Delete Scene */}
                            {videoScenes.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (videoScenes.length <= 1) return;
                                  const filtered = videoScenes.filter((_, i) => i !== idx);
                                  setVideoScenes(filtered);
                                  const newIdx = Math.max(0, idx - 1);
                                  switchActiveScene(newIdx, filtered);
                                  toast.info(isAr ? 'تم حذف المشهد' : 'Scene deleted');
                                }}
                                className="p-0.5 rounded-xs hover:bg-rose-500/20 text-rose-400"
                                title={isAr ? 'حذف المشهد' : 'Delete Scene'}
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Transition Control Button Between Scenes */}
                      {idx < videoScenes.length - 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            switchActiveScene(idx);
                            setActiveSidebarTab('transitions' as any);
                            setIsSidebarOpen(true);
                          }}
                          className="group/tr-btn shrink-0 px-2 h-7 rounded-full bg-slate-900 hover:bg-[var(--accent)] text-slate-300 hover:text-slate-950 border border-slate-700 hover:border-[var(--accent)] flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
                          title={isAr ? `تعديل الانتقال إلى المشهد ${idx + 2} (${sc.transitionToNext?.type || 'إذابة'})` : 'Edit Scene Transition'}
                        >
                          <Sparkles size={11} className="group-hover/tr-btn:rotate-12 transition-transform text-[var(--accent)] group-hover/tr-btn:text-slate-950" />
                          <span className="text-[9px] font-bold tracking-tight">
                            {sc.transitionToNext?.type || 'إذابة'}
                          </span>
                        </button>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Audio Track Timeline Lane */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-6 h-6 rounded-shape-xs bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                    <Volume2 size={13} />
                  </div>
                  
                  {activeAudioTrack ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-bold text-slate-200 truncate max-w-[200px] sm:max-w-[320px]">
                        🎵 {isAr ? activeAudioTrack.titleAr : activeAudioTrack.titleEn}
                      </span>
                      {isPlayingVideoTimeline && !activeAudioTrack.isMuted && (
                        <div className="flex items-center gap-0.5 h-3 shrink-0">
                          <span className="w-1 h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="w-1 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="w-1 h-3.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium italic">
                      {isAr ? 'لا يوجد مسار صوتي مضاف (انقر لإضافة موسيقى)' : 'No audio track selected'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {activeAudioTrack && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAudioTrack({
                          ...activeAudioTrack,
                          isMuted: !activeAudioTrack.isMuted
                        });
                      }}
                      className="h-7 px-2 rounded-shape-xs bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title={activeAudioTrack.isMuted ? (isAr ? 'تفعيل الصوت' : 'Unmute') : (isAr ? 'كتم الصوت' : 'Mute')}
                    >
                      {activeAudioTrack.isMuted ? <VolumeX size={12} className="text-rose-400" /> : <Volume2 size={12} className="text-emerald-400" />}
                      <span className="hidden sm:inline">{activeAudioTrack.isMuted ? (isAr ? 'مكتوم' : 'Muted') : (isAr ? 'صوت' : 'Audio')}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setActiveSidebarTab('audio' as any);
                      setIsSidebarOpen(true);
                    }}
                    className="h-7 px-2.5 rounded-shape-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus size={12} className="text-[var(--accent)]" />
                    <span>{activeAudioTrack ? (isAr ? 'تغيير الصوت' : 'Change Track') : (isAr ? 'إضافة مسار صوت' : 'Add Audio')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Fullscreen Video Preview Modal */}
          {isFullscreenVideoPreview && (
            <div className="fixed inset-0 z-[120] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200">
              {/* Fullscreen Header */}
              <div className="w-full max-w-5xl flex items-center justify-between text-white border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Play size={18} className="text-[var(--accent)] fill-current" />
                  <h3 className="text-sm font-bold tracking-tight">
                    {isAr ? 'معاينة سينمائية حية - رينكس فيديو استوديو' : 'Cinematic Live Preview - Rinex Video Studio'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFullscreenVideoPreview(false)}
                  className="w-8 h-8 rounded-shape-xs bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Center Video Frame */}
              <div className="flex-1 w-full max-w-4xl flex items-center justify-center p-4">
                <div 
                  className="relative shadow-2xl rounded-shape-md overflow-hidden border border-white/20 transition-all flex items-center justify-center"
                  style={{
                    width: imageSize.width > imageSize.height ? '100%' : 'auto',
                    height: imageSize.height >= imageSize.width ? '80vh' : 'auto',
                    maxHeight: '75vh',
                    aspectRatio: `${imageSize.width} / ${imageSize.height}`,
                    backgroundColor: videoScenes[activeSceneIndex]?.backgroundColor || '#090d16'
                  }}
                >
                  <PageCanvasPreview
                    elements={videoScenes[activeSceneIndex]?.elements || elements}
                    imageSize={imageSize}
                    filters={filters}
                  />
                </div>
              </div>

              {/* Fullscreen Player Control Bar */}
              <div className="w-full max-w-3xl rounded-shape-md bg-slate-900/90 border border-white/15 p-3 flex items-center justify-between gap-4 text-white shadow-2xl">
                <button
                  type="button"
                  onClick={() => setIsPlayingVideoTimeline(!isPlayingVideoTimeline)}
                  className="h-9 px-4 rounded-shape-xs bg-[var(--accent)] text-slate-950 font-black text-xs flex items-center gap-2 hover:brightness-110 transition-all cursor-pointer"
                >
                  {isPlayingVideoTimeline ? <Pause size={14} className="fill-current text-slate-950" /> : <Play size={14} className="fill-current text-slate-950" />}
                  <span>{isPlayingVideoTimeline ? (isAr ? 'إيقاف مؤقت' : 'Pause') : (isAr ? 'تشغيل' : 'Play')}</span>
                </button>

                <div className="font-mono text-xs font-bold text-slate-300">
                  00:{Math.floor(videoCurrentTime).toString().padStart(2, '0')} / 00:
                  {Math.floor(
                    videoScenes.reduce((acc, sc) => acc + (sc.durationSeconds || 5), 0)
                  ).toString().padStart(2, '0')}
                </div>

                {activeAudioTrack && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveAudioTrack({
                        ...activeAudioTrack,
                        isMuted: !activeAudioTrack.isMuted
                      });
                    }}
                    className="h-9 px-3 rounded-shape-xs bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    title={activeAudioTrack.isMuted ? (isAr ? 'تفعيل الصوت' : 'Unmute') : (isAr ? 'كتم الصوت' : 'Mute')}
                  >
                    {activeAudioTrack.isMuted ? <VolumeX size={14} className="text-rose-400" /> : <Volume2 size={14} className="text-emerald-400" />}
                    <span className="hidden sm:inline font-mono">{activeAudioTrack.isMuted ? (isAr ? 'مكتوم' : 'Muted') : `${Math.round(activeAudioTrack.volume * 100)}%`}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsFullscreenVideoPreview(false)}
                  className="h-9 px-4 rounded-shape-xs bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors cursor-pointer"
                >
                  {isAr ? 'خروج (Esc)' : 'Exit (Esc)'}
                </button>
              </div>
            </div>
          )}

          {/* Export MP4 Video Modal */}
          {isExportVideoModalOpen && (
            <div 
              className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
              onClick={() => setIsExportVideoModalOpen(false)}
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-shape-md bg-[var(--surface-card)] border border-[var(--border-default)] p-5 shadow-2xl space-y-5 text-[var(--text-primary)]"
              >
                <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-3">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Download size={16} className="text-[var(--accent)]" />
                    <span>{isAr ? 'تصدير وتحميل فيديو MP4' : 'Export MP4 Video'}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsExportVideoModalOpen(false)}
                    className="w-7 h-7 rounded-shape-xs hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] flex items-center justify-center cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Quality Options */}
                <div className="space-y-2">
                  <label className="text-xs font-bold block">{isAr ? 'دقة وتوضيح الفيديو:' : 'Video Resolution:'}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: '1080p', label: '1080p Full HD' },
                      { id: '4k', label: '4K Ultra HD' },
                      { id: '720p', label: '720p HD' },
                    ].map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setVideoExportQuality(q.id as any)}
                        className={`p-2.5 rounded-shape-xs border text-xs font-bold text-center cursor-pointer transition-all ${
                          videoExportQuality === q.id
                            ? 'bg-[var(--accent)] text-slate-950 border-[var(--accent)] font-extrabold shadow-2xs'
                            : 'bg-[var(--surface-subtle)] border-[var(--border-default)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Frame Rate Options */}
                <div className="space-y-2">
                  <label className="text-xs font-bold block">{isAr ? 'معدل الإطارات (FPS):' : 'Frame Rate:'}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 30, label: '30 FPS (قياسي)' },
                      { id: 60, label: '60 FPS (سلاسة سينمائية)' },
                    ].map((fpsItem) => (
                      <button
                        key={fpsItem.id}
                        type="button"
                        onClick={() => setVideoExportFPS(fpsItem.id as any)}
                        className={`p-2.5 rounded-shape-xs border text-xs font-bold text-center cursor-pointer transition-all ${
                          videoExportFPS === fpsItem.id
                            ? 'bg-[var(--accent)] text-slate-950 border-[var(--accent)] font-extrabold shadow-2xs'
                            : 'bg-[var(--surface-subtle)] border-[var(--border-default)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {fpsItem.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportVideoModalOpen(false);
                      toast.success(isAr ? 'جاري تصدير الفيديو بصيغة MP4 بأعلى دقة...' : 'Exporting MP4 video...');
                    }}
                    className="flex-1 py-2.5 rounded-shape-sm bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] font-extrabold text-xs shadow hover:opacity-90 transition-opacity cursor-pointer text-center"
                  >
                    {isAr ? 'بدء التحميل والتصدير 🚀' : 'Start Download 🚀'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsExportVideoModalOpen(false)}
                    className="px-4 py-2.5 rounded-shape-sm bg-[var(--surface-subtle)] text-[var(--text-secondary)] font-bold text-xs border border-[var(--border-default)] cursor-pointer"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Canva-Standard Bottom Pages & Canvas Status Bar (Rock-Solid Fixed Height) */}
          <div className="h-11 bg-[var(--surface-card)] border-t border-[var(--border-main)] px-3 flex items-center justify-between shrink-0 z-20 select-none overflow-x-auto custom-scrollbar">
            {/* Left: Pages Management Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Pages Grid Overview Toggle */}
              <button
                type="button"
                onClick={() => setIsPagesOverviewOpen(!isPagesOverviewOpen)}
                className={`h-7 px-2.5 rounded-shape-xs border font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs ${
                  isPagesOverviewOpen
                    ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] border-transparent'
                    : 'bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border-[var(--border-default)] text-[var(--text-primary)]'
                }`}
                title={isAr ? 'عرض مخطط كافة الصفحات' : 'View All Pages Grid'}
              >
                <Layers size={13} className="text-[var(--fg-accent)]" />
                <span>{isAr ? `الصفحة ${currentPageIndex + 1} من ${pages.length}` : `Page ${currentPageIndex + 1} of ${pages.length}`}</span>
              </button>
            </div>

            {/* Center: Smart Margins & Snapping Guides Indicator */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Safe Margins Toggle */}
              <button
                type="button"
                onClick={() => setShowMargins(!showMargins)}
                className={`h-7 px-2.5 rounded-shape-xs border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs ${
                  showMargins
                    ? 'bg-rose-500/15 text-rose-500 border-rose-500/40 ring-1 ring-rose-500/30'
                    : 'bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title={isAr ? 'إظهار / إخفاء هوامش وحدود الأمان للتصميم والطباعة' : 'Toggle Safe Margins & Boundary Guides'}
              >
                <Square size={12} className={showMargins ? 'text-rose-500' : 'text-[var(--text-muted)]'} />
                <span className="hidden sm:inline">{isAr ? 'هوامش الأمان' : 'Safe Margins'}</span>
                {showMargins && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />}
              </button>
            </div>

            {/* Right: Zoom & Viewport Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Zoom Out Button */}
              <button
                type="button"
                onClick={() => handleZoomChange('out')}
                className="w-7 h-7 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors shadow-2xs"
                title={isAr ? 'تصغير (-)' : 'Zoom Out'}
              >
                <ZoomOut size={13} />
              </button>

              {/* Zoom Slider */}
              <div className="flex items-center gap-1 hidden sm:flex">
                <input
                  type="range"
                  min="20"
                  max="300"
                  step="5"
                  value={Math.round(zoom * 100)}
                  onChange={(e) => {
                    const newZoom = Number(((parseInt(e.target.value, 10) || 100) / 100).toFixed(2));
                    setZoom(newZoom);
                    try {
                      localStorage.setItem('rataq_studio_zoomScale', String(newZoom));
                      localStorage.setItem('rataq_studio_user_zoom', String(newZoom));
                    } catch {}
                  }}
                  className="w-16 md:w-20 h-1 bg-[var(--surface-inset)] rounded-shape-full appearance-none cursor-pointer accent-[var(--fg-accent)]"
                  title={isAr ? 'مستوى التكبير' : 'Zoom Slider'}
                />
              </div>

              {/* Zoom In Button */}
              <button
                type="button"
                onClick={() => handleZoomChange('in')}
                className="w-7 h-7 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors shadow-2xs"
                title={isAr ? 'تكبير (+)' : 'Zoom In'}
              >
                <ZoomIn size={13} />
              </button>

              {/* Reset 100% Zoom */}
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  try {
                    localStorage.setItem('rataq_studio_zoomScale', '1');
                    localStorage.setItem('rataq_studio_user_zoom', '1');
                  } catch {}
                }}
                className="h-7 px-1.5 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] font-mono text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors shadow-2xs"
                title={isAr ? 'إعادة ضبط التكبير إلى 100%' : 'Reset 100%'}
              >
                {Math.round(zoom * 100)}%
              </button>

              {/* Fit Image View */}
              <button
                type="button"
                onClick={() => fitImageToContainer(imageSize.width, imageSize.height)}
                className="w-7 h-7 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors shadow-2xs"
                title={isAr ? 'ملاءمة وتوسيط الشاشة' : 'Fit to Screen'}
              >
                <Maximize size={13} />
              </button>

              {onToggleFullscreen && (
                <button
                  type="button"
                  onClick={onToggleFullscreen}
                  className="w-7 h-7 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors shadow-2xs"
                  title={isFullscreen ? (isAr ? 'إنهاء ملء الشاشة' : 'Exit Fullscreen') : (isAr ? 'ملء الشاشة' : 'Fullscreen')}
                >
                  {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </button>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Pages Overview / Carousel Drawer Modal */}
      {isPagesOverviewOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsPagesOverviewOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl max-h-[85vh] rounded-shape-md bg-[var(--surface-card)] border border-[var(--border-default)] shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150 overflow-hidden text-[var(--text-primary)]"
          >
            <div className="p-4 border-b border-[var(--border-main)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-shape-sm bg-[var(--bg-accent-muted)] border border-[var(--border-accent)]/30 flex items-center justify-center text-[var(--fg-accent)]">
                  <Layers size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {isAr ? 'مخطط صفحات التصميم (Pages Overview)' : 'Design Pages Overview'}
                  </h3>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {isAr ? `إجمالي الصفحات: ${pages.length} | انقر للتبديل أو التكرار` : `Total pages: ${pages.length} | Click to switch or duplicate`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddPage}
                  className="h-8 px-3 rounded-shape-xs bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] hover:opacity-90 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus size={13} />
                  <span>{isAr ? 'إضافة صفحة جديدة' : 'Add New Page'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPagesOverviewOpen(false)}
                  className="w-8 h-8 rounded-shape-xs hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {pages.map((pg, idx) => {
                const isActive = idx === currentPageIndex;
                return (
                  <div
                    key={pg.id}
                    onClick={() => {
                      handleSwitchPage(idx);
                      setIsPagesOverviewOpen(false);
                    }}
                    className={`relative rounded-shape-sm p-3 border-2 transition-all cursor-pointer flex flex-col gap-2 ${
                      isActive 
                        ? 'border-[var(--fg-accent)] bg-[var(--bg-accent-muted)]/40 shadow-lg' 
                        : 'border-[var(--border-default)] hover:border-[var(--border-accent)]/60 bg-[var(--surface-subtle)]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1 text-[var(--text-primary)]">
                        <span>{idx + 1}.</span>
                        <span>{pg.title || (isAr ? `صفحة ${idx + 1}` : `Page ${idx + 1}`)}</span>
                      </span>
                      {isActive && (
                        <span className="px-1.5 py-0.5 rounded-shape-xs bg-[var(--fg-accent)] text-white text-[9px] font-bold">
                          {isAr ? 'الحالية' : 'Active'}
                        </span>
                      )}
                    </div>

                    <div className="w-full aspect-[4/3] rounded-shape-xs bg-[var(--surface-inset)] flex items-center justify-center text-xs text-[var(--text-muted)] font-mono border border-[var(--border-default)]">
                      {pg.elements.length} {isAr ? 'طبقات / عناصر' : 'layers'}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[var(--border-default)]/60" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMovePage(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer border border-[var(--border-default)]"
                          title={isAr ? 'نقل للأعلى' : 'Move Up'}
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMovePage(idx, 'down')}
                          disabled={idx === pages.length - 1}
                          className="p-1 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer border border-[var(--border-default)]"
                          title={isAr ? 'نقل للأسفل' : 'Move Down'}
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDuplicatePage(idx)}
                          className="px-1.5 py-0.5 rounded-shape-xs hover:bg-[var(--surface-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer text-[10px] font-bold flex items-center gap-1 border border-[var(--border-default)]"
                          title={isAr ? 'تكرار الصفحة' : 'Duplicate'}
                        >
                          <Copy size={11} />
                          <span>{isAr ? 'تكرار' : 'Copy'}</span>
                        </button>

                        {pages.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeletePage(idx)}
                            className="px-1.5 py-0.5 rounded-shape-xs hover:bg-rose-500/10 text-rose-500 cursor-pointer text-[10px] font-bold flex items-center gap-1 border border-rose-500/30"
                            title={isAr ? 'حذف الصفحة' : 'Delete'}
                          >
                            <Trash2 size={11} />
                            <span>{isAr ? 'حذف' : 'Delete'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. Unified Clear All Confirmation Modal */}
      {isClearModalOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsClearModalOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-shape-md bg-[var(--surface-card)] border border-rose-500/40 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-shape-sm bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {isAr ? 'تأكيد مسح كافة التعديلات' : 'Confirm Clear All Modifications'}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                  {isAr
                    ? 'هل أنت متأكد من مسح جميع النصوص والرسومات والأشكال المضافة وإعادة ضبط الفلاتر؟'
                    : 'Are you sure you want to remove all drawings, text layers, shapes, and reset filters?'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-default)]">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="h-8 px-3.5 rounded-shape-sm bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-secondary)] cursor-pointer transition-colors shadow-2xs"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleExecuteClearAll}
                className="h-8 px-4 rounded-shape-sm bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-all shadow-2xs flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                <span>{isAr ? 'مسح الكل' : 'Clear All'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3.5. Publish as Public Template Modal */}
      {isPublishModalOpen && (
        <div 
          className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsPublishModalOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-shape-md bg-[var(--surface-card)] border border-[var(--border-default)] shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-[var(--text-primary)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-shape-sm bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] border border-[color-mix(in_oklab,var(--accent)_25%,transparent)] flex items-center justify-center text-[var(--accent)]">
                  <Award size={16} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                    {isAr ? 'نشر التصميم في سوق القوالب المفتوح' : 'Publish to Rinex Marketplace'}
                  </h3>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {isAr ? 'شارك تصاميمك المبتكرة مع مجتمع رينكس وابدأ بتحقيق عوائد مجزية' : 'Publish and monetize your premium templates'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                className="w-6 h-6 rounded-shape-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] flex items-center justify-center cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Template Title */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[var(--text-secondary)]">{isAr ? 'عنوان القالب' : 'Template Title'}</label>
                <input
                  type="text"
                  required
                  value={publishTitle}
                  onChange={(e) => setPublishTitle(e.target.value)}
                  placeholder={isAr ? 'مثال: قالب بوستر إعلاني احترافي' : 'Enter template title...'}
                  className="w-full h-9 px-3 rounded-shape-sm bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>

              {/* Template Description */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[var(--text-secondary)]">{isAr ? 'وصف القالب ومميزاته' : 'Description / Features'}</label>
                <textarea
                  rows={2}
                  value={publishDesc}
                  onChange={(e) => setPublishDesc(e.target.value)}
                  placeholder={isAr ? 'اشرح بالتفصيل كيفية تعديل القالب والجمهور المستهدف...' : 'اشرح بالتفصيل كيفية تعديل القالب...'}
                  className="w-full p-2.5 rounded-shape-sm bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>

              {/* Template Category */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[var(--text-secondary)]">{isAr ? 'قسم وفئة التصميم' : 'Category'}</label>
                <select
                  value={publishCategory}
                  onChange={(e) => setPublishCategory(e.target.value as any)}
                  className="w-full h-9 px-2.5 rounded-shape-sm bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)] font-bold"
                >
                  <option value="marketing">{isAr ? 'تسويق وإعلان (Marketing)' : 'Marketing & Ad Posters'}</option>
                  <option value="story">{isAr ? 'استوري وقصص عمودية (Story)' : 'Vertical Story 9:16'}</option>
                  <option value="banner">{isAr ? 'بنرات وأغلفة (Banners)' : 'Banners & Covers'}</option>
                  <option value="social">{isAr ? 'مواقع التواصل (Social)' : 'Social Media'}</option>
                </select>
              </div>

              {/* Pricing selector */}
              <div className="space-y-1.5 pt-1.5 border-t border-[var(--border-main)]">
                <label className="block text-[11px] font-bold text-[var(--text-secondary)]">{isAr ? 'نموذج التسعير والربح' : 'Monetization Model'}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'free', labelAr: 'مجاني', labelEn: 'Free' },
                    { id: 'pro', labelAr: 'برو (PRO)', labelEn: 'PRO only' },
                    { id: 'points', labelAr: 'نقاط/كريديت', labelEn: 'Credits' }
                  ].map(model => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setPublishPriceType(model.id as any)}
                      className={`h-8 rounded-shape-xs font-bold border transition-all cursor-pointer ${
                        publishPriceType === model.id
                          ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] border-transparent shadow-2xs'
                          : 'bg-[var(--surface-subtle)] border-[var(--border-default)] hover:bg-[var(--surface-card)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {isAr ? model.labelAr : model.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {publishPriceType === 'points' && (
                <div className="space-y-1 animate-in slide-in-from-top-2 duration-150">
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)]">{isAr ? 'السعر بالنقاط/الكريديت' : 'Price in Credits'}</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={publishPrice}
                    onChange={(e) => setPublishPrice(parseInt(e.target.value) || 5)}
                    className="w-full h-9 px-3 rounded-shape-sm bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)] font-mono font-bold"
                  />
                </div>
              )}

              {/* Warning compliance text */}
              <div className="p-2.5 rounded bg-amber-500/5 border border-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400 leading-normal">
                {isAr 
                  ? 'بضغطك على نشر، فإنك تؤكد خلو التصميم من أي حقوق ملكية فكرية مملوكة للغير، وتوافق على مراجعة المحتوى.' 
                  : 'By publishing, you guarantee that this design is original and does not violate any third-party copyrights.'}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-main)]">
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                className="h-8 px-4 rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] text-xs font-bold text-[var(--text-secondary)] transition-all cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!publishTitle.trim()) {
                    toast.error(isAr ? 'يرجى كتابة عنوان للقالب' : 'Please write a template title');
                    return;
                  }
                  
                  try {
                    const registryKey = 'rinex_marketplace_templates_v1';
                    const storedRaw = localStorage.getItem(registryKey);
                    const existing = storedRaw ? JSON.parse(storedRaw) : [];
                    
                    const newTpl = {
                      id: `m-tpl-${Date.now()}`,
                      creatorId: 'creator-1', // Simulated Sarah
                      creatorName: user?.name || 'سارة العتيبي',
                      creatorUsername: (user as any)?.username || 'sarah_designs',
                      creatorAvatar: (user as any)?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
                      titleAr: publishTitle,
                      titleEn: publishTitle,
                      descriptionAr: publishDesc || (isAr ? 'قالب رينكس المبتكر المصمم باحترافية لتعديله فوراً.' : 'Premium Rinex template designed for instant customization.'),
                      descriptionEn: publishDesc || 'Premium Rinex template designed for instant customization.',
                      thumbnail: artifact.content || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
                      category: publishCategory,
                      categoryLabelAr: publishCategory === 'marketing' ? 'تسويقي' : (publishCategory === 'banner' ? 'بنرات وأغلفة' : (publishCategory === 'story' ? 'قصة واستوري' : 'سوشيال ميديا')),
                      dimensions: `${imageSize.width} × ${imageSize.height}`,
                      priceType: publishPriceType,
                      price: publishPriceType === 'points' ? publishPrice : 0,
                      viewsCount: 1,
                      usesCount: 0,
                      rating: 5.0,
                      createdAt: Date.now(),
                      elements,
                      canvasBackground: artifact.content
                    };
                    
                    localStorage.setItem(registryKey, JSON.stringify([newTpl, ...existing]));
                    setIsPublishModalOpen(false);
                    toast.success(isAr ? 'تم نشر قالبك الإبداعي بنجاح في سوق رينكس العام وجاري تجميع الأرباح' : 'Template published successfully to Rinex Marketplace');
                  } catch (err) {
                    console.error('Publish error', err);
                    toast.error(isAr ? 'تعذر النشر في الوقت الحالي' : 'Failed to publish template');
                  }
                }}
                className="h-8 px-4 rounded-shape-xs bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] hover:opacity-90 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Award size={13} />
                <span>{isAr ? 'تأكيد ونشر القالب' : 'Confirm & Publish'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 4. Canvas Dimensions & Resize Modal */}
      {isResizeModalOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsResizeModalOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-shape-md bg-[var(--surface-card)] border border-[var(--border-default)] shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-[var(--text-primary)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-shape-sm bg-[var(--bg-accent-muted)] border border-[var(--border-accent)]/30 flex items-center justify-center text-[var(--fg-accent)]">
                  <LayoutTemplate size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {isAr ? 'أبعاد ومقاسات مساحة العمل (Resize Studio)' : 'Canvas Dimensions & Presets'}
                  </h3>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {isAr ? 'اختر مقاساً جاهزاً لمنصات التواصل أو حدد أبعاداً مخصصة' : 'Choose a preset size or enter custom dimensions'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResizeModalOpen(false)}
                className="w-7 h-7 rounded-shape-xs hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Custom Dimensions Input */}
            <div className="space-y-2 bg-[var(--surface-subtle)] p-3 rounded-shape-sm border border-[var(--border-default)]">
              <span className="text-xs font-bold text-[var(--text-secondary)] block">
                {isAr ? 'الأبعاد المخصصة (بالبكسل):' : 'Custom Dimensions (px):'}
              </span>
              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-[var(--text-muted)] font-mono block">
                    {isAr ? 'العرض (W)' : 'Width (W)'}
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="6000"
                    value={customWidth}
                    onChange={(e) => {
                      const w = parseInt(e.target.value) || 0;
                      setCustomWidth(w);
                      if (lockAspectRatio && imageSize.width > 0) {
                        setCustomHeight(Math.round((w * imageSize.height) / imageSize.width));
                      }
                    }}
                    className="w-full h-8 px-2.5 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-shape-xs text-xs font-mono font-bold"
                  />
                </div>

                <div className="text-[var(--text-muted)] font-bold pt-4">×</div>

                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-[var(--text-muted)] font-mono block">
                    {isAr ? 'الارتفاع (H)' : 'Height (H)'}
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="6000"
                    value={customHeight}
                    onChange={(e) => {
                      const h = parseInt(e.target.value) || 0;
                      setCustomHeight(h);
                      if (lockAspectRatio && imageSize.height > 0) {
                        setCustomWidth(Math.round((h * imageSize.width) / imageSize.height));
                      }
                    }}
                    className="w-full h-8 px-2.5 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-shape-xs text-xs font-mono font-bold"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setLockAspectRatio(!lockAspectRatio)}
                  className={`mt-4 h-8 px-2 rounded-shape-xs border text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                    lockAspectRatio
                      ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] border-transparent'
                      : 'bg-[var(--surface-card)] text-[var(--text-muted)] border-[var(--border-default)]'
                  }`}
                  title={isAr ? 'قفل نسبة العرض إلى الارتفاع' : 'Lock Aspect Ratio'}
                >
                  {lockAspectRatio ? <Lock size={12} /> : <Unlock size={12} />}
                  <span className="hidden sm:inline">{isAr ? 'قفل النسبة' : 'Lock'}</span>
                </button>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[var(--text-secondary)] block">
                {isAr ? 'المقاسات والقوالب القياسية الجاهزة:' : 'Standard Presets:'}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-[220px] overflow-y-auto custom-scrollbar p-0.5">
                {[
                  { name: isAr ? 'منشور إنستغرام' : 'Instagram Post', w: 1080, h: 1080, tag: 'Post', ratio: '1:1' },
                  { name: isAr ? 'ريلز وقصص' : 'Reels & Stories', w: 1080, h: 1920, tag: 'Story', ratio: '9:16' },
                  { name: isAr ? 'مصغرة يوتيوب' : 'YouTube Thumbnail', w: 1280, h: 720, tag: 'Thumb', ratio: '16:9' },
                  { name: isAr ? 'بانر عريض' : 'Landscape Web', w: 1920, h: 1080, tag: 'Web', ratio: '16:9' },
                  { name: isAr ? 'غلاف فيسبوك' : 'Facebook Cover', w: 820, h: 312, tag: 'Cover', ratio: '2.6:1' },
                  { name: isAr ? 'ترويسة إكس/تويتر' : 'Twitter Header', w: 1500, h: 500, tag: 'Header', ratio: '3:1' },
                  { name: isAr ? 'مستند طباعة A4' : 'A4 Print Doc', w: 2480, h: 3508, tag: 'Print', ratio: '1:1.41' },
                  { name: isAr ? 'مربع فائق الدقة' : 'Square 2K HD', w: 2000, h: 2000, tag: '2K', ratio: '1:1' }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCustomWidth(item.w);
                      setCustomHeight(item.h);
                      handleApplyResize(item.w, item.h);
                    }}
                    className={`p-2 rounded-shape-sm border text-start transition-all cursor-pointer flex flex-col justify-between ${
                      customWidth === item.w && customHeight === item.h
                        ? 'bg-[var(--bg-accent-muted)] border-[var(--fg-accent)] shadow-2xs'
                        : 'bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border-[var(--border-default)] hover:border-[var(--border-accent)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-shape-xs bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-default)]">{item.tag}</span>
                      <span className="text-[9px] font-mono font-bold text-[var(--fg-accent)]">{item.ratio}</span>
                    </div>
                    <div className="text-[11px] font-bold text-[var(--text-primary)] truncate mt-1">
                      {item.name}
                    </div>
                    <div className="text-[9.5px] font-mono text-[var(--text-muted)] mt-0.5">
                      {item.w} × {item.h}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-main)]">
              <button
                type="button"
                onClick={() => setIsResizeModalOpen(false)}
                className="h-8 px-3.5 rounded-shape-sm bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-secondary)] cursor-pointer transition-colors shadow-2xs"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handleApplyResize(customWidth, customHeight)}
                className="h-8 px-4 rounded-shape-sm bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] hover:opacity-90 text-xs font-bold cursor-pointer transition-all shadow-2xs flex items-center gap-1.5"
              >
                <Check size={13} />
                <span>{isAr ? 'تطبيق المقاس الجديد' : 'Apply Dimensions'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4.5. Replace Canvas Background Modal */}
      {isReplaceBgModalOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsReplaceBgModalOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-shape-md bg-[var(--surface-card)] border border-[var(--border-default)] shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-[var(--text-primary)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-shape-sm bg-[var(--bg-accent-muted)] border border-[var(--border-accent)]/30 flex items-center justify-center text-[var(--fg-accent)]">
                  <Palette size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {isAr ? 'استبدال خلفية مساحة العمل' : 'Replace Canvas Background'}
                  </h3>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {isAr ? 'اختر صورة من جهازك، أو من وسائطك المحملة، أو حدد الصورة المعروضة كخلفية رئيسية' : 'Choose a new photo, upload from device, or use selected image as canvas background'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReplaceBgModalOpen(false)}
                className="w-7 h-7 rounded-shape-xs hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Quick Action: If an image element is currently selected */}
            {selectedElement && (selectedElement.type === 'sticker' || selectedElement.imgSrc) && (
              <div className="p-3 rounded-shape-sm bg-[var(--bg-accent-muted)] border border-[var(--border-accent)]/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {selectedElement.imgSrc && (
                    <img src={selectedElement.imgSrc} alt="Preview" className="w-10 h-10 rounded-shape-xs object-cover border border-white/20 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-[var(--text-primary)] block truncate">
                      {isAr ? 'الصورة المحددة حالياً على لوحة العمل' : 'Currently Selected Canvas Image'}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {isAr ? 'استبدال خلفية التصميم الحالية بهذه الصورة فوراً' : 'Set this element as the canvas background'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleSetImageAsBackground(selectedElement);
                    setIsReplaceBgModalOpen(false);
                  }}
                  className="h-8 px-3 rounded-shape-sm bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] hover:opacity-90 text-xs font-bold cursor-pointer transition-all shadow-2xs shrink-0"
                >
                  {isAr ? 'تعيين كخلفية' : 'Set as Background'}
                </button>
              </div>
            )}

            {/* Upload From Device Button */}
            <button
              type="button"
              onClick={handleUploadNewBackground}
              className="w-full h-12 rounded-shape-sm border-2 border-dashed border-[var(--border-accent)]/60 hover:border-[var(--fg-accent)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-subtle)]/70 flex items-center justify-center gap-2 text-xs font-bold text-[var(--text-primary)] cursor-pointer transition-all active:scale-[0.99]"
            >
              <UploadCloud size={16} className="text-[var(--fg-accent)]" />
              <span>{isAr ? 'رفع صورة خلفية جديدة من جهازك' : 'Upload New Background Photo from Computer'}</span>
            </button>

            {/* Pick from User Uploads */}
            {uploads.filter(u => u.type === 'image').length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-[var(--text-secondary)] block">
                  {isAr ? 'اختيار من مكتبة التحميلات الخاصة بك:' : 'Choose from your uploads:'}
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {uploads.filter(u => u.type === 'image').map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleApplyBackgroundUrl(u.url, u.name)}
                      className="group relative aspect-square rounded-shape-xs overflow-hidden border border-[var(--border-default)] hover:border-[var(--fg-accent)] transition-all cursor-pointer shadow-2xs"
                      title={u.name}
                    >
                      <img src={u.url} alt={u.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <span className="absolute inset-x-0 bottom-0 p-1 bg-black/70 text-[8px] text-white truncate text-center">
                        {u.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Modern Gradient Presets */}
            <div className="space-y-2 pt-2 border-t border-[var(--border-main)]">
              <span className="text-xs font-bold text-[var(--text-secondary)] block">
                {isAr ? 'أو اختر خلفية فخمة جاهزة:' : 'Or choose a luxury preset background:'}
              </span>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { name: isAr ? 'نيبولا فضائية' : 'Cyber Nebula', grad: ['#0f172a', '#1e1b4b', '#312e81'] },
                  { name: isAr ? 'شفق الغروب' : 'Sunset Glow', grad: ['#4c0519', '#831843', '#be123c'] },
                  { name: isAr ? 'ذهب ملكي' : 'Luxury Gold', grad: ['#451a03', '#78350f', '#b45309'] },
                  { name: isAr ? 'زمردي داكن' : 'Cyber Emerald', grad: ['#022c22', '#064e3b', '#047857'] }
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const canvas = document.createElement('canvas');
                      canvas.width = imageSize.width || 1080;
                      canvas.height = imageSize.height || 1080;
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                        g.addColorStop(0, preset.grad[0]);
                        g.addColorStop(0.5, preset.grad[1]);
                        g.addColorStop(1, preset.grad[2]);
                        ctx.fillStyle = g;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        handleApplyBackgroundUrl(canvas.toDataURL('image/png'), preset.name);
                      }
                    }}
                    className="p-1.5 rounded-shape-xs border border-[var(--border-default)] hover:border-[var(--border-accent)] flex flex-col items-center gap-1 cursor-pointer transition-all"
                  >
                    <div 
                      className="w-full h-8 rounded-shape-xs border border-white/10" 
                      style={{ background: `linear-gradient(135deg, ${preset.grad.join(', ')})` }} 
                    />
                    <span className="text-[9.5px] font-bold text-[var(--text-secondary)] truncate">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Upgraded Professional Export Options Modal */}
      {isExportModalOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsExportModalOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-shape-md bg-[var(--surface-card)] border border-[var(--border-default)] shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-[var(--text-primary)]"
          >
            <div className="flex items-center gap-2.5 border-b border-[var(--border-main)] pb-3">
              <div className="w-8 h-8 rounded-shape-sm bg-[var(--bg-accent-muted)] border border-[var(--border-accent)]/30 flex items-center justify-center text-[var(--fg-accent)]">
                <Download size={15} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {isAr ? 'تصدير وحفظ الصورة والتصميم' : 'Export & Save Design'}
                </h3>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {isAr ? 'اختر صيغة الملف والدقة المطلوبة للتصدير' : 'Choose format, resolution, and transparency'}
                </p>
              </div>
            </div>

            {/* Custom Filename */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--text-secondary)] block">
                {isAr ? 'اسم الملف:' : 'File Name:'}
              </label>
              <input
                type="text"
                value={customFileName}
                placeholder={artifact.title || 'perplexta_design'}
                onChange={(e) => setCustomFileName(e.target.value)}
                className="w-full h-8 px-2.5 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-shape-xs text-xs font-bold"
              />
            </div>

            {/* Format Selection Tabs */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-secondary)] block">
                {isAr ? 'صيغة الملف (Format):' : 'File Format:'}
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {(['png', 'jpeg', 'webp', 'pdf', 'svg'] as const).map(fmt => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setExportFormat(fmt)}
                    className={`py-1.5 px-2 rounded-shape-sm border text-[11px] font-bold uppercase transition-all cursor-pointer text-center ${
                      exportFormat === fmt
                        ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] border-transparent shadow-2xs'
                        : 'bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border-[var(--border-default)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {fmt === 'jpeg' ? 'JPG' : fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution Scaling Multipliers */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[var(--text-secondary)]">
                  {isAr ? 'مضاعف الدقة والحجم:' : 'Resolution Scale:'}
                </span>
                <span className="font-mono text-[11px] font-bold text-[var(--fg-accent)]">
                  {imageSize.width * exportScale} × {imageSize.height * exportScale} px
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { scale: 1, label: isAr ? '1x (عادي)' : '1x (Standard)' },
                  { scale: 2, label: isAr ? '2x (عالي HD)' : '2x (HD Retina)' },
                  { scale: 3, label: isAr ? '3x (طباعة 300DPI)' : '3x (Print Ultra)' }
                ].map(item => (
                  <button
                    key={item.scale}
                    type="button"
                    onClick={() => setExportScale(item.scale)}
                    className={`py-1.5 px-2 rounded-shape-sm border text-[11px] font-bold transition-all cursor-pointer text-center ${
                      exportScale === item.scale
                        ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] border-transparent shadow-2xs'
                        : 'bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border-[var(--border-default)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transparent Background Option for PNG/WebP/SVG */}
            {['png', 'webp', 'svg'].includes(exportFormat) && (
              <label className="flex items-center gap-2.5 p-2 bg-[var(--surface-subtle)] rounded-shape-sm border border-[var(--border-default)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportTransparent}
                  onChange={(e) => setExportTransparent(e.target.checked)}
                  className="w-4 h-4 rounded-shape-xs accent-[var(--fg-accent)] cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-xs font-bold text-[var(--text-primary)] block">
                    {isAr ? 'خلفية شفافة (Transparent Background)' : 'Transparent Background'}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] block">
                    {isAr ? 'حفظ النصوص والرسومات فقط بدون الصورة الخلفية' : 'Export only elements without background photo'}
                  </span>
                </div>
              </label>
            )}

            {/* Quality Slider for JPEG / WebP */}
            {['jpeg', 'webp'].includes(exportFormat) && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                  <span>{isAr ? 'جودة وضغط الصورة:' : 'Image Quality:'}</span>
                  <span className="font-mono font-bold">{Math.round(exportQuality * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.05"
                  value={exportQuality}
                  onChange={e => setExportQuality(parseFloat(e.target.value))}
                  className="w-full h-1 bg-[var(--surface-subtle)] rounded-shape-full appearance-none cursor-pointer accent-[var(--fg-accent)]"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-main)]">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="h-8 px-3.5 rounded-shape-sm bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-secondary)] cursor-pointer transition-colors shadow-2xs"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleExecuteExport}
                className="h-8 px-4 rounded-shape-sm bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] hover:opacity-90 text-xs font-bold cursor-pointer transition-all shadow-2xs flex items-center gap-1.5"
              >
                <Download size={13} />
                <span>{isAr ? 'تصدير وتنزيل التصميم' : 'Export & Download'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Template Apply Choice Modal (استبدال التصميم أم إضافة صفحة جديدة) */}
      {pendingTemplatePrompt && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPendingTemplatePrompt(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-shape-md bg-[var(--surface-card)] border border-[var(--border-default)] shadow-2xl p-5 space-y-4 text-[var(--text-primary)] animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-shape-sm bg-[var(--bg-accent-muted)] border border-[var(--border-accent)]/30 flex items-center justify-center text-[var(--fg-accent)]">
                  <Wand2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {isAr ? 'تطبيق القالب الاحترافي' : 'Apply Professional Template'}
                  </h3>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {isAr ? pendingTemplatePrompt.titleAr : pendingTemplatePrompt.titleEn} ({pendingTemplatePrompt.width}×{pendingTemplatePrompt.height} px)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingTemplatePrompt(null)}
                className="w-7 h-7 rounded-shape-xs hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Template Preview Banner */}
            <div className="relative h-28 w-full rounded-shape-sm overflow-hidden border border-[var(--border-default)] bg-slate-900">
              <img 
                src={safeSvgDataUrl(pendingTemplatePrompt.thumbnailUrl)} 
                alt={pendingTemplatePrompt.titleAr} 
                className="w-full h-full object-cover opacity-85"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.style.display = 'none';
                  if (target.parentElement) {
                    target.parentElement.style.background = pendingTemplatePrompt.backgroundColor || '#0f172a';
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-2 start-2 end-2 flex items-center justify-between text-white text-xs font-bold">
                <span>{isAr ? pendingTemplatePrompt.titleAr : pendingTemplatePrompt.titleEn}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-shape-xs bg-black/60">
                  {pendingTemplatePrompt.elements.length} {isAr ? 'طبقات' : 'layers'}
                </span>
              </div>
            </div>

            {/* Prompt Message */}
            <p className="text-xs font-bold text-[var(--text-secondary)] leading-relaxed">
              {isAr 
                ? 'يوجد تصميم قائم بالفعل في مساحة العمل. اختر الطريقة المناسبة لتطبيق القالب:' 
                : 'You have an active design on canvas. How would you like to apply this template?'}
            </p>

            {/* Action Choice Buttons */}
            <div className="grid grid-cols-1 gap-2 pt-1">
              {/* Option 1: Replace Current Design */}
              <button
                type="button"
                onClick={() => executeApplyTemplateReplace(pendingTemplatePrompt)}
                className="w-full h-11 px-4 rounded-shape-sm bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] hover:opacity-90 font-bold text-xs flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <RefreshCw size={15} />
                  <span>{isAr ? 'استبدال التصميم الحالي بالقالب' : 'Replace Current Design'}</span>
                </div>
                <ChevronLeft size={14} className={dir === 'rtl' ? '' : 'rotate-180'} />
              </button>

              {/* Option 2: Add as New Page */}
              <button
                type="button"
                onClick={() => executeApplyTemplateNewPage(pendingTemplatePrompt)}
                className="w-full h-11 px-4 rounded-shape-sm bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] hover:border-[var(--border-accent)] font-bold text-xs text-[var(--text-primary)] flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <Plus size={15} className="text-[var(--fg-accent)]" />
                  <span>
                    {isAr 
                      ? `إضافة كصفحة جديدة (صفحة ${pages.length + 1})` 
                      : `Add as New Page (Page ${pages.length + 1})`}
                  </span>
                </div>
                <ChevronLeft size={14} className={dir === 'rtl' ? '' : 'rotate-180'} />
              </button>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-[var(--border-main)]">
              <button
                type="button"
                onClick={() => setPendingTemplatePrompt(null)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-shape-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Creator Registration Protocol Modal */}
      <CreatorRegistrationModal
        isOpen={isRegistrationModalOpen}
        onClose={() => setIsRegistrationModalOpen(false)}
      />

    </div>
  );
};

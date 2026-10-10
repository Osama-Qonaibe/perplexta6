import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  Sparkles, Upload, Plus, ChevronRight, ChevronLeft, 
  Palette, LayoutTemplate, Sliders, ArrowUpRight, 
  Languages, Camera, Smartphone, Monitor, CreditCard,
  FolderHeart, Star, Trash2, Copy, Search, Filter, ShieldCheck,
  User as UserIcon, Crown, FolderOpen, Image as ImageIcon,
  FileText, Sparkle, RefreshCw, Layers, Check, ExternalLink,
  Edit3, ArrowRight, UploadCloud, Award
} from 'lucide-react';
import { ArtifactImageEditor, CanvasElement, EditorFilters } from '../components/chat/artifacts/ArtifactImageEditor';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { resolveImageUrl } from '../utils/imageResolver';
import { toast } from '@/design-system';
import { 
  StudioProject, 
  getUserStudioProjects, 
  saveUserStudioProject, 
  deleteUserStudioProject, 
  duplicateUserStudioProject, 
  toggleFavoriteStudioProject 
} from '../data/rataqProjects';
import { 
  StudioUploadItem, 
  getStoredStudioUploads,
  getUploadsFromDB,
  getStudioSessionFromDB,
  clearStudioSessionFromDB
} from '../data/rataqUploads';
import { 
  StudioBrandKit, 
  getStoredBrandKit 
} from '../data/rataqBrandKit';
import { PublicGuestLanding } from '../components/PublicGuestLanding';
import { RataqRepoTemplates, RataqRepoTemplate } from '../data/templates';
import { convertRataqTemplateToCanvasElements } from '../utils/rataqTemplateLoader';
import { CreatorRegistrationModal } from '../components/creators/CreatorRegistrationModal';
import { TemplatePreviewModal } from '../components/creators/TemplatePreviewModal';
import { getStoredCreators, getStoredMarketplaceTemplates, recordTemplateUse, MarketplaceTemplate } from '../data/rinexCreators';
import { UNIFIED_PUBLIC_TEMPLATES, PublicTemplateItem } from '../data/publicTemplatesData';

interface CanvasPreset {
  id: string;
  nameAr: string;
  nameEn: string;
  width: number;
  height: number;
  icon: React.ReactNode;
  aspectRatio: string;
  category: 'social' | 'marketing' | 'print' | 'custom';
}

const CANVAS_PRESETS: CanvasPreset[] = [
  {
    id: 'instagram_post',
    nameAr: 'منشور إنستغرام (مربع 1:1)',
    nameEn: 'Instagram Post (1:1)',
    width: 1080,
    height: 1080,
    icon: <Camera className="w-5 h-5 text-pink-500" />,
    aspectRatio: '1:1',
    category: 'social'
  },
  {
    id: 'instagram_portrait',
    nameAr: 'منشور إنستغرام (عمودي 4:5)',
    nameEn: 'Instagram Portrait (4:5)',
    width: 1080,
    height: 1350,
    icon: <Camera className="w-5 h-5 text-pink-600" />,
    aspectRatio: '4:5',
    category: 'social'
  },
  {
    id: 'instagram_story',
    nameAr: 'قصة إنستغرام / ستوري (9:16)',
    nameEn: 'Instagram Story (9:16)',
    width: 1080,
    height: 1920,
    icon: <Smartphone className="w-5 h-5 text-purple-500" />,
    aspectRatio: '9:16',
    category: 'social'
  },
  {
    id: 'tiktok_post',
    nameAr: 'منشور تيك توك / شورتس (9:16)',
    nameEn: 'TikTok & Shorts Post (9:16)',
    width: 1080,
    height: 1920,
    icon: <Smartphone className="w-5 h-5 text-rose-500" />,
    aspectRatio: '9:16',
    category: 'social'
  },
  {
    id: 'youtube_banner',
    nameAr: 'غلاف يوتيوب عريض (16:9)',
    nameEn: 'YouTube Wide Banner (16:9)',
    width: 1920,
    height: 1080,
    icon: <Monitor className="w-5 h-5 text-red-500" />,
    aspectRatio: '16:9',
    category: 'marketing'
  },
  {
    id: 'youtube_thumbnail',
    nameAr: 'صورة يوتيوب مصغرة (16:9)',
    nameEn: 'YouTube Thumbnail',
    width: 1280,
    height: 720,
    icon: <Monitor className="w-5 h-5 text-red-400" />,
    aspectRatio: '16:9',
    category: 'marketing'
  },
  {
    id: 'facebook_post',
    nameAr: 'منشور فيسبوك عريض',
    nameEn: 'Facebook Post',
    width: 1200,
    height: 630,
    icon: <Camera className="w-5 h-5 text-blue-500" />,
    aspectRatio: '1.91:1',
    category: 'social'
  },
  {
    id: 'facebook_story',
    nameAr: 'ستوري فيسبوك (9:16)',
    nameEn: 'Facebook Story',
    width: 1080,
    height: 1920,
    icon: <Smartphone className="w-5 h-5 text-blue-400" />,
    aspectRatio: '9:16',
    category: 'social'
  },
  {
    id: 'twitter_banner',
    nameAr: 'غلاف تويتر / إكس (X)',
    nameEn: 'Twitter / X Banner',
    width: 1500,
    height: 500,
    icon: <Monitor className="w-5 h-5 text-sky-400" />,
    aspectRatio: '3:1',
    category: 'marketing'
  },
  {
    id: 'linkedin_post',
    nameAr: 'منشور لينكد إن احترافي',
    nameEn: 'LinkedIn Post',
    width: 1200,
    height: 627,
    icon: <Monitor className="w-5 h-5 text-blue-700" />,
    aspectRatio: '1.91:1',
    category: 'marketing'
  },
  {
    id: 'linkedin_banner',
    nameAr: 'بانر لينكد إن للشركات',
    nameEn: 'LinkedIn Company Banner',
    width: 1128,
    height: 376,
    icon: <Monitor className="w-5 h-5 text-blue-600" />,
    aspectRatio: '3:1',
    category: 'marketing'
  },
  {
    id: 'pinterest_pin',
    nameAr: 'تصميم بينتريست (Pin 2:3)',
    nameEn: 'Pinterest Pin',
    width: 1000,
    height: 1500,
    icon: <Smartphone className="w-5 h-5 text-red-600" />,
    aspectRatio: '2:3',
    category: 'social'
  },
  {
    id: 'snapchat_ad',
    nameAr: 'إعلان سناب شات / ستوري',
    nameEn: 'Snapchat Ad & Story',
    width: 1080,
    height: 1920,
    icon: <Smartphone className="w-5 h-5 text-amber-400" />,
    aspectRatio: '9:16',
    category: 'social'
  },
  {
    id: 'whatsapp_status',
    nameAr: 'حالة واتساب (9:16)',
    nameEn: 'WhatsApp Status',
    width: 1080,
    height: 1920,
    icon: <Smartphone className="w-5 h-5 text-emerald-500" />,
    aspectRatio: '9:16',
    category: 'social'
  },
  {
    id: 'a4_print',
    nameAr: 'مستند طباعة (A4)',
    nameEn: 'A4 Print Document',
    width: 2480,
    height: 3508,
    icon: <FileText className="w-5 h-5 text-amber-600" />,
    aspectRatio: '1:1.41',
    category: 'print'
  }
];

const PUBLIC_TEMPLATES: PublicTemplateItem[] = UNIFIED_PUBLIC_TEMPLATES;

const PUBLIC_STUDIO_FEATURES = [
  {
    icon: <Layers className="w-5 h-5 text-[var(--accent)]" />,
    titleAr: 'محرر متعدد الصفحات (Multi-Page Canvas)',
    titleEn: 'Multi-Page Canvas System',
    descAr: 'إضافة وتنظيم وتنسيق صفحات متعددة داخل مساحة عمل مرنة مع التمرير السلس بين الصفحات.',
    descEn: 'Create, reorder, and edit stacked multi-page canvases seamlessly.'
  },
  {
    icon: <Sparkles className="w-5 h-5 text-[var(--accent)]" />,
    titleAr: 'المحو السحري وتنقية الخلفيات',
    titleEn: 'AI Magic Eraser & Inpainting',
    descAr: 'إزالة الأجسام غير المرغوبة وترميم خلفية الصور بالذكاء الاصطناعي بنقرة واحدة.',
    descEn: 'Instantly remove unwanted objects and repair background textures.'
  },
  {
    icon: <Edit3 className="w-5 h-5 text-[var(--accent)]" />,
    titleAr: 'خطوط عربية وتشكيل نصوص احترافي',
    titleEn: 'Arabic Calligraphy & Typography',
    descAr: 'مكتبة خطوط عربية فاخرة مع التحكم في ظلال النصوص، الحدود، والتشكيل الجمالي.',
    descEn: 'Curated Arabic fonts with precise text shadows, strokes, and letter spacing.'
  },
  {
    icon: <UploadCloud className="w-5 h-5 text-[var(--accent)]" />,
    titleAr: 'تصدير عالي الدقة 4K بدون علامات مائية',
    titleEn: 'High-Res 4K Exporting',
    descAr: 'حفظ واستخراج التصميمات بصيغ PNG, WEBP, PDF, SVG عالية الجودة مباشرة.',
    descEn: 'Export high-definition graphics in PNG, WEBP, PDF, and SVG vector formats.'
  }
];

function parseTemplateDimensions(dimStr?: string): { width: number; height: number } | undefined {
  if (!dimStr) return undefined;
  const match = dimStr.match(/(\d+)\s*[×xX*]\s*(\d+)/);
  if (match) {
    const w = parseInt(match[1], 10);
    const h = parseInt(match[2], 10);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      return { width: w, height: h };
    }
  }
  return undefined;
}

export const ImageStudioPage: React.FC = () => {
  const { language, setLanguage, dir, theme, siteSettings, user, setIsAuthModalOpen } = useAppContext();
  const isAr = language === 'ar' || dir === 'rtl';
  const navigate = useNavigate();
  const location = useLocation();

  // Active Editor Session State (Immediate synchronous restore to ensure zero flicker or data loss on refresh/reload)
  const [activeImageArtifact, setActiveImageArtifact] = useState<{ id: string; title: string; content: string } | null>(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('rataq_studio_session_active') === 'true') {
        const stored = localStorage.getItem('rataq_studio_session_artifact');
        if (stored) return JSON.parse(stored);
      }
    } catch {}
    return null;
  });

  const [activeInitialElements, setActiveInitialElements] = useState<CanvasElement[] | undefined>(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('rataq_studio_session_active') === 'true') {
        const stored = localStorage.getItem('rataq_studio_session_elements');
        if (stored) return JSON.parse(stored);
      }
    } catch {}
    return undefined;
  });

  const [activeInitialFilters, setActiveInitialFilters] = useState<EditorFilters | undefined>(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('rataq_studio_session_active') === 'true') {
        const stored = localStorage.getItem('rataq_studio_session_filters');
        if (stored) return JSON.parse(stored);
      }
    } catch {}
    return undefined;
  });

  const [activeProjectId, setActiveProjectId] = useState<string | undefined>(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('rataq_studio_session_active') === 'true') {
        return localStorage.getItem('rataq_studio_session_projectId') || undefined;
      }
    } catch {}
    return undefined;
  });

  const [activeInitialPages, setActiveInitialPages] = useState<any[] | undefined>(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('rataq_studio_session_active') === 'true') {
        const stored = localStorage.getItem('rataq_studio_session_pages');
        if (stored) return JSON.parse(stored);
      }
    } catch {}
    return undefined;
  });

  const [activeInitialCurrentPageIndex, setActiveInitialCurrentPageIndex] = useState<number | undefined>(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('rataq_studio_session_active') === 'true') {
        const stored = localStorage.getItem('rataq_studio_session_currentPageIndex');
        if (stored) return parseInt(stored, 10);
      }
    } catch {}
    return undefined;
  });

  const [activeInitialImageSize, setActiveInitialImageSize] = useState<{ width: number; height: number } | undefined>(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('rataq_studio_session_active') === 'true') {
        const stored = localStorage.getItem('rataq_studio_session_imageSize');
        if (stored) return JSON.parse(stored);
      }
    } catch {}
    return undefined;
  });

  useEffect(() => {
    async function loadPending() {
      if (location.state && location.state.loadMarketplaceTemplate) {
        const tpl = location.state.loadMarketplaceTemplate;
        const newId = `project-marketplace-${tpl.id}-${Date.now()}`;
        setActiveProjectId(newId);
        setActiveInitialElements(tpl.elements || []);
        setActiveInitialFilters(undefined);
        const templateSize = ((tpl as any).width && (tpl as any).height) ? { width: (tpl as any).width, height: (tpl as any).height } : parseTemplateDimensions(tpl.dimensions);
        if (templateSize) setActiveInitialImageSize(templateSize);

        const isVideoTpl = Boolean(
          tpl.category === 'reels' || tpl.category === 'video' || tpl.category === 'story' || tpl.category === 'tiktok' ||
          (templateSize && templateSize.width === 1080 && templateSize.height === 1920) ||
          (tpl.titleAr && (tpl.titleAr.includes('ريلز') || tpl.titleAr.includes('فيديو') || tpl.titleAr.includes('ستوري') || tpl.titleAr.includes('تيك توك'))) ||
          (tpl.titleEn && (tpl.titleEn.toLowerCase().includes('reel') || tpl.titleEn.toLowerCase().includes('video') || tpl.titleEn.toLowerCase().includes('story') || tpl.titleEn.toLowerCase().includes('tiktok')))
        );
        try {
          localStorage.setItem('rataq_studio_session_isVideo', isVideoTpl ? 'true' : 'false');
          if (isVideoTpl) {
            localStorage.setItem('rataq_studio_session_templateCategory', tpl.category || 'reels');
          }
        } catch (e) {}

        setActiveImageArtifact({
          id: newId,
          title: isAr ? tpl.titleAr : tpl.titleEn,
          content: tpl.canvasBackground || tpl.thumbnail || tpl.src
        });
        // Clear location state after processing to avoid reload trigger
        window.history.replaceState({}, document.title);
      } else if (user) {
        try {
          const pendingTplId = sessionStorage.getItem('pending_studio_template');
          const pendingTplPayload = sessionStorage.getItem('pending_studio_template_payload');
          if (pendingTplPayload || pendingTplId) {
            const allTpls = await getStoredMarketplaceTemplates();
            let tpl = pendingTplPayload ? JSON.parse(pendingTplPayload) : null;
            if (!tpl && pendingTplId) {
              tpl = allTpls.find(t => t.id === pendingTplId) || (PUBLIC_TEMPLATES.find(t => t.id === pendingTplId) as any);
            }
            if (tpl) {
              await recordTemplateUse(tpl.id);
              const newId = `project-pending-${tpl.id}-${Date.now()}`;
              setActiveProjectId(newId);

              let loadedElements = tpl.elements || [];
              let loadedBg = tpl.canvasBackground || tpl.thumbnail || tpl.src;
              let loadedSize = ((tpl as any).width && (tpl as any).height) ? { width: (tpl as any).width, height: (tpl as any).height } : parseTemplateDimensions(tpl.dimensions);

              if (tpl.repoTemplate) {
                const converted = convertRataqTemplateToCanvasElements(tpl.repoTemplate);
                loadedElements = converted.elements;
                loadedBg = converted.canvasBackground || converted.previewUrl;
                loadedSize = { width: converted.width, height: converted.height };
              }

              const isVideoTpl = Boolean(
                tpl.category === 'reels' || tpl.category === 'video' || tpl.category === 'story' || tpl.category === 'tiktok' ||
                (loadedSize && loadedSize.width === 1080 && loadedSize.height === 1920) ||
                (tpl.titleAr && (tpl.titleAr.includes('ريلز') || tpl.titleAr.includes('فيديو') || tpl.titleAr.includes('ستوري') || tpl.titleAr.includes('تيك توك'))) ||
                (tpl.titleEn && (tpl.titleEn.toLowerCase().includes('reel') || tpl.titleEn.toLowerCase().includes('video') || tpl.titleEn.toLowerCase().includes('story') || tpl.titleEn.toLowerCase().includes('tiktok')))
              );
              try {
                localStorage.setItem('rataq_studio_session_isVideo', isVideoTpl ? 'true' : 'false');
                if (isVideoTpl) {
                  localStorage.setItem('rataq_studio_session_templateCategory', tpl.category || 'reels');
                }
              } catch (e) {}

              setActiveInitialElements(loadedElements);
              setActiveInitialFilters(undefined);
              if (loadedSize) setActiveInitialImageSize(loadedSize);
              setActiveImageArtifact({
                id: newId,
                title: isAr ? (tpl.titleAr || tpl.title) : (tpl.titleEn || tpl.title),
                content: loadedBg
              });
              toast.success(
                isAr 
                  ? 'تم فتح القالب المطلوب في مساحتك الإبداعية المحمية بنجاح!' 
                  : 'Requested template initialized in your protected workspace!'
              );
            }
            sessionStorage.removeItem('pending_studio_template');
            sessionStorage.removeItem('pending_studio_template_payload');
          }
        } catch (e) {}
      }
    }
    loadPending();
  }, [location.state, user, isAr]);

  // Auto-initialize a blank design for logged-in users if there is no active session/artifact,
  // taking them directly to the workspace/canvas without any intermediate dashboard.
  useEffect(() => {
    if (user && !activeImageArtifact) {
      const defaultId = `project-default-${Date.now()}`;
      const defaultWidth = 1080;
      const defaultHeight = 1080;

      // Create a default simple canvas image background
      const canvas = document.createElement('canvas');
      canvas.width = defaultWidth;
      canvas.height = defaultHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, defaultWidth, defaultHeight);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#1e293b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, defaultWidth, defaultHeight);

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, defaultWidth, defaultHeight);
      }
      const defaultBg = canvas.toDataURL('image/png');

      setActiveProjectId(defaultId);
      setActiveInitialElements([]);
      setActiveInitialFilters(undefined);
      setActiveInitialImageSize({ width: defaultWidth, height: defaultHeight });
      setActiveImageArtifact({
        id: defaultId,
        title: isAr ? 'تصميم جديد' : 'New Design',
        content: defaultBg
      });

      // Save session so it's instantly active and bypasses any intermediate state on page refresh
      try {
        localStorage.setItem('rataq_studio_session_active', 'true');
        localStorage.setItem('rataq_studio_session_projectId', defaultId);
        localStorage.setItem('rataq_studio_session_designTitle', isAr ? 'تصميم جديد' : 'New Design');
        localStorage.setItem('rataq_studio_session_elements', '[]');
        localStorage.setItem('rataq_studio_session_imageSize', JSON.stringify({ width: defaultWidth, height: defaultHeight }));
      } catch (e) {}
    }
  }, [user, activeImageArtifact, isAr]);

  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState<boolean>(false);
  const [previewTemplate, setPreviewTemplate] = useState<MarketplaceTemplate | null>(null);
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<'all' | 'community' | 'marketing' | 'reels' | 'story' | 'social' | 'repo'>('all');
  const [aspectRatioFilter, setAspectRatioFilter] = useState<'all' | '1:1' | '9:16' | '16:9' | '4:5'>('all');

  const [isUserRegisteredCreator, setIsUserRegisteredCreator] = useState<boolean>(false);
  const [communityMarketplaceTemplates, setCommunityMarketplaceTemplates] = useState<MarketplaceTemplate[]>([]);

  // Search, Pagination & Hover-Video optimization states for 1,000+ templates
  const [templateSearchQuery, setTemplateSearchQuery] = useState<string>('');
  const [templateVisibleCount, setTemplateVisibleCount] = useState<number>(24);
  const [hoveredTemplateCardId, setHoveredTemplateCardId] = useState<string | null>(null);

  useEffect(() => {
    setTemplateVisibleCount(24);
  }, [templateCategoryFilter, aspectRatioFilter, templateSearchQuery]);

  // Master deduplicated templates list combining community marketplace and public presets
  const allUnifiedTemplates = useMemo(() => {
    const items: any[] = [];
    const seenIds = new Set<string>();

    if (Array.isArray(communityMarketplaceTemplates)) {
      for (const m of communityMarketplaceTemplates) {
        if (!m || !m.id) continue;
        const rawId = String(m.id).replace(/^remotion_/, '');
        if (!seenIds.has(m.id) && !seenIds.has(rawId)) {
          seenIds.add(m.id);
          seenIds.add(rawId);
          items.push(m);
        }
      }
    }

    for (const p of UNIFIED_PUBLIC_TEMPLATES) {
      if (!p || !p.id) continue;
      const rawId = String(p.id).replace(/^remotion_/, '');
      if (!seenIds.has(p.id) && !seenIds.has(rawId)) {
        seenIds.add(p.id);
        seenIds.add(rawId);
        items.push({
          id: p.id,
          creatorId: 'rinex-curated',
          creatorName: isAr ? 'استوديو رينكس' : 'Rinex Studio',
          creatorUsername: 'rinex_official',
          creatorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
          titleAr: p.titleAr,
          titleEn: p.titleEn,
          descriptionAr: `قالب ${p.titleAr} احترافي بدقة فائقة قابل للتعديل بالكامل.`,
          descriptionEn: `High-fidelity ${p.titleEn} template with editable layers.`,
          thumbnail: p.src,
          dimensions: p.dimensions || '1920x1080',
          category: p.category || 'marketing',
          categoryLabelAr: p.categoryLabelAr || 'قالب إبداعي',
          categoryLabelEn: p.category || 'Creative',
          rating: 4.9,
          usesCount: 1250,
          videoUrl: p.videoUrl || p.previewVideoUrl,
          elements: p.elements || [],
          repoTemplate: p.repoTemplate
        });
      }
    }

    return items;
  }, [communityMarketplaceTemplates, isAr]);

  // High-performance filtered & searched templates
  const filteredMarketplaceTemplates = useMemo(() => {
    return allUnifiedTemplates.filter((m: any) => {
      // 1. Search filter
      if (templateSearchQuery.trim()) {
        const q = templateSearchQuery.trim().toLowerCase();
        const matchAr = m.titleAr?.toLowerCase().includes(q);
        const matchEn = m.titleEn?.toLowerCase().includes(q);
        const matchCat = m.category?.toLowerCase().includes(q);
        const matchDescAr = m.descriptionAr?.toLowerCase().includes(q);
        if (!matchAr && !matchEn && !matchCat && !matchDescAr) return false;
      }

      // 2. Category Filter
      if (templateCategoryFilter !== 'all') {
        if (templateCategoryFilter === 'repo') {
          if (!String(m.id).startsWith('remotion_') && m.creatorId !== 'rinex-curated') return false;
        } else if (m.category !== templateCategoryFilter) {
          return false;
        }
      }

      // 3. Aspect Ratio Filter
      if (aspectRatioFilter !== 'all') {
        const dim = parseTemplateDimensions(m.dimensions) || { width: m.width || 1080, height: m.height || 1080 };
        const r = dim.width / dim.height;
        if (aspectRatioFilter === '1:1' && Math.abs(r - 1.0) >= 0.08) return false;
        if (aspectRatioFilter === '9:16' && Math.abs(r - (9/16)) >= 0.08) return false;
        if (aspectRatioFilter === '16:9' && Math.abs(r - (16/9)) >= 0.08) return false;
        if (aspectRatioFilter === '4:5' && Math.abs(r - (4/5)) >= 0.08) return false;
      }

      return true;
    });
  }, [allUnifiedTemplates, templateSearchQuery, templateCategoryFilter, aspectRatioFilter]);

  // Paginated visible slice for instant 60fps rendering without DOM lag
  const visibleMarketplaceTemplates = useMemo(() => {
    return filteredMarketplaceTemplates.slice(0, templateVisibleCount);
  }, [filteredMarketplaceTemplates, templateVisibleCount]);

  useEffect(() => {
    async function checkCreatorStatus() {
      if (!user) {
        setIsUserRegisteredCreator(false);
        return;
      }
      try {
        const creators = await getStoredCreators();
        const status = creators.some(c => 
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
    async function loadMarketplace() {
      try {
        const list = await getStoredMarketplaceTemplates();
        setCommunityMarketplaceTemplates(list);
      } catch (err) {
        console.error('Error loading community templates:', err);
      }
    }
    checkCreatorStatus();
    loadMarketplace();
  }, [user]);

  const logo = theme === 'dark' ? siteSettings?.logoBase64 : (siteSettings?.logoLightBase64 || siteSettings?.logoBase64);

  // Active Tab State (Default to 'templates' for guest showcase or 'projects' for logged-in users)
  const [activeTab, setActiveTab] = useState<'projects' | 'templates' | 'presets' | 'brand' | 'uploads' | 'features'>(() => user ? 'projects' : 'templates');
  const [projectSearchQuery, setProjectSearchQuery] = useState<string>('');
  const [projectFilterFavorite, setProjectFilterFavorite] = useState<boolean>(false);

  // Public Landing Category Filter State (Guest Mode)
  const [publicCategoryFilter, setPublicCategoryFilter] = useState<'all' | 'reels' | 'story' | 'marketing' | 'social' | 'youtube' | 'cards'>('all');

  const filteredPublicTemplates = useMemo(() => {
    if (publicCategoryFilter === 'all') return PUBLIC_TEMPLATES;
    return PUBLIC_TEMPLATES.filter(t => t.category === publicCategoryFilter);
  }, [publicCategoryFilter]);

  // User Isolated Projects & Assets State
  const [projects, setProjects] = useState<StudioProject[]>(() => getUserStudioProjects(user?.id));
  const [uploads, setUploads] = useState<StudioUploadItem[]>(() => getStoredStudioUploads(user?.id));
  const [brandKit, setBrandKit] = useState<StudioBrandKit>(() => getStoredBrandKit(user?.id, siteSettings));

  // Sync projects and brandkit when user changes
  useEffect(() => {
    setProjects(getUserStudioProjects(user?.id));
    setUploads(getStoredStudioUploads(user?.id));
    getUploadsFromDB(user?.id).then((items) => {
      if (items && items.length > 0) {
        setUploads(items);
      }
    });
    setBrandKit(getStoredBrandKit(user?.id, siteSettings));
  }, [user?.id, siteSettings]);

  // Guard activeTab for guest users (Strict guest isolation)
  useEffect(() => {
    if (!user && (activeTab === 'projects' || activeTab === 'brand' || activeTab === 'uploads')) {
      setActiveTab('templates');
    }
  }, [user, activeTab]);

  // Custom Dimension State
  const [customW, setCustomW] = useState<number>(1080);
  const [customH, setCustomH] = useState<number>(1080);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);

  // Restore previous active canvas session on refresh / reload
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // 1. Try restoring from unlimited IndexedDB first (bypasses localStorage limits completely)
        const dbSession = await getStudioSessionFromDB();
        if (dbSession && dbSession.artifact && dbSession.elements) {
          setActiveProjectId(dbSession.projectId);
          setActiveImageArtifact(dbSession.artifact);
          setActiveInitialElements(dbSession.elements);
          if (dbSession.filters) setActiveInitialFilters(dbSession.filters);
          if (dbSession.imageSize) setActiveInitialImageSize(dbSession.imageSize);
          if (dbSession.pages) setActiveInitialPages(dbSession.pages);
          if (dbSession.currentPageIndex !== undefined) {
            setActiveInitialCurrentPageIndex(dbSession.currentPageIndex);
          }
          toast.success(
            isAr 
              ? 'تم استعادة جلستك التصميمية السابقة تلقائياً بنجاح! 🔄' 
              : 'Your previous canvas design session was successfully restored! 🔄'
          );
          return;
        }

        // 2. Fallback to localStorage if no IndexedDB session exists
        const sessionActive = localStorage.getItem('rataq_studio_session_active');
        if (sessionActive === 'true') {
          const storedProjId = localStorage.getItem('rataq_studio_session_projectId') || undefined;
          const storedArtifact = localStorage.getItem('rataq_studio_session_artifact');
          const storedElements = localStorage.getItem('rataq_studio_session_elements');
          const storedFilters = localStorage.getItem('rataq_studio_session_filters');
          const storedImageSize = localStorage.getItem('rataq_studio_session_imageSize');
          const storedPages = localStorage.getItem('rataq_studio_session_pages');
          const storedCurrentPageIndex = localStorage.getItem('rataq_studio_session_currentPageIndex');

          if (storedArtifact && storedElements) {
            setActiveProjectId(storedProjId);
            setActiveImageArtifact(JSON.parse(storedArtifact));
            setActiveInitialElements(JSON.parse(storedElements));
            if (storedFilters) {
              setActiveInitialFilters(JSON.parse(storedFilters));
            }
            if (storedImageSize) {
              setActiveInitialImageSize(JSON.parse(storedImageSize));
            }
            if (storedPages) {
              setActiveInitialPages(JSON.parse(storedPages));
            }
            if (storedCurrentPageIndex) {
              setActiveInitialCurrentPageIndex(parseInt(storedCurrentPageIndex) || 0);
            }
            toast.success(
              isAr 
                ? 'تم استعادة جلستك التصميمية السابقة تلقائياً بنجاح! 🔄' 
                : 'Your previous canvas design session was successfully restored! 🔄'
            );
          }
        }
      } catch (err) {
        console.warn('Failed to restore active canvas session:', err);
      }
    };

    restoreSession();
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered Projects for Current User
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = !projectSearchQuery.trim() || 
        p.title.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
        p.tags?.some(t => t.toLowerCase().includes(projectSearchQuery.toLowerCase()));
      const matchesFav = !projectFilterFavorite || p.isFavorite;
      return matchesSearch && matchesFav;
    });
  }, [projects, projectSearchQuery, projectFilterFavorite]);

  // Helper to open an existing project
  const handleOpenProject = (project: StudioProject) => {
    if (!user) {
      toast.error(isAr ? 'حفاظاً على أمان بياناتك، يرجى تسجيل الدخول أو إنشاء حساب جديد لتحديد مالك لمشروعك' : 'For security, please log in to set a project owner');
      setIsAuthModalOpen(true);
      return;
    }
    setActiveProjectId(project.id);
    setActiveInitialElements(project.elements || []);
    setActiveInitialFilters(project.filters);
    setActiveImageArtifact({
      id: project.id,
      title: project.title,
      content: project.canvasBackground || project.previewUrl
    });
    toast.success(isAr ? `تم فتح مشروع "${project.title}"` : `Opened project "${project.title}"`);
  };

  // Helper to create blank solid canvas image
  const handleCreateBlankCanvas = (width: number, height: number, title: string) => {
    if (!user) {
      toast.error(isAr ? 'حفاظاً على أمان بياناتك، يرجى تسجيل الدخول أو إنشاء حساب جديد لتحديد مالك لمشروعك' : 'For security, please log in to set a project owner');
      setIsAuthModalOpen(true);
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, width, height);
    }
    const dataUrl = canvas.toDataURL('image/png');
    const newId = `project-${Date.now()}`;

    const isVideoFormat = Boolean(
      (width === 1080 && height === 1920) ||
      (width === 1920 && height === 1080) ||
      (width === 1280 && height === 720) ||
      title.toLowerCase().includes('reels') ||
      title.toLowerCase().includes('tiktok') ||
      title.toLowerCase().includes('story') ||
      title.toLowerCase().includes('shorts') ||
      title.includes('ستوري') ||
      title.includes('ريلز') ||
      title.includes('تيك توك') ||
      title.includes('فيديو') ||
      title.includes('يوتيوب')
    );
    try {
      localStorage.setItem('rataq_studio_session_isVideo', isVideoFormat ? 'true' : 'false');
      if (isVideoFormat) {
        localStorage.setItem('rataq_studio_session_templateCategory', 'reels');
      }
    } catch (e) {}

    setActiveProjectId(newId);
    setActiveInitialElements([]);
    setActiveInitialFilters(undefined);
    setActiveInitialImageSize({ width, height });
    setActiveImageArtifact({
      id: newId,
      title,
      content: dataUrl
    });

    toast.success(
      isAr 
        ? `تم إنشاء مساحة عمل جديدة (${width} × ${height}) في ${isVideoFormat ? 'محرر الفيديو والمونتاج 🎬' : 'محرر الصور والبوسترات 🎨'}` 
        : `Created new ${isVideoFormat ? 'Video Studio' : 'Image Studio'} canvas (${width} × ${height})`
    );
  };

  // Upload Local Image File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      toast.error(isAr ? 'حفاظاً على أمان بياناتك، يرجى تسجيل الدخول أولاً لتحديد مالك للمشروع وحفظ صورتك المرفوعة' : 'Please log in first to set a project owner and upload images');
      setIsAuthModalOpen(true);
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error(isAr ? 'يرجى اختيار ملف صورة صالح' : 'Please upload a valid image file');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          const newId = `project-upload-${Date.now()}`;
          setActiveProjectId(newId);
          setActiveInitialElements([]);
          setActiveInitialFilters(undefined);
          setActiveImageArtifact({
            id: newId,
            title: file.name.replace(/\.[^/.]+$/, ''),
            content: ev.target.result as string
          });
          toast.success(isAr ? 'تم فتح الصورة في استوديو رينكس' : 'Image loaded into studio');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Project Actions
  const handleDeleteProject = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    const updated = deleteUserStudioProject(user?.id, projectId);
    setProjects(updated);
    toast.success(isAr ? 'تم حذف المشروع من محفظتك' : 'Project deleted from portfolio');
  };

  const handleDuplicateProject = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    const updated = duplicateUserStudioProject(user?.id, projectId);
    setProjects(updated);
    toast.success(isAr ? 'تم تكرار المشروع بنجاح' : 'Project duplicated successfully');
  };

  const handleToggleFavorite = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    const updated = toggleFavoriteStudioProject(user?.id, projectId);
    setProjects(updated);
  };

  // If user is logged in but active session is not fully initialized, show high-fidelity loading state
  if (user && !activeImageArtifact) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-[#0f172a] flex flex-col items-center justify-center select-none z-50">
        <div className="flex flex-col items-center gap-3.5 text-slate-100">
          <RefreshCw size={24} className="animate-spin text-[var(--accent)]" />
          <p className="text-xs font-bold tracking-wide font-sans">
            {isAr ? 'جاري تحضير مساحتك الإبداعية الفاخرة...' : 'Preparing your premium creative workspace...'}
          </p>
        </div>
      </div>
    );
  }

  // If editor is active, render full-screen RATAQ Studio workspace
  if (activeImageArtifact) {
    return (
      <div className="fixed inset-0 z-50 w-screen h-screen bg-[var(--surface-page)] flex flex-col overflow-hidden select-none">
        <ArtifactImageEditor
          artifact={activeImageArtifact}
          initialElements={activeInitialElements}
          initialFilters={activeInitialFilters}
          initialImageSize={activeInitialImageSize}
          projectId={activeProjectId}
          initialPages={activeInitialPages}
          initialCurrentPageIndex={activeInitialCurrentPageIndex}
          onSaveProject={(savedProject) => {
            setProjects(getUserStudioProjects(user?.id));
          }}
          onClose={() => {
            try {
              localStorage.removeItem('rataq_studio_session_active');
              localStorage.removeItem('rataq_studio_session_projectId');
              localStorage.removeItem('rataq_studio_session_artifact');
              localStorage.removeItem('rataq_studio_session_elements');
              localStorage.removeItem('rataq_studio_session_filters');
              localStorage.removeItem('rataq_studio_session_imageSize');
              localStorage.removeItem('rataq_studio_session_designTitle');
              localStorage.removeItem('rataq_studio_session_pages');
              localStorage.removeItem('rataq_studio_session_currentPageIndex');
              localStorage.removeItem('rataq_studio_session_isVideo');
              localStorage.removeItem('rataq_studio_session_templateCategory');
              clearStudioSessionFromDB();
            } catch (e) {}
            setActiveImageArtifact(null);
            setActiveProjectId(undefined);
            setActiveInitialElements(undefined);
            setActiveInitialFilters(undefined);
            setActiveInitialImageSize(undefined);
            setActiveInitialPages(undefined);
            setActiveInitialCurrentPageIndex(undefined);
            setProjects(getUserStudioProjects(user?.id));
            navigate('/studio');
          }}
          isFullscreen={true}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen-safe bg-[var(--surface-page)] text-[var(--text-primary)] font-sans pb-28 md:pb-20 transition-theme flex flex-col">
      
      {/* Top Header Navigation (Perplexta Unified Standard) */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[var(--surface-page)]/95 border-b border-[var(--border-default)] pt-[env(safe-area-inset-top,0px)] transition-theme shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Unified Logo & Morphing Exit Button */}
            <button 
              type="button"
              onClick={() => navigate('/studio')} 
              className="group/logo-btn relative w-8 h-8 rounded-shape-sm overflow-hidden border border-[var(--border-default)] hover:border-[var(--accent-foreground)]/60 bg-transparent hover:bg-[var(--surface-subtle)] transition-all duration-fast flex items-center justify-center flex-shrink-0 cursor-pointer active:scale-95 shadow-2xs before:absolute before:-inset-1.5 before:content-['']"
              title={isAr ? 'الخروج والعودة للاستوديو العام' : 'Exit to Studio Hub'}
              aria-label={isAr ? 'الخروج والعودة للاستوديو العام' : 'Exit to Studio Hub'}
            >
              {/* Normal Logo */}
              <div className="w-full h-full p-1 flex items-center justify-center transition-all duration-base group-hover/logo-btn:opacity-0 group-hover/logo-btn:scale-75">
                <img 
                  src={resolveImageUrl(logo, 'general') || '/brand/default-logo.svg'} 
                  alt={isAr ? "رينكس" : "Rinex"} 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/brand/default-logo.svg';
                  }}
                />
              </div>

              {/* Glassy Outward Exit Arrow on Hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 scale-75 group-hover/logo-btn:opacity-100 group-hover/logo-btn:scale-100 transition-all duration-fast pointer-events-none bg-[var(--surface-subtle)]">
                <div className="w-6 h-6 rounded-shape-xs bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--text-primary)] flex items-center justify-center shadow-2xs">
                  {dir === 'rtl' ? <ChevronRight size={14} className="stroke-[2.5]" /> : <ChevronLeft size={14} className="stroke-[2.5]" />}
                </div>
              </div>
            </button>

            {/* Studio Title */}
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] leading-tight tracking-tight">
                {isAr ? 'رينكس' : 'Rinex'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCreateBlankCanvas(1080, 1080, isAr ? 'منشور إنستغرام (1:1)' : 'Instagram Post (1:1)')}
              className="h-8 px-3 rounded-shape-sm bg-[var(--comp-button-primary-bg)] hover:opacity-90 text-[var(--comp-button-primary-fg)] font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              title={isAr ? 'بدء تصميم منشور جديد' : 'Start New Post'}
            >
              <Plus size={14} />
              <span className="hidden sm:inline">{isAr ? 'منشور جديد' : 'New Post'}</span>
            </button>
            <button
              type="button"
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="w-8 h-8 rounded-shape-sm border border-[var(--border-default)] hover:border-[var(--border-accent)] bg-transparent hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer"
              title={language === 'ar' ? 'English' : 'العربية'}
            >
              <Languages size={14} />
            </button>
            <ThemeToggleButton 
              variant="icon-button" 
              size="sm" 
              className="!w-8 !h-8 !rounded-shape-sm !border-[var(--border-default)] hover:!border-[var(--border-accent)] !bg-transparent hover:!bg-[var(--surface-subtle)] !text-[var(--text-secondary)] hover:!text-[var(--text-primary)] transition-all duration-150" 
            />
          </div>
        </div>
      </header>

      {/* Main Studio Landing Hub */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        
        {/* 1. Unauthenticated Public Guest Landing Showcase OR Sovereign User Creator Workspace */}
        <PublicGuestLanding />
        {false && user && (
          <div className="space-y-6">
            {/* Creator Profile Banner */}
            <section className="p-5 sm:p-6 rounded-shape-lg bg-[var(--surface-card)] border border-[var(--border-default)] shadow-2xs relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start sm:items-center gap-4">
                {/* User Avatar / Profile Icon */}
                <div className="relative">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-shape-md overflow-hidden bg-[var(--surface-subtle)] border-2 border-[var(--border-accent)] flex items-center justify-center text-[var(--accent)] font-bold text-xl shadow-sm flex-shrink-0">
                    {user?.avatar ? (
                      <img src={resolveImageUrl(user?.avatar, 'avatar')} alt={user?.name || ''} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-7 h-7 text-[var(--accent)]" />
                    )}
                  </div>
                  <div className="absolute -bottom-1 -end-1 w-5 h-5 rounded-full bg-[var(--fg-success)] border-2 border-[var(--surface-card)] flex items-center justify-center text-white" title={isAr ? 'الحساب نشط ومتصل' : 'Account Active'}>
                    <Check size={10} className="stroke-[3]" />
                  </div>
                </div>

                {/* Profile Info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black text-[var(--text-primary)] tracking-tight">
                      {user?.name || (isAr ? 'مصمم رينكس المبدع' : 'Rinex Creative Designer')}
                    </h2>
                    <span className="px-2 py-0.5 rounded-shape-xs bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold flex items-center gap-1">
                      <Crown size={11} />
                      <span>{user?.subscription?.plan_name_ar || (isAr ? 'باقة المصممين PRO' : 'PRO Creator')}</span>
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {user?.email || (isAr ? 'حساب تصميم شخصي معزول ومحفوظ سحابياً' : 'Isolated personal creator workspace')}
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-[11px] text-[var(--text-muted)] font-mono">
                    <span>📁 {projects.length} {isAr ? 'تصميم خاص' : 'Designs'}</span>
                    <span>•</span>
                    <span>🎨 {brandKit.logos.length} {isAr ? 'شعارات براند' : 'Brand Logos'}</span>
                    <span>•</span>
                    <span>☁️ {uploads.length} {isAr ? 'ملفات مرفوعة' : 'Uploads'}</span>
                  </div>
                </div>
              </div>

              {/* Quick Hub Actions */}
              <div className="flex items-center gap-2.5 w-full md:w-auto justify-start md:justify-end flex-wrap">
                {/* Dynamic Creator Hub / Registration CTA */}
                {isUserRegisteredCreator ? (
                  <button
                    type="button"
                    onClick={() => navigate('/settings/creators-hub')}
                    className="h-9 px-3.5 rounded-shape-sm bg-gradient-to-r from-purple-600 to-[var(--accent)] text-slate-950 hover:brightness-110 font-black text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
                    title={isAr ? 'لوحة تحكم الأرباح والإحصائيات الخاصة بك' : 'Your Creator Earnings & Analytics Dashboard'}
                  >
                    <Award size={14} className="text-slate-950 fill-current" />
                    <span>{isAr ? 'لوحة تحكم المبدع' : 'Creator Dashboard'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsRegistrationModalOpen(true)}
                    className="h-9 px-3.5 rounded-shape-sm bg-gradient-to-r from-amber-500 via-[var(--accent)] to-purple-600 text-slate-950 hover:brightness-110 font-black text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
                    title={isAr ? 'انضم لشبكة صناع محتوى رينكس وابدأ الربح ($50 مكافأة)' : 'Join Rinex Creators Network & Earn ($50 Bonus)'}
                  >
                    <Sparkles size={13} className="animate-pulse text-slate-950 fill-current" />
                    <span>{isAr ? 'سجل كمبدع معتمد ($50)' : 'Become Creator ($50)'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 px-3.5 rounded-shape-sm bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-default)] hover:border-[var(--border-accent)] text-[var(--text-primary)] font-bold text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-2xs"
                >
                  <Upload size={13} className="text-[var(--accent)]" />
                  <span>{isAr ? 'رفع صورة وتعديلها' : 'Upload Image'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(true)}
                  className="h-9 px-3.5 rounded-shape-sm bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] hover:opacity-90 font-bold text-xs flex items-center gap-2 shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  <Sliders size={13} />
                  <span>{isAr ? 'مقاس مخصص' : 'Custom Size'}</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </section>

        {/* 2. Navigation Tabs (Canva Style Menu Bar) */}
        <section className="flex items-center justify-between border-b border-[var(--border-default)] pb-2 overflow-x-auto no-scrollbar gap-2">
          <div className="flex items-center gap-1.5 min-w-max">
            {user ? (
              /* LOGGED IN USER TABS */
              <>
                {/* Tab 1: My Personal Projects */}
                <button
                  type="button"
                  onClick={() => setActiveTab('projects')}
                  className={`h-9 px-3.5 rounded-shape-sm text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'projects'
                      ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]'
                  }`}
                >
                  <FolderHeart size={14} />
                  <span>{isAr ? 'مشاريعي وتصميماتي الخاصة' : 'My Designs & Projects'}</span>
                  <span className={`px-1.5 py-0.2 rounded-shape-xs text-[10px] font-mono ${
                    activeTab === 'projects' ? 'bg-white/20 text-white' : 'bg-[var(--surface-subtle)] text-[var(--text-muted)]'
                  }`}>
                    {projects.length}
                  </span>
                </button>

                {/* Tab 2: Pro Templates */}
                <button
                  type="button"
                  onClick={() => setActiveTab('templates')}
                  className={`h-9 px-3.5 rounded-shape-sm text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'templates'
                      ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]'
                  }`}
                >
                  <Palette size={14} />
                  <span>{isAr ? 'قوالب رينكس الاحترافية' : 'Pro Templates'}</span>
                </button>

                {/* Tab 3: Presets & Platforms */}
                <button
                  type="button"
                  onClick={() => setActiveTab('presets')}
                  className={`h-9 px-3.5 rounded-shape-sm text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'presets'
                      ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]'
                  }`}
                >
                  <LayoutTemplate size={14} />
                  <span>{isAr ? 'مقاسات المنصات' : 'Canvas Sizes'}</span>
                </button>

                {/* Tab 4: Brand Kit */}
                <button
                  type="button"
                  onClick={() => setActiveTab('brand')}
                  className={`h-9 px-3.5 rounded-shape-sm text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'brand'
                      ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]'
                  }`}
                >
                  <Sparkles size={14} />
                  <span>{isAr ? 'العلامة التجارية والهوية' : 'Brand Kit'}</span>
                </button>

                {/* Tab 5: My Uploads */}
                <button
                  type="button"
                  onClick={() => setActiveTab('uploads')}
                  className={`h-9 px-3.5 rounded-shape-sm text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'uploads'
                      ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]'
                  }`}
                >
                  <UploadCloud size={14} />
                  <span>{isAr ? 'مكتبة المرفوعات' : 'Uploads Library'}</span>
                </button>
              </>
            ) : (
              /* GUEST PUBLIC VISITORS ONLY TABS */
              <>
                {/* Public Tab 1: Ready Templates */}
                <button
                  type="button"
                  onClick={() => setActiveTab('templates')}
                  className={`h-9 px-3.5 rounded-shape-sm text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'templates'
                      ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]'
                  }`}
                >
                  <Palette size={14} />
                  <span>{isAr ? 'قوالب ونماذج جاهزة' : 'Ready Templates'}</span>
                </button>

                {/* Public Tab 2: Canvas Preset Sizes */}
                <button
                  type="button"
                  onClick={() => setActiveTab('presets')}
                  className={`h-9 px-3.5 rounded-shape-sm text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'presets'
                      ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]'
                  }`}
                >
                  <LayoutTemplate size={14} />
                  <span>{isAr ? 'أبعاد ومقاسات الكانفاس' : 'Canvas Sizes'}</span>
                </button>

                {/* Public Tab 3: Studio Features */}
                <button
                  type="button"
                  onClick={() => setActiveTab('features')}
                  className={`h-9 px-3.5 rounded-shape-sm text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'features'
                      ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]'
                  }`}
                >
                  <Sparkles size={14} />
                  <span>{isAr ? 'مميزات وإمكانيات الاستوديو' : 'Studio Features'}</span>
                </button>
              </>
            )}
          </div>
        </section>

        {/* 3. TAB CONTENT VIEWS */}

        {/* TAB 1: MY PROJECTS (Personal Isolated Portfolio) */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--surface-subtle)] p-3 rounded-shape-md border border-[var(--border-default)]">
              <div className="relative w-full sm:w-80">
                <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={projectSearchQuery}
                  onChange={(e) => setProjectSearchQuery(e.target.value)}
                  placeholder={isAr ? 'بحث في مشاريعك وتصميماتك...' : 'Search your designs...'}
                  className="w-full ps-9 pe-3 py-1.5 rounded-shape-sm bg-[var(--surface-card)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setProjectFilterFavorite(prev => !prev)}
                  className={`h-8 px-3 rounded-shape-sm text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    projectFilterFavorite 
                      ? 'bg-amber-500/15 text-amber-500 border-amber-500/30' 
                      : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Star size={13} className={projectFilterFavorite ? 'fill-amber-500' : ''} />
                  <span>{isAr ? 'المفضلة فقط' : 'Favorites'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCreateBlankCanvas(1080, 1080, isAr ? 'تصميم جديد' : 'New Design')}
                  className="h-8 px-3 rounded-shape-sm bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs hover:opacity-90 active:scale-95"
                >
                  <Plus size={13} />
                  <span>{isAr ? 'مشروع جديد' : 'New Project'}</span>
                </button>
              </div>
            </div>

            {/* Projects Grid */}
            {filteredProjects.length === 0 ? (
              <div className="p-12 text-center rounded-shape-md bg-[var(--surface-card)] border border-[var(--border-default)] space-y-3">
                <div className="w-12 h-12 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-muted)] flex items-center justify-center mx-auto">
                  <FolderHeart size={20} />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {isAr ? 'لا توجد مشاريع مطابقة للبحث' : 'No projects found'}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                  {isAr ? 'ابدأ الآن بإنشاء تصميم جديد أو تعديل أحد القوالب الجاهزة وحفظه في ملفك الشخصي.' : 'Start by creating a new design or editing a template and saving to your account.'}
                </p>
                <button
                  type="button"
                  onClick={() => handleCreateBlankCanvas(1080, 1080, isAr ? 'تصميم جديد' : 'New Design')}
                  className="h-8 px-4 rounded-shape-sm bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-2xs hover:opacity-90 active:scale-95"
                >
                  <Plus size={13} />
                  <span>{isAr ? 'إنشاء أول مشروع' : 'Create First Project'}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProjects.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => handleOpenProject(proj)}
                    className="group rounded-shape-md bg-[var(--surface-card)] border border-[var(--border-default)] hover:border-[color-mix(in_oklab,var(--accent)_45%,var(--border-default))] overflow-hidden shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col active:scale-[0.99]"
                  >
                    {/* Thumbnail Preview */}
                    <div className="h-44 w-full bg-[var(--surface-subtle)] overflow-hidden relative flex items-center justify-center p-2">
                      <img
                        src={proj.previewUrl}
                        alt={proj.title}
                        className="max-h-full max-w-full object-contain rounded-shape-xs group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      
                      {/* Top Badges */}
                      <div className="absolute top-2.5 start-2.5 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 text-[9px] font-mono font-bold rounded-shape-xs bg-[var(--surface-card)]/90 text-[var(--text-primary)] border border-[var(--border-default)] backdrop-blur-xs shadow-2xs">
                          {proj.width} × {proj.height}
                        </span>
                        {proj.elements && proj.elements.length > 0 && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-shape-xs bg-[var(--accent)] text-white shadow-2xs">
                            {proj.elements.length} {isAr ? 'عنصر' : 'layers'}
                          </span>
                        )}
                      </div>

                      {/* Favorite Button */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(e, proj.id)}
                        className={`absolute top-2.5 end-2.5 w-7 h-7 rounded-shape-xs flex items-center justify-center transition-all backdrop-blur-xs border ${
                          proj.isFavorite
                            ? 'bg-amber-500/90 text-white border-amber-600'
                            : 'bg-[var(--surface-card)]/80 text-[var(--text-muted)] hover:text-amber-500 border-[var(--border-default)]'
                        }`}
                        title={isAr ? 'المفضلة' : 'Favorite'}
                      >
                        <Star size={12} className={proj.isFavorite ? 'fill-white' : ''} />
                      </button>
                    </div>

                    {/* Project Meta & Action Footer */}
                    <div className="p-3 bg-[var(--surface-card)] border-t border-[var(--border-default)] space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-1">
                            {proj.title}
                          </h4>
                          <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                            {isAr ? 'آخر تعديل: ' : 'Updated: '}
                            {new Date(proj.updatedAt || proj.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-[var(--border-default)] text-[10px]">
                        <span className="text-[var(--accent)] font-bold flex items-center gap-1 group-hover:underline">
                          <Edit3 size={11} />
                          <span>{isAr ? 'متابعة التعديل' : 'Edit Project'}</span>
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleDuplicateProject(e, proj.id)}
                            className="p-1 rounded-shape-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors"
                            title={isAr ? 'تكرار المشروع' : 'Duplicate'}
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteProject(e, proj.id)}
                            className="p-1 rounded-shape-xs text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title={isAr ? 'حذف المشروع' : 'Delete'}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PRO & CREATOR TEMPLATES (UNIFIED HIGH-PERFORMANCE ENGINE) */}
        {activeTab === 'templates' && (
          <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-default)] pb-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-[var(--text-primary)] flex items-center gap-2">
                  <Palette size={18} className="text-[var(--accent)]" />
                  <span>{isAr ? 'سوق وقوالب رينكس الإبداعية الجاهزة للتعديل:' : 'Rinex Pro & Creator Design Templates:'}</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-shape-full bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--accent)]">
                    {filteredMarketplaceTemplates.length.toLocaleString()} {isAr ? 'قالب' : 'templates'}
                  </span>
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {isAr 
                    ? 'تصفح قوالب المبدعين والمستودع، عاين القالب أو افتحه مباشرة لتعديل كافة نصوصه وطبقاته.' 
                    : 'Browse creator and official templates with full editable layers and vector graphics.'}
                </p>
              </div>

              {/* Search Bar & Filters */}
              <div className="flex flex-col gap-2 shrink-0 sm:min-w-[340px]">
                {/* Search Input Box */}
                <div className="relative">
                  <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={templateSearchQuery}
                    onChange={(e) => setTemplateSearchQuery(e.target.value)}
                    placeholder={isAr ? 'ابحث باسم القالب، الكلمة المفتاحية، أو التصنيف...' : 'Search templates by title, keyword, category...'}
                    className="w-full h-9 ps-9 pe-8 text-xs bg-[var(--surface-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] border border-[var(--border-default)] rounded-shape-sm focus:outline-none focus:border-[var(--accent)] transition-all"
                  />
                  {templateSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTemplateSearchQuery('')}
                      className="absolute end-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Category Filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {[
                    { id: 'all', labelAr: 'الكل', labelEn: 'All' },
                    { id: 'marketing', labelAr: 'بوسترات تسويقية', labelEn: 'Marketing' },
                    { id: 'reels', labelAr: 'فيديو وريلز', labelEn: 'Reels' },
                    { id: 'story', labelAr: 'قصص واستوري', labelEn: 'Stories' },
                    { id: 'social', labelAr: 'مواقع التواصل', labelEn: 'Social Media' },
                    { id: 'repo', labelAr: 'المستودع الرسمي', labelEn: 'Official Repo' },
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setTemplateCategoryFilter(cat.id as any)}
                      className={`h-7 px-2.5 rounded-shape-xs text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        templateCategoryFilter === cat.id
                          ? 'bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] shadow-xs'
                          : 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)]'
                      }`}
                    >
                      {isAr ? cat.labelAr : cat.labelEn}
                    </button>
                  ))}
                </div>

                {/* Aspect Ratio Filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider shrink-0 me-1">
                    {isAr ? 'الأبعاد:' : 'Ratio:'}
                  </span>
                  {[
                    { id: 'all', labelAr: 'كافة الأبعاد', labelEn: 'All Ratios' },
                    { id: '1:1', labelAr: 'مربع (1:1)', labelEn: 'Square (1:1)' },
                    { id: '9:16', labelAr: 'ريلز/قصص (9:16)', labelEn: 'Story (9:16)' },
                    { id: '16:9', labelAr: 'عريض (16:9)', labelEn: 'Wide (16:9)' },
                    { id: '4:5', labelAr: 'بوستر عمودي (4:5)', labelEn: 'Portrait (4:5)' },
                  ].map(ratio => (
                    <button
                      key={ratio.id}
                      type="button"
                      onClick={() => setAspectRatioFilter(ratio.id as any)}
                      className={`h-6 px-2 rounded-shape-xs text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                        aspectRatioFilter === ratio.id
                          ? 'bg-[var(--accent)] text-slate-950 border-[var(--accent)] font-extrabold shadow-2xs'
                          : 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-default)]'
                      }`}
                    >
                      {isAr ? ratio.labelAr : ratio.labelEn}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Zero State if no search matches */}
            {visibleMarketplaceTemplates.length === 0 && (
              <div className="py-12 text-center space-y-3 bg-[var(--surface-card)] rounded-shape-lg border border-[var(--border-default)]">
                <Search size={32} className="mx-auto text-[var(--text-muted)] opacity-50" />
                <h4 className="text-sm font-bold text-[var(--text-primary)]">
                  {isAr ? 'لم نجد قوالب تطابق بحثك حالياً' : 'No templates match your search criteria'}
                </h4>
                <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                  {isAr 
                    ? 'جرب البحث بكلمات مفتاحية مختلفة أو قم بإلغاء الفلترة لعرض كافة القوالب المتاحة.' 
                    : 'Try searching for different keywords or clear filters to view all templates.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTemplateSearchQuery('');
                    setTemplateCategoryFilter('all');
                    setAspectRatioFilter('all');
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-shape-sm bg-[var(--accent)] text-slate-950 shadow cursor-pointer hover:opacity-90 transition-opacity"
                >
                  {isAr ? 'إعادة ضبط الفلترة' : 'Reset Filters'}
                </button>
              </div>
            )}

            {/* Paginated Templates Grid: Community Creators & Official Presets */}
            {visibleMarketplaceTemplates.length > 0 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {visibleMarketplaceTemplates.map((tpl: any) => {
                    const isHovered = hoveredTemplateCardId === tpl.id;
                    const hasVideo = Boolean(tpl.videoUrl || tpl.previewVideoUrl);

                    return (
                      <div
                        key={tpl.id}
                        onMouseEnter={() => setHoveredTemplateCardId(tpl.id)}
                        onMouseLeave={() => setHoveredTemplateCardId(null)}
                        className="group rounded-shape-md bg-[var(--surface-card)] border border-[var(--border-default)] hover:border-[color-mix(in_oklab,var(--accent)_40%,var(--border-default))] overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col"
                      >
                        {/* Image Thumbnail Container (Hover-Only Video Playback to prevent DOM freeze) */}
                        <div className="h-44 w-full bg-slate-950/40 overflow-hidden relative group/thumb flex items-center justify-center">
                          <img
                            src={tpl.thumbnail}
                            alt={tpl.titleEn}
                            className={`w-full h-full object-cover transition-transform duration-300 ${
                              isHovered ? 'scale-105' : ''
                            }`}
                            loading="lazy"
                          />

                          {/* Lazy-mount video ONLY on cursor hover */}
                          {isHovered && hasVideo && (
                            <video
                              src={tpl.videoUrl || tpl.previewVideoUrl}
                              poster={tpl.thumbnail}
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="w-full h-full object-cover absolute inset-0 z-10 animate-fade-in"
                            />
                          )}

                          <span className="absolute top-2.5 end-2.5 px-2 py-0.5 text-[9px] font-bold rounded-shape-xs bg-slate-950/80 text-white border border-white/10 backdrop-blur-xs z-20">
                            {tpl.dimensions}
                          </span>
                          <span className="absolute top-2.5 start-2.5 px-2 py-0.5 text-[9px] font-black rounded-shape-xs bg-[var(--accent)] text-slate-950 shadow-xs z-20">
                            {isAr ? tpl.categoryLabelAr : tpl.category}
                          </span>

                          {/* Hover Overlay with Preview and Use Quick Buttons */}
                          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-3 backdrop-blur-[2px] z-30">
                            <button
                              type="button"
                              onClick={() => setPreviewTemplate(tpl)}
                              className="px-3 py-2 rounded-shape-sm bg-[var(--surface-card)] hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-default)] text-xs font-bold transition-transform active:scale-95 cursor-pointer shadow"
                            >
                              {isAr ? 'معاينة القالب' : 'Preview'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!user) {
                                  try {
                                    sessionStorage.setItem('pending_studio_template', tpl.id);
                                    sessionStorage.setItem('pending_studio_template_payload', JSON.stringify(tpl));
                                  } catch (e) {}
                                  toast.info(isAr ? 'حفاظاً على أمان بياناتك، يرجى تسجيل الدخول أو إنشاء حساب لتحديد مالك لمشروعك وبدء التعديل.' : 'Please log in or register to customize this template.');
                                  setIsAuthModalOpen(true);
                                  return;
                                }
                                const newId = `project-marketplace-${tpl.id}-${Date.now()}`;
                                setActiveProjectId(newId);

                                const isVideo = Boolean(
                                  tpl.category === 'reels' ||
                                  tpl.category === 'story' ||
                                  tpl.videoUrl ||
                                  tpl.previewVideoUrl ||
                                  (tpl.dimensions && (tpl.dimensions.includes('9 : 16') || tpl.dimensions.includes('9:16')))
                                );
                                try {
                                  localStorage.setItem('rataq_studio_session_isVideo', isVideo ? 'true' : 'false');
                                  localStorage.setItem('rataq_studio_session_templateCategory', tpl.category || 'all');
                                } catch (e) {}

                                if (tpl.repoTemplate) {
                                  const converted = convertRataqTemplateToCanvasElements(tpl.repoTemplate);
                                  setActiveInitialElements(converted.elements);
                                  setActiveInitialFilters(undefined);
                                  setActiveInitialImageSize({ width: converted.width, height: converted.height });
                                  setActiveImageArtifact({
                                    id: newId,
                                    title: isAr ? tpl.titleAr : tpl.titleEn,
                                    content: converted.canvasBackground || converted.previewUrl
                                  });
                                } else {
                                  setActiveInitialElements(tpl.elements || []);
                                  setActiveInitialFilters(undefined);
                                  const templateSize = ((tpl as any).width && (tpl as any).height) ? { width: (tpl as any).width, height: (tpl as any).height } : parseTemplateDimensions(tpl.dimensions);
                                  if (templateSize) setActiveInitialImageSize(templateSize);
                                  setActiveImageArtifact({
                                    id: newId,
                                    title: isAr ? tpl.titleAr : tpl.titleEn,
                                    content: tpl.canvasBackground || tpl.thumbnail
                                  });
                                }

                                recordTemplateUse(tpl.id);
                                toast.success(
                                  isAr 
                                    ? `تم فتح "${tpl.titleAr}" في ${isVideo ? 'محرر الفيديو والمونتاج 🎬' : 'محرر البوسترات والصور 🎨'}!` 
                                    : `Loaded "${tpl.titleEn}" in ${isVideo ? 'Video Studio 🎬' : 'Poster Studio 🎨'}!`
                                );
                              }}
                              className="px-3 py-2 rounded-shape-sm bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] text-xs font-black transition-transform active:scale-95 cursor-pointer shadow flex items-center gap-1.5"
                            >
                              <span>{isAr ? 'استخدم القالب' : 'Use Template'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Card Content & Creator Attribution */}
                        <div className="p-3.5 flex flex-col justify-between flex-1 bg-[var(--surface-card)] space-y-2.5">
                          <div>
                            <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-1">
                              {isAr ? tpl.titleAr : tpl.titleEn}
                            </h4>
                            <p className="text-[10px] text-[var(--text-muted)] line-clamp-1 mt-0.5">
                              {isAr ? tpl.descriptionAr : tpl.descriptionEn}
                            </p>
                          </div>

                          {/* Creator Footer Pill */}
                          <div className="flex items-center justify-between pt-1 border-t border-[var(--border-default)]/60 text-[10px]">
                            <button
                              type="button"
                              onClick={() => navigate(`/creator/${tpl.creatorUsername ? tpl.creatorUsername.replace('@', '') : 'official'}`)}
                              className="flex items-center gap-1.5 text-start hover:opacity-80 transition-opacity cursor-pointer min-w-0"
                            >
                              <img
                                src={tpl.creatorAvatar}
                                alt={tpl.creatorName}
                                className="w-4 h-4 rounded-full object-cover border border-[var(--border-default)] shrink-0"
                              />
                              <span className="font-bold text-[var(--text-secondary)] truncate max-w-[90px]">
                                {tpl.creatorName}
                              </span>
                            </button>

                            <div className="flex items-center gap-2 font-mono font-bold text-[var(--text-muted)] shrink-0">
                              <span className="flex items-center gap-0.5 text-amber-500">
                                <Star size={10} className="fill-amber-500" />
                                <span>{tpl.rating || 4.9}</span>
                              </span>
                              <span>•</span>
                              <span>{(tpl.usesCount || 1000).toLocaleString()} {isAr ? 'استخدام' : 'uses'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Load More Button Section */}
                {visibleMarketplaceTemplates.length < filteredMarketplaceTemplates.length && (
                  <div className="pt-4 text-center space-y-2">
                    <p className="text-xs font-mono font-bold text-[var(--text-muted)]">
                      {isAr 
                        ? `يعرض ${visibleMarketplaceTemplates.length.toLocaleString()} من إجمالي ${filteredMarketplaceTemplates.length.toLocaleString()} قالب عالي الدقة`
                        : `Showing ${visibleMarketplaceTemplates.length.toLocaleString()} of ${filteredMarketplaceTemplates.length.toLocaleString()} templates`}
                    </p>
                    <button
                      type="button"
                      onClick={() => setTemplateVisibleCount(prev => prev + 36)}
                      className="px-6 py-3 rounded-shape-md bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] text-xs font-black hover:opacity-90 transition-all shadow-md active:scale-95 cursor-pointer inline-flex items-center gap-2"
                    >
                      <span>{isAr ? 'عرض المزيد من القوالب (+36)' : 'Load More Templates (+36)'}</span>
                      <ArrowUpRight size={14} className="rotate-90" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CANVAS SIZES & PRESETS */}
        {activeTab === 'presets' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <LayoutTemplate size={16} className="text-[var(--accent)]" />
                  <span>{isAr ? 'مقاسات منصات التواصل الاجتماعي والطباعة:' : 'Standard Platform Dimensions:'}</span>
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {isAr ? 'اختر مقاساً قياسياً أو أدخل أبعاداً مخصصة لفتح مساحة عمل مطابقة تماماً للمنصة.' : 'Choose a standard preset or enter custom dimensions.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {CANVAS_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => {
                    handleCreateBlankCanvas(preset.width, preset.height, isAr ? preset.nameAr : preset.nameEn);
                  }}
                  className="p-4 rounded-shape-md bg-[var(--surface-card)] hover:bg-[var(--surface-subtle)] border border-[var(--border-default)] hover:border-[color-mix(in_oklab,var(--accent)_40%,var(--border-default))] transition-all cursor-pointer flex flex-col justify-between group shadow-2xs space-y-3 active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-shape-sm bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] border border-[color-mix(in_oklab,var(--accent)_20%,transparent)] text-[var(--accent)] flex items-center justify-center group-hover:bg-[color-mix(in_oklab,var(--accent)_15%,transparent)] transition-all duration-fast">
                      {preset.icon}
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-shape-xs bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-muted)]">
                      {preset.aspectRatio}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      {isAr ? preset.nameAr : preset.nameEn}
                    </h4>
                    <span className="text-[10px] font-mono text-[var(--text-muted)] block mt-0.5">
                      {preset.width} × {preset.height} px
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: BRAND KIT (Personal Brand Hub) */}
        {activeTab === 'brand' && (
          <div className="space-y-6">
            <div className="p-5 rounded-shape-md bg-[var(--surface-card)] border border-[var(--border-default)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[var(--accent)]" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {isAr ? 'العلامة التجارية وهوية البراند الخاصة بك' : 'Your Personal Brand Kit'}
                  </h3>
                </div>
                <span className="text-[11px] text-[var(--text-muted)] font-medium">
                  {isAr ? 'تطبق تلقائياً على تصميماتك ومحرر رينكس' : 'Synchronized with your personal editor'}
                </span>
              </div>

              {/* Brand Logos */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[var(--text-secondary)]">
                  {isAr ? '1. شعارات الهوية الرسمية (Logos & Seals)' : '1. Brand Logos & Seals'}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {brandKit.logos.map((l) => (
                    <div key={l.id} className="p-3 rounded-shape-sm bg-[var(--surface-subtle)] border border-[var(--border-default)] flex flex-col items-center justify-center text-center space-y-2">
                      <div className="w-16 h-16 rounded-shape-xs bg-[var(--surface-card)] border border-[var(--border-default)] p-1.5 flex items-center justify-center">
                        <img src={l.url} alt={l.titleAr} className="max-w-full max-h-full object-contain" />
                      </div>
                      <span className="text-[11px] font-bold text-[var(--text-primary)] line-clamp-1">{l.titleAr}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Brand Color Palette */}
              <div className="space-y-2 pt-2 border-t border-[var(--border-default)]">
                <h4 className="text-xs font-bold text-[var(--text-secondary)]">
                  {isAr ? '2. لوحة ألوان الهوية (Brand Color Palette)' : '2. Color Palette'}
                </h4>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {[brandKit.colors.primary, brandKit.colors.secondary, brandKit.colors.accent, brandKit.colors.dark, brandKit.colors.light, ...(brandKit.colors.custom || [])].map((c: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-1.5 px-2.5 rounded-shape-sm bg-[var(--surface-subtle)] border border-[var(--border-default)]">
                      <div className="w-5 h-5 rounded-full border border-black/20 shadow-2xs" style={{ backgroundColor: c }} />
                      <span className="text-[11px] font-mono font-bold text-[var(--text-primary)]">{c}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Brand Typography */}
              <div className="space-y-2 pt-2 border-t border-[var(--border-default)]">
                <h4 className="text-xs font-bold text-[var(--text-secondary)]">
                  {isAr ? '3. خطوط الهوية المعتمدة (Brand Typography)' : '3. Brand Fonts'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-shape-sm bg-[var(--surface-subtle)] border border-[var(--border-default)]">
                    <span className="text-[10px] text-[var(--text-muted)] block">{isAr ? 'خط العناوين الرئيسية' : 'Heading Font'}</span>
                    <span className="text-xs font-bold text-[var(--text-primary)] font-mono">{brandKit.fonts.heading}</span>
                  </div>
                  <div className="p-3 rounded-shape-sm bg-[var(--surface-subtle)] border border-[var(--border-default)]">
                    <span className="text-[10px] text-[var(--text-muted)] block">{isAr ? 'خط النصوص والفقرات' : 'Body Font'}</span>
                    <span className="text-xs font-bold text-[var(--text-primary)] font-mono">{brandKit.fonts.body}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MY UPLOADS */}
        {activeTab === 'uploads' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <UploadCloud size={16} className="text-[var(--accent)]" />
                  <span>{isAr ? 'الملفات والمرفوعات المحفوظة بحسابك:' : 'Uploaded Assets in Account:'}</span>
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {isAr ? 'الصور والخطوط والرسومات والشعارات ومستندات PDF الخاصة بحسابك والمتاحة في المحرر.' : 'Images, fonts, graphics, logos, and PDFs uploaded to your account.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 px-3 rounded-shape-sm bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs hover:opacity-90 active:scale-95"
              >
                <Upload size={13} />
                <span>{isAr ? 'رفع ملف جديد' : 'Upload Asset'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {uploads.map((item) => (
                <div key={item.id} className="p-3 rounded-shape-md bg-[var(--surface-card)] border border-[var(--border-default)] space-y-2 shadow-2xs">
                  <div className="h-28 w-full rounded-shape-xs bg-[var(--surface-subtle)] flex items-center justify-center overflow-hidden">
                    {item.type === 'image' && <img src={item.url} alt={item.name} className="max-w-full max-h-full object-contain" />}
                    {item.type === 'font' && <div className="text-lg font-bold text-[var(--accent)]">Aa</div>}
                    {item.type !== 'image' && item.type !== 'font' && <FileText className="w-8 h-8 text-[var(--accent)]" />}
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-bold text-[var(--text-primary)] line-clamp-1">{item.name}</h5>
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                      <span className="uppercase font-mono">{item.type}</span>
                      <span>{item.size || ''}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: PUBLIC STUDIO FEATURES SHOWCASE */}
        {activeTab === 'features' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Sparkles size={16} className="text-[var(--accent)]" />
                  <span>{isAr ? 'إمكانيات ومميزات استوديو رينكس السيادي:' : 'Sovereign Studio Capabilities:'}</span>
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {isAr ? 'استكشف الميزات والتقنيات المدعومة داخل ساحة العمل التفاعلية.' : 'Explore supported tools and creative technologies.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PUBLIC_STUDIO_FEATURES.map((feat, idx) => (
                <div key={idx} className="p-4 rounded-shape-md bg-[var(--surface-card)] border border-[var(--border-default)] space-y-2 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-shape-sm bg-[var(--surface-subtle)] border border-[var(--border-default)]">
                      {feat.icon}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">
                        {isAr ? feat.titleAr : feat.titleEn}
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                        {isAr ? feat.descAr : feat.descEn}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
          </div>
        )}

      </main>

      {/* Custom Canvas Dimension Modal */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-shape-md bg-[var(--surface-card)] border border-[var(--border-default)] p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-[var(--text-primary)]">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-2.5">
              <h3 className="text-sm font-bold flex items-center gap-1.5 text-[var(--text-primary)]">
                <Sliders size={14} className="text-[var(--accent)]" />
                <span>{isAr ? 'إنشاء مساحة بمقاس مخصص' : 'Custom Canvas Dimensions'}</span>
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[var(--text-secondary)]">{isAr ? 'العرض (بكسل)' : 'Width (px)'}</label>
                <input
                  type="number"
                  value={customW}
                  onChange={(e) => setCustomW(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-shape-sm bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-mono font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[var(--text-secondary)]">{isAr ? 'الارتفاع (بكسل)' : 'Height (px)'}</label>
                <input
                  type="number"
                  value={customH}
                  onChange={(e) => setCustomH(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-shape-sm bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-mono font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-default)]">
              <button
                type="button"
                onClick={() => setIsCustomModalOpen(false)}
                className="h-8 px-3 rounded-shape-sm text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCustomModalOpen(false);
                  handleCreateBlankCanvas(customW || 1080, customH || 1080, isAr ? `مساحة ${customW}×${customH}` : `${customW}x${customH} Canvas`);
                }}
                className="h-8 px-4 rounded-shape-sm bg-[var(--comp-button-primary-bg)] text-[var(--comp-button-primary-fg)] font-bold text-xs cursor-pointer shadow-2xs hover:opacity-90 active:scale-95"
              >
                {isAr ? 'إنشاء مساحة العمل' : 'Create Canvas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Platform Sovereign Footer */}
      <footer className="pt-8 pb-4 space-y-3 text-center border-t border-[var(--border-default)] mt-12 max-w-6xl mx-auto w-full px-4">
        <p className="text-xs text-[var(--text-muted)] font-mono">
          {language === 'ar' ? 'جميع الحقوق محفوظة 2025-2026 بيربليكستا' : '© 2025-2026 PERPLEXTA. All rights reserved.'}
        </p>
        <div className="flex items-center justify-center gap-4 text-xs text-[var(--text-muted)]">
          <button onClick={() => navigate('/terms')} className="hover:text-[var(--text-primary)] transition-colors cursor-pointer">
            {language === 'ar' ? 'الشروط والأحكام' : 'Terms of Service'}
          </button>
          <span>•</span>
          <button onClick={() => navigate('/privacy')} className="hover:text-[var(--text-primary)] transition-colors cursor-pointer">
            {language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
          </button>
          <span>•</span>
          <button onClick={() => navigate('/about')} className="hover:text-[var(--text-primary)] transition-colors cursor-pointer">
            {language === 'ar' ? 'عن المنصة' : 'About Platform'}
          </button>
        </div>
      </footer>

      {/* Creator Registration Protocol Modal */}
      <CreatorRegistrationModal
        isOpen={isRegistrationModalOpen}
        onClose={() => setIsRegistrationModalOpen(false)}
      />

      {/* Interactive Template Preview Modal */}
      <TemplatePreviewModal
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
      />
    </div>
  );
};

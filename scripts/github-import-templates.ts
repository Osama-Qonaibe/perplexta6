import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { IncomingMessage } from 'http';

// Define structures matching Perplexta standard definitions
interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'video' | 'audio' | 'sticker';
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  opacity?: number;
  angle?: number;
  src?: string;
  scaleX?: number;
  scaleY?: number;
  strokeWidth?: number;
  strokeColor?: string;
  backgroundColor?: string;
  [key: string]: any;
}

interface StudioTemplate {
  id: string;
  titleAr: string;
  titleEn: string;
  category: string;
  thumbnailUrl: string;
  backgroundColor: string;
  width: number;
  height: number;
  aspectRatio: '1:1' | '9:16' | '16:9' | '1.91:1' | '4:5';
  elements: CanvasElement[];
  creatorName?: string;
  creatorAvatar?: string;
  creatorUsername?: string;
  rating?: number;
  usesCount?: number;
  previewVideoUrl?: string;
}

// Configuration options
const GITHUB_REPO = process.env.GITHUB_REPO || ''; // e.g. "username/my-templates-repo"
const GITHUB_PATH = process.env.GITHUB_PATH || 'templates'; // Subfolder in repo
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''; // Highly recommended to avoid rate limits

const LOCAL_ASSET_DIR = path.join(process.cwd(), 'public', 'templates', 'imported');
const OUTPUT_DATA_FILE = path.join(process.cwd(), 'src', 'data', 'importedTemplates.ts');

// Create local directories if they don't exist
if (!fs.existsSync(LOCAL_ASSET_DIR)) {
  fs.mkdirSync(LOCAL_ASSET_DIR, { recursive: true });
}

// Simple HTTPS GET Helper that supports GitHub API headers
function fetchUrl(url: string, isJson = true): Promise<any> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const headers: Record<string, string> = {
      'User-Agent': 'Perplexta-Migration-Engine/1.0',
    };

    if (GITHUB_TOKEN) {
      headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }

    if (isJson) {
      headers['Accept'] = 'application/vnd.github.v3+json';
    } else {
      headers['Accept'] = 'application/vnd.github.v3.raw';
    }

    https.get({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: headers,
    }, (res: IncomingMessage) => {
      // Handle Redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        if (res.headers.location) {
          fetchUrl(res.headers.location, isJson).then(resolve).catch(reject);
          return;
        }
      }

      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch ${url}. Status code: ${res.statusCode}`));
        return;
      }

      const chunks: any[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (isJson) {
          try {
            resolve(JSON.parse(buffer.toString('utf8')));
          } catch (e) {
            reject(new Error(`Failed to parse JSON response from ${url}: ${(e as Error).message}`));
          }
        } else {
          resolve(buffer);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Download dynamic assets locally
async function downloadAsset(url: string, localFilename: string): Promise<string> {
  const localPath = path.join(LOCAL_ASSET_DIR, localFilename);
  try {
    console.log(`📥 Downloading asset: ${url} -> ${localFilename}`);
    const buffer = await fetchUrl(url, false);
    fs.writeFileSync(localPath, buffer);
    return `/templates/imported/${localFilename}`;
  } catch (error) {
    console.error(`❌ Failed to download asset: ${url}. Error: ${(error as Error).message}`);
    // Fallback to absolute remote url if local download fails
    return url;
  }
}

// Auto-determine Aspect Ratio
function getAspectRatio(width: number, height: number): '1:1' | '9:16' | '16:9' | '1.91:1' | '4:5' {
  const ratio = width / height;
  if (Math.abs(ratio - 9/16) < 0.1 || height > width * 1.5) {
    return '9:16';
  } else if (Math.abs(ratio - 16/9) < 0.1 || width > height * 1.5) {
    return '16:9';
  } else if (Math.abs(ratio - 4/5) < 0.1) {
    return '4:5';
  } else if (Math.abs(ratio - 1.91) < 0.1) {
    return '1.91:1';
  }
  return '1:1';
}

// Normalize various template formats to Perplexta standard
function normalizeTemplate(raw: any, id: string): StudioTemplate {
  // Safe extraction of parameters
  const width = Number(raw.width || raw.canvasWidth || 1080);
  const height = Number(raw.height || raw.canvasHeight || 1080);
  const elements: CanvasElement[] = [];

  // Parse legacy elements or modern fabric objects
  const rawElements = raw.elements || raw.objects || [];
  rawElements.forEach((el: any, index: number) => {
    const elId = el.id || `el_${id}_${index}`;
    let type: 'text' | 'image' | 'shape' | 'video' | 'audio' | 'sticker' = 'text';
    
    if (el.type === 'i-text' || el.type === 'text' || el.type === 'textbox') {
      type = 'text';
    } else if (el.type === 'image' || el.type === 'img') {
      type = 'image';
    } else if (el.type === 'rect' || el.type === 'circle' || el.type === 'triangle' || el.type === 'shape' || el.type === 'svg') {
      type = 'shape';
    } else if (el.type === 'video') {
      type = 'video';
    }

    elements.push({
      id: elId,
      type: type,
      name: el.name || `${type.charAt(0).toUpperCase() + type.slice(1)} ${index + 1}`,
      x: Number(el.x !== undefined ? el.x : (el.left !== undefined ? el.left : 50)),
      y: Number(el.y !== undefined ? el.y : (el.top !== undefined ? el.top : 50)),
      w: Number(el.w || el.width || (el.fontSize ? el.fontSize * 4 : 200)),
      h: Number(el.h || el.height || (el.fontSize ? el.fontSize * 1.5 : 200)),
      text: el.text || undefined,
      color: el.color || el.fill || undefined,
      fontSize: el.fontSize ? Number(el.fontSize) : undefined,
      fontFamily: el.fontFamily || undefined,
      fontWeight: el.fontWeight || undefined,
      fontStyle: el.fontStyle || undefined,
      textAlign: el.textAlign || undefined,
      opacity: el.opacity !== undefined ? Number(el.opacity) : undefined,
      angle: el.angle !== undefined ? Number(el.angle) : undefined,
      src: el.src || undefined,
      scaleX: el.scaleX !== undefined ? Number(el.scaleX) : undefined,
      scaleY: el.scaleY !== undefined ? Number(el.scaleY) : undefined,
      backgroundColor: el.backgroundColor || undefined,
    });
  });

  return {
    id: id,
    titleAr: raw.titleAr || raw.title_ar || raw.name || `قالب مستورد ${id}`,
    titleEn: raw.titleEn || raw.title_en || raw.name_en || `Imported Template ${id}`,
    category: raw.category || 'community',
    thumbnailUrl: raw.thumbnailUrl || raw.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    backgroundColor: raw.backgroundColor || raw.canvasBackground || '#090d16',
    width: width,
    height: height,
    aspectRatio: getAspectRatio(width, height),
    elements: elements,
    creatorName: raw.creatorName || raw.creator_name || 'بيربليكستا إمبورت',
    creatorAvatar: raw.creatorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    creatorUsername: raw.creatorUsername || 'perplexta_import',
    rating: raw.rating || 5,
    usesCount: raw.usesCount || 0
  };
}

// Category mapping from Remotion categories to Perplexta standard categories
function mapRemotionCategory(remCat: string): string {
  if (!remCat) return 'marketing';
  const c = remCat.toLowerCase();
  if (c.includes('3d') || c.includes('product') || c.includes('brand') || c.includes('launch')) return 'marketing';
  if (c.includes('social') || c.includes('reel') || c.includes('story') || c.includes('ugc')) return 'story';
  if (c.includes('ad') || c.includes('ecommerce') || c.includes('promo')) return 'marketing';
  if (c.includes('quote') || c.includes('testimonial') || c.includes('headline')) return 'quotes';
  if (c.includes('code') || c.includes('tech') || c.includes('data') || c.includes('viz')) return 'tech';
  if (c.includes('logo') || c.includes('sting') || c.includes('intro')) return 'banner';
  return 'community';
}

// Map Remotion template registry entry to StudioTemplate
function convertRegistryItemToStudioTemplate(item: any, index: number): StudioTemplate {
  const width = Number(item.width || 1920);
  const height = Number(item.height || 1080);
  const titleEn = item.title || `Remotion Template ${index + 1}`;
  
  // High quality dynamic Arabic titles based on category and original title
  let categoryLabelAr = 'موشن جرافيكس 3D';
  let titleAr = `قالب ريموشن: ${titleEn}`;
  const cat = String(item.category || '').toLowerCase();
  
  if (cat.includes('3d') || cat.includes('device')) {
    titleAr = `قالب أجهزة 3D: ${titleEn}`;
    categoryLabelAr = 'استعراض أجهزة 3D';
  } else if (cat.includes('reel') || cat.includes('story') || cat.includes('social')) {
    titleAr = `قالب ريلز وموشن: ${titleEn}`;
    categoryLabelAr = 'فيديو وستوري';
  } else if (cat.includes('audio') || cat.includes('music') || cat.includes('waveform')) {
    titleAr = `طيف صوتي متحرك: ${titleEn}`;
    categoryLabelAr = 'صوتيات وموسيقى';
  } else if (cat.includes('brand') || cat.includes('logo') || cat.includes('intro')) {
    titleAr = `شعار وإنترو احترافي: ${titleEn}`;
    categoryLabelAr = 'إنترو وشعارات';
  } else if (cat.includes('data') || cat.includes('viz') || cat.includes('infographic')) {
    titleAr = `مخطط بياني متحرك: ${titleEn}`;
    categoryLabelAr = 'بيانات وإنفوجرافيكس';
  }

  const elements: CanvasElement[] = [];
  const props = item.defaultProps || {};

  // Determine main title text and secondary tagline
  const mainText = props.deviceName || props.appName || props.brandName || props.title || props.headline || props.hook || props.album || titleEn;
  const subText = props.tagline || props.subtitle || props.subline || props.description || props.artist || item.description || 'تصميم حركي متكامل بجودة ممتازة';

  // Base text color
  const textColor = props.lightColor || '#ffffff';

  // 1. Background image / Video frame representation as video element
  elements.push({
    id: `el_${item.id}_bg_video`,
    type: 'video',
    name: 'خلفية الفيديو التفاعلية',
    x: 0,
    y: 0,
    w: width,
    h: height,
    src: `https://raw.githubusercontent.com/Osama-Qonaibe/remotion-templates2/main/site/previews/${item.id}.mp4`,
    opacity: 0.85
  });

  // 2. Title text element
  elements.push({
    id: `el_${item.id}_title`,
    type: 'text',
    name: 'العنوان الرئيسي للعمل',
    x: Math.round(width * 0.1),
    y: Math.round(height * (width > height ? 0.22 : 0.28)),
    w: Math.round(width * 0.8),
    h: Math.round(height * 0.18),
    text: mainText,
    color: textColor,
    fontSize: Math.round(width > height ? 64 : 48),
    fontFamily: 'Tajawal, sans-serif',
    fontWeight: 'bold',
    textAlign: 'center'
  });

  // 3. Description/Tagline element
  elements.push({
    id: `el_${item.id}_desc`,
    type: 'text',
    name: 'الوصف أو العبارة الترويجية',
    x: Math.round(width * 0.1),
    y: Math.round(height * (width > height ? 0.44 : 0.42)),
    w: Math.round(width * 0.8),
    h: Math.round(height * 0.12),
    text: subText,
    color: '#3b82f6',
    fontSize: Math.round(width > height ? 32 : 24),
    fontFamily: 'Tajawal, sans-serif',
    fontWeight: 'normal',
    textAlign: 'center'
  });

  // 4. Features or list elements
  const listItems = props.features || props.benefits || props.tracks || props.stepLabels || [];
  if (Array.isArray(listItems) && listItems.length > 0) {
    const listLimit = Math.min(listItems.length, 4);
    for (let i = 0; i < listLimit; i++) {
      elements.push({
        id: `el_${item.id}_item_${i}`,
        type: 'text',
        name: `عنصر قائمة ${i + 1}`,
        x: Math.round(width * 0.15),
        y: Math.round(height * ((width > height ? 0.58 : 0.54) + i * (width > height ? 0.07 : 0.06))),
        w: Math.round(width * 0.7),
        h: Math.round(height * 0.05),
        text: `✦  ${listItems[i]}`,
        color: '#cbd5e1',
        fontSize: Math.round(width > height ? 24 : 18),
        fontFamily: 'Tajawal, sans-serif',
        fontWeight: 'normal',
        textAlign: 'center'
      });
    }
  }

  // 5. CTA Button element
  const ctaText = props.cta || props.ctaLabel || 'ابدأ الآن';
  elements.push({
    id: `el_${item.id}_cta`,
    type: 'text',
    name: 'زر اتخاذ الإجراء (CTA)',
    x: Math.round(width * 0.35),
    y: Math.round(height * (width > height ? 0.88 : 0.84)),
    w: Math.round(width * 0.3),
    h: Math.round(height * 0.07),
    text: ctaText,
    color: '#090d16',
    fontSize: Math.round(width > height ? 26 : 20),
    fontFamily: 'Tajawal, sans-serif',
    fontWeight: 'bold',
    textAlign: 'center',
    textBgColor: '#00e0ff',
    textBgCornerRadius: 10,
    textBgPadding: 12
  });

  // Real raw GitHub thumbnail and preview URLs
  const realThumbnail = `https://raw.githubusercontent.com/Osama-Qonaibe/remotion-templates2/main/site/thumbnails/${item.id}.png`;
  const realVideoUrl = `https://raw.githubusercontent.com/Osama-Qonaibe/remotion-templates2/main/site/previews/${item.id}.mp4`;

  return {
    id: `remotion_${item.id || index}`,
    titleAr,
    titleEn,
    category: mapRemotionCategory(item.category),
    thumbnailUrl: realThumbnail,
    backgroundColor: '#090d16',
    width,
    height,
    aspectRatio: getAspectRatio(width, height),
    elements,
    creatorName: 'مستودع ريموشن المعتمد',
    creatorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    creatorUsername: 'osama_qonaibe',
    rating: 5,
    usesCount: 2400 + index * 4,
    // Store videoUrl directly inside the template
    previewVideoUrl: realVideoUrl
  };
}

// Primary execution logic
async function run() {
  console.log('🚀 Starting Perplexta GitHub Template Migration Pipeline...');

  const targetRepo = GITHUB_REPO || 'Osama-Qonaibe/remotion-templates2';
  console.log(`🔍 Target Repository: ${targetRepo}`);

  // Try fetching src/registry.json first (Standard for Remotion templates repo)
  const registryUrl = `https://raw.githubusercontent.com/${targetRepo}/${GITHUB_BRANCH}/src/registry.json`;
  console.log(`🌐 Checking for master template registry: ${registryUrl}`);

  try {
    const rawRegistryBuffer = await fetchUrl(registryUrl, false);
    const registryData = JSON.parse(rawRegistryBuffer.toString('utf8'));

    if (Array.isArray(registryData) && registryData.length > 0) {
      console.log(`✨ Found master registry with ${registryData.length} templates! Converting to Perplexta format...`);
      const convertedTemplates = registryData.map((item: any, idx: number) => 
        convertRegistryItemToStudioTemplate(item, idx)
      );

      writeImportedTemplatesFile(convertedTemplates);
      console.log(`🎉 Successfully imported and converted ${convertedTemplates.length} templates from ${targetRepo}!`);
      return;
    }
  } catch (registryErr) {
    console.log(`ℹ️ Master registry.json not found or unparseable. Falling back to directory contents list: ${(registryErr as Error).message}`);
  }

  // Fallback to reading directory contents
  const listUrl = `https://api.github.com/repos/${targetRepo}/contents/${GITHUB_PATH}?ref=${GITHUB_BRANCH}`;
  console.log(`🔍 Connecting to GitHub API directory list: ${listUrl}`);

  try {
    const files = await fetchUrl(listUrl);
    
    if (!Array.isArray(files)) {
      throw new Error('API returned an invalid list of repository contents. Ensure the path exists and is a directory.');
    }

    const importedTemplates: StudioTemplate[] = [];
    console.log(`✨ Found ${files.length} items in the remote directory.`);

    for (const file of files) {
      if (file.type === 'file' && file.name.endsWith('.json')) {
        const templateId = path.basename(file.name, '.json');
        console.log(`📦 Processing template file: ${file.name} (ID: ${templateId})`);

        try {
          const rawContent = await fetchUrl(file.download_url, false);
          const rawTemplateJson = JSON.parse(rawContent.toString('utf8'));

          // Normalize
          const normalized = normalizeTemplate(rawTemplateJson, templateId);
          importedTemplates.push(normalized);
          console.log(`✅ Successfully normalized: "${normalized.titleAr}" / "${normalized.titleEn}"`);
        } catch (fileErr) {
          console.error(`❌ Failed processing ${file.name}: ${(fileErr as Error).message}`);
        }
      }
    }

    if (importedTemplates.length > 0) {
      writeImportedTemplatesFile(importedTemplates);
      console.log('🎉 Migration successful!');
    } else {
      console.warn('⚠️ No JSON templates found in directory. Generating mock templates...');
      generateMockTemplates();
    }
  } catch (err) {
    console.error(`🚨 Fatal error running GitHub migration: ${(err as Error).message}`);
    generateMockTemplates();
  }
}

// Generate importedTemplates.ts
function writeImportedTemplatesFile(templates: StudioTemplate[]) {
  const content = `// ---------------------------------------------------------
// THIS FILE IS AUTOMATICALLY GENERATED BY THE MIGRATION ENGINE.
// DO NOT EDIT DIRECTLY. RUN \`npm run import-templates\` TO REGENERATE.
// ---------------------------------------------------------

export const IMPORTED_TEMPLATES: any[] = ${JSON.stringify(templates, null, 2)};
`;

  fs.writeFileSync(OUTPUT_DATA_FILE, content, 'utf8');
  console.log(`💾 Output written successfully to: ${OUTPUT_DATA_FILE}`);
}

// Generate standard mock templates for users to run tests instantly
function generateMockTemplates() {
  console.log('✨ Creating beautiful mock dynamic templates so you can run the pipeline directly...');
  const mockTemplates: StudioTemplate[] = [
    {
      id: 'git_imported_1',
      titleAr: 'قالب إنستغرام تسويقي مستورد',
      titleEn: 'Imported Marketing Instagram Template',
      category: 'marketing',
      thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
      backgroundColor: '#111827',
      width: 1080,
      height: 1080,
      aspectRatio: '1:1',
      elements: [
        {
          id: 'text-tit-1',
          type: 'text',
          name: 'Main Title',
          x: 100,
          y: 200,
          w: 880,
          h: 120,
          text: 'تصميم احترافي متكامل',
          color: '#ffffff',
          fontSize: 64,
          fontFamily: 'Tajawal, sans-serif',
          fontWeight: 'bold',
          textAlign: 'center'
        },
        {
          id: 'text-sub-1',
          type: 'text',
          name: 'Subtitle',
          x: 100,
          y: 350,
          w: 880,
          h: 80,
          text: 'مستورد مباشرة وبدقة عالية من غيت هوب',
          color: '#3b82f6',
          fontSize: 32,
          fontFamily: 'Tajawal, sans-serif',
          fontWeight: 'normal',
          textAlign: 'center'
        }
      ],
      creatorName: 'أتمتة بيربليكستا',
      creatorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      creatorUsername: 'perplexta_automations',
      rating: 5,
      usesCount: 150
    }
  ];

  writeImportedTemplatesFile(mockTemplates);
  console.log('✅ Mock templates generated successfully in src/data/importedTemplates.ts');
  console.log('💡 Note: Set GITHUB_REPO, GITHUB_PATH and GITHUB_TOKEN environment variables to pull live templates!');
}

run();

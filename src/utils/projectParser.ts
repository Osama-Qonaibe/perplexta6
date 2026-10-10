import { Artifact, ProjectFiles, ProjectFile, getFileTypeFromPath } from '../types/artifact';

export interface StructuredProjectJson {
  title?: string;
  entry?: string;
  type?: 'project' | 'html' | 'react' | 'code';
  files: Array<{
    path: string;
    content: string;
    type?: string;
    isEntry?: boolean;
  }> | Record<string, string | { content: string; type?: string }>;
}

/**
 * Checks if raw text contains a structured project declaration JSON.
 * Returns parsed ProjectFiles and entryPath if valid, or null.
 */
export function tryParseProjectJson(rawText: string): {
  title?: string;
  files: ProjectFiles;
  entryPath: string;
} | null {
  if (!rawText) return null;
  const trimmed = rawText.trim();

  // Try extracting json codeblock if present
  let jsonString = '';
  const jsonBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonBlockMatch) {
    jsonString = jsonBlockMatch[1].trim();
  } else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    jsonString = trimmed;
  } else {
    // Look for { "files": ... } anywhere in the text
    const objMatch = trimmed.match(/\{[\s\S]*"files"[\s\S]*\}/);
    if (objMatch) {
      jsonString = objMatch[0];
    }
  }

  if (!jsonString) return null;

  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object' || !parsed.files) return null;

    const files: ProjectFiles = {};
    let detectedEntry = parsed.entry || '';

    // Format 1: files is an Array of { path, content }
    if (Array.isArray(parsed.files)) {
      for (const item of parsed.files) {
        if (!item || !item.path) continue;
        const cleanPath = item.path.replace(/^\/+/, '');
        const fileName = cleanPath.split('/').pop() || cleanPath;
        const fileType = item.type || getFileTypeFromPath(cleanPath);
        const isEntry = Boolean(item.isEntry || (detectedEntry && cleanPath === detectedEntry));

        files[cleanPath] = {
          name: fileName,
          path: cleanPath,
          content: typeof item.content === 'string' ? item.content : String(item.content || ''),
          type: fileType,
          isEntry
        };

        if (isEntry && !detectedEntry) {
          detectedEntry = cleanPath;
        }
      }
    } 
    // Format 2: files is a Record<string, string | { content: string }>
    else if (typeof parsed.files === 'object') {
      for (const [filePath, val] of Object.entries(parsed.files)) {
        const cleanPath = filePath.replace(/^\/+/, '');
        const fileName = cleanPath.split('/').pop() || cleanPath;
        const fileType = getFileTypeFromPath(cleanPath);
        const content = typeof val === 'string' ? val : (val && typeof val === 'object' && 'content' in val ? String((val as any).content) : '');
        const isEntry = detectedEntry ? cleanPath === detectedEntry : (cleanPath === 'index.html' || cleanPath === 'App.tsx');

        files[cleanPath] = {
          name: fileName,
          path: cleanPath,
          content,
          type: fileType,
          isEntry
        };

        if (isEntry && !detectedEntry) {
          detectedEntry = cleanPath;
        }
      }
    }

    if (Object.keys(files).length === 0) return null;

    if (!detectedEntry) {
      detectedEntry = files['index.html'] ? 'index.html' : (files['App.tsx'] ? 'App.tsx' : Object.keys(files)[0]);
    }

    return {
      title: parsed.title,
      files,
      entryPath: detectedEntry
    };
  } catch (e) {
    return null;
  }
}

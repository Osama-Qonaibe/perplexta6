import { Artifact } from '../types/artifact';

export function extractArtifact(content: string): Artifact | null {
  const artifactRegex = /<antArtifact\s+identifier="([^"]+)"\s+type="([^"]+)"\s+title="([^"]+)">([\s\S]*?)<\/antArtifact>/;
  const match = content.match(artifactRegex);

  if (!match) return null;

  return {
    id: match[1],
    type: match[2] as Artifact['type'],
    title: match[3],
    content: match[4].trim(),
    version: 1,
  };
}

export function removeArtifactTags(content: string): string {
  return content.replace(/<antArtifact[\s\S]*?<\/antArtifact>/g, '').trim();
}

export * from './media/ImageRenderers';
export * from './media/VideoRenderers';

import React from 'react';
import { ShareableImageOutput } from './media/ImageRenderers';
import { MarkdownVideo } from './media/VideoRenderers';

export const MarkdownImg = React.memo((props: any) => {
  const src = props.src || '';
  const isVideo = src.endsWith('.mp4') || src.endsWith('.webm') || src.endsWith('.mov') || src.includes('/video/') || (props.alt && (props.alt.includes('فيديو') || props.alt.includes('Video')));
  if (isVideo) {
    return <MarkdownVideo {...props} />;
  }
  return (
    <ShareableImageOutput 
      src={props.src} 
      alt={props.alt} 
      {...props} 
    />
  );
});

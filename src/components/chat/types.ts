import React from 'react';

export interface ThinkingStep {
  step: string;
  status: 'completed' | 'processing' | 'pending';
  is_raw_trace?: boolean;
}

export interface Citation {
  title: string;
  url: string;
  index: number;
  link?: string;
  description?: string;
  ogImage?: string;
  domain?: string;
  sourceType?: string;
  snippet?: string;
}

export interface MessageFile {
  name: string;
  type: string;
  preview?: string;
  base64?: string;
}

export interface MessagePart {
  type: 'text' | 'image' | 'video' | 'audio' | 'code' | 'thinking';
  content: string;
  metadata?: any;
}

export interface Message {
  client_id?: string;
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  parts?: MessagePart[];
  tool?: string;
  model?: string;
  feedback?: number;
  is_pinned?: boolean;
  is_quota_error?: boolean;
  is_system_inactive?: boolean;
  is_insufficient_funds?: boolean;
  is_image_failed?: boolean;
  is_video_failed?: boolean;
  quota_data?: any;
  thinking_steps?: ThinkingStep[];
  citations?: Citation[];
  follow_ups?: string[];
  is_streaming?: boolean;
  generation_time?: number;
  created_at?: string;
  file?: MessageFile;
  status?: 'sending' | 'sent' | 'error' | 'streaming';
  aspect_ratio?: string;
}

export interface Thread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  tool?: string;
}

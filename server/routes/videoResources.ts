import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { VideoResourceProvider } from '../services/videoResourceProvider.js';
import { pool } from '../db/index.js';
import { executeTaskLogic } from '../services/orchestrator.js';

const router = express.Router();

export interface CachedVideoJob {
  jobId: string;
  userId: number;
  status: string;
  mediaUrl?: string | null;
  error?: string | null;
  latency?: number | null;
  cachedAt: number;
}

// In-memory cache for fast, non-blocking job status polling without database thrashing
const videoJobCache = new Map<string, CachedVideoJob>();
const negativeJobCache = new Map<string, number>(); // jobId -> timestamp

const TERMINAL_JOB_TTL_MS = 10 * 60 * 1000; // 10 mins for completed/failed jobs
const PROCESSING_JOB_COALESCE_MS = 2500;    // 2.5 seconds coalesce window for active polling
const NEGATIVE_CACHE_TTL_MS = 2000;         // 2 seconds for missing jobs

export function setVideoJobCache(jobId: string, data: Partial<CachedVideoJob> & { status: string; userId?: number }) {
  if (!jobId) return;
  const existing = videoJobCache.get(jobId);
  const updated: CachedVideoJob = {
    jobId,
    userId: data.userId ?? existing?.userId ?? 0,
    status: data.status,
    mediaUrl: data.mediaUrl !== undefined ? data.mediaUrl : (existing?.mediaUrl || null),
    error: data.error !== undefined ? data.error : (existing?.error || null),
    latency: data.latency !== undefined ? data.latency : (existing?.latency || 0),
    cachedAt: Date.now()
  };
  videoJobCache.set(jobId, updated);
  negativeJobCache.delete(jobId);

  // Evict old cache entries if map grows large
  if (videoJobCache.size > 2000) {
    const now = Date.now();
    for (const [k, v] of videoJobCache.entries()) {
      const ttl = (v.status === 'completed' || v.status === 'failed') ? TERMINAL_JOB_TTL_MS : PROCESSING_JOB_COALESCE_MS * 4;
      if (now - v.cachedAt > ttl) videoJobCache.delete(k);
    }
  }
}

export function getVideoJobCache(jobId: string): CachedVideoJob | null {
  return videoJobCache.get(jobId) || null;
}

/**
 * POST /api/video-resources/generate
 * Dedicated high-performance endpoint to initiate video generation tasks.
 * Returns a jobId immediately for the client to poll or monitor via the status endpoint.
 */
router.post('/generate', authenticateToken, async (req: any, res) => {
  try {
    const userId = Number(req.user.id);
    const { prompt, chatId, videoSettings, attachedImages } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required for video generation.' });
    }

    const cleanChatId = chatId ? parseInt(String(chatId), 10) : null;
    let messageId: number | null = null;

    // 1. Create a placeholder message in the chat if a valid chatId is provided
    if (cleanChatId && !isNaN(cleanChatId)) {
      try {
        const msgResult = await pool.query(
          'INSERT INTO messages (chat_id, role, content, tool, tool_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [cleanChatId, 'assistant', 'جاري معالجة طلب الفيديو الخاص بك...', 'video', 'video']
        );
        if (msgResult.rows.length > 0) {
          messageId = msgResult.rows[0].id;
        }
      } catch (insertErr: any) {
        console.warn('[VideoResources] Message placeholder insertion note:', insertErr.message);
      }
    }

    // 2. Generate a unique job identifier
    const jobId = `video_job_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Prime the in-memory cache immediately so instant polling hits 0ms latency without DB lookups
    setVideoJobCache(jobId, {
      userId,
      status: 'processing',
      cachedAt: Date.now()
    });

    // 3. Start background orchestrator execution
    executeTaskLogic({
      tool_id: 'video',
      prompt: prompt.trim(),
      chat_id: cleanChatId,
      video_settings: videoSettings,
      attached_images: attachedImages,
      assistant_message_id: messageId, // Pass the message ID to avoid later redundant update queries
      jobId
    }, userId, req).catch(err => {
      console.error(`[VideoResources] Background generation failed for job ${jobId}:`, err.message);
      setVideoJobCache(jobId, {
        userId,
        status: 'failed',
        error: err.message || 'Generation failed'
      });
    });

    // 4. Confirm job initiation to client
    res.json({
      success: true,
      jobId,
      messageId,
      status: 'processing'
    });
  } catch (err: any) {
    console.error('[VideoResources] Generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to initiate video generation.' });
  }
});

/**
 * GET /api/video-resources/jobs/:jobId
 * Poll the status of a specific GPU video generation job.
 * Employs in-memory caching to eliminate database thrashing during rapid poll intervals.
 */
router.get('/jobs/:jobId', authenticateToken, async (req: any, res) => {
  try {
    const { jobId } = req.params;
    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid jobId parameter.' });
    }

    const currentUserId = Number(req.user.id);
    const isAdmin = req.user.role === 'admin';

    // 1. Fast-path: Check in-memory cache
    const cached = videoJobCache.get(jobId);
    if (cached) {
      // Security check
      if (cached.userId !== 0 && cached.userId !== currentUserId && !isAdmin) {
        return res.status(403).json({ error: 'Unauthorized to view this job.' });
      }

      // If job is in terminal state, return immediately from cache
      if (cached.status === 'completed' || cached.status === 'failed') {
        return res.json({
          jobId,
          status: cached.status,
          mediaUrl: cached.mediaUrl || null,
          error: cached.error || null,
          latency: cached.latency || 0
        });
      }

      // If job is still processing and was refreshed recently, return cached processing state
      if (Date.now() - cached.cachedAt < PROCESSING_JOB_COALESCE_MS) {
        return res.json({
          jobId,
          status: cached.status,
          mediaUrl: cached.mediaUrl || null,
          error: cached.error || null,
          latency: cached.latency || 0
        });
      }
    }

    // 2. Negative cache check to prevent spamming DB with invalid job IDs
    const negativeCachedTime = negativeJobCache.get(jobId);
    if (negativeCachedTime && Date.now() - negativeCachedTime < NEGATIVE_CACHE_TTL_MS) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    // 3. Query PostgreSQL with indexed lookup
    const result = await pool.query(
      'SELECT status, result_url, error_message, latency_ms, user_id FROM gpu_execution_jobs WHERE job_id = $1 LIMIT 1',
      [jobId]
    );

    if (result.rows.length === 0) {
      negativeJobCache.set(jobId, Date.now());
      return res.status(404).json({ error: 'Job not found.' });
    }

    const job = result.rows[0];
    const jobUserId = Number(job.user_id);

    // Authorization check
    if (jobUserId && jobUserId !== currentUserId && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to view this job.' });
    }

    // Update in-memory cache
    setVideoJobCache(jobId, {
      userId: jobUserId,
      status: job.status,
      mediaUrl: job.result_url,
      error: job.error_message,
      latency: job.latency_ms
    });

    res.json({
      jobId,
      status: job.status,
      mediaUrl: job.result_url,
      error: job.error_message,
      latency: job.latency_ms
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve job status.' });
  }
});

/**
 * GET /api/video-resources/chat/:chatId
 * Retrieve the high-definition video resources associated with a specific chat session.
 */
router.get('/chat/:chatId', authenticateToken, async (req: any, res) => {
  try {
    const chatId = parseInt(req.params.chatId, 10);
    if (isNaN(chatId)) {
      return res.status(400).json({ error: 'Invalid or missing chatId parameter.' });
    }

    const resources = await VideoResourceProvider.getResourcesByChat(chatId);
    res.json(resources);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve video resources for chat.' });
  }
});

/**
 * GET /api/video-resources/user
 * Retrieve all video resources generated by/for the currently authenticated user.
 */
router.get('/user', authenticateToken, async (req: any, res) => {
  try {
    const userId = String(req.user.id);
    const resources = await VideoResourceProvider.getResourcesByUser(userId);
    res.json(resources);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve video resources for user.' });
  }
});

/**
 * GET /api/video-resources/message/:messageId
 * Retrieve the specific video resource for a single chat message ID.
 */
router.get('/message/:messageId', authenticateToken, async (req: any, res) => {
  try {
    const messageId = parseInt(req.params.messageId, 10);
    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid or missing messageId parameter.' });
    }

    const resource = await VideoResourceProvider.getResourceByMessage(messageId);
    if (!resource) {
      return res.status(404).json({ error: 'No video resource found associated with this message ID.' });
    }

    res.json(resource);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve video resource for message.' });
  }
});

export default router;

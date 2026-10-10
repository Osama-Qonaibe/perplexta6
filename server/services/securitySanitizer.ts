/**
 * Zero-Knowledge Security & Anti-Prompt-Injection Shield
 * 
 * Inspects incoming prompts before LLM dispatch to block exfiltration,
 * jailbreaks, reverse engineering, and infrastructure probing at the server level.
 */

export interface SecurityScanResult {
  blocked: boolean;
  reason?: string;
  responseAr?: string;
  responseEn?: string;
}

// Permitted Identity Queries (WHITELIST) that must NEVER trigger safety refusals
const PERMITTED_IDENTITY_PATTERNS: RegExp[] = [
  /(?:مين|من|منهو|من\s+هو|من\s+هي|شو|ما|ماذا|ايش|إيش)\s*(?:مطورك|مبرمجك|صانعك|مؤسسك|اسمك|أنت|انت|بيربليكستا|أسامة\s*قنيبي|اسامة\s*قنيبي|فيرال\s*لينك|viral\s*link)/i,
  /(?:who|what)\s+(?:is|are|made|created|developed|founded|built)\s+(?:you|your\s+creator|your\s+developer|your\s+name|perplexta|osama\s+qonaibe|viral\s+link)/i,
  /(?:who\s+are\s+you|what\s+is\s+your\s+name|tell\s+me\s+about\s+osama\s+qonaibe|tell\s+me\s+about\s+perplexta)/i
];

// Adversarial and prompt-injection patterns (Case-insensitive multi-language regexes)
const INJECTION_PATTERNS: RegExp[] = [
  // System prompt / Instruction extraction
  /(?:reveal|show|dump|print|output|display|repeat|leak)\s+(?:your\s+)?(?:system\s+prompt|hidden\s+prompt|initial\s+prompt|base\s+prompt|meta\s+prompt|system\s+instructions?|system\s+message)/i,
  /(?:system\s*prompt\s*dump|developer\s*instruction\s*dump)/i,
  /(?:ما\s*(?:هو|هي)?\s*(?:الـ\s*system\s*prompt|الأوامر\s*المخفية|التعليمات\s*السرية|رسالة\s*النظام\s*السرية))/i,
  /(?:اكشف|اعرض|اطبع|اكتب|انسخ|اظهر|أظهر)\s+(?:لي\s+)?(?:البرومبت\s*المخفي|الأوامر\s*الأولى|الـ\s*system\s*prompt|التعليمات\s*السرية|النص\s*الذي\s*فوق)/i,

  // Jailbreaks & Instruction Overrides
  /(?:ignore|disregard|forget|bypass|override)\s+(?:all\s+)?(?:previous|prior|above|former|initial|system)\s+(?:instructions?|directives?|rules?|prompts?|constraints?)/i,
  /(?:تجاهل|انسَ|تخطى|تجاوز|الغِ|ألغِ)\s+(?:كل\s+)?(?:التعليمات|الأوامر|القواعد|التوجيهات|القيود)\s+(?:السابقة|القديمة|المذكورة|أعلاه)/i,
  /(?:dan\s*mode|jailbreak\s*mode|god\s*mode|unrestricted\s*mode|explain\s*your\s*internal\s*neural\s*pipeline)/i,
  /(?:وضع\s*المطور|تفعيل\s*وضع\s*التصحيح|تجاوز\s*القيود|جيلبريك)/i,

  // Internal Configuration / Infrastructure Probing
  /(?:api_keys_vault|gpu_providers|tool_orchestrator|bulletin_ads|admin_panel|core\.schema|drizzle\.config)/i,
  /(?:cat\s+\/etc|process\.env|eval\(|SELECT\s+.*\s+FROM\s+(?:users|api_keys|configs))/i
];

/**
 * Fast Regex Pre-Flight Security Check
 * Returns immediately if prompt injection or system probe is detected.
 */
export const scanForPromptInjection = (prompt: string): SecurityScanResult => {
  if (!prompt || typeof prompt !== 'string') {
    return { blocked: false };
  }

  const normalized = prompt.trim().toLowerCase();

  // Whitelist check: Legitimate identity queries pass through freely
  for (const whitePattern of PERMITTED_IDENTITY_PATTERNS) {
    if (whitePattern.test(normalized)) {
      return { blocked: false };
    }
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        blocked: true,
        reason: 'PROMPT_INJECTION_OR_PROBE_DETECTED',
        responseAr: 'عذراً، هذا الإجراء غير متاح. المنظومة مخصصة للبحث المعرفي والمعالجة المباشرة فقط.',
        responseEn: 'Sorry, this operation is not permitted. The platform is dedicated solely to cognitive research and direct processing.'
      };
    }
  }

  return { blocked: false };
};

/**
 * Redacts any internal database table names, paths, or secrets from outgoing text
 */
export const redactInternalArtifacts = (text: string): string => {
  if (!text) return text;
  return text
    .replace(/(?:api_keys_vault|tool_orchestrator|gpu_providers|bulletin_ads|ledger_transactions)/gi, '[PROTECTED_SYSTEM_ENTITY]')
    .replace(/(?:postgres:\/\/[^\s]+|mongodb:\/\/[^\s]+)/gi, '[PROTECTED_CONNECTION_URI]')
    .replace(/(?:sk-[a-zA-Z0-9]{20,}|AIzaSy[a-zA-Z0-9_-]{33}|bearer\s+[a-zA-Z0-9_\-\.]{20,})/gi, '[REDACTED_CREDENTIAL]');
};

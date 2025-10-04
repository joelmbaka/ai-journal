import { supabase } from '../lib/supabase';
import { getBackendBaseUrl } from '../config/appConfig';

// Resolve backend URL robustly at runtime. We probe likely candidates and cache the first reachable one.
let RESOLVED_BASE_URL: string | null = null;

async function resolveBackendBaseUrl(): Promise<string> {
  if (RESOLVED_BASE_URL) return RESOLVED_BASE_URL;

  // Build candidate list (ordered by likelihood) - get seed URL lazily
  const BASE_URL_SEED = getBackendBaseUrl();
  const candidates = Array.from(new Set([
    BASE_URL_SEED,
    // Common emulator/localhost fallbacks
    'http://10.0.2.2:8082',
    'http://localhost:8082',
  ].filter(Boolean)));

  for (const base of candidates) {
    try {
      // Fresh controller per attempt
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${base}/`, { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        RESOLVED_BASE_URL = base.replace(/\/+$/, '');
        return RESOLVED_BASE_URL;
      }
    } catch (_) {
      // Try next candidate
    }
  }

  // Fallback to seed even if unreachable, so errors surface clearly
  RESOLVED_BASE_URL = BASE_URL_SEED;
  return RESOLVED_BASE_URL;
}

// Types aligned with simplified backend/models.py
export interface AIReport {
  title: string;
  summary: string;
  key_insights: string[];
  recommendations: string[];
  mood_analysis?: string;
  keywords?: string[];
  entries_analyzed: number;
  confidence_score: number;
  prompt_used: string;
}

export interface AIReportResponse {
  success: boolean;
  report?: AIReport;
  error_message?: string;
  processing_time_seconds?: number;
}

export async function generateAIReport(params: {
  prompt: string;
  userId?: string | null;
  preferredAnalysisTypes?: string[];
  dateRangeDays?: number;
  matchCount?: number;
  userToken?: string | null;
}): Promise<AIReportResponse> {
  // Resolve token if not provided
  let token = params.userToken ?? null;
  if (!token) {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token ?? null;
  }

  // Clamp/sanitize to satisfy backend Pydantic constraints
  const promptSafe = (params.prompt ?? '').slice(0, 500);
  const typesSafe = (params.preferredAnalysisTypes ?? []).slice(0, 3);
  const dateRangeSafe = Math.min(365, Math.max(1, params.dateRangeDays ?? 30));
  const matchCountSafe = Math.min(50, Math.max(1, params.matchCount ?? 10));

  const body = {
    prompt: promptSafe,
    user_id: params.userId ?? 'anonymous',
    preferred_analysis_types: typesSafe,
    date_range_days: dateRangeSafe,
    user_token: token ?? '',
    match_count: matchCountSafe,
  };

  try {
    const base = await resolveBackendBaseUrl();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 600_000); // allow up to 10 minutes
    const res = await fetch(`${base}/generate-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { success: false, error_message: `HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}` };
    }
    return (await res.json()) as AIReportResponse;
  } catch (err: any) {
    const msg = err?.name === 'AbortError' ? 'Network timeout' : (err?.message || 'Network request failed');
    return { success: false, error_message: msg };
  }
}

// Helper to render AIReport to a user-friendly text block
export function renderAIReportToText(report: AIReport): string {
  const parts: string[] = [];
  // Normalize fields defensively to avoid NaN/undefined in UI
  const title = (report as any)?.title ? String((report as any).title).trim() : 'AI Report';
  const summary = (report as any)?.summary ? String((report as any).summary).trim() : '';
  const normalizeList = (v: any): string[] => {
    if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).filter(Boolean);
    if (typeof v === 'string' && v.trim()) return [v.trim()];
    return [];
  };
  const keyInsights = normalizeList((report as any).key_insights);
  const recommendations = normalizeList((report as any).recommendations);
  const keywords = normalizeList((report as any).keywords);
  const entriesRaw = (report as any)?.entries_analyzed;
  let entries = 0;
  if (typeof entriesRaw === 'number' && Number.isFinite(entriesRaw)) {
    entries = entriesRaw;
  } else if (typeof entriesRaw === 'string') {
    const n = parseInt(entriesRaw, 10);
    if (Number.isFinite(n)) entries = n;
  }
  const confidenceRaw = (report as any)?.confidence_score;
  let confidence = 0.5;
  if (typeof confidenceRaw === 'number' && Number.isFinite(confidenceRaw)) {
    confidence = confidenceRaw;
  } else if (typeof confidenceRaw === 'string') {
    const n = parseFloat(confidenceRaw);
    if (Number.isFinite(n)) confidence = n;
  }
  const promptUsed = (report as any)?.prompt_used ? String((report as any).prompt_used).trim() : '';

  parts.push(`# ${title}`);
  parts.push('');
  parts.push(summary);
  parts.push('');

  if (keyInsights.length) {
    parts.push('Key Insights:');
    keyInsights.forEach((insight) => {
      parts.push(`- ${insight}`);
    });
    parts.push('');
  }

  if (recommendations.length) {
    parts.push('Recommendations:');
    recommendations.forEach((rec) => {
      parts.push(`- ${rec}`);
    });
    parts.push('');
  }

  if ((report as any)?.mood_analysis) {
    parts.push(`Mood Analysis: ${String((report as any).mood_analysis)}`);
    parts.push('');
  }

  if (keywords.length) {
    parts.push(`Keywords: ${keywords.join(', ')}`);
    parts.push('');
  }

  parts.push(`Entries analyzed: ${entries}`);
  parts.push(`Overall confidence: ${(confidence * 100).toFixed(0)}%`);
  if (promptUsed) {
    parts.push(`Prompt used: ${promptUsed}`);
  }

  return parts.join('\n');
}

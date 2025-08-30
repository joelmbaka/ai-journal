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

// Types aligned with backend/models.py (simplified where possible)
export interface AIKeyInsight { title: string; description: string; confidence: number }
export interface AIRecommendation { action: string; priority: 'high' | 'medium' | 'low'; rationale: string }
export interface AIMoodPattern { dominant_mood: string; trend: 'improving' | 'declining' | 'stable' | 'mixed'; frequency: number }

export interface AIReport {
  title: string;
  summary: string;
  analysis_type: string[];
  key_insights: AIKeyInsight[];
  recommendations: AIRecommendation[];
  mood_patterns?: AIMoodPattern[];
  themes_identified?: string[];
  keywords?: string[];
  entries_analyzed: number;
  date_range_start?: string | null;
  date_range_end?: string | null;
  confidence_score: number;
  prompt_used: string;
  user_focus_areas?: string[];
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
    const timeout = setTimeout(() => controller.abort(), 240_000); // allow up to 4 minutes
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
  parts.push(`# ${report.title}`);
  parts.push('');
  parts.push(report.summary);
  parts.push('');

  if (report.key_insights?.length) {
    parts.push('Key Insights:');
    report.key_insights.forEach((k, idx) => {
      parts.push(`- (${(k.confidence * 100).toFixed(0)}%) ${k.title}: ${k.description}`);
    });
    parts.push('');
  }

  if (report.recommendations?.length) {
    parts.push('Recommendations:');
    report.recommendations.forEach((r) => {
      parts.push(`- [${r.priority}] ${r.action} — ${r.rationale}`);
    });
    parts.push('');
  }

  if (report.themes_identified?.length) {
    parts.push(`Themes: ${report.themes_identified.join(', ')}`);
  }
  if (report.keywords?.length) {
    parts.push(`Keywords: ${report.keywords.join(', ')}`);
  }

  parts.push('');
  parts.push(`Entries analyzed: ${report.entries_analyzed}`);
  if (report.date_range_start || report.date_range_end) {
    parts.push(`Date range: ${report.date_range_start ?? ''} → ${report.date_range_end ?? ''}`);
  }
  parts.push(`Overall confidence: ${(report.confidence_score * 100).toFixed(0)}%`);

  return parts.join('\n');
}

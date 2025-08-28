import { supabase } from '../lib/supabase';

// Keep timeout > 3 minutes as requested
export const LONG_TIMEOUT_MS = 4 * 60 * 1000; // 4 minutes

// Minimal local shape to avoid cross-module coupling
export interface LocalReport {
  id: number;
  title: string;
  content: string;
  prompt: string;
  type: string;
  status: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

async function withTimeout<T>(fn: () => Promise<T>, ms = LONG_TIMEOUT_MS): Promise<T> {
  return await Promise.race([
    fn(),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)),
  ]);
}

export async function pushAllReports(db: any): Promise<{ pushed: number }> {
  const localReports = (await db.getAllAsync('SELECT * FROM reports')) as LocalReport[];
  if (!localReports || localReports.length === 0) return { pushed: 0 };

  const payload = localReports.map((r) => ({
    client_id: r.id,
    title: r.title,
    content: r.content,
    prompt: r.prompt,
    type: r.type,
    status: r.status,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
    // user_id is set by DB trigger (auth.uid())
  }));

  await withTimeout(async () => {
    const { error } = await supabase
      .from('reports')
      .upsert(payload, { onConflict: 'user_id,client_id' });
    if (error) throw error;
    return;
  });
  return { pushed: payload.length };
}

export async function pushReport(report: LocalReport): Promise<void> {
  const payload = [{
    client_id: report.id,
    title: report.title,
    content: report.content,
    prompt: report.prompt,
    type: report.type,
    status: report.status,
    created_at: report.createdAt,
    updated_at: report.updatedAt,
  }];

  await withTimeout(async () => {
    const { error } = await supabase
      .from('reports')
      .upsert(payload, { onConflict: 'user_id,client_id' });
    if (error) throw error;
    return;
  });
}

export async function deleteRemoteReport(clientId: number): Promise<void> {
  await withTimeout(async () => {
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('client_id', clientId);
    if (error) throw error;
    return;
  });
}

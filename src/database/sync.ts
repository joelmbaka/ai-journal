import { supabase } from '../lib/supabase';
import type { JournalEntry } from './schema';
import { initializeDatabase } from './schema';

// Push all local entries to Supabase. Server enforces uniqueness on (user_id, client_id)
export async function pushAllEntries(db: any): Promise<{ pushed: number }> {
  const localEntries = await db.getAllAsync('SELECT * FROM journal_entries') as JournalEntry[];
  if (!localEntries || localEntries.length === 0) return { pushed: 0 };

  const payload = localEntries.map((e: JournalEntry) => ({
    client_id: e.id,        // local autoincrement id
    title: e.title,
    content: e.content,
    date: e.date,           // 'YYYY-MM-DD'
    created_at: e.created_at,
    updated_at: e.updated_at,
    // user_id is set by DB trigger (auth.uid()) and synced_at auto-set on insert
  }));

  const { error } = await supabase
    .from('journal_entries')
    .upsert(payload, { onConflict: 'user_id,client_id' });

  if (error) throw error;
  return { pushed: payload.length };
}

// Push a single entry (used after local create when logged in)
export async function pushEntry(entry: JournalEntry): Promise<void> {
  const payload = [{
    client_id: entry.id,
    title: entry.title,
    content: entry.content,
    date: entry.date,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
  }];

  const { error } = await supabase
    .from('journal_entries')
    .upsert(payload, { onConflict: 'user_id,client_id' });

  if (error) throw error;
}

// Delete a single remote entry by client_id (RLS uses current user session)
export async function deleteRemoteEntry(clientId: number): Promise<void> {
  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('client_id', clientId);
  if (error) throw error;
}

// Pull all remote entries for the authenticated user and merge into local DB
// Uses remote client_id as local id. If a local row exists, update only when remote is newer.
export async function pullAllEntries(db: any): Promise<{ inserted: number; updated: number }> {
  await initializeDatabase(db);

  type RemoteEntry = {
    client_id: number;
    title: string;
    content: string;
    date: string;
    created_at: string;
    updated_at: string;
  };

  const { data, error } = await supabase
    .from('journal_entries')
    .select('client_id, title, content, date, created_at, updated_at')
    .order('created_at', { ascending: true });

  if (error) throw error;
  const rows = (data ?? []) as RemoteEntry[];

  let inserted = 0;
  let updated = 0;

  for (const r of rows) {
    const local = await db.getFirstAsync(
      'SELECT updated_at FROM journal_entries WHERE id = ?',
      [r.client_id]
    ) as { updated_at: string } | undefined;

    if (!local) {
      await db.runAsync(
        'INSERT INTO journal_entries (id, title, content, date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [r.client_id, r.title, r.content, r.date, r.created_at, r.updated_at]
      );
      inserted += 1;
    } else {
      const localTs = new Date(local.updated_at).getTime();
      const remoteTs = new Date(r.updated_at).getTime();
      if (isFinite(localTs) && isFinite(remoteTs) && remoteTs > localTs) {
        await db.runAsync(
          'UPDATE journal_entries SET title = ?, content = ?, date = ?, created_at = ?, updated_at = ? WHERE id = ?',
          [r.title, r.content, r.date, r.created_at, r.updated_at, r.client_id]
        );
        updated += 1;
      }
    }
  }

  return { inserted, updated };
}

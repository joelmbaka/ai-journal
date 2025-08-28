import { useSQLiteContext } from 'expo-sqlite';
import { JournalEntry } from './schema';
import { useAuth } from '../context/AuthContext';
import { pushEntry, deleteRemoteEntry } from './sync';
import { requestEmbeddingUpdate } from './embeddings';

export const useJournalService = () => {
  const db = useSQLiteContext();
  const { session } = useAuth();

  const getTodaysEntries = async (): Promise<JournalEntry[]> => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return getEntriesForDate(today);
  };

  const getEntriesForDate = async (dateString: string): Promise<JournalEntry[]> => {
    console.log(`📅 [DB] Loading entries for date: ${dateString}`);
    
    try {
      const entries = await db.getAllAsync<JournalEntry>(
        'SELECT * FROM journal_entries WHERE date = ? ORDER BY created_at DESC',
        [dateString]
      );
      console.log(`✅ [DB] Successfully loaded ${entries.length} entries for ${dateString}`);
      console.log(`📝 [DB] Entries:`, entries.map(e => ({ id: e.id, title: e.title, created_at: e.created_at })));
      return entries;
    } catch (error) {
      console.error(`❌ [DB] Error loading entries for ${dateString}:`, error);
      throw error;
    }
  };

  const createEntry = async (title: string, content: string, dateString?: string): Promise<number> => {
    const entryDate = dateString || new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    
    console.log(`💾 [DB] Creating new entry:`, {
      title: title.substring(0, 50) + (title.length > 50 ? '...' : ''),
      contentLength: content.length,
      date: entryDate,
      timestamp: now
    });
    
    try {
      const result = await db.runAsync(
        'INSERT INTO journal_entries (title, content, date, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [title, content, entryDate, now, now]
      );
      
      console.log(`✅ [DB] Entry created successfully:`, {
        id: result.lastInsertRowId,
        changes: result.changes,
        title: title.substring(0, 30) + '...',
        savedForDate: entryDate
      });
      
      // Push to Supabase if logged in
      if (session?.user?.id) {
        try {
          const entry: JournalEntry = {
            id: result.lastInsertRowId,
            title,
            content,
            date: entryDate,
            created_at: now,
            updated_at: now,
          };
          await pushEntry(entry);
          console.log(`☁️ [Sync] Pushed new entry ${entry.id} to cloud`);
          // Request server-side embedding generation (Gemini via Edge Function)
          try {
            await requestEmbeddingUpdate(entry.id, title, content);
            console.log(`🧠 [Embed] Requested embedding update for entry ${entry.id}`);
          } catch (embedErr) {
            console.warn('🧠 [Embed] Failed to request embedding update', embedErr);
          }
        } catch (syncErr) {
          console.warn('☁️ [Sync] Failed to push new entry', syncErr);
        }
      }

      return result.lastInsertRowId;
    } catch (error) {
      console.error(`❌ [DB] Error creating entry:`, error);
      console.error(`📋 [DB] Failed entry data:`, { title, contentLength: content.length, date: entryDate });
      throw error;
    }
  };

  const updateEntry = async (id: number, title: string, content: string): Promise<void> => {
    const now = new Date().toISOString();
    
    console.log(`🔄 [DB] Updating entry:`, {
      id,
      title: title.substring(0, 30) + '...',
      contentLength: content.length,
      timestamp: now
    });
    
    try {
      const result = await db.runAsync(
        'UPDATE journal_entries SET title = ?, content = ?, updated_at = ? WHERE id = ?',
        [title, content, now, id]
      );
      
      console.log(`✅ [DB] Entry updated successfully:`, {
        id,
        changes: result.changes,
        affectedRows: result.changes
      });

      // Push to Supabase if logged in
      if (session?.user?.id) {
        try {
          const updated = await db.getFirstAsync<JournalEntry>(
            'SELECT * FROM journal_entries WHERE id = ?',
            [id]
          );
          if (updated) {
            await pushEntry(updated);
            console.log(`☁️ [Sync] Pushed updated entry ${id} to cloud`);
            // Request embedding update using latest content
            try {
              await requestEmbeddingUpdate(id, updated.title, updated.content);
              console.log(`🧠 [Embed] Requested embedding update for entry ${id}`);
            } catch (embedErr) {
              console.warn('🧠 [Embed] Failed to request embedding update', embedErr);
            }
          }
        } catch (syncErr) {
          console.warn('☁️ [Sync] Failed to push updated entry', syncErr);
        }
      }
    } catch (error) {
      console.error(`❌ [DB] Error updating entry ${id}:`, error);
      throw error;
    }
  };

  const deleteEntry = async (id: number): Promise<void> => {
    console.log(`🗑️ [DB] Deleting entry: ${id}`);
    
    try {
      const result = await db.runAsync('DELETE FROM journal_entries WHERE id = ?', [id]);
      console.log(`✅ [DB] Entry deleted successfully:`, {
        id,
        changes: result.changes
      });

      // Delete from Supabase if logged in (RLS will scope to current user)
      if (session?.user?.id) {
        try {
          await deleteRemoteEntry(id);
          console.log(`☁️ [Sync] Deleted entry ${id} from cloud`);
          // Optionally: trigger embedding deletion via Edge Function if implemented
        } catch (syncErr) {
          console.warn('☁️ [Sync] Failed to delete remote entry', syncErr);
        }
      }
    } catch (error) {
      console.error(`❌ [DB] Error deleting entry ${id}:`, error);
      throw error;
    }
  };

  const getEntryById = async (id: number): Promise<JournalEntry | null> => {
    console.log(`🔍 [DB] Fetching entry: ${id}`);
    
    try {
      const entry = await db.getFirstAsync<JournalEntry>(
        'SELECT * FROM journal_entries WHERE id = ?',
        [id]
      );
      
      if (entry) {
        console.log(`✅ [DB] Entry found:`, {
          id: entry.id,
          title: entry.title.substring(0, 30) + '...',
          created_at: entry.created_at
        });
      } else {
        console.log(`⚠️ [DB] Entry ${id} not found`);
      }
      
      return entry;
    } catch (error) {
      console.error(`❌ [DB] Error fetching entry ${id}:`, error);
      throw error;
    }
  };

  const getAllEntries = async (): Promise<JournalEntry[]> => {
    console.log(`📊 [DB] Fetching all entries from database`);
    
    try {
      const entries = await db.getAllAsync<JournalEntry>(
        'SELECT * FROM journal_entries ORDER BY created_at DESC'
      );
      
      console.log(`✅ [DB] Total entries in database: ${entries.length}`);
      console.table(entries.map(e => ({
        id: e.id,
        title: e.title.substring(0, 40),
        date: e.date,
        created: new Date(e.created_at).toLocaleString()
      })));
      
      return entries;
    } catch (error) {
      console.error(`❌ [DB] Error fetching all entries:`, error);
      throw error;
    }
  };

  const getDbStats = async () => {
    console.log(`📈 [DB] Getting database statistics`);
    
    try {
      const totalCount = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM journal_entries'
      );
      
      const todayCount = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM journal_entries WHERE date = ?',
        [new Date().toISOString().split('T')[0]]
      );
      
      const stats = {
        totalEntries: totalCount?.count || 0,
        todayEntries: todayCount?.count || 0,
        lastEntry: await db.getFirstAsync<{ created_at: string }>(
          'SELECT created_at FROM journal_entries ORDER BY created_at DESC LIMIT 1'
        )
      };
      
      console.log(`📊 [DB] Database Stats:`, stats);
      return stats;
    } catch (error) {
      console.error(`❌ [DB] Error getting database stats:`, error);
      throw error;
    }
  };

  // Clear all local journal entries from SQLite
  const clearAllEntries = async (): Promise<void> => {
    try {
      await db.execAsync('DELETE FROM journal_entries;');
      console.log('🧹 [DB] Cleared all journal entries');
    } catch (error) {
      console.error('❌ [DB] Error clearing all journal entries:', error);
      throw error;
    }
  };

  return {
    getTodaysEntries,
    getEntriesForDate,
    createEntry,
    updateEntry,
    getEntryById,
    getAllEntries,
    deleteEntry,
    getDbStats,
    clearAllEntries,
  };
};

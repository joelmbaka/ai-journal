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
    try {
      const entries = await db.getAllAsync<JournalEntry>(
        'SELECT * FROM journal_entries WHERE date = ? ORDER BY created_at DESC',
        [dateString]
      );
      return entries;
    } catch (error) {
      console.error(`❌ [DB] Error loading entries for ${dateString}:`, error);
      throw error;
    }
  };

  const createEntry = async (title: string, content: string, dateString?: string): Promise<number> => {
    const entryDate = dateString || new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    
    try {
      const result = await db.runAsync(
        'INSERT INTO journal_entries (title, content, date, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [title, content, entryDate, now, now]
      );
      
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
          // Request server-side embedding generation (Gemini via Edge Function)
          try {
            await requestEmbeddingUpdate(entry.id, title, content);
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
      throw error;
    }
  };

  const updateEntry = async (id: number, title: string, content: string): Promise<void> => {
    const now = new Date().toISOString();
    
    try {
      const result = await db.runAsync(
        'UPDATE journal_entries SET title = ?, content = ?, updated_at = ? WHERE id = ?',
        [title, content, now, id]
      );
      
      // Push to Supabase if logged in
      if (session?.user?.id) {
        try {
          const updated = await db.getFirstAsync<JournalEntry>(
            'SELECT * FROM journal_entries WHERE id = ?',
            [id]
          );
          if (updated) {
            await pushEntry(updated);
            // Request embedding update using latest content
            try {
              await requestEmbeddingUpdate(id, updated.title, updated.content);
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
    try {
      const result = await db.runAsync('DELETE FROM journal_entries WHERE id = ?', [id]);

      // Delete from Supabase if logged in (RLS will scope to current user)
      if (session?.user?.id) {
        try {
          await deleteRemoteEntry(id);
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
    try {
      const entry = await db.getFirstAsync<JournalEntry>(
        'SELECT * FROM journal_entries WHERE id = ?',
        [id]
      );
      
      return entry;
    } catch (error) {
      console.error(`❌ [DB] Error fetching entry ${id}:`, error);
      throw error;
    }
  };

  const getAllEntries = async (): Promise<JournalEntry[]> => {
    try {
      const entries = await db.getAllAsync<JournalEntry>(
        'SELECT * FROM journal_entries ORDER BY created_at DESC'
      );
      
      return entries;
    } catch (error) {
      console.error(`❌ [DB] Error fetching all entries:`, error);
      throw error;
    }
  };

  const getDbStats = async () => {
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

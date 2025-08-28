export interface JournalEntry {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  date: string; // YYYY-MM-DD format for easy querying
}

export const DATABASE_VERSION = 1;

export const initializeDatabase = async (db: any) => {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    
    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      date TEXT NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date);
    CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at ON journal_entries(created_at);
  `);
};

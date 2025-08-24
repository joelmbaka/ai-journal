export interface JournalEntry {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  title?: string;
  content: string;
  mood?: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
  tags?: string[];
  audioTranscription?: boolean;
  createdAt: string; // ISO datetime string
  updatedAt: string; // ISO datetime string
}

export interface JournalState {
  entries: Record<string, JournalEntry>; // keyed by date (YYYY-MM-DD)
  currentDate: string;
  isLoading: boolean;
  searchQuery: string;
  filteredEntries: JournalEntry[];
}

export interface RootState {
  journal: JournalState;
  settings: import('./settings').SettingsState;
}

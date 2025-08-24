import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { JournalEntry, JournalState } from '../../types/journal';

const getCurrentDate = (): string => {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
};

const initialState: JournalState = {
  entries: {},
  currentDate: getCurrentDate(),
  isLoading: false,
  searchQuery: '',
  filteredEntries: [],
};

const journalSlice = createSlice({
  name: 'journal',
  initialState,
  reducers: {
    // Entry CRUD operations
    createEntry: (state, action: PayloadAction<{ date: string; content: string; title?: string }>) => {
      const { date, content, title } = action.payload;
      const now = new Date().toISOString();
      
      state.entries[date] = {
        id: `entry-${date}`,
        date,
        title,
        content,
        createdAt: now,
        updatedAt: now,
      };
    },

    updateEntry: (state, action: PayloadAction<{ date: string; updates: Partial<JournalEntry> }>) => {
      const { date, updates } = action.payload;
      
      if (state.entries[date]) {
        state.entries[date] = {
          ...state.entries[date],
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      }
    },

    deleteEntry: (state, action: PayloadAction<string>) => {
      const date = action.payload;
      delete state.entries[date];
    },

    // Navigation
    setCurrentDate: (state, action: PayloadAction<string>) => {
      state.currentDate = action.payload;
    },

    // Search functionality
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      
      // Simple text search - will be enhanced with semantic search later
      if (action.payload.trim() === '') {
        state.filteredEntries = [];
      } else {
        const query = action.payload.toLowerCase();
        state.filteredEntries = Object.values(state.entries).filter(entry =>
          entry.content.toLowerCase().includes(query) ||
          entry.title?.toLowerCase().includes(query) ||
          entry.tags?.some(tag => tag.toLowerCase().includes(query))
        );
      }
    },

    // Loading states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // Mood tracking
    setEntryMood: (state, action: PayloadAction<{ date: string; mood: JournalEntry['mood'] }>) => {
      const { date, mood } = action.payload;
      
      if (state.entries[date]) {
        state.entries[date].mood = mood;
        state.entries[date].updatedAt = new Date().toISOString();
      }
    },

    // Tags management
    addEntryTag: (state, action: PayloadAction<{ date: string; tag: string }>) => {
      const { date, tag } = action.payload;
      
      if (state.entries[date]) {
        const entry = state.entries[date];
        entry.tags = entry.tags ? [...entry.tags, tag] : [tag];
        entry.updatedAt = new Date().toISOString();
      }
    },

    removeEntryTag: (state, action: PayloadAction<{ date: string; tag: string }>) => {
      const { date, tag } = action.payload;
      
      if (state.entries[date] && state.entries[date].tags) {
        state.entries[date].tags = state.entries[date].tags!.filter(t => t !== tag);
        state.entries[date].updatedAt = new Date().toISOString();
      }
    },

    // Bulk operations for data sync
    loadEntries: (state, action: PayloadAction<Record<string, JournalEntry>>) => {
      state.entries = action.payload;
      state.isLoading = false;
    },

    clearAllEntries: (state) => {
      state.entries = {};
      state.filteredEntries = [];
      state.searchQuery = '';
    },
  },
});

export const {
  createEntry,
  updateEntry,
  deleteEntry,
  setCurrentDate,
  setSearchQuery,
  setLoading,
  setEntryMood,
  addEntryTag,
  removeEntryTag,
  loadEntries,
  clearAllEntries,
} = journalSlice.actions;

export default journalSlice.reducer;

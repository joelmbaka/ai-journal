import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';

// Typed hooks for Redux
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Custom hooks for journal operations
export const useJournal = () => {
  const dispatch = useAppDispatch();
  const journalState = useAppSelector((state) => state.journal);

  return {
    ...journalState,
    dispatch,
  };
};

// Helper hook to get current day's entry
export const useCurrentEntry = () => {
  const { entries, currentDate } = useAppSelector((state) => state.journal);
  return entries[currentDate] || null;
};

// Helper hook to get entries for a date range
export const useEntriesInRange = (startDate: string, endDate: string) => {
  const { entries } = useAppSelector((state) => state.journal);
  
  return Object.values(entries).filter(entry => 
    entry.date >= startDate && entry.date <= endDate
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// Helper hook for search functionality
export const useSearchEntries = () => {
  const { searchQuery, filteredEntries } = useAppSelector((state) => state.journal);
  
  return {
    searchQuery,
    results: filteredEntries,
    hasResults: filteredEntries.length > 0,
  };
};

import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Appearance,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
// Removed gesture handling - no horizontal swipe navigation
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Removed BackgroundPatterns - using only clean blank background
import { DateNavigationHeader } from '../components/DateNavigationHeader';
import { JournalEntryComponent } from '../components/JournalEntry';
import { colorPresets } from '../constants/colorPresets';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setCurrentDate } from '../store/slices/journalSlice';
import { setColors } from '../store/slices/settingsSlice';
import { useJournalService } from '../database/journalService';
import { JournalEntry } from '../database/schema';

export const JournalScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const journalService = useJournalService();
  
  const { entries, currentDate } = useAppSelector((state) => state.journal);
  const { personalization } = useAppSelector((state) => state.settings);
  
  // State to trigger re-render when system theme changes
  const [systemColorScheme, setSystemColorScheme] = useState(Appearance.getColorScheme());
  
  // New state for seamless journal entries
  const [currentDateEntries, setCurrentDateEntries] = useState<JournalEntry[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const currentEntry = entries[currentDate];

  // Ensure unique entries by id before rendering to avoid duplicate React keys
  const entriesToRender = useMemo(() => {
    const seen = new Set<number>();
    const unique: JournalEntry[] = [];
    for (const e of currentDateEntries) {
      if (!seen.has(e.id)) {
        seen.add(e.id);
        unique.push(e);
      }
    }
    // Render latest items first
    return unique.slice().reverse();
  }, [currentDateEntries]);

  // Load entries for current date on mount and when date changes
  useEffect(() => {
    loadEntriesForCurrentDate();
  }, [currentDate]);

  const loadEntriesForCurrentDate = async (preventRefreshKey = false) => {
    try {
      const entries = await journalService.getEntriesForDate(currentDate);
      setCurrentDateEntries(entries);
      if (!preventRefreshKey) {
        setRefreshKey(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error loading entries:', error);
    }
  };

  // Refresh entries whenever the screen gains focus (e.g., returning from sign-out or other screens)
  useFocusEffect(
    useCallback(() => {
      // Avoid re-keying the ScrollView on focus to keep scroll position stable
      loadEntriesForCurrentDate(true);
    }, [currentDate])
  );

  const handleCreateEntry = async (title: string, content: string) => {
    try {
      const newEntryId = await journalService.createEntry(title, content, currentDate);
      
      // Optimistic update - add the new entry immediately without full reload
      const newEntry: JournalEntry = {
        id: newEntryId,
        title,
        content,
        date: currentDate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Prevent duplicates by id in optimistic state
      setCurrentDateEntries(prevEntries => [newEntry, ...prevEntries.filter(e => e.id !== newEntry.id)]);
    } catch (error) {
      console.error('Error creating entry:', error);
      // Fallback to full reload on error
      await loadEntriesForCurrentDate(true);
      throw error;
    }
  };

  const handleUpdateEntry = async (id: number, title: string, content: string) => {
    try {
      await journalService.updateEntry(id, title, content);
      
      // Optimistic update - update the entry in place
      setCurrentDateEntries(prevEntries => 
        prevEntries.map(entry => 
          entry.id === id 
            ? { ...entry, title, content, updated_at: new Date().toISOString() }
            : entry
        )
      );
    } catch (error) {
      console.error('Error updating entry:', error);
      // Fallback to full reload on error
      await loadEntriesForCurrentDate(true);
      throw error;
    }
  };

  const handleDeleteEntry = async (id: number) => {
    try {
      await journalService.deleteEntry(id);
      
      // Optimistic update - remove the entry immediately
      setCurrentDateEntries(prevEntries => 
        prevEntries.filter(entry => entry.id !== id)
      );
    } catch (error) {
      console.error('Error deleting entry:', error);
      // Fallback to full reload on error
      await loadEntriesForCurrentDate(true);
      throw error;
    }
  };

  // Removed animation values - no swipe navigation


  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription?.remove();
  }, []);

  // Removed gesture handling - only vertical scrolling allowed

  const handleDateChange = (date: string) => {
    dispatch(setCurrentDate(date));
  };

  // Determine actual theme (handle auto/system theme)
  const getActualTheme = () => {
    if (personalization.theme === 'auto') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return personalization.theme;
  };

  const actualTheme = getActualTheme();
  
  // No longer needed - removed line drawing feature

  const getStatusBarStyle = () => {
    if (actualTheme === 'dark') return 'light-content' as const;
    return 'dark-content' as const;
  };

  // Use neutral screen background - only apply personalization colors to writing area
  const screenBackgroundColor = actualTheme === 'dark' ? '#000000' : '#F5F5F5';

  return (
      <View className="flex-1" style={{ backgroundColor: screenBackgroundColor }}>
        <StatusBar barStyle={getStatusBarStyle()} />
        
        <DateNavigationHeader
          currentDate={currentDate}
          onDateChange={handleDateChange}
          personalization={personalization}
          hasEntry={!!currentEntry}
          screenBackgroundColor={screenBackgroundColor}
          actualTheme={actualTheme}
        />

        <View className="flex-1">
          <View className="flex-1 relative overflow-hidden">
            <View className="flex-1 z-[1] ml-4 mt-4 mr-4 mb-0">
              <View className="flex-1 relative overflow-hidden" style={{ backgroundColor: personalization.backgroundColor }}>
                <KeyboardAvoidingView
                  className="flex-1"
                  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                  keyboardVerticalOffset={insets.top}
                >
                  <ScrollView 
                    className="flex-1" 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, paddingBottom: 0 }}
                    key={refreshKey}
                    maintainVisibleContentPosition={{
                      minIndexForVisible: 0,
                      autoscrollToTopThreshold: 10,
                    }}
                  >
                    <View className="flex-row items-center justify-center px-4 py-2 gap-2.5">
                      {colorPresets.map((preset) => {
                        const isActive = personalization.backgroundColor === preset.bg;
                        return (
                          <TouchableOpacity
                            key={preset.name}
                            className="w-7 h-7 rounded-full items-center justify-center"
                            style={{
                              backgroundColor: preset.bg,
                              borderColor: isActive ? preset.accent : 'transparent',
                              borderWidth: isActive ? 2 : 0,
                            }}
                            onPress={async () => {
                              if (personalization.hapticFeedback) {
                                try {
                                  await Haptics.selectionAsync();
                                } catch {}
                              }
                              dispatch(
                                setColors({
                                  backgroundColor: preset.bg,
                                  textColor: preset.text,
                                  accentColor: preset.accent,
                                  lineColor: preset.line,
                                })
                              );
                            }}
                            accessibilityLabel={`Apply ${preset.name} colors`}
                          >
                            {isActive && (
                              <View
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: preset.accent }}
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {entriesToRender.map((entry) => (
                      <JournalEntryComponent
                        key={entry.id}
                        entry={entry}
                        personalization={personalization}
                        theme={actualTheme}
                        onSave={handleCreateEntry}
                        onUpdate={handleUpdateEntry}
                        onDelete={handleDeleteEntry}
                      />
                    ))}
                    
                    <JournalEntryComponent
                      isNewEntry={true}
                      personalization={personalization}
                      theme={actualTheme}
                      onSave={handleCreateEntry}
                    />
                  </ScrollView>
                </KeyboardAvoidingView>
              </View>
            </View>
          </View>
        </View>
      </View>
  );
};

 

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Appearance,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  Text,
  PixelRatio,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
// Removed gesture handling - no horizontal swipe navigation
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// Removed BackgroundPatterns - using only clean blank background
import { DateNavigationHeader } from '../components/DateNavigationHeader';
import { JournalTextInput } from '../components/JournalTextInput';
import { SpiralBinding } from '../components/SpiralBinding';
import { JournalEntryComponent } from '../components/JournalEntry';
import { colorPresets } from '../constants/colorPresets';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { createEntry, setCurrentDate, updateEntry } from '../store/slices/journalSlice';
import { setColors } from '../store/slices/settingsSlice';
import { formatDate } from '../utils/dateHelpers';
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
      
      setCurrentDateEntries(prevEntries => [newEntry, ...prevEntries]);
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
      <View style={[styles.container, { backgroundColor: screenBackgroundColor }]}>
        <StatusBar barStyle={getStatusBarStyle()} />
        
        <DateNavigationHeader
          currentDate={currentDate}
          onDateChange={handleDateChange}
          personalization={personalization}
          hasEntry={!!currentEntry}
          screenBackgroundColor={screenBackgroundColor}
          actualTheme={actualTheme}
        />


        <View style={styles.content}>
          <View style={styles.journalContainer}>
            <SpiralBinding theme={actualTheme} />
            
            <View style={styles.textContainer}>
                <View style={[styles.textAreaContainer, { backgroundColor: personalization.backgroundColor }]}>
                  <KeyboardAvoidingView
                    style={styles.keyboardAvoidingView}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={insets.top}
                  >
                    <ScrollView 
                      style={styles.journalScrollView} 
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.scrollContent}
                      key={refreshKey}
                      maintainVisibleContentPosition={{
                        minIndexForVisible: 0,
                        autoscrollToTopThreshold: 10,
                      }}
                    >
                      <View style={styles.quickColorsRow}>
                        {colorPresets.map((preset) => {
                          const isActive = personalization.backgroundColor === preset.bg;
                          return (
                            <TouchableOpacity
                              key={preset.name}
                              style={[
                                styles.quickColorItem,
                                {
                                  backgroundColor: preset.bg,
                                  borderColor: isActive ? preset.accent : 'transparent',
                                  borderWidth: isActive ? 2 : 0,
                                },
                              ]}
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
                                  style={[
                                    styles.quickColorAccent,
                                    { backgroundColor: preset.accent },
                                  ]}
                                />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      {/* Render existing entries - oldest first */}
                      {[...currentDateEntries].reverse().map((entry) => (
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
                      
                      {/* New entry input positioned immediately after last entry */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  journalContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  textContainer: {
    flex: 1,
    zIndex: 1,
    marginLeft: 40, // Space for spiral binding
    marginTop: 16, // Gap between header and page
    marginBottom: 0, // Let content extend to tabs
    marginRight: 16, // Right margin for balance
  },
  textAreaContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  quickColorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16, // Reduced padding since no settings button
    paddingVertical: 8,
    gap: 10,
  },
  quickColorItem: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickColorAccent: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  journalScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 0,
  },
  newEntrySpacing: {
    height: 8,
  },
});

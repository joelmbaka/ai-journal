import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Haptics } from 'expo-haptics';

import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { createEntry, updateEntry, setCurrentDate } from '../store/slices/journalSlice';
import { BackgroundPatterns } from '../components/BackgroundPatterns';
import { JournalTextInput } from '../components/JournalTextInput';
import { DateNavigationHeader } from '../components/DateNavigationHeader';
import { formatDate } from '../utils/dateHelpers';

export const JournalScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  
  const { entries, currentDate } = useAppSelector((state) => state.journal);
  const { personalization } = useAppSelector((state) => state.settings);
  
  const currentEntry = entries[currentDate];
  const [localText, setLocalText] = useState(currentEntry?.content || '');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animation values for swipe navigation
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    setLocalText(currentEntry?.content || '');
  }, [currentDate, currentEntry]);

  // Auto-save functionality
  const saveEntry = useCallback((text: string) => {
    if (text.trim() === '') {
      return;
    }

    if (currentEntry) {
      dispatch(updateEntry({
        date: currentDate,
        updates: { content: text }
      }));
    } else {
      dispatch(createEntry({
        date: currentDate,
        content: text
      }));
    }
  }, [dispatch, currentDate, currentEntry]);

  const handleTextChange = useCallback((text: string) => {
    setLocalText(text);

    if (personalization.autoSave) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new timeout for auto-save
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveEntry(text);
      }, 2000); // Save after 2 seconds of inactivity
    }
  }, [personalization.autoSave, saveEntry]);

  // Save text when component unmounts or date changes
  useEffect(() => {
    const saveCurrentText = () => {
      if (localText.trim()) {
        saveEntry(localText);
      }
    };

    // Save when date changes (not on initial mount)
    return () => {
      saveCurrentText();
      // Clear timeout on unmount
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [currentDate]); // Save when currentDate changes

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Gesture handling for date navigation
  const navigateToDate = (direction: 'prev' | 'next') => {
    if (personalization.hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const date = new Date(currentDate);
    date.setDate(date.getDate() + (direction === 'next' ? 1 : -1));
    dispatch(setCurrentDate(formatDate(date)));
  };

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      // Clear auto-save timeout and save current text before navigation
      if (autoSaveTimeoutRef.current) {
        runOnJS(clearTimeout)(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
      if (localText.trim()) {
        runOnJS(saveEntry)(localText);
      }
    },
    onActive: (event) => {
      translateX.value = event.translationX;
      opacity.value = 1 - Math.abs(event.translationX) / 300;
    },
    onEnd: (event) => {
      const { translationX, velocityX } = event;
      const threshold = 100;
      
      if (Math.abs(translationX) > threshold || Math.abs(velocityX) > 500) {
        if (translationX > 0) {
          runOnJS(navigateToDate)('prev');
        } else {
          runOnJS(navigateToDate)('next');
        }
      }
      
      // Reset animation
      translateX.value = withSpring(0);
      opacity.value = withSpring(1);
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
    };
  });

  const handleDateChange = (date: string) => {
    // Clear auto-save timeout and save current text before changing date
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
    if (localText.trim()) {
      saveEntry(localText);
    }
    dispatch(setCurrentDate(date));
  };

  const getStatusBarStyle = () => {
    if (personalization.theme === 'dark') return 'light-content';
    if (personalization.theme === 'light') return 'dark-content';
    return 'auto';
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={[styles.container, { backgroundColor: personalization.backgroundColor }]}>
        <StatusBar barStyle={getStatusBarStyle()} backgroundColor={personalization.backgroundColor} />
        
        <DateNavigationHeader
          currentDate={currentDate}
          onDateChange={handleDateChange}
          personalization={personalization}
          hasEntry={!!currentEntry}
        />

        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={insets.top}
        >
          <View style={styles.journalContainer}>
            <BackgroundPatterns
              style={personalization.backgroundStyle}
              lineColor={personalization.lineColor}
              backgroundColor={personalization.backgroundColor}
            />
            
            <PanGestureHandler onGestureEvent={gestureHandler}>
              <Animated.View style={[styles.textContainer, animatedStyle]}>
                <JournalTextInput
                  personalization={personalization}
                  onTextChange={handleTextChange}
                  initialText={localText}
                  placeholder={`What happened on ${new Date(currentDate).toLocaleDateString()}?`}
                />
              </Animated.View>
            </PanGestureHandler>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
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
  },
  textContainer: {
    flex: 1,
    zIndex: 1,
  },
});

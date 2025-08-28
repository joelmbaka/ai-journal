import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { PersonalizationSettings } from '../types/settings';
import { formatDisplayDate, isToday } from '../utils/dateHelpers';

interface DateNavigationHeaderProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  personalization: PersonalizationSettings;
  hasEntry: boolean;
  screenBackgroundColor?: string;
  actualTheme?: string;
}

const { width } = Dimensions.get('window');

export const DateNavigationHeader: React.FC<DateNavigationHeaderProps> = ({
  currentDate,
  onDateChange,
  personalization,
  hasEntry,
  screenBackgroundColor,
  actualTheme,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Use neutral colors for navbar elements - use actualTheme if provided, fallback to personalization.theme
  const effectiveTheme = actualTheme || personalization.theme;
  const navTextColor = effectiveTheme === 'dark' ? '#FFFFFF' : '#1A1A1A';
  const navAccentColor = effectiveTheme === 'dark' ? '#0A84FF' : '#007AFF';


  const navigateDate = (direction: 'prev' | 'next') => {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + (direction === 'next' ? 1 : -1));
    onDateChange(date.toISOString().split('T')[0]);
  };

  const handleDatePickerChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      onDateChange(dateString);
    }
  };

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateDate('prev')}
        >
          <MaterialIcons
            name="chevron-left"
            size={24}
            color={navAccentColor}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateContainer}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={[styles.dateText, { color: navTextColor }]}> 
            {formatDisplayDate(currentDate)}
          </Text>
          {isToday(currentDate) && (
            <View style={[styles.todayIndicator, { backgroundColor: navAccentColor }]} />
          )}
          {hasEntry && (
            <View style={[styles.entryIndicator, { backgroundColor: navAccentColor }]} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateDate('next')}
        >
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={navAccentColor}
          />
        </TouchableOpacity>

      </View>

      {showDatePicker && (
        <DateTimePicker
          value={new Date(currentDate)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDatePickerChange}
          themeVariant={effectiveTheme === 'dark' ? 'dark' : 'light'}
        />
      )}

    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navButton: {
    padding: 8,
    borderRadius: 20,
  },
  dateContainer: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  todayIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  entryIndicator: {
    position: 'absolute',
    top: -4,
    right: -8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

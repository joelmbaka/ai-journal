import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

export const DateNavigationHeader: React.FC<DateNavigationHeaderProps> = ({
  currentDate,
  onDateChange,
  personalization,
  hasEntry,
  screenBackgroundColor,
  actualTheme,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const insets = useSafeAreaInsets();
  
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
      <View className="flex-row items-center justify-between px-4 py-4" style={{ paddingTop: insets.top, minHeight: 56 }}>
        <TouchableOpacity
          className="p-2 rounded-full"
          onPress={() => navigateDate('prev')}
        >
          <MaterialIcons
            name="chevron-left"
            size={24}
            color={navAccentColor}
          />
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 items-center relative"
          onPress={() => setShowDatePicker(true)}
        >
          <Text className="text-lg font-semibold text-center" style={{ color: navTextColor }}> 
            {formatDisplayDate(currentDate)}
          </Text>
          {isToday(currentDate) && (
            <View className="absolute w-[6px] h-[6px] rounded-full bottom-[-6px]" style={{ backgroundColor: navAccentColor }} />
          )}
          {hasEntry && (
            <View className="absolute w-2 h-2 rounded-full top-[-4px] right-[-8px]" style={{ backgroundColor: navAccentColor }} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="p-2 rounded-full"
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


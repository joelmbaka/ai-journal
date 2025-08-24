import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { PersonalizationSettings } from '../types/settings';
import { formatDisplayDate, isToday } from '../utils/dateHelpers';
import { SettingsOverlay } from './SettingsOverlay';

interface DateNavigationHeaderProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  personalization: PersonalizationSettings;
  hasEntry: boolean;
}

const { width } = Dimensions.get('window');

export const DateNavigationHeader: React.FC<DateNavigationHeaderProps> = ({
  currentDate,
  onDateChange,
  personalization,
  hasEntry,
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const navigateDate = (direction: 'prev' | 'next') => {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + (direction === 'next' ? 1 : -1));
    onDateChange(date.toISOString().split('T')[0]);
  };

  const handleCalendarSelect = (day: any) => {
    onDateChange(day.dateString);
    setShowCalendar(false);
  };

  const calendarTheme = {
    backgroundColor: personalization.backgroundColor,
    calendarBackground: personalization.backgroundColor,
    textSectionTitleColor: personalization.textColor,
    selectedDayBackgroundColor: personalization.accentColor,
    selectedDayTextColor: personalization.backgroundColor,
    todayTextColor: personalization.accentColor,
    dayTextColor: personalization.textColor,
    textDisabledColor: `${personalization.textColor}40`,
    arrowColor: personalization.accentColor,
    monthTextColor: personalization.textColor,
    indicatorColor: personalization.accentColor,
  };

  return (
    <>
      <View style={[styles.header, { backgroundColor: personalization.backgroundColor }]}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateDate('prev')}
        >
          <MaterialIcons
            name="chevron-left"
            size={24}
            color={personalization.accentColor}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateContainer}
          onPress={() => setShowCalendar(true)}
        >
          <Text style={[styles.dateText, { color: personalization.textColor }]}>
            {formatDisplayDate(currentDate)}
          </Text>
          {isToday(currentDate) && (
            <View style={[styles.todayIndicator, { backgroundColor: personalization.accentColor }]} />
          )}
          {hasEntry && (
            <View style={[styles.entryIndicator, { backgroundColor: personalization.accentColor }]} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateDate('next')}
        >
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={personalization.accentColor}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setShowSettings(true)}
        >
          <MaterialIcons
            name="settings"
            size={20}
            color={personalization.accentColor}
          />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showCalendar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCalendar(false)}
        >
          <View style={[styles.calendarContainer, { backgroundColor: personalization.backgroundColor }]}>
            <Calendar
              current={currentDate}
              onDayPress={handleCalendarSelect}
              theme={calendarTheme}
              style={styles.calendar}
              hideExtraDays={true}
              firstDay={1}
              showWeekNumbers={false}
              disableMonthChange={false}
              enableSwipeMonths={true}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <SettingsOverlay
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E7',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    width: width * 0.9,
    borderRadius: 12,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  calendar: {
    borderRadius: 8,
  },
  settingsButton: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
});

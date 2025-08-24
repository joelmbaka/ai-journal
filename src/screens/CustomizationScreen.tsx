import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import {
    setBackgroundStyle,
    setColors,
    setFontFamily,
    setFontSize,
    setTheme,
    toggleAutoSave,
    toggleHapticFeedback,
} from '../store/slices/settingsSlice';
import { BackgroundStyle, FontFamily, Theme } from '../types/settings';

export const CustomizationScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { personalization } = useAppSelector((state) => state.settings);

  const backgroundOptions: { label: string; value: BackgroundStyle }[] = [
    { label: 'Blank', value: 'blank' },
    { label: 'Lined', value: 'lined' },
    { label: 'Dotted', value: 'dotted' },
    { label: 'Grid', value: 'grid' },
    { label: 'Minimal Lines', value: 'minimal-lines' },
  ];

  const fontOptions: { label: string; value: FontFamily }[] = [
    { label: 'Default', value: 'default' },
    { label: 'Serif', value: 'serif' },
    { label: 'Monospace', value: 'mono' },
    { label: 'Handwriting', value: 'handwriting' },
    { label: 'Modern', value: 'modern' },
  ];

  const themeOptions: { label: string; value: Theme }[] = [
    { label: 'Auto', value: 'auto' },
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'Warm', value: 'warm' },
    { label: 'Cool', value: 'cool' },
  ];

  const colorPresets = [
    { name: 'Classic', bg: '#FFFFFF', text: '#1A1A1A', accent: '#007AFF', line: '#E5E5E7' },
    { name: 'Dark', bg: '#1A1A1A', text: '#FFFFFF', accent: '#0A84FF', line: '#3A3A3C' },
    { name: 'Warm', bg: '#FFF8F0', text: '#2D1810', accent: '#D2691E', line: '#E6D2C0' },
    { name: 'Cool', bg: '#F0F8FF', text: '#1E3A5F', accent: '#4682B4', line: '#C0D9F0' },
    { name: 'Mint', bg: '#F0FFF8', text: '#0F3B2A', accent: '#20B2AA', line: '#C0F0E8' },
  ];

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: personalization.textColor }]}>
        {title}
      </Text>
      {children}
    </View>
  );

  const renderOptionGrid = <T extends string>(
    options: { label: string; value: T }[],
    currentValue: T,
    onSelect: (value: T) => void
  ) => (
    <View style={styles.optionGrid}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.optionButton,
            {
              backgroundColor: currentValue === option.value 
                ? personalization.accentColor 
                : personalization.backgroundColor,
              borderColor: personalization.accentColor,
            }
          ]}
          onPress={() => onSelect(option.value)}
        >
          <Text
            style={[
              styles.optionText,
              {
                color: currentValue === option.value 
                  ? personalization.backgroundColor 
                  : personalization.textColor,
              }
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderColorPresets = () => (
    <View style={styles.colorGrid}>
      {colorPresets.map((preset) => (
        <TouchableOpacity
          key={preset.name}
          style={[
            styles.colorPreset,
            { backgroundColor: preset.bg, borderColor: preset.accent }
          ]}
          onPress={() => dispatch(setColors({
            backgroundColor: preset.bg,
            textColor: preset.text,
            accentColor: preset.accent,
            lineColor: preset.line,
          }))}
        >
          <View style={[styles.colorSwatch, { backgroundColor: preset.accent }]} />
          <Text style={[styles.colorLabel, { color: preset.text }]}>
            {preset.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderFontSizeSlider = () => (
    <View style={styles.sliderContainer}>
      <Text style={[styles.sliderLabel, { color: personalization.textColor }]}>
        Font Size: {personalization.fontSize}px
      </Text>
      <View style={styles.sliderButtons}>
        {[14, 16, 18, 20, 22, 24].map((size) => (
          <TouchableOpacity
            key={size}
            style={[
              styles.sizeButton,
              {
                backgroundColor: personalization.fontSize === size 
                  ? personalization.accentColor 
                  : personalization.backgroundColor,
                borderColor: personalization.accentColor,
              }
            ]}
            onPress={() => dispatch(setFontSize(size))}
          >
            <Text
              style={[
                styles.sizeText,
                {
                  color: personalization.fontSize === size 
                    ? personalization.backgroundColor 
                    : personalization.textColor,
                  fontSize: size * 0.7,
                }
              ]}
            >
              {size}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderToggleOption = (
    title: string,
    value: boolean,
    onToggle: () => void,
    description: string
  ) => (
    <TouchableOpacity style={styles.toggleRow} onPress={onToggle}>
      <View style={styles.toggleContent}>
        <Text style={[styles.toggleTitle, { color: personalization.textColor }]}>
          {title}
        </Text>
        <Text style={[styles.toggleDescription, { color: `${personalization.textColor}80` }]}>
          {description}
        </Text>
      </View>
      <View
        style={[
          styles.toggle,
          {
            backgroundColor: value ? personalization.accentColor : `${personalization.textColor}20`,
          }
        ]}
      >
        <View
          style={[
            styles.toggleKnob,
            {
              backgroundColor: personalization.backgroundColor,
              transform: [{ translateX: value ? 16 : 0 }],
            }
          ]}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: personalization.backgroundColor }]}>
      <View style={[styles.header, { borderBottomColor: personalization.lineColor }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={personalization.accentColor}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: personalization.textColor }]}>
          Personalization
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderSection('Background Style', 
          renderOptionGrid(backgroundOptions, personalization.backgroundStyle, (value) => 
            dispatch(setBackgroundStyle(value))
          )
        )}

        {renderSection('Font Family', 
          renderOptionGrid(fontOptions, personalization.fontFamily, (value) => 
            dispatch(setFontFamily(value))
          )
        )}

        {renderSection('Font Size', renderFontSizeSlider())}

        {renderSection('Color Theme', renderColorPresets())}

        {renderSection('App Theme', 
          renderOptionGrid(themeOptions, personalization.theme, (value) => 
            dispatch(setTheme(value))
          )
        )}

        {renderSection('Preferences', (
          <View>
            {renderToggleOption(
              'Haptic Feedback',
              personalization.hapticFeedback,
              () => dispatch(toggleHapticFeedback()),
              'Feel vibrations when navigating'
            )}
            {renderToggleOption(
              'Auto Save',
              personalization.autoSave,
              () => dispatch(toggleAutoSave()),
              'Automatically save your entries'
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40, // Same width as back button for center alignment
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorPreset: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  colorLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  sliderContainer: {
    gap: 12,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  sliderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sizeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeText: {
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  toggleContent: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggleDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  toggle: {
    width: 40,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});

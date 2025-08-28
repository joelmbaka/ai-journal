import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Appearance,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colorPresets } from '../constants/colorPresets';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import {
    setColors,
    setFontFamily,
    setFontSize,
    setTheme,
    toggleAutoSave,
    toggleHapticFeedback,
} from '../store/slices/settingsSlice';
import { FontFamily, Theme } from '../types/settings';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from '../components/AuthModal';

export const CustomizationScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { personalization } = useAppSelector((state) => state.settings);
  const { session, signOut } = useAuth();
  const [authVisible, setAuthVisible] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  
  // State to trigger re-render when system theme changes
  const [systemColorScheme, setSystemColorScheme] = useState(Appearance.getColorScheme());

  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription?.remove();
  }, []);

  // Determine actual theme (handle auto/system theme)
  const getActualTheme = () => {
    if (personalization.theme === 'auto') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return personalization.theme;
  };

  const actualTheme = getActualTheme();

  // Use neutral screen background - consistent with JournalScreen
  const screenBackgroundColor = actualTheme === 'dark' ? '#000000' : '#F5F5F5';
  
  // Use neutral colors for text elements to ensure visibility
  const screenTextColor = actualTheme === 'dark' ? '#FFFFFF' : '#1A1A1A';
  const screenAccentColor = actualTheme === 'dark' ? '#0A84FF' : '#007AFF';

  // Removed lined background option - keeping only blank clean page
  // const backgroundOptions: { label: string; value: BackgroundStyle }[] = [
  //   { label: 'Blank', value: 'blank' },
  // ];

  const fontOptions: { label: string; value: FontFamily }[] = [
    { label: 'Default', value: 'default' },
    { label: 'Serif', value: 'serif' },
    { label: 'Monospace', value: 'mono' },
    { label: 'Handwriting', value: 'handwriting' },
    { label: 'Modern', value: 'modern' },
  ];

  const themeOptions: { label: string; value: Theme }[] = [
    { label: 'System', value: 'auto' },
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
  ];

  

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: screenTextColor }]}>
        {title}
      </Text>
      {children}
    </View>
  );

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

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
                ? screenAccentColor 
                : screenBackgroundColor,
              borderColor: screenAccentColor,
            }
          ]}
          onPress={() => onSelect(option.value)}
        >
          <Text
            style={[
              styles.optionText,
              {
                color: currentValue === option.value 
                  ? screenBackgroundColor 
                  : screenTextColor,
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
      <Text style={[styles.sliderLabel, { color: screenTextColor }]}>
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
                  ? screenAccentColor 
                  : screenBackgroundColor,
                borderColor: screenAccentColor,
              }
            ]}
            onPress={() => dispatch(setFontSize(size))}
          >
            <Text
              style={[
                styles.sizeText,
                {
                  color: personalization.fontSize === size 
                    ? screenBackgroundColor 
                    : screenTextColor,
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
        <Text style={[styles.toggleTitle, { color: screenTextColor }]}>
          {title}
        </Text>
        <Text style={[styles.toggleDescription, { color: `${screenTextColor}80` }]}>
          {description}
        </Text>
      </View>
      <View
        style={[
          styles.toggle,
          {
            backgroundColor: value ? screenAccentColor : `${screenTextColor}20`,
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
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: screenBackgroundColor }]}> 
      <View style={[styles.header, { borderBottomColor: `${screenTextColor}20` }]}> 
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={screenAccentColor}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: screenTextColor }]}> 
          Personalization
        </Text>
        {session ? (
          <TouchableOpacity
            style={[styles.authButton, signingOut && { opacity: 0.7 }]}
            onPress={handleSignOut}
            accessibilityLabel="Sign out"
            disabled={signingOut}
          >
            {signingOut ? (
              <ActivityIndicator size="small" color={screenAccentColor} />
            ) : (
              <Text style={[styles.authButtonText, { color: screenAccentColor }]}>Sign out</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.authButton} onPress={() => setAuthVisible(true)} accessibilityLabel="Sign in or Sign up">
            <Text style={[styles.authButtonText, { color: screenAccentColor }]}>Sign in/up</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Background Style section removed - using only blank background */}

        {renderSection('Font Family', 
          renderOptionGrid(fontOptions, personalization.fontFamily, (value) => 
            dispatch(setFontFamily(value))
          )
        )}

        {renderSection('Font Size', renderFontSizeSlider())}

        {/* Color Theme moved to quick-access row in JournalScreen */}

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

      <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />
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
  authButton: {
    padding: 8,
    borderRadius: 8,
    minWidth: 72,
    alignItems: 'flex-end',
  },
  authButtonText: {
    fontSize: 14,
    fontWeight: '600',
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

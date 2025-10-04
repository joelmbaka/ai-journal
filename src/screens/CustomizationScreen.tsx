import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Appearance,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
    ActivityIndicator,
    StyleSheet,
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
    <View className="mb-8">
      <Text className="text-xl font-semibold mb-4" style={{ color: screenTextColor }}>
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
    <View className="flex-row flex-wrap gap-2.5">
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          className="px-4 py-2 rounded-[20px] border min-w-[80px] items-center"
          style={{
            backgroundColor: currentValue === option.value
              ? screenAccentColor
              : screenBackgroundColor,
            borderColor: screenAccentColor,
          }}
          onPress={() => onSelect(option.value)}
        >
          <Text
            className="text-sm font-medium"
            style={{
              color: currentValue === option.value
                ? screenBackgroundColor
                : screenTextColor,
            }}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderColorPresets = () => (
    <View className="flex-row flex-wrap gap-3">
      {colorPresets.map((preset) => (
        <TouchableOpacity
          key={preset.name}
          className="w-20 h-20 rounded-xl border-2 p-2 items-center justify-between"
          style={{ backgroundColor: preset.bg, borderColor: preset.accent }}
          onPress={() => dispatch(setColors({
            backgroundColor: preset.bg,
            textColor: preset.text,
            accentColor: preset.accent,
            lineColor: preset.line,
          }))}
        >
          <View className="w-5 h-5 rounded-full" style={{ backgroundColor: preset.accent }} />
          <Text className="text-xs font-medium" style={{ color: preset.text }}>
            {preset.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderFontSizeSlider = () => (
    <View className="gap-3">
      <Text className="text-base font-medium" style={{ color: screenTextColor }}>
        Font Size: {personalization.fontSize}px
      </Text>
      <View className="flex-row gap-2">
        {[14, 16, 18, 20, 22, 24].map((size) => (
          <TouchableOpacity
            key={size}
            className="w-10 h-10 rounded-full border items-center justify-center"
            style={{
              backgroundColor: personalization.fontSize === size
                ? screenAccentColor
                : screenBackgroundColor,
              borderColor: screenAccentColor,
            }}
            onPress={() => dispatch(setFontSize(size))}
          >
            <Text
              className="font-semibold"
              style={{
                color: personalization.fontSize === size
                  ? screenBackgroundColor
                  : screenTextColor,
                fontSize: size * 0.7,
              }}
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
    <TouchableOpacity className="flex-row items-center justify-between py-3" onPress={onToggle}>
      <View className="flex-1">
        <Text className="text-base font-medium" style={{ color: screenTextColor }}>
          {title}
        </Text>
        <Text className="text-sm mt-0.5" style={{ color: `${screenTextColor}80` }}>
          {description}
        </Text>
      </View>
      <View
        className="w-10 h-6 rounded-full p-0.5 justify-center"
        style={{ backgroundColor: value ? screenAccentColor : `${screenTextColor}20` }}
      >
        <View
          className="w-5 h-5 rounded-full"
          style={{
            backgroundColor: personalization.backgroundColor,
            transform: [{ translateX: value ? 16 : 0 }],
          }}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1" style={{ backgroundColor: screenBackgroundColor }}>
      <View className="flex-row items-center px-4 py-5 border-b" style={{ minHeight: 56, borderBottomColor: `${screenTextColor}20`, borderBottomWidth: StyleSheet.hairlineWidth }}>
        <TouchableOpacity
          className="p-2 rounded-full"
          onPress={() => router.back()}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={screenAccentColor}
          />
        </TouchableOpacity>
        <Text className="text-lg font-semibold flex-1 text-center" style={{ color: screenTextColor }}>
          Personalization
        </Text>
        {session ? (
          <TouchableOpacity
            className="p-2 rounded-lg min-w-[72px] items-end"
            style={{ opacity: signingOut ? 0.7 : 1 }}
            onPress={handleSignOut}
            accessibilityLabel="Sign out"
            disabled={signingOut}
          >
            {signingOut ? (
              <ActivityIndicator size="small" color={screenAccentColor} />
            ) : (
              <Text className="text-sm font-semibold" style={{ color: screenAccentColor }}>Sign out</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity className="p-2 rounded-lg min-w-[72px] items-end" onPress={() => setAuthVisible(true)} accessibilityLabel="Sign in or Sign up">
            <Text className="text-sm font-semibold" style={{ color: screenAccentColor }}>Sign in/up</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
        {renderSection('Font Family', 
          renderOptionGrid(fontOptions, personalization.fontFamily, (value) => 
            dispatch(setFontFamily(value))
          )
        )}

        {renderSection('Font Size', renderFontSizeSlider())}

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

// Stylesheet removed in favor of NativeWind className utilities and inline dynamic styles

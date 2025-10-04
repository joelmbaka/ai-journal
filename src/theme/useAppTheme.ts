import { useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

export type AppThemeMode = 'light' | 'dark';

export interface ThemeTokens {
  mode: AppThemeMode;
  colors: {
    background: string; // screen background
    surface: string; // headers, modals, surfaces
    card: string; // cards
    text: string;
    muted: string;
    secondaryText: string;
    accent: string;
    border: string;
    icon: string; // tertiary icon color
    success: string;
    warning: string;
    error: string;
    warningContainer: string;
    recordingContainer: string;
    transcribingContainer: string;
  };
  statusBarStyle: 'dark-content' | 'light-content';
  tabBar: {
    background: string;
    border: string;
    active: string;
    inactive: string;
  };
}

export function useAppTheme(): { actualTheme: AppThemeMode; tokens: ThemeTokens; personalization: RootState['settings']['personalization'] } {
  const { personalization } = useSelector((state: RootState) => state.settings);
  const [systemColorScheme, setSystemColorScheme] = useState(Appearance.getColorScheme());

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });
    return () => subscription?.remove();
  }, []);

  const actualTheme: AppThemeMode = useMemo(() => {
    if (personalization.theme === 'auto') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return personalization.theme === 'dark' ? 'dark' : 'light';
  }, [personalization.theme, systemColorScheme]);

  const tokens: ThemeTokens = useMemo(() => {
    const isDark = actualTheme === 'dark';

    const accent = isDark ? '#0A84FF' : '#007AFF';
    const background = isDark ? '#000000' : '#F5F5F5';
    const surface = isDark ? '#1C1C1E' : '#FFFFFF';
    const card = surface;
    const text = isDark ? '#FFFFFF' : '#1A1A1A';
    const muted = isDark ? '#A1A1A1' : '#666666';
    const secondaryText = '#8E8E93';
    const border = isDark ? '#38383A' : '#E5E5E7';
    const icon = isDark ? '#636366' : '#C7C7CC';

    const success = '#34C759';
    const warning = '#FF9500';
    const error = '#FF3B30';

    const warningContainer = isDark ? 'rgba(255,149,0,0.20)' : 'rgba(255,149,0,0.15)';
    const recordingContainer = isDark ? 'rgba(255,59,48,0.20)' : 'rgba(255,59,48,0.15)';
    const transcribingContainer = isDark ? 'rgba(52,199,89,0.20)' : 'rgba(52,199,89,0.15)';

    return {
      mode: actualTheme,
      colors: {
        background,
        surface,
        card,
        text,
        muted,
        secondaryText,
        accent,
        border,
        icon,
        success,
        warning,
        error,
        warningContainer,
        recordingContainer,
        transcribingContainer,
      },
      statusBarStyle: isDark ? 'light-content' : 'dark-content',
      tabBar: {
        background: isDark ? '#000000' : '#FFFFFF',
        border,
        active: accent,
        inactive: '#8E8E93',
      },
    };
  }, [actualTheme]);

  return { actualTheme, tokens, personalization };
}

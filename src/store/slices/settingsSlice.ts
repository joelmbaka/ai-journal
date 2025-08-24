import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PersonalizationSettings, SettingsState } from '../../types/settings';

const defaultPersonalization: PersonalizationSettings = {
  backgroundStyle: 'lined',
  fontFamily: 'default',
  fontSize: 16,
  lineHeight: 1.5,
  theme: 'auto',
  
  backgroundColor: '#FFFFFF',
  textColor: '#1A1A1A',
  accentColor: '#007AFF',
  lineColor: '#E5E5E7',
  
  hapticFeedback: true,
  autoSave: true,
  showWordCount: true,
  showDateInHeader: true,
  
  textPadding: 20,
  cornerRadius: 8,
  showWritingStats: false,
};

const initialState: SettingsState = {
  personalization: defaultPersonalization,
  onboardingCompleted: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updatePersonalization: (state, action: PayloadAction<Partial<PersonalizationSettings>>) => {
      state.personalization = { ...state.personalization, ...action.payload };
    },
    
    setBackgroundStyle: (state, action: PayloadAction<PersonalizationSettings['backgroundStyle']>) => {
      state.personalization.backgroundStyle = action.payload;
    },
    
    setFontFamily: (state, action: PayloadAction<PersonalizationSettings['fontFamily']>) => {
      state.personalization.fontFamily = action.payload;
    },
    
    setFontSize: (state, action: PayloadAction<number>) => {
      state.personalization.fontSize = Math.max(14, Math.min(24, action.payload));
    },
    
    setTheme: (state, action: PayloadAction<PersonalizationSettings['theme']>) => {
      state.personalization.theme = action.payload;
    },
    
    setColors: (state, action: PayloadAction<{
      backgroundColor?: string;
      textColor?: string;
      accentColor?: string;
      lineColor?: string;
    }>) => {
      Object.assign(state.personalization, action.payload);
    },
    
    toggleHapticFeedback: (state) => {
      state.personalization.hapticFeedback = !state.personalization.hapticFeedback;
    },
    
    toggleAutoSave: (state) => {
      state.personalization.autoSave = !state.personalization.autoSave;
    },
    
    completeOnboarding: (state) => {
      state.onboardingCompleted = true;
    },
    
    resetToDefaults: (state) => {
      state.personalization = defaultPersonalization;
    },
  },
});

export const {
  updatePersonalization,
  setBackgroundStyle,
  setFontFamily,
  setFontSize,
  setTheme,
  setColors,
  toggleHapticFeedback,
  toggleAutoSave,
  completeOnboarding,
  resetToDefaults,
} = settingsSlice.actions;

export default settingsSlice.reducer;

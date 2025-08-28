export type FontFamily = 'default' | 'serif' | 'mono' | 'handwriting' | 'modern';
export type Theme = 'light' | 'dark' | 'auto';

export interface PersonalizationSettings {
  // Visual customization
  fontFamily: FontFamily;
  fontSize: number; // 14-24
  lineHeight: number; // 1.2-2.0
  theme: Theme;
  
  // Colors
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  lineColor: string;
  
  // Behavior
  hapticFeedback: boolean;
  autoSave: boolean;
  showWordCount: boolean;
  showDateInHeader: boolean;
  
  // Writing experience
  textPadding: number; // 16-32
  cornerRadius: number; // 0-16
  showWritingStats: boolean;
}

export interface SettingsState {
  personalization: PersonalizationSettings;
  onboardingCompleted: boolean;
  lastBackupDate?: string;
}

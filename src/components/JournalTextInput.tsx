import React, { useRef } from 'react';
import {
  PixelRatio,
  Platform,
  TextInput,
  TextInputProps,
} from 'react-native';
import { PersonalizationSettings } from '../types/settings';

interface JournalTextInputProps extends Omit<TextInputProps, 'style'> {
  personalization: PersonalizationSettings;
  onTextChange: (text: string) => void;
  initialText?: string;
  value?: string;
}

export const JournalTextInput: React.FC<JournalTextInputProps> = ({
  personalization,
  onTextChange,
  initialText = '',
  value,
  ...textInputProps
}) => {
  const textInputRef = useRef<TextInput>(null);

  const getFontFamily = () => {
    switch (personalization.fontFamily) {
      case 'serif':
        return Platform.select({
          ios: 'Georgia',
          android: 'serif',
        });
      case 'mono':
        return Platform.select({
          ios: 'Menlo',
          android: 'monospace',
        });
      case 'handwriting':
        return Platform.select({
          ios: 'Marker Felt',
          android: 'casual',
        });
      case 'modern':
        return Platform.select({
          ios: 'San Francisco',
          android: 'Roboto',
        });
      default:
        return Platform.select({
          ios: 'System',
          android: 'System',
        });
    }
  };

  // Line-index-based positioning system - robust across all devices
  const getTextAlignment = () => {
    const fontSize = personalization.fontSize;
    const lineStep = PixelRatio.roundToNearestPixel(fontSize * personalization.lineHeight);
    
    // Configuration: which line should the bullet and text start on (0-indexed)
    const startLineIndex = 0; // Start on first line (line 0)
    
    // Calculate Y position based on line index
    const targetLineTop = startLineIndex * lineStep;
    
    // Approximate baseline position within a line box
    const getBaselineRatio = () => {
      const ratioByFamily: Record<string, number> = {
        default: Platform.OS === 'ios' ? 0.82 : 0.80,
        serif: Platform.OS === 'ios' ? 0.86 : 0.84,
        mono: Platform.OS === 'ios' ? 0.78 : 0.76,
        handwriting: Platform.OS === 'ios' ? 0.80 : 0.78,
        modern: Platform.OS === 'ios' ? 0.82 : 0.80,
      };
      return ratioByFamily[personalization.fontFamily || 'default'] ?? ratioByFamily.default;
    };

    const baselineWithinLine = PixelRatio.roundToNearestPixel(fontSize * getBaselineRatio());
    const textBaselineFromTop = targetLineTop + baselineWithinLine;
    
    // Platform-specific fine-tuning + user-requested 10px upward offset
    const platformNudge = Platform.OS === 'ios' ? 0 : PixelRatio.roundToNearestPixel(1);
    const userOffset = -10; // Move 10px higher as requested
    
    const computed = {
      lineHeight: lineStep,
      paddingTop: 0,
      paddingLeft: 5,
      paddingRight: personalization.textPadding,
      paddingBottom: personalization.textPadding,
      marginTop: PixelRatio.roundToNearestPixel(textBaselineFromTop + platformNudge + userOffset),
      // Export line info for bullet positioning
      _lineStep: lineStep,
      _startLineIndex: startLineIndex,
      _bulletDiameter: Math.max(6, Math.round(fontSize * 0.5)),
    };

    return computed;
  };

  const textAlignment = getTextAlignment();
  const textStyle = {
    fontSize: personalization.fontSize,
    lineHeight: textAlignment.lineHeight,
    color: personalization.textColor,
    fontFamily: getFontFamily(),
    paddingTop: textAlignment.paddingTop,
    paddingLeft: textAlignment.paddingLeft,
    paddingRight: textAlignment.paddingRight,
    paddingBottom: textAlignment.paddingBottom,
    marginTop: textAlignment.marginTop,
  };

  return (
    <TextInput
      ref={textInputRef}
      className="flex-1"
      style={[textStyle, { includeFontPadding: false }]}
      value={value !== undefined ? value : initialText}
      onChangeText={onTextChange}
      placeholder="What's on your mind?"
      placeholderTextColor={`${personalization.textColor}60`}
      multiline
      textAlignVertical="top"
      scrollEnabled
      keyboardType="default"
      autoCorrect
      spellCheck
      {...textInputProps}
    />
  );
};


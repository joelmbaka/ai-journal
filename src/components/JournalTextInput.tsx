import React, { useEffect, useRef, useState } from 'react';
import {
  TextInput,
  StyleSheet,
  Keyboard,
  Platform,
  TextInputProps,
} from 'react-native';
import { PersonalizationSettings } from '../types/settings';

interface JournalTextInputProps extends Omit<TextInputProps, 'style'> {
  personalization: PersonalizationSettings;
  onTextChange: (text: string) => void;
  initialText?: string;
}

export const JournalTextInput: React.FC<JournalTextInputProps> = ({
  personalization,
  onTextChange,
  initialText = '',
  ...textInputProps
}) => {
  const [text, setText] = useState(initialText);
  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  const handleTextChange = (newText: string) => {
    setText(newText);
    onTextChange(newText);
  };

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

  const textStyle = {
    fontSize: personalization.fontSize,
    lineHeight: personalization.fontSize * personalization.lineHeight,
    color: personalization.textColor,
    fontFamily: getFontFamily(),
    padding: personalization.textPadding,
  };

  return (
    <TextInput
      ref={textInputRef}
      style={[styles.textInput, textStyle]}
      value={text}
      onChangeText={handleTextChange}
      placeholder="What's on your mind today?"
      placeholderTextColor={`${personalization.textColor}60`}
      multiline
      textAlignVertical="top"
      scrollEnabled
      showsVerticalScrollIndicator={false}
      keyboardType="default"
      autoCorrect
      spellCheck
      {...textInputProps}
    />
  );
};

const styles = StyleSheet.create({
  textInput: {
    flex: 1,
    textAlignVertical: 'top',
    includeFontPadding: false,
  },
});

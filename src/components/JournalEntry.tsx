import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, PixelRatio, Platform, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { JournalTextInput } from './JournalTextInput';
import { PersonalizationSettings } from '../types/settings';
import { JournalEntry as JournalEntryType } from '../database/schema';
import { sttService } from '../services/sttService';

interface JournalEntryProps {
  entry?: JournalEntryType;
  isNewEntry?: boolean;
  personalization: PersonalizationSettings;
  theme: 'light' | 'dark';
  onSave: (title: string, content: string) => Promise<void>;
  onUpdate?: (id: number, title: string, content: string) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}

export const JournalEntryComponent: React.FC<JournalEntryProps> = ({
  entry,
  isNewEntry = false,
  personalization,
  theme,
  onSave,
  onUpdate,
  onDelete,
}) => {
  const [content, setContent] = useState(entry?.content || '');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTextFocused, setIsTextFocused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const autoSaveTimeoutRef = useRef<number | null>(null);

  // Line-index-based positioning matching JournalTextInput
  const fontSize = personalization.fontSize;
  const lineStep = PixelRatio.roundToNearestPixel(fontSize * personalization.lineHeight);
  const bulletDiameter = Math.max(6, Math.round(fontSize * 0.5));
  const bulletRadius = bulletDiameter / 2;
  
  // Configuration: start on same line as text (0-indexed)
  const startLineIndex = 0; // Start on first line (line 0)
  
  // Calculate bullet center position to align with text baseline
  const targetLineTop = startLineIndex * lineStep;
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
  const bulletOffset = 0; // Move bullet 2px higher (3px lower than previous)
  const bulletCenterOffset = textBaselineFromTop - bulletRadius + bulletOffset; // Center bullet on text baseline

  useEffect(() => {
    if (entry) {
      setContent(entry.content);
    }
  }, [entry]);

  const generateTitle = (text: string): string => {
    const lines = text.trim().split('\n');
    const firstLine = lines[0].trim();
    return firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine || 'Untitled Entry';
  };

  const handleContentChange = (text: string, skipAutoSave = false) => {
    setContent(text);
    setHasChanges(text !== (entry?.content || ''));

    // Skip auto-save during voice transcription - we'll trigger it manually after transcription
    if (skipAutoSave) {
      return;
    }

    // Auto-save with debounce
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (text.trim() && text !== (entry?.content || '')) {
        await handleAutoSave(text);
      }
    }, 3000); // 3 seconds debounce for better performance
  };

  const handleAutoSave = async (text: string) => {
    if (!text.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const title = generateTitle(text);
      
      if (entry && onUpdate) {
        await onUpdate(entry.id, title, text);
      } else if (isNewEntry) {
        await onSave(title, text);
        // Clear the new entry input after successful save
        setContent('');
        setHasChanges(false);
      } else {
        console.warn(`⚠️ [AutoSave] No valid save method found - entry: ${!!entry}, onUpdate: ${!!onUpdate}, isNewEntry: ${isNewEntry}`);
      }
      
      if (!isNewEntry) {
        setHasChanges(false);
      }
    } catch (error) {
      console.error('❌ [AutoSave] Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleVoiceRecord = async () => {
    if (isRecording) {
      // Stop recording
      await stopRecording();
    } else {
      // Start recording
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      setIsRecording(true);
      const newRecording = await sttService.startRecording();
      if (newRecording) {
        setRecording(newRecording);
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Recording Error', 'Failed to start voice recording. Please check microphone permissions.');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      setIsTranscribing(true);
      
      const audioUri = await sttService.stopRecording(recording);
      const sttResult = await sttService.convertSpeechToText(audioUri);
      
      // Insert transcribed text at cursor or append to existing content
      const newText = sttResult.text.trim();
      if (newText) {
        const updatedContent = content ? `${content} ${newText}` : newText;
        handleContentChange(updatedContent, true); // Skip auto-save during update
        
        // Trigger auto-save after transcription is complete
        setTimeout(async () => {
          if (updatedContent.trim() && updatedContent !== (entry?.content || '')) {
            await handleAutoSave(updatedContent);
          }
        }, 500); // Small delay to ensure UI updates
      }
      
      setRecording(null);
    } catch (error) {
      console.error('Failed to process recording:', error);
      Alert.alert('Transcription Error', 'Failed to convert speech to text. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleManualSave = async () => {
    if (!content.trim() || isSaving) return;
    
    if (isNewEntry) {
      // For new entries, clear after manual save
      await handleAutoSave(content);
    } else {
      await handleAutoSave(content);
    }
  };

  const handleDelete = async () => {
    if (!entry || !onDelete) return;

    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await onDelete(entry.id);
            } catch (error) {
              console.error('Error deleting entry:', error);
              Alert.alert('Error', 'Failed to delete entry. Please try again.');
            }
          },
        },
      ]
    );
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const subtleTextColor = theme === 'dark' ? '#888888' : '#666666';

  return (
    <View className="my-2">
      {/* Entry indicator and header */}
      <View className="flex-row items-start mb-2">
        {/* Entry bullet indicator */}
        <View className="items-center mr-3 pt-1">
          {!isNewEntry && entry && (
            <View className="w-2 h-2 rounded-full mb-1" style={{ backgroundColor: personalization.accentColor }} />
          )}
          {!isNewEntry && entry && (
            <View
              style={{
                width: StyleSheet.hairlineWidth,
                height: 20,
                backgroundColor: subtleTextColor,
                opacity: 0.3,
              }}
            />
          )}
        </View>

        {/* Entry header with timestamp and actions */}
        {entry && (
          <View className="flex-row justify-between items-center mb-2 px-1">
            <View className="flex-1 flex-row items-center">
              <Text className="text-[11px] italic min-w-[45px]" style={{ color: subtleTextColor }}>
                {formatTime(entry.created_at)}
              </Text>
              {isSaving && (
                <View className="flex-row items-center ml-2">
                  <MaterialIcons name="sync" size={12} color={subtleTextColor} />
                  <Text className="text-[11px] italic" style={{ color: subtleTextColor }}>
                    Saving...
                  </Text>
                </View>
              )}
            </View>
            <View className="flex-row items-center mr-3">
              {((entry && onUpdate && (isTextFocused || hasChanges)) || (isNewEntry && hasChanges)) && !isSaving && (
                <TouchableOpacity 
                  className="w-6 h-6 rounded-full justify-center items-center ml-2"
                  style={{ 
                    backgroundColor: hasChanges ? personalization.accentColor : `${personalization.accentColor}60`,
                    opacity: isSaving ? 0.6 : 1
                  }}
                  onPress={handleManualSave}
                  disabled={isSaving || (!hasChanges && !!entry)}
                >
                  <MaterialIcons 
                    name={isSaving ? 'sync' : 'check'}
                    size={16} 
                    color="#FFFFFF" 
                  />
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity 
                  className="w-6 h-6 rounded-full justify-center items-center ml-2"
                  style={{ backgroundColor: '#FF6B6B' }}
                  onPress={handleDelete}
                >
                  <MaterialIcons 
                    name="delete-outline" 
                    size={16} 
                    color="#FFFFFF" 
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Content input aligned with bullet on same baseline */}
      <View className="flex-row items-start" style={{ minHeight: lineStep }}>
        {/* Entry bullet positioned to align with text baseline */}
        <View className="w-5 items-center justify-start mr-[1px]" style={{ paddingTop: bulletCenterOffset }}>
          {!entry && isNewEntry && (
            <View 
              style={{
                width: bulletDiameter,
                height: bulletDiameter,
                borderRadius: bulletRadius,
                backgroundColor: personalization.accentColor,
              }} 
            />
          )}
        </View>
        
        <View className="flex-1 flex-row items-start min-h-[60px]">
          <View className="flex-1">
            <JournalTextInput
              personalization={personalization}
              onTextChange={handleContentChange}
              value={content}
              placeholder={isNewEntry ? "Start typing..." : "Continue writing..."}
              onFocus={() => setIsTextFocused(true)}
              onBlur={() => setIsTextFocused(false)}
            />
          </View>
          
          {/* Voice recording button inline with text input - only for new entries */}
          {isNewEntry && (
            <TouchableOpacity
              className="w-8 h-8 rounded-full justify-center items-center ml-2 border"
              style={{
                backgroundColor: isRecording ? 'rgba(255, 59, 48, 0.1)' : 'transparent',
                borderColor: isRecording ? '#FF3B30' : 'transparent',
                opacity: isSaving || isTranscribing ? 0.5 : 1,
              }}
              onPress={handleVoiceRecord}
              disabled={isSaving || isTranscribing}
              accessibilityLabel={isRecording ? "Stop voice recording" : "Start voice recording"}
            >
              {isTranscribing ? (
                <ActivityIndicator size="small" color={personalization.accentColor} />
              ) : (
                <MaterialIcons 
                  name={isRecording ? "stop" : "mic"} 
                  size={20} 
                  color={isRecording ? '#FF3B30' : personalization.accentColor} 
                />
              )}
            </TouchableOpacity>
          )}
          
          {/* Inline save button */}
          {isNewEntry && hasChanges && (
            <View className="ml-2 justify-center">
              {isSaving ? (
                <View className="w-7 h-7 justify-center items-center">
                  <MaterialIcons 
                    name="sync" 
                    size={16} 
                    color={personalization.accentColor} 
                  />
                </View>
              ) : (
                <TouchableOpacity 
                  className="w-7 h-7 rounded-full justify-center items-center"
                  style={{ backgroundColor: personalization.accentColor }}
                  onPress={handleManualSave}
                >
                  <MaterialIcons 
                    name="check" 
                    size={16} 
                    color="#FFFFFF" 
                  />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Voice recording status indicators */}
      {isRecording && (
        <View
          className="flex-row items-center justify-center mt-2 px-3 py-1.5 rounded-xl border mx-6"
          style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', borderColor: '#FF3B30' }}
        >
          <MaterialIcons name="fiber-manual-record" size={12} color="#FF3B30" />
          <Text className="text-xs ml-1.5 font-medium" style={{ color: '#FF3B30' }}>
            Recording... Tap mic to stop
          </Text>
        </View>
      )}
      
      {isTranscribing && (
        <View
          className="flex-row items-center justify-center mt-2 px-3 py-1.5 rounded-xl border mx-6"
          style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)', borderColor: '#34C759' }}
        >
          <ActivityIndicator size="small" color="#34C759" />
          <Text className="text-xs ml-1.5 font-medium" style={{ color: '#34C759' }}>
            Converting speech to text...
          </Text>
        </View>
      )}

    </View>
  );
};
// Stylesheet removed in favor of NativeWind className utilities and inline dynamic styles

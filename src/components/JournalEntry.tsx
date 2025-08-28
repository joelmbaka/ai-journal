import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, PixelRatio, Platform, ActivityIndicator } from 'react-native';
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

    console.log(`🔄 [AutoSave] Triggering auto-save for ${entry ? 'existing' : 'new'} entry`);
    setIsSaving(true);
    try {
      const title = generateTitle(text);
      
      if (entry && onUpdate) {
        console.log(`📝 [AutoSave] Updating existing entry ID: ${entry.id}`);
        await onUpdate(entry.id, title, text);
      } else if (isNewEntry) {
        console.log(`✏️ [AutoSave] Creating new entry`);
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
      console.log(`✅ [AutoSave] Auto-save completed successfully`);
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

  const textColor = theme === 'dark' ? '#FFFFFF' : '#000000';
  const subtleTextColor = theme === 'dark' ? '#888888' : '#666666';

  return (
    <View style={styles.container}>
      {/* Entry indicator and header */}
      <View style={styles.entryHeaderContainer}>
        {/* Entry bullet indicator */}
        <View style={styles.entryIndicator}>
          {!isNewEntry && entry && (
            <View style={[styles.entryBullet, { backgroundColor: personalization.accentColor }]} />
          )}
          {!isNewEntry && entry && (
            <View style={[styles.entryLine, { backgroundColor: subtleTextColor }]} />
          )}
        </View>

        {/* Entry header with timestamp and preview */}
        {entry && (
          <View style={styles.header}>
            <View style={styles.entryInfo}>
              <Text style={[styles.timeText, { color: subtleTextColor }]}>
                {formatTime(entry.created_at)}
              </Text>
              {/* <Text style={[styles.previewText, { color: subtleTextColor }]}>
                {content.trim().substring(0, 40)}{content.trim().length > 40 ? '...' : ''}
              </Text> */}
              {isSaving && (
                <View style={styles.savingIndicator}>
                  <MaterialIcons 
                    name="sync" 
                    size={12} 
                    color={subtleTextColor} 
                  />
                  <Text style={[styles.savingText, { color: subtleTextColor }]}>
                    Saving...
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.entryActions}>
              {/* Show save icon for existing entries only when focused or has changes, for new entries only when changes exist */}
              {((entry && onUpdate && (isTextFocused || hasChanges)) || (isNewEntry && hasChanges)) && !isSaving && (
                <TouchableOpacity 
                  style={[styles.saveIcon, { 
                    backgroundColor: hasChanges ? personalization.accentColor : `${personalization.accentColor}60`,
                    opacity: isSaving ? 0.6 : 1
                  }]}
                  onPress={handleManualSave}
                  disabled={isSaving || (!hasChanges && !!entry)}
                >
                  <MaterialIcons 
                    name={isSaving ? "sync" : "check"}
                    size={16} 
                    color="#FFFFFF" 
                  />
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity 
                  style={[styles.deleteIcon, { backgroundColor: '#FF6B6B' }]}
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
      <View style={[styles.contentRow, { minHeight: lineStep }]}>
        {/* Entry bullet positioned to align with text baseline */}
        <View style={[styles.contentBulletContainer, { paddingTop: bulletCenterOffset }]}>
          {!entry && isNewEntry && (
            <View 
              style={[
                styles.contentBullet, 
                { width: bulletDiameter, height: bulletDiameter, borderRadius: bulletRadius },
                { backgroundColor: personalization.accentColor }
              ]} 
            />
          )}
        </View>
        
        <View style={styles.contentContainer}>
          <View style={styles.textInputContainer}>
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
              style={[
                styles.inlineVoiceButton,
                isRecording && styles.inlineVoiceButtonRecording,
                (isSaving || isTranscribing) && styles.inlineVoiceButtonDisabled
              ]}
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
            <View style={styles.inlineSaveContainer}>
              {isSaving ? (
                <View style={styles.inlineSavingIndicator}>
                  <MaterialIcons 
                    name="sync" 
                    size={16} 
                    color={personalization.accentColor} 
                  />
                </View>
              ) : (
                <TouchableOpacity 
                  style={[styles.inlineSaveButton, { backgroundColor: personalization.accentColor }]}
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
        <View style={styles.recordingIndicator}>
          <MaterialIcons name="fiber-manual-record" size={12} color="#FF3B30" />
          <Text style={[styles.recordingText, { color: '#FF3B30' }]}>
            Recording... Tap mic to stop
          </Text>
        </View>
      )}
      
      {isTranscribing && (
        <View style={styles.transcribingIndicator}>
          <ActivityIndicator size="small" color="#34C759" />
          <Text style={[styles.transcribingText, { color: '#34C759' }]}>
            Converting speech to text...
          </Text>
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  entryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  timeText: {
    fontSize: 11,
    fontStyle: 'italic',
    minWidth: 45,
  },
  previewText: {
    fontSize: 11,
    fontStyle: 'italic',
    flex: 1,
    opacity: 0.8,
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  savingText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  saveIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  entryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginRight: 4, // Add margin from right edge
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 32, // Match line height
  },
  contentBulletContainer: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 32, // Start on second line (32px down)
    marginRight: 1, // Reduce gap between bullet and text
  },
  contentBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 60,
  },
  textInputContainer: {
    flex: 1,
  },
  inlineSaveContainer: {
    marginLeft: 8,
    justifyContent: 'center',
  },
  inlineSaveButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineSavingIndicator: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  voiceButtonRecording: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  voiceButtonDisabled: {
    opacity: 0.5,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
    marginHorizontal: 24,
  },
  recordingText: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  transcribingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#34C759',
    marginHorizontal: 24,
  },
  transcribingText: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  inlineVoiceButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inlineVoiceButtonRecording: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderColor: '#FF3B30',
  },
  inlineVoiceButtonDisabled: {
    opacity: 0.5,
  },
  newEntryFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  entryHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  entryIndicator: {
    alignItems: 'center',
    marginRight: 12,
    paddingTop: 4, // Align bullet with text baseline
  },
  entryBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  entryLine: {
    width: 1,
    height: 20,
    opacity: 0.3,
  },
});

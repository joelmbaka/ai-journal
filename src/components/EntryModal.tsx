import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { JournalEntry } from '../database/schema';

interface EntryModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (title: string, content: string) => Promise<void>;
  entry?: JournalEntry | null;
  theme: 'light' | 'dark';
}

export const EntryModal: React.FC<EntryModalProps> = ({
  visible,
  onClose,
  onSave,
  entry,
  theme,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (entry) {
        setTitle(entry.title);
        setContent(entry.content);
      } else {
        setTitle('');
        setContent('');
      }
    }
  }, [visible, entry]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your entry.');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Missing Content', 'Please write some content for your entry.');
      return;
    }

    setSaving(true);
    try {
      await onSave(title.trim(), content.trim());
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to save entry. Please try again.');
      console.error('Error saving entry:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (title.trim() || content.trim()) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to close?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  };

  const backgroundColor = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textColor = theme === 'dark' ? '#FFFFFF' : '#000000';
  const placeholderColor = theme === 'dark' ? '#888888' : '#666666';
  const borderColor = theme === 'dark' ? '#444444' : '#E0E0E0';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, { color: textColor }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: textColor }]}>
            {entry ? 'Edit Entry' : 'New Entry'}
          </Text>
          
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.headerButton, styles.saveButton]}
            disabled={saving}
          >
            <Text style={[styles.headerButtonText, styles.saveButtonText]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <TextInput
            style={[
              styles.titleInput,
              {
                color: textColor,
                borderBottomColor: borderColor,
              },
            ]}
            placeholder="Entry title..."
            placeholderTextColor={placeholderColor}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            returnKeyType="next"
            blurOnSubmit={false}
          />

          <TextInput
            style={[
              styles.contentInput,
              {
                color: textColor,
                backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F8F8F8',
                borderColor: borderColor,
              },
            ]}
            placeholder="What's on your mind?"
            placeholderTextColor={placeholderColor}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            scrollEnabled={false}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    paddingTop: 50, // Account for status bar
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 60,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  saveButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '600',
    paddingVertical: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 400,
    textAlignVertical: 'top',
  },
});

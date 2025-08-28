import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { JournalEntry } from '../database/schema';

interface EntryCardProps {
  entry?: JournalEntry;
  isAddNew?: boolean;
  onPress: () => void;
  theme: 'light' | 'dark';
}

export const EntryCard: React.FC<EntryCardProps> = ({ 
  entry, 
  isAddNew = false, 
  onPress, 
  theme 
}) => {
  const getPreviewText = (content: string, maxLength: number = 60) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isAddNew) {
    return (
      <TouchableOpacity 
        style={[
          styles.card, 
          styles.addNewCard,
          { 
            backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F8F8F8',
            borderColor: theme === 'dark' ? '#444444' : '#E0E0E0',
          }
        ]} 
        onPress={onPress}
      >
        <View style={styles.addNewContent}>
          <Text style={[
            styles.addNewIcon, 
            { color: theme === 'dark' ? '#888888' : '#666666' }
          ]}>
            +
          </Text>
          <Text style={[
            styles.addNewText, 
            { color: theme === 'dark' ? '#888888' : '#666666' }
          ]}>
            Add New Entry
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (!entry) return null;

  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        { 
          backgroundColor: theme === 'dark' ? '#2A2A2A' : '#FFFFFF',
          borderColor: theme === 'dark' ? '#444444' : '#E0E0E0',
        }
      ]} 
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <Text style={[
          styles.title, 
          { color: theme === 'dark' ? '#FFFFFF' : '#000000' }
        ]} numberOfLines={1}>
          {entry.title}
        </Text>
        <Text style={[
          styles.time, 
          { color: theme === 'dark' ? '#888888' : '#666666' }
        ]}>
          {formatTime(entry.created_at)}
        </Text>
      </View>
      <Text style={[
        styles.preview, 
        { color: theme === 'dark' ? '#CCCCCC' : '#555555' }
      ]} numberOfLines={2}>
        {getPreviewText(entry.content)}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addNewCard: {
    borderStyle: 'dashed',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 80,
  },
  addNewContent: {
    alignItems: 'center',
  },
  addNewIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  addNewText: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    fontWeight: '400',
  },
  preview: {
    fontSize: 14,
    lineHeight: 20,
  },
});

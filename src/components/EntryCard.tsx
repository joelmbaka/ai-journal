import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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
        className="border rounded-xl p-4 mb-3 border-dashed border-2 justify-center items-center min-h-20"
        style={{
          backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F8F8F8',
          borderColor: theme === 'dark' ? '#444444' : '#E0E0E0',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
        onPress={onPress}
      >
        <View className="items-center">
          <Text className="text-2xl font-bold mb-1" style={{ color: theme === 'dark' ? '#888888' : '#666666' }}>+
          </Text>
          <Text className="text-sm font-medium" style={{ color: theme === 'dark' ? '#888888' : '#666666' }}>
            Add New Entry
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (!entry) return null;

  return (
    <TouchableOpacity
      className="border rounded-xl p-4 mb-3"
      style={{
        backgroundColor: theme === 'dark' ? '#2A2A2A' : '#FFFFFF',
        borderColor: theme === 'dark' ? '#444444' : '#E0E0E0',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
      onPress={onPress}
    >
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-base font-semibold flex-1 mr-2" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }} numberOfLines={1}>
          {entry.title}
        </Text>
        <Text className="text-xs font-normal" style={{ color: theme === 'dark' ? '#888888' : '#666666' }}>
          {formatTime(entry.created_at)}
        </Text>
      </View>
      <Text className="text-sm leading-5" style={{ color: theme === 'dark' ? '#CCCCCC' : '#555555' }} numberOfLines={2}>
        {getPreviewText(entry.content)}
      </Text>
    </TouchableOpacity>
  );
};


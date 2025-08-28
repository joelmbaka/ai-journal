// BackgroundPatterns component removed - using only clean blank background
// This file is kept for compatibility but no longer renders patterns

import React from 'react';
import { View } from 'react-native';

interface BackgroundPatternsProps {
  backgroundColor: string;
}

export const BackgroundPatterns: React.FC<BackgroundPatternsProps> = ({
  backgroundColor,
}) => {
  return (
    <View 
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor,
        zIndex: -1,
      }} 
    />
  );
};

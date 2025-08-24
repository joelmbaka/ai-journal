import React from 'react';
import { Dimensions, View } from 'react-native';
import Svg, { Circle, Defs, Line, Pattern, Rect } from 'react-native-svg';
import { BackgroundStyle } from '../types/settings';

interface BackgroundPatternsProps {
  style: BackgroundStyle;
  lineColor: string;
  backgroundColor: string;
}

const { width, height } = Dimensions.get('window');

export const BackgroundPatterns: React.FC<BackgroundPatternsProps> = ({
  style,
  lineColor,
  backgroundColor,
}) => {
  if (style === 'blank') {
    return <View style={{ flex: 1, backgroundColor }} />;
  }

  const renderPattern = () => {
    switch (style) {
      case 'lined':
        return (
          <Svg height={height} width={width} style={{ position: 'absolute' }}>
            <Defs>
              <Pattern
                id="lines"
                patternUnits="userSpaceOnUse"
                width="1"
                height="24"
              >
                <Line
                  x1="0"
                  y1="24"
                  x2={width}
                  y2="24"
                  stroke={lineColor}
                  strokeWidth="0.5"
                />
              </Pattern>
            </Defs>
            <Rect width="100%" height="100%" fill={backgroundColor} />
            <Rect width="100%" height="100%" fill="url(#lines)" />
          </Svg>
        );

      case 'dotted':
        return (
          <Svg height={height} width={width} style={{ position: 'absolute' }}>
            <Defs>
              <Pattern
                id="dots"
                patternUnits="userSpaceOnUse"
                width="20"
                height="20"
              >
                <Circle cx="10" cy="10" r="0.5" fill={lineColor} />
              </Pattern>
            </Defs>
            <Rect width="100%" height="100%" fill={backgroundColor} />
            <Rect width="100%" height="100%" fill="url(#dots)" />
          </Svg>
        );

      case 'grid':
        return (
          <Svg height={height} width={width} style={{ position: 'absolute' }}>
            <Defs>
              <Pattern
                id="grid"
                patternUnits="userSpaceOnUse"
                width="20"
                height="20"
              >
                <Line x1="0" y1="0" x2="0" y2="20" stroke={lineColor} strokeWidth="0.3" />
                <Line x1="0" y1="0" x2="20" y2="0" stroke={lineColor} strokeWidth="0.3" />
              </Pattern>
            </Defs>
            <Rect width="100%" height="100%" fill={backgroundColor} />
            <Rect width="100%" height="100%" fill="url(#grid)" />
          </Svg>
        );

      case 'minimal-lines':
        return (
          <Svg height={height} width={width} style={{ position: 'absolute' }}>
            <Defs>
              <Pattern
                id="minimal"
                patternUnits="userSpaceOnUse"
                width="1"
                height="32"
              >
                <Line
                  x1="0"
                  y1="32"
                  x2={width}
                  y2="32"
                  stroke={lineColor}
                  strokeWidth="0.3"
                  strokeDasharray="2,2"
                />
              </Pattern>
            </Defs>
            <Rect width="100%" height="100%" fill={backgroundColor} />
            <Rect width="100%" height="100%" fill="url(#minimal)" />
          </Svg>
        );

      default:
        return <View style={{ flex: 1, backgroundColor }} />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor }}>
      {renderPattern()}
    </View>
  );
};

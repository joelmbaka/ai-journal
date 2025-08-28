import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, Mask, Rect, Circle, G } from 'react-native-svg';

interface SpiralBindingProps {
  theme: 'light' | 'dark';
}

const { height: screenHeight } = Dimensions.get('window');

export const SpiralBinding: React.FC<SpiralBindingProps> = ({ theme }) => {
  // Calculate number of spiral rings based on screen height
  const ringCount = Math.floor(screenHeight / 45);
  
  const spiralColor = theme === 'dark' ? '#666666' : '#8B8B8B';
  const shadowColor = theme === 'dark' ? '#000000' : '#000000';
 
  // Geometry constants (must match styles below)
  const HOLE_SPACING = 45;
  const HOLE_TOP = 20;
  const HOLE_RADIUS = 3;
  // Holes are centered in an 8px column, both spiral and holes containers are offset left: 8
  const HOLE_X = 10; // center X within the SVG (spiralContainer)
  const START_Y = HOLE_TOP + HOLE_SPACING / 2;
  
  // Generate a spiral that passes through hole centers
  const generateSpiralPath = () => {
    let path = '';
    const holeX = HOLE_X;
    const spacing = HOLE_SPACING;
    const startY = START_Y;
    // Keep leftmost curve within the SVG; push further left for stronger outside look
    const leftX = 0.5;
    for (let i = 0; i < ringCount - 1; i++) {
      const y1 = startY + i * spacing;
      const y2 = y1 + spacing;
      if (i === 0) {
        path += `M ${holeX} ${y1}`;
      }
      // One smooth outward loop to the left, then back through the next hole center
      const cp1x = leftX;
      const cp1y = y1 + spacing * 0.18;
      const cp2x = leftX;
      const cp2y = y1 + spacing * 0.82;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${holeX} ${y2}`;
    }
    return path;
  };
  
  return (
    <View style={[styles.bindingContainer, { backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E8E8E8' }]}>
      {/* Spiral + holes (SVG) */}
      <View style={styles.spiralContainer}>
        <Svg height="100%" width="32" style={{ position: 'absolute' }}>
          <Defs>
            {/* Reveal the wire on the left side, and inside the circular holes */}
            <Mask id="coilMask" x="0" y="0" width="32" height="100%">
              {/* Hide everywhere by default */}
              <Rect x={0} y={0} width="32" height="100%" fill="black" />
              {/* Left outside area (always show) */}
              <Rect x={0} y={0} width={HOLE_X - HOLE_RADIUS} height="100%" fill="white" />
              {/* Circular holes (reveal wire at centers) */}
              {Array.from({ length: ringCount }, (_, i) => (
                <Circle
                  key={`mask-hole-${i}`}
                  cx={HOLE_X}
                  cy={START_Y + i * HOLE_SPACING}
                  r={HOLE_RADIUS}
                  fill="white"
                />
              ))}
            </Mask>
          </Defs>
          {/* Spiral wire hidden - showing only holes */}
          {/* Hole rims on top */}
          {Array.from({ length: ringCount }, (_, i) => (
            <Circle
              key={`rim-hole-${i}`}
              cx={HOLE_X}
              cy={START_Y + i * HOLE_SPACING}
              r={HOLE_RADIUS}
              fill="none"
              stroke="#999999"
              strokeWidth={0.8}
            />
          ))}
        </Svg>
      </View>
      
      {/* Binding edge shadow */}
      <View style={[
        styles.bindingEdge,
        {
          backgroundColor: theme === 'dark' ? '#1F1F1F' : '#D5D5D5',
          shadowColor: shadowColor,
        }
      ]} />
    </View>
  );
};

const styles = StyleSheet.create({
  bindingContainer: {
    width: 32,
    position: 'absolute',
    left: 8, // Move away from screen edge
    top: 16, // Match text area top margin
    bottom: 0, // Extend to tabs
    borderRightWidth: 1,
    borderRightColor: '#C0C0C0',
    zIndex: 10,
  },
  spiralContainer: {
    position: 'absolute',
    left: 8, // Match binding container offset
    top: 16, // Match binding container top margin
    bottom: 0, // Extend to tabs
    width: 32,
    zIndex: 5,
  },
  bindingEdge: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 2,
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
});

import React, { useEffect } from 'react';
import { Dimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import { useTabTransition } from '../context/TabTransitionContext';

export function SlideInView({ children }: { children: React.ReactNode }) {
  const { direction, trigger } = useTabTransition();
  const isFocused = useIsFocused();

  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!isFocused || !direction) return;
    const width = Dimensions.get('window').width;
    translateX.value = direction === 'left' ? width : -width;
    opacity.value = 0.2;
    translateX.value = withTiming(0, { duration: 440, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(1, { duration: 440, easing: Easing.out(Easing.cubic) });
  }, [trigger, isFocused, direction]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
    flex: 1,
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

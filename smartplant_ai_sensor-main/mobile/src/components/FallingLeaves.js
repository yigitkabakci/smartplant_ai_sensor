import React, { useEffect, useRef, useMemo } from 'react';
import { View, Animated, Text, Dimensions, StyleSheet } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');
const EMOJIS = ['🍃', '🍃', '🌿', '🍀', '🍃', '🌿'];

function Leaf({ x, size, duration, delay, drift, rotations, maxOpacity, emoji }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, []);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, H + 60],
  });
  const translateX = anim.interpolate({
    inputRange: [0, 0.35, 0.65, 1],
    outputRange: [0, drift * 0.6, drift, drift * 0.8],
  });
  const rotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${rotations * 360}deg`],
  });
  const opacity = anim.interpolate({
    inputRange: [0, 0.06, 0.88, 1],
    outputRange: [0, maxOpacity, maxOpacity, 0],
  });

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        left: x,
        top: 0,
        fontSize: size,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate }],
      }}
    >
      {emoji}
    </Animated.Text>
  );
}

export default function FallingLeaves() {
  const leaves = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      emoji: EMOJIS[i % EMOJIS.length],
      x: (W / 12) * i + Math.random() * (W / 14),
      size: 12 + Math.random() * 11,
      duration: 9000 + Math.random() * 8000,
      delay: Math.random() * 12000,
      drift: (Math.random() - 0.5) * 90,
      rotations: 1 + Math.random() * 2,
      maxOpacity: 0.13 + Math.random() * 0.17,
    }))
  , []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {leaves.map(l => <Leaf key={l.id} {...l} />)}
    </View>
  );
}

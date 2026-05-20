import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Radius, Typography } from '../constants/theme';

export default function Badge({ label, variant = 'green', style }) {
  const { colors: C } = useTheme();
  const variants = {
    green:  { bg: C.greenDim,  text: C.green,  border: `${C.green}40` },
    red:    { bg: C.redDim,    text: C.red,    border: `${C.red}40` },
    orange: { bg: C.amberDim,  text: C.amber,  border: `${C.amber}40` },
    blue:   { bg: C.blueDim,   text: C.blue,   border: `${C.blue}40` },
    purple: { bg: C.purpleDim, text: C.purple, border: `${C.purple}40` },
    gold:   { bg: C.goldDim,   text: C.gold,   border: `${C.gold}40` },
    gray:   { bg: C.card2,     text: C.sub2,   border: C.borderDim },
  };
  const v = variants[variant] || variants.gray;
  return (
    <View style={[s.badge, { backgroundColor: v.bg, borderColor: v.border }, style]}>
      <Text style={[s.label, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  label: {
    fontSize: Typography.xs,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});

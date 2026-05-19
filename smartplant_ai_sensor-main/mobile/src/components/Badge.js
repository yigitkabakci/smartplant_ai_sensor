import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Typography } from '../constants/theme';

const variants = {
  green:  { bg: Colors.greenDim,  text: Colors.green,  border: 'rgba(34,197,94,0.2)' },
  red:    { bg: Colors.redDim,    text: Colors.red,    border: 'rgba(239,68,68,0.2)' },
  orange: { bg: Colors.orangeDim, text: Colors.orange, border: 'rgba(245,158,11,0.2)' },
  blue:   { bg: Colors.blueDim,   text: Colors.blue,   border: 'rgba(59,130,246,0.2)' },
  purple: { bg: Colors.purpleDim, text: Colors.purple, border: 'rgba(168,85,247,0.2)' },
  gold:   { bg: Colors.goldDim,   text: Colors.gold,   border: 'rgba(200,169,106,0.25)' },
  gray:   { bg: Colors.card2,     text: Colors.sub2,   border: 'rgba(200,169,106,0.08)' },
};

export default function Badge({ label, variant = 'green', style }) {
  const v = variants[variant] || variants.gray;
  return (
    <View style={[styles.badge, { backgroundColor: v.bg, borderColor: v.border }, style]}>
      <Text style={[styles.label, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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

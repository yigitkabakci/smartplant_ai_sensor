import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Typography } from '../constants/theme';

const variants = {
  green:  { bg: Colors.greenDim,  text: Colors.greenDark },
  red:    { bg: Colors.redDim,    text: Colors.red },
  orange: { bg: Colors.orangeDim, text: Colors.orange },
  blue:   { bg: Colors.blueDim,   text: Colors.blue },
  purple: { bg: Colors.purpleDim, text: Colors.purple },
  gray:   { bg: Colors.bgCard2,   text: Colors.textSub },
};

export default function Badge({ label, variant = 'green', style }) {
  const v = variants[variant] || variants.gray;
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }, style]}>
      <Text style={[styles.label, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: Typography.xs,
    fontWeight: '700',
  },
});

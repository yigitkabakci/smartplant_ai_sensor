import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Radius, Shadow } from '../constants/theme';

export default function Card({ children, style }) {
  const { colors } = useTheme();
  return (
    <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    ...Shadow.md,
  },
});

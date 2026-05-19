import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Shadow, Typography } from '../constants/theme';

export default function Card({ children, style }) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.md,
  },
});

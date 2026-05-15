import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Radius, Shadow } from '../constants/theme';

export default function Card({ children, style }) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: 16,
    ...Shadow.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});

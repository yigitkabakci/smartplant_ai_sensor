import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Shadow, Typography } from '../constants/theme';

export default function MetricCard({ icon, label, value, unit, color, subText }) {
  return (
    <View style={[styles.card, { borderTopColor: color }]}>
      <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
        <Text style={{ fontSize: 20 }}>{icon}</Text>
      </View>
      <Text style={[styles.value, { color }]}>{value ?? '--'}</Text>
      <Text style={styles.unit}>{unit}</Text>
      <Text style={styles.label}>{label}</Text>
      {subText ? <Text style={styles.sub}>{subText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: 14,
    borderTopWidth: 3,
    alignItems: 'center',
    flex: 1,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopWidth: 3,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  value: {
    fontSize: Typography.xxl,
    fontWeight: '800',
    lineHeight: 28,
  },
  unit: {
    fontSize: Typography.sm,
    color: Colors.textSub,
    marginTop: 1,
  },
  label: {
    fontSize: Typography.xs,
    color: Colors.textSub,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sub: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 3,
    textAlign: 'center',
  },
});

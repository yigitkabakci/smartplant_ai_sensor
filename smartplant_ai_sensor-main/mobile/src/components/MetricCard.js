import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Shadow, Typography } from '../constants/theme';

export default function MetricCard({ icon, label, value, unit, color, subText }) {
  return (
    <View style={[styles.card, { borderTopColor: color }]}>
      <View style={[styles.iconWrap, { backgroundColor: color + '1a', borderColor: color + '33' }]}>
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
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 14,
    borderTopWidth: 3,
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
  },
  value: {
    fontSize: Typography.xxl,
    fontWeight: '700',
    lineHeight: 28,
  },
  unit: {
    fontSize: Typography.sm,
    color: Colors.sub,
    marginTop: 1,
  },
  label: {
    fontSize: Typography.xs,
    color: Colors.sub2,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sub: {
    fontSize: 10,
    color: Colors.sub,
    marginTop: 3,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});

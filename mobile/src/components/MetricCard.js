import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Radius, Shadow, Typography } from '../constants/theme';

export default function MetricCard({ icon, label, value, unit, color, subText }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[s.card, { borderTopColor: color }]}>
      <View style={[s.iconWrap, { backgroundColor: color + '1a', borderColor: color + '33' }]}>
        <Text style={{ fontSize: 20 }}>{icon}</Text>
      </View>
      <Text style={[s.value, { color }]}>{value ?? '--'}</Text>
      <Text style={s.unit}>{unit}</Text>
      <Text style={s.label}>{label}</Text>
      {subText ? <Text style={s.sub}>{subText}</Text> : null}
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    card: {
      backgroundColor: C.card,
      borderRadius: Radius.lg,
      padding: 14,
      borderTopWidth: 3,
      alignItems: 'center',
      flex: 1,
      borderWidth: 1,
      borderColor: C.border,
      ...Shadow.sm,
    },
    iconWrap: {
      width: 44, height: 44,
      borderRadius: Radius.md,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 10, borderWidth: 1,
    },
    value:  { fontSize: Typography.xxl, fontWeight: '700', lineHeight: 28 },
    unit:   { fontSize: Typography.sm, color: C.sub, marginTop: 1 },
    label:  { fontSize: Typography.xs, color: C.sub2, fontWeight: '600', marginTop: 6, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 },
    sub:    { fontSize: 10, color: C.sub, marginTop: 3, textAlign: 'center', letterSpacing: 0.3 },
  });
}

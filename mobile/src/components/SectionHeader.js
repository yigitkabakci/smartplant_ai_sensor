import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Typography, Radius } from '../constants/theme';

export default function SectionHeader({ title, subtitle, onAction, actionLabel }) {
  const { colors } = useTheme();
  return (
    <View style={s.wrap}>
      <View style={{ flex: 1 }}>
        <Text style={[s.title, { color: colors.cream }]}>{title}</Text>
        {subtitle ? <Text style={[s.sub, { color: colors.sub }]}>{subtitle}</Text> : null}
      </View>
      {onAction && (
        <TouchableOpacity
          style={[s.btn, { borderColor: colors.goldGlow, backgroundColor: colors.goldDim }]}
          onPress={onAction}
        >
          <Text style={[s.btnText, { color: colors.gold }]}>{actionLabel || 'Tümü'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: Typography.base,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  sub: {
    fontSize: Typography.xs,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  btn: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  btnText: {
    fontSize: Typography.xs,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

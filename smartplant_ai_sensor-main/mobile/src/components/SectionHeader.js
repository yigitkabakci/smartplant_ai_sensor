import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography, Radius } from '../constants/theme';

export default function SectionHeader({ title, subtitle, onAction, actionLabel }) {
  return (
    <View style={styles.wrap}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      {onAction && (
        <TouchableOpacity style={styles.btn} onPress={onAction}>
          <Text style={styles.btnText}>{actionLabel || 'Tumu'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: Colors.cream,
    letterSpacing: 0.3,
  },
  sub: {
    fontSize: Typography.xs,
    color: Colors.sub,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  btn: {
    borderWidth: 1,
    borderColor: Colors.goldGlow,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: Colors.goldDim,
  },
  btnText: {
    fontSize: Typography.xs,
    fontWeight: '600',
    color: Colors.gold,
    letterSpacing: 0.3,
  },
});

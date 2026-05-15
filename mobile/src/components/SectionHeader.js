import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography } from '../constants/theme';

export default function SectionHeader({ title, subtitle, onAction, actionLabel }) {
  return (
    <View style={styles.wrap}>
      <View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      {onAction && (
        <TouchableOpacity style={styles.btn} onPress={onAction}>
          <Text style={styles.btnText}>{actionLabel || 'Tümü'}</Text>
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
    marginBottom: 12,
  },
  title: {
    fontSize: Typography.md,
    fontWeight: '700',
    color: Colors.text,
  },
  sub: {
    fontSize: Typography.xs,
    color: Colors.textSub,
    marginTop: 1,
  },
  btn: {
    backgroundColor: Colors.greenDim,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  btnText: {
    fontSize: Typography.xs,
    fontWeight: '700',
    color: Colors.greenDark,
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral' }) => {
  return (
    <View style={[styles.badge, styles[variant]]}>
      <Text style={[styles.text, styles[`${variant}Text` as keyof typeof styles]]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
  success: {
    backgroundColor: '#d1fae5',
  },
  successText: {
    color: '#065f46',
  },
  warning: {
    backgroundColor: '#fef3c7',
  },
  warningText: {
    color: '#92400e',
  },
  danger: {
    backgroundColor: '#fee2e2',
  },
  dangerText: {
    color: '#991b1b',
  },
  info: {
    backgroundColor: '#e0e7ff',
  },
  infoText: {
    color: '#3730a3',
  },
  neutral: {
    backgroundColor: '#f3f4f6',
  },
  neutralText: {
    color: '#374151',
  },
});

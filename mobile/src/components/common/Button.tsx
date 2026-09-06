import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const containerStyles: StyleProp<ViewStyle> = [
    styles.button,
    styles[variant],
    styles[size],
    (disabled || loading) && styles.disabled,
    style,
  ];

  const labelStyles: StyleProp<TextStyle> = [
    styles.text,
    styles[`${variant}Text` as keyof typeof styles] as TextStyle,
    styles[`${size}Text` as keyof typeof styles] as TextStyle,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={containerStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'secondary' ? '#047857' : '#ffffff'}
        />
      ) : (
        <>
          {icon ? <>{icon}</> : null}
          <Text style={labelStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  // Variants
  primary: {
    backgroundColor: '#047857', // Emerald 700
  },
  secondary: {
    backgroundColor: '#d1fae5', // Emerald 100
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#047857',
  },
  danger: {
    backgroundColor: '#ef4444',
  },
  disabled: {
    opacity: 0.5,
  },
  // Sizes
  small: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    minHeight: 36,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    minHeight: 48,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: 56,
  },
  // Text
  text: {
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryText: {
    color: '#ffffff',
  },
  secondaryText: {
    color: '#065f46',
  },
  outlineText: {
    color: '#047857',
  },
  dangerText: {
    color: '#ffffff',
  },
  smallText: {
    fontSize: 13,
  },
  mediumText: {
    fontSize: 15,
  },
  largeText: {
    fontSize: 17,
  },
});

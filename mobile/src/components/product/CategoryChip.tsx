import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface CategoryChipProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
}

export const CategoryChip: React.FC<CategoryChipProps> = ({
  label,
  isSelected,
  onPress,
  icon,
}) => {
  return (
    <TouchableOpacity
      style={[styles.chip, isSelected && styles.selectedChip]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon ? icon : null}
      <Text style={[styles.label, isSelected && styles.selectedLabel]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  selectedChip: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
  },
  selectedLabel: {
    color: '#ffffff',
  },
});

/**
 * Indian Phone Number Normalization and Validation Utility
 */

export const normalizePhoneNumber = (phone: string): string => {
  if (!phone || typeof phone !== 'string') return '';

  // Strip zero-width characters, non-breaking spaces, spaces, dashes, parentheses, dots
  let cleaned = phone.replace(/[\u200B-\u200D\uFEFF\u00A0\s\-\(\)\.]/g, '').trim();

  // Strip international prefixes if present
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  }

  // Strip leading 0 if present (common in Indian trunk dialing)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.replace(/^0+/, '');
  }

  return cleaned.trim();
};

export const isValidIndianPhoneNumber = (phone: string): boolean => {
  const normalized = normalizePhoneNumber(phone);
  // Standard Indian mobile number: 10 digits starting with 6, 7, 8, or 9
  return /^[6-9]\d{9}$/.test(normalized);
};

export const buildPhoneVariants = (rawPhone: string): string[] => {
  if (!rawPhone || typeof rawPhone !== 'string') return [];
  const normalized = normalizePhoneNumber(rawPhone);
  const variants = new Set<string>();

  if (normalized) {
    variants.add(normalized);
    variants.add(`+91${normalized}`);
    variants.add(`+91 ${normalized}`);
    variants.add(`+91-${normalized}`);
    variants.add(`91${normalized}`);
    variants.add(`0${normalized}`);
  }

  const trimmed = rawPhone.trim();
  if (trimmed) {
    variants.add(trimmed);
  }

  return Array.from(variants);
};

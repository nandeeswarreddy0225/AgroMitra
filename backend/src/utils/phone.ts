/**
 * Indian Phone Number Normalization and Validation Utility
 */

export const normalizePhoneNumber = (phone: string): string => {
  if (!phone || typeof phone !== 'string') return '';

  // Strip spaces, dashes, parentheses, dots
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '').trim();

  // Strip international prefixes if present
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }

  return cleaned.trim();
};

export const isValidIndianPhoneNumber = (phone: string): boolean => {
  const normalized = normalizePhoneNumber(phone);
  // Standard Indian mobile number: 10 digits starting with 6, 7, 8, or 9
  return /^[6-9]\d{9}$/.test(normalized);
};

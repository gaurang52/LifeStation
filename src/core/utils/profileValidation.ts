/**
 * Profile form validation utilities.
 * Keeps validation logic consistent with backend (backend/src/utils/validators.js).
 */

export const NAME_MAX_LENGTH = 100;
export const PHONE_MAX_LENGTH = 15;

/** Restrict name to letters, spaces, hyphens, apostrophes, periods (no newlines). */
export function filterNameInput(text: string): string {
  return text.replace(/[\r\n]/g, '').replace(/[^\p{L}\s\-'.]/gu, '');
}

/** Restrict phone to digits and optional leading +. */
export function filterPhoneInput(text: string): string {
  if (text.startsWith('+')) {
    const rest = text.slice(1).replace(/\D/g, '');
    return rest.length <= PHONE_MAX_LENGTH - 1
      ? '+' + rest
      : '+' + rest.slice(0, PHONE_MAX_LENGTH - 1);
  }
  const digits = text.replace(/\D/g, '');
  return digits.slice(0, PHONE_MAX_LENGTH);
}

export function validateName(name: string): string | null {
  const t = name.trim();
  if (!t) return 'Please enter a valid name';
  if (t.length > NAME_MAX_LENGTH) return `Name must be ${NAME_MAX_LENGTH} characters or less`;
  if (!/^[\p{L}\s\-'.]+$/u.test(t)) {
    return 'Name can only contain letters, spaces, hyphens, and apostrophes';
  }
  return null;
}

export function validatePhone(phone: string): string | null {
  const t = phone.trim();
  if (!t) return null;
  const normalized = t.startsWith('+') ? '+' + t.replace(/\D/g, '') : t.replace(/\D/g, '');
  if (normalized.length > PHONE_MAX_LENGTH)
    return `Phone must be ${PHONE_MAX_LENGTH} characters or less`;
  if (!/^\+?[1-9]\d{1,14}$/.test(normalized)) return 'Please enter a valid phone number';
  return null;
}

/**
 * Password complexity (Affiliated rules: 8+ chars, 3 of: upper, lower, number, special).
 */
export function validatePasswordComplexity(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  let count = 0;
  if (/[a-z]/.test(password)) count++;
  if (/[A-Z]/.test(password)) count++;
  if (/\d/.test(password)) count++;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) count++;
  if (count < 3)
    return 'Password must contain at least three of: uppercase, lowercase, number, special character.';
  return null;
}

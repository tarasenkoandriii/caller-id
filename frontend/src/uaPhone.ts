const UA_PHONE_REGEX = /^\+380\d{9}$/;

export function normalizeUaPhone(input: string): string | null {
  const trimmed = input.trim().replace(/[\s()-]/g, '');
  const withPlus = trimmed.startsWith('380') ? `+${trimmed}` : trimmed;
  return UA_PHONE_REGEX.test(withPlus) ? withPlus : null;
}

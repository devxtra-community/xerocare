const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password12',
  'password123',
  'password1234',
  'password1!',
  'password123!',
  'password2024',
  'password2025',
  'password2026',
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty',
  'qwertyuiop',
  'qwerty123',
  'letmein',
  'welcome',
  'welcome1',
  'admin',
  'admin123',
  'iloveyou',
  'abc123',
  'monkey',
  'dragon',
  'football',
  'princess',
  'sunshine',
  'trustno1',
  'changeme',
  'secret',
  'passw0rd',
  'Password1',
  'Password1!',
  'Xerocare123',
  'Xerocare@123',
]);

function normalizeForBlocklist(password: string): string {
  return password
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\W_]/gu, '');
}

const NORMALIZED_COMMON_PASSWORDS = new Set([...COMMON_PASSWORDS].map(normalizeForBlocklist));

export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.trim().length === 0) {
    return 'Password is required.';
  }
  if ([...password].length < 15) {
    return 'Password must be at least 15 characters.';
  }
  if (new TextEncoder().encode(password).length > 72) {
    return 'Password must be 72 UTF-8 bytes or fewer.';
  }
  if (/[\p{Cc}\p{Cs}]/u.test(password)) {
    return 'Password contains unsupported characters.';
  }
  const normalized = normalizeForBlocklist(password);
  if (
    NORMALIZED_COMMON_PASSWORDS.has(normalized) ||
    /^(?:password|qwerty|letmein|welcome|admin|123456|iloveyou)/u.test(normalized)
  ) {
    return 'Choose a password that is not commonly used.';
  }
  return null;
}

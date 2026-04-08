/**
 * Generates a random alphanumeric SKU.
 * Default length is 8 characters.
 */
export const generateSku = (length: number = 8): string => {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

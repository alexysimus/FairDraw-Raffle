/**
 * Client-side SHA-256 hash using native browser Web Cryptography API.
 * 100% native, zero dependencies, zero bundle weight.
 */
export async function sha256(text: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(text.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Cryptographically generates an 8-character high-entropy recovery password
 * Guarantees balanced inclusion of uppercase, lowercase, digits, and symbols.
 * Excludes visually ambiguous characters (I/l/1, O/0).
 * Examples: "k9#P@7w!", "m$4R#9t*", "A8&x#2v!"
 */
export function generateRecoveryPassword(length = 8): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*?=';
  const all = upper + lower + digits + symbols;

  const getRandomChar = (charset: string) => {
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    return charset[randomArray[0] % charset.length];
  };

  // Ensure balanced representation
  const chars: string[] = [
    getRandomChar(upper),
    getRandomChar(lower),
    getRandomChar(digits),
    getRandomChar(symbols),
  ];

  for (let i = chars.length; i < length; i++) {
    chars.push(getRandomChar(all));
  }

  // Fisher-Yates cryptographic shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const j = randomArray[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}


/**
 * FairDraw Device-Adaptive Internationalization Engine (Intl)
 * 
 * Leverages native ECMAScript Intl APIs to format numbers, dates, and times
 * according to each user's device/browser locale and operating system preferences.
 * 
 * Invariants:
 * 1. Zero dependencies (0 KB bundle overhead, native browser C++ engine).
 * 2. Ticket codes (#1762, #0042) must NEVER be passed through formatNumber.
 * 3. Passing `undefined` as locale delegates directly to browser/OS settings.
 */

/**
 * Formats a numerical quantity according to user's device locale.
 * Example:
 * - en-US: 1250000 -> "1,250,000"
 * - fi-FI: 1250000 -> "1 250 000"
 * - de-DE: 1250000 -> "1.250.000"
 * - vi-VN: 1250000 -> "1.250.000"
 */
export function formatNumber(
  value: number | undefined | null,
  options?: Intl.NumberFormatOptions,
  locale?: string
): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '0';
  }

  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch (err) {
    console.warn('Intl.NumberFormat fallback triggered:', err);
    return value.toLocaleString();
  }
}

/**
 * Formats a timestamp into a localized calendar date string.
 * Default style: { year: 'numeric', month: 'short', day: 'numeric' }
 * Example:
 * - en-US: "Oct 29, 2026"
 * - fi-FI: "29.10.2026"
 * - vi-VN: "29 thg 10, 2026"
 */
export function formatDate(
  timestamp: number | Date | undefined | null,
  options?: Intl.DateTimeFormatOptions,
  locale?: string
): string {
  if (!timestamp) return '';

  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
  if (Number.isNaN(date.getTime())) return '';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  try {
    return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...(options || {}) }).format(date);
  } catch (err) {
    console.warn('Intl.DateTimeFormat fallback triggered:', err);
    return date.toLocaleDateString();
  }
}

/**
 * Formats a timestamp into localized time (automatically respects 12h vs 24h OS settings).
 */
export function formatTime(
  timestamp: number | Date | undefined | null,
  options?: Intl.DateTimeFormatOptions,
  locale?: string
): string {
  if (!timestamp) return '';

  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
  if (Number.isNaN(date.getTime())) return '';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };

  try {
    return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...(options || {}) }).format(date);
  } catch (err) {
    return date.toLocaleTimeString();
  }
}

/**
 * Formats a timestamp into a combined localized date and time string.
 */
export function formatDateTime(
  timestamp: number | Date | undefined | null,
  options?: Intl.DateTimeFormatOptions,
  locale?: string
): string {
  if (!timestamp) return '';

  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
  if (Number.isNaN(date.getTime())) return '';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  try {
    return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...(options || {}) }).format(date);
  } catch (err) {
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }
}

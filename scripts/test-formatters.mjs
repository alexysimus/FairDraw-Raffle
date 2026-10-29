/**
 * Automated test suite for FairDraw formatters (Intl)
 * Tests all edge cases across multiple locales.
 */

import { formatNumber, formatDate, formatTime, formatDateTime } from '../src/lib/formatters.ts';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('🧪 Starting FairDraw Intl Formatters Verification Suite...\n');

// --- 1. formatNumber Locale Tests ---
console.log('1. formatNumber Locale Adaptation:');
const enNum = formatNumber(1250000, undefined, 'en-US');
assert(enNum === '1,250,000', `en-US formats 1250000 with commas -> "${enNum}"`);

const deNum = formatNumber(1250000, undefined, 'de-DE');
assert(deNum === '1.250.000', `de-DE formats 1250000 with dots -> "${deNum}"`);

const viNum = formatNumber(1250000, undefined, 'vi-VN');
assert(viNum === '1.250.000', `vi-VN formats 1250000 with dots -> "${viNum}"`);

const fiNum = formatNumber(1250000, undefined, 'fi-FI');
// fi-FI uses non-breaking space (\u00A0 or \u202F) or space
const fiNormalized = fiNum.replace(/[\u00A0\u202F]/g, ' ');
assert(fiNormalized === '1 250 000', `fi-FI formats 1250000 with space separator -> "${fiNum}"`);

// --- 2. formatNumber Edge Cases ---
console.log('\n2. formatNumber Defensive Edge Cases:');
assert(formatNumber(0) === '0', 'formatNumber(0) returns "0"');
assert(formatNumber(null) === '0', 'formatNumber(null) returns "0" safely');
assert(formatNumber(undefined) === '0', 'formatNumber(undefined) returns "0" safely');
assert(formatNumber(NaN) === '0', 'formatNumber(NaN) returns "0" safely');
assert(formatNumber(42) === '42', 'formatNumber(42) returns "42"');
assert(formatNumber(1000) !== '', 'formatNumber(1000) returns non-empty string');

// --- 3. formatDate Locale Tests ---
console.log('\n3. formatDate Locale Adaptation:');
const testDate = new Date(Date.UTC(2026, 9, 29, 12, 0, 0)); // 29 Oct 2026

const enDate = formatDate(testDate, { timeZone: 'UTC' }, 'en-US');
assert(enDate.includes('Oct') && enDate.includes('29') && enDate.includes('2026'), `en-US contains Oct, 29, 2026 -> "${enDate}"`);

const fiDate = formatDate(testDate, { timeZone: 'UTC' }, 'fi-FI');
assert(fiDate.includes('29') && fiDate.includes('10') && fiDate.includes('2026'), `fi-FI contains 29.10.2026 -> "${fiDate}"`);

const viDate = formatDate(testDate, { timeZone: 'UTC' }, 'vi-VN');
assert(viDate.includes('29') && viDate.includes('2026'), `vi-VN formats cleanly -> "${viDate}"`);

// --- 4. formatDate Edge Cases ---
console.log('\n4. formatDate Defensive Edge Cases:');
assert(formatDate(null) === '', 'formatDate(null) returns empty string');
assert(formatDate(undefined) === '', 'formatDate(undefined) returns empty string');
assert(formatDate(new Date('invalid')) === '', 'formatDate(invalid Date) returns empty string without crashing');
assert(formatDate(Date.now()).length > 0, 'formatDate(Date.now()) returns valid formatted string');

// --- 5. formatTime & formatDateTime ---
console.log('\n5. formatTime & formatDateTime:');
const timeStr = formatTime(testDate, { timeZone: 'UTC' });
assert(timeStr.length > 0, `formatTime returns valid time string -> "${timeStr}"`);

const dtStr = formatDateTime(testDate, { timeZone: 'UTC' });
assert(dtStr.length > 0, `formatDateTime returns valid date/time string -> "${dtStr}"`);

console.log(`\n========================================`);
console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
console.log(`========================================`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All formatting and locale tests passed successfully!');
}

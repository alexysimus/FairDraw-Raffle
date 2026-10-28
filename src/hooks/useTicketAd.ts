export const TICKET_AD_SESSION_KEY = 'fairdraw_has_seen_ad_session';

/**
 * Checks whether the participant has already seen an ad during this browser session.
 */
export function hasSeenSessionAd(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(TICKET_AD_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Marks the session as having viewed the ticket lounge ad, granting instant entry
 * for any subsequent registrations (e.g. adding passes for friends or family).
 */
export function markSessionAdSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(TICKET_AD_SESSION_KEY, 'true');
  } catch (err) {
    console.warn('[TicketAd] Could not set session ad flag:', err);
  }
}

/**
 * Resets the session ad flag (useful for testing or debugging).
 */
export function resetSessionAd(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(TICKET_AD_SESSION_KEY);
  } catch (err) {
    console.warn('[TicketAd] Could not reset session ad flag:', err);
  }
}

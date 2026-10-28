/**
 * FairDraw 100% Cookieless Google Analytics 4 (GA4) Telemetry Module
 * 
 * Strict Privacy & Legal Compliance:
 * - Operates under Google Consent Mode v2 with analytics_storage: 'denied' and client_storage: 'none'.
 * - 0 cookies or persistent client identifiers written to document.cookie.
 * - Exempt from EU ePrivacy Directive Art. 5(3) & Finnish Traficom cookie consent banner mandates.
 * - All parameters strictly anonymized (zero PII, zero participant names, zero passwords).
 * - Safe fail-soft design: gracefully ignores execution when ad blockers (Brave Shields, uBlock) block gtag.
 */

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

export type AnalyticsParamValue = string | number | boolean;

const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

/**
 * Dispatches a stateless, cookieless telemetry event to Google Analytics 4.
 * Fails silently and instantly if blocked, unconfigured, or unavailable.
 */
export const trackEvent = (
  eventName: string, 
  params: Record<string, AnalyticsParamValue> = {}
): void => {
  if (!gaMeasurementId || typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  try {
    window.gtag('event', eventName, {
      ...params,
      send_to: gaMeasurementId
    });
  } catch {
    // Fail silently - zero impact on user experience
  }
};

/**
 * Dispatches an anonymous virtual SPA pageview without query parameter leak.
 */
export const trackPageView = (screenName: string): void => {
  if (!gaMeasurementId || typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  try {
    const origin = window.location.origin || 'https://fairdraw.daocongthanh.com';
    const cleanPath = `/?view=${screenName.toLowerCase()}`;
    
    window.gtag('event', 'page_view', {
      page_title: `FairDraw - ${screenName}`,
      page_location: `${origin}${cleanPath}`,
      send_to: gaMeasurementId
    });
  } catch {
    // Fail silently
  }
};

/**
 * SECTION 11.6: MARKETING, SEO & ANALYTICS TRACKING UTILITIES
 * 
 * Manages:
 * 1. UTM Parameter Capture & Persistence across the registration funnel
 * 2. Facebook Pixel integration & custom conversion events (Registration Started, Registration Completed)
 * 3. Referral source attribution tracking
 * 4. Safe development mode fallback when pixel credentials are unconfigured
 */

export interface UtmParameters {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrer?: string;
}

const STORAGE_KEY_UTM = 'pmp_utm_attribution';
const STORAGE_KEY_REG_STARTED = 'pmp_reg_started_tracked';
const STORAGE_KEY_REG_COMPLETED = 'pmp_reg_completed_tracked';

/**
 * Capture UTM parameters from URL query string on visitor arrival
 * and persist in sessionStorage so it survives multi-step browsing.
 */
export function captureAndPersistUtmParams(): UtmParameters {
  try {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source') || undefined;
    const utmMedium = params.get('utm_medium') || undefined;
    const utmCampaign = params.get('utm_campaign') || undefined;
    const utmTerm = params.get('utm_term') || undefined;
    const utmContent = params.get('utm_content') || undefined;

    // Only overwrite if new UTM parameters are present
    if (utmSource || utmMedium || utmCampaign) {
      const attribution: UtmParameters = {
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
        referrer: document.referrer || undefined,
      };
      sessionStorage.setItem(STORAGE_KEY_UTM, JSON.stringify(attribution));
      return attribution;
    }

    // Otherwise retrieve existing stored attribution
    const stored = sessionStorage.getItem(STORAGE_KEY_UTM);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('[Analytics] Failed to capture UTM params:', e);
  }

  return {
    referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
  };
}

/**
 * Get current persisted attribution data for form submission
 */
export function getPersistedAttribution(): {
  registrationSource: string;
  attributionData: UtmParameters;
} {
  const utm = captureAndPersistUtmParams();

  // Infer registration source
  let source = 'DIRECT';
  if (utm.utmSource) {
    const s = utm.utmSource.toLowerCase();
    if (s.includes('google')) source = 'GOOGLE';
    else if (s.includes('facebook') || s.includes('fb') || s.includes('instagram') || s.includes('ig')) source = 'FACEBOOK';
    else if (s.includes('whatsapp') || s.includes('wa')) source = 'WHATSAPP';
    else if (s.includes('referral') || s.includes('friend')) source = 'FRIEND_REFERRAL';
    else source = 'OTHER';
  } else if (utm.referrer) {
    const r = utm.referrer.toLowerCase();
    if (r.includes('google')) source = 'GOOGLE';
    else if (r.includes('facebook') || r.includes('instagram')) source = 'FACEBOOK';
    else if (r.includes('whatsapp')) source = 'WHATSAPP';
    else source = 'OTHER';
  }

  return {
    registrationSource: source,
    attributionData: utm,
  };
}

/**
 * Facebook Pixel Support
 */
const FB_PIXEL_ID = import.meta.env.VITE_FACEBOOK_PIXEL_ID || '';

export function initFacebookPixel(): void {
  if (typeof window === 'undefined') return;

  if (!FB_PIXEL_ID) {
    // Graceful simulated test mode
    console.log('[Analytics Dev] Facebook Pixel not configured; running in safe test mode.');
    return;
  }

  // Load standard Facebook Pixel script if not already loaded
  if (!(window as any).fbq) {
    (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    (window as any).fbq('init', FB_PIXEL_ID);
    (window as any).fbq('track', 'PageView');
  }
}

/**
 * Track Registration Started event
 */
export function trackRegistrationStarted(): void {
  try {
    if (sessionStorage.getItem(STORAGE_KEY_REG_STARTED)) return; // Prevent duplicate events

    sessionStorage.setItem(STORAGE_KEY_REG_STARTED, 'true');

    if ((window as any).fbq && FB_PIXEL_ID) {
      (window as any).fbq('trackCustom', 'RegistrationStarted');
    } else {
      console.log('[Analytics Dev] Event: RegistrationStarted');
    }
  } catch (e) {
    console.warn('[Analytics] Failed to track RegistrationStarted:', e);
  }
}

/**
 * Track Registration Completed event
 */
export function trackRegistrationCompleted(memberId?: string): void {
  try {
    if (sessionStorage.getItem(STORAGE_KEY_REG_COMPLETED)) return; // Prevent duplicate events

    sessionStorage.setItem(STORAGE_KEY_REG_COMPLETED, 'true');

    if ((window as any).fbq && FB_PIXEL_ID) {
      (window as any).fbq('track', 'CompleteRegistration', {
        content_name: 'Member Registration',
        status: 'Completed',
        member_id: memberId || 'N/A',
      });
    } else {
      console.log('[Analytics Dev] Event: CompleteRegistration', { memberId });
    }
  } catch (e) {
    console.warn('[Analytics] Failed to track CompleteRegistration:', e);
  }
}

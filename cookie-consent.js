// Cookie consent implementation for Mintlify with geolocation-based auto-consent
// This script checks user location and shows consent banner only for regulated regions

(function() {
  'use strict';

  // Configuration
  const CONSENT_KEY = 'cookie-consent';
  const CONSENT_VALUE_GRANTED = 'granted';
  const CONSENT_VALUE_DECLINED = 'declined';
  const COOKIE_DOMAIN = '.chatlevel.io';

  // Countries/regions that require explicit cookie consent
  // EU/EEA member states, UK, Brazil, Switzerland, Canada
  const CONSENT_REQUIRED_COUNTRIES = [
    // EU Member States
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
    // EEA (non-EU)
    'IS', 'LI', 'NO',
    // Other privacy-regulated regions
    'GB', 'UK', 'BR', 'CH', 'CA'
  ];

  // California requires special handling as it's a US state
  const CONSENT_REQUIRED_REGIONS = ['California', 'CA'];

  let cachedGeoData = null;

  /**
   * Gets current consent status from localStorage
   */
  function getConsentStatus() {
    try {
      return localStorage.getItem(CONSENT_KEY);
    } catch (e) {
      console.warn('Failed to read consent status:', e);
      return null;
    }
  }

  /**
   * Sets consent status in localStorage
   */
  function setConsentStatus(value) {
    try {
      localStorage.setItem(CONSENT_KEY, value);
      console.log('Cookie consent set to:', value);

      // Trigger a page reload to activate PostHog after consent is granted
      if (value === CONSENT_VALUE_GRANTED) {
        window.location.reload();
      }
    } catch (e) {
      console.error('Failed to set consent status:', e);
    }
  }

  /**
   * Fetches user's geolocation data from ipapi.co
   * Returns null if API fails (defaults to requiring consent)
   */
  async function getUserGeolocation() {
    if (cachedGeoData) return cachedGeoData;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch('https://ipapi.co/json/', {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn('Geolocation API request failed');
        return null;
      }

      const data = await response.json();
      cachedGeoData = {
        country: data.country_code || data.country || null,
        region: data.region || null,
        city: data.city || null
      };

      return cachedGeoData;
    } catch (error) {
      console.warn('Failed to fetch geolocation:', error.message);
      return null;
    }
  }

  /**
   * Checks if the user is in a region that requires explicit cookie consent
   */
  async function requiresConsent() {
    try {
      const geoData = await getUserGeolocation();

      // If we can't determine location, require consent (privacy-first approach)
      if (!geoData || !geoData.country) {
        console.log('Location unknown, requiring consent');
        return true;
      }

      const country = geoData.country.toUpperCase();
      const region = geoData.region;

      // Check if country requires consent
      if (CONSENT_REQUIRED_COUNTRIES.includes(country)) {
        console.log(`User in ${country}, consent required`);
        return true;
      }

      // Special handling for California
      if (country === 'US' && region) {
        const isCaliforniaVariant = CONSENT_REQUIRED_REGIONS.some(r =>
          region.toLowerCase().includes(r.toLowerCase())
        );
        if (isCaliforniaVariant) {
          console.log('User in California, consent required');
          return true;
        }
      }

      console.log(`User in ${country}, auto-granting consent`);
      return false;
    } catch (error) {
      console.error('Error checking consent requirements:', error);
      // Default to requiring consent if there's an error
      return true;
    }
  }

  /**
   * Creates and shows the cookie consent banner
   */
  function showConsentBanner() {
    // Create banner HTML
    const banner = document.createElement('div');
    banner.id = 'cookie-consent-banner';
    banner.innerHTML = `
      <div style="
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: #1a1a1a;
        color: #ffffff;
        padding: 20px;
        box-shadow: 0 -2px 10px rgba(0,0,0,0.2);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      ">
        <div style="
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        ">
          <div style="flex: 1; min-width: 300px;">
            <p style="margin: 0; font-size: 14px; line-height: 1.5;">
              We use cookies and similar technologies to enhance your experience, analyze site usage, and assist in our marketing efforts.
              By clicking "Accept", you consent to our use of cookies.
            </p>
          </div>
          <div style="display: flex; gap: 12px; flex-shrink: 0;">
            <button id="cookie-decline-btn" style="
              background: transparent;
              color: #ffffff;
              border: 1px solid #ffffff;
              padding: 10px 24px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
              transition: all 0.2s;
            ">
              Decline
            </button>
            <button id="cookie-accept-btn" style="
              background: #16A34A;
              color: #ffffff;
              border: none;
              padding: 10px 24px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
              transition: all 0.2s;
            ">
              Accept
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    // Add hover effects
    const style = document.createElement('style');
    style.textContent = `
      #cookie-accept-btn:hover {
        background: #15803D !important;
      }
      #cookie-decline-btn:hover {
        background: rgba(255, 255, 255, 0.1) !important;
      }
    `;
    document.head.appendChild(style);

    // Handle accept button
    document.getElementById('cookie-accept-btn').addEventListener('click', function() {
      setConsentStatus(CONSENT_VALUE_GRANTED);
      banner.remove();
    });

    // Handle decline button
    document.getElementById('cookie-decline-btn').addEventListener('click', function() {
      setConsentStatus(CONSENT_VALUE_DECLINED);
      banner.remove();
    });
  }

  /**
   * Main initialization function
   */
  async function init() {
    // Check if user already made a decision
    const currentConsent = getConsentStatus();
    if (currentConsent) {
      console.log('User already made consent decision:', currentConsent);
      return;
    }

    // Check if user is in a region that requires explicit consent
    const needsConsent = await requiresConsent();

    if (!needsConsent) {
      // Auto-grant consent for users outside restricted regions
      setConsentStatus(CONSENT_VALUE_GRANTED);
      console.log('Auto-granted cookie consent based on location');
    } else {
      // Show consent banner for users in restricted regions
      showConsentBanner();
    }
  }

  // Run initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

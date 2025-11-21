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
   * Creates and shows the cookie consent banner (minimal variant - matches shadcn design)
   */
  function showConsentBanner() {
    // Create banner container
    const banner = document.createElement('div');
    banner.id = 'cookie-consent-banner';
    banner.style.cssText = `
      position: fixed;
      z-index: 200;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 1rem;
      width: 100%;
      animation: slideUp 0.7s ease-out;
    `;

    // Create card
    const card = document.createElement('div');
    card.style.cssText = `
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    `;

    // Create header with icon
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #e5e7eb;
    `;

    const headerContent = document.createElement('div');
    headerContent.style.cssText = 'display: flex; align-items: center; gap: 0.5rem;';

    // Cookie icon (simplified SVG)
    const icon = document.createElement('span');
    icon.innerHTML = '🍪';
    icon.style.cssText = 'font-size: 1rem;';

    const title = document.createElement('span');
    title.textContent = 'Cookie Notice';
    title.style.cssText = `
      font-size: 0.875rem;
      font-weight: 500;
      color: #111827;
    `;

    headerContent.appendChild(icon);
    headerContent.appendChild(title);
    header.appendChild(headerContent);

    // Create content area
    const content = document.createElement('div');
    content.style.cssText = 'padding: 0.75rem;';

    const text = document.createElement('p');
    text.textContent = 'We use cookies to enhance your browsing experience.';
    text.style.cssText = `
      margin: 0 0 0.75rem 0;
      font-size: 0.75rem;
      line-height: 1.5;
      color: #6b7280;
    `;

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    `;

    // Decline button
    const declineBtn = document.createElement('button');
    declineBtn.id = 'cookie-decline-btn';
    declineBtn.textContent = 'Decline';
    declineBtn.style.cssText = `
      background: transparent;
      color: #6b7280;
      border: 1px solid #e5e7eb;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s;
    `;

    // Accept button
    const acceptBtn = document.createElement('button');
    acceptBtn.id = 'cookie-accept-btn';
    acceptBtn.textContent = 'Accept';
    acceptBtn.style.cssText = `
      background: #16A34A;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s;
    `;

    buttonContainer.appendChild(declineBtn);
    buttonContainer.appendChild(acceptBtn);

    content.appendChild(text);
    content.appendChild(buttonContainer);

    card.appendChild(header);
    card.appendChild(content);
    banner.appendChild(card);

    // Add styles for animation and responsive behavior
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(100%);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      #cookie-accept-btn:hover {
        background: #15803D;
      }

      #cookie-decline-btn:hover {
        background: #f9fafb;
      }

      /* Responsive: compact card on larger screens */
      @media (min-width: 640px) {
        #cookie-consent-banner {
          left: 1rem;
          bottom: 1rem;
          right: auto;
          max-width: 300px;
          padding: 0;
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(banner);

    // Handle accept button
    acceptBtn.addEventListener('click', function() {
      setConsentStatus(CONSENT_VALUE_GRANTED);
      banner.style.animation = 'slideUp 0.3s ease-in reverse';
      setTimeout(() => banner.remove(), 300);
    });

    // Handle decline button
    declineBtn.addEventListener('click', function() {
      setConsentStatus(CONSENT_VALUE_DECLINED);
      banner.style.animation = 'slideUp 0.3s ease-in reverse';
      setTimeout(() => banner.remove(), 300);
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

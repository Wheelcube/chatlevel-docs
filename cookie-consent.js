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
   * Gets a cookie value by name
   */
  function getCookie(name) {
    try {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        return parts.pop().split(';').shift();
      }
      return null;
    } catch (e) {
      console.warn('Failed to read cookie:', e);
      return null;
    }
  }

  /**
   * Gets current consent status from localStorage or cookie
   */
  function getConsentStatus() {
    try {
      // Check localStorage first
      const localStorageValue = localStorage.getItem(CONSENT_KEY);
      if (localStorageValue) {
        return localStorageValue;
      }

      // Check cookie as fallback
      const cookieValue = getCookie(CONSENT_KEY);
      if (cookieValue) {
        return cookieValue;
      }

      return null;
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
   * Detects if dark mode is currently active
   */
  function isDarkMode() {
    // Check for dark mode class on html or body element
    if (document.documentElement.classList.contains('dark') ||
        document.body.classList.contains('dark')) {
      return true;
    }

    // Check for dark mode using media query
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true;
    }

    return false;
  }

  /**
   * Creates and shows the cookie consent banner
   */
  function showConsentBanner() {
    const darkMode = isDarkMode();

    // Define color schemes
    const colors = darkMode ? {
      cardBg: '#1f2937',
      cardBorder: '#374151',
      titleColor: '#f9fafb',
      textColor: '#d1d5db',
      linkColor: '#9ca3af',
      linkHoverColor: '#f9fafb',
      declineBg: 'transparent',
      declineBorder: '#4b5563',
      declineColor: '#d1d5db',
      declineHoverBg: '#374151'
    } : {
      cardBg: 'white',
      cardBorder: '#e5e5e5',
      titleColor: '#111827',
      textColor: '#4b5563',
      linkColor: '#4b5563',
      linkHoverColor: '#111827',
      declineBg: 'white',
      declineBorder: '#d1d5db',
      declineColor: '#374151',
      declineHoverBg: '#f9fafb'
    };

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
      background: ${colors.cardBg};
      border: 1px solid ${colors.cardBorder};
      border-radius: 0.5rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, ${darkMode ? '0.3' : '0.1'}), 0 4px 6px -2px rgba(0, 0, 0, ${darkMode ? '0.2' : '0.05'});
      padding: 1.5rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    `;

    // Create content wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 1rem;
    `;

    // Create text area
    const textArea = document.createElement('div');
    textArea.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    `;

    // Title
    const title = document.createElement('h3');
    title.textContent = 'Cookie Consent';
    title.style.cssText = `
      font-weight: 600;
      color: ${colors.titleColor};
      font-size: 1.125rem;
      margin: 0;
    `;

    // Description
    const description = document.createElement('p');
    description.id = 'cookie-consent-description';
    description.style.cssText = `
      color: ${colors.textColor};
      font-size: 0.875rem;
      line-height: 1.5;
      margin: 0;
    `;
    description.innerHTML = `We use cookies to improve your experience and analyze site usage. By clicking "Accept", you agree to our use of cookies for analytics. <a href="https://wheelcube.com/privacy-policy" target="_blank" rel="noopener noreferrer" style="text-decoration: underline; text-underline-offset: 2px; color: ${colors.linkColor}; transition: color 0.2s;">Learn more</a>`;

    textArea.appendChild(title);
    textArea.appendChild(description);

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    `;

    // Decline button
    const declineBtn = document.createElement('button');
    declineBtn.id = 'cookie-decline-btn';
    declineBtn.textContent = 'Decline';
    declineBtn.style.cssText = `
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      border: 1px solid ${colors.declineBorder};
      color: ${colors.declineColor};
      border-radius: 0.5rem;
      font-weight: 500;
      background: ${colors.declineBg};
      cursor: pointer;
      transition: background-color 0.2s;
      flex: 1;
    `;

    // Accept button with gradient
    const acceptBtn = document.createElement('button');
    acceptBtn.id = 'cookie-accept-btn';
    acceptBtn.textContent = 'Accept';
    acceptBtn.style.cssText = `
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      background: linear-gradient(to right, #22c55e, #4ade80);
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-position 600ms ease-in-out, transform 300ms;
      background-size: 200% 100%;
      background-position: 0% center;
      will-change: background-position, transform;
      flex: 1;
    `;

    buttonContainer.appendChild(declineBtn);
    buttonContainer.appendChild(acceptBtn);

    contentWrapper.appendChild(textArea);
    contentWrapper.appendChild(buttonContainer);
    card.appendChild(contentWrapper);
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
        background-position: 100% center !important;
      }

      #cookie-decline-btn:hover {
        background-color: ${colors.declineHoverBg} !important;
      }

      #cookie-consent-description a:hover {
        color: ${colors.linkHoverColor} !important;
      }

      /* Responsive: buttons horizontal on larger screens */
      @media (min-width: 640px) {
        #cookie-consent-banner > div > div > div:last-child {
          flex-direction: row;
        }

        #cookie-consent-banner {
          left: 1rem;
          bottom: 1rem;
          right: auto;
          max-width: 400px;
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

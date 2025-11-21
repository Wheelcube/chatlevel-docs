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
   * Sets a cookie with domain-level scope
   */
  function setCookie(name, value, days) {
    try {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      const expires = `expires=${date.toUTCString()}`;

      // Set cookie for entire .chatlevel.io domain
      document.cookie = `${name}=${value};${expires};domain=${COOKIE_DOMAIN};path=/;SameSite=Lax`;
      console.log(`Cookie set: ${name}=${value} for domain ${COOKIE_DOMAIN}`);
    } catch (e) {
      console.error('Failed to set cookie:', e);
    }
  }

  /**
   * Sets consent status in both localStorage and cookie
   */
  function setConsentStatus(value) {
    try {
      // Store in localStorage for quick access
      localStorage.setItem(CONSENT_KEY, value);

      // Store in cookie for domain-level sharing (365 days)
      setCookie(CONSENT_KEY, value, 365);

      console.log('Cookie consent set to:', value);

      // Initialize PostHog if consent is granted
      if (value === CONSENT_VALUE_GRANTED) {
        initializePostHog();
      }
    } catch (e) {
      console.error('Failed to set consent status:', e);
    }
  }

  /**
   * Initializes PostHog analytics
   */
  function initializePostHog() {
    // Check if PostHog is already loaded
    if (window.posthog && window.posthog.__loaded) {
      console.log('PostHog already initialized');
      return;
    }

    try {
      // PostHog initialization script
      !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

      window.posthog.init('phc_8s95aHTNzDk66PrTRsP2eb4WBkKZ3SixL7G3B45H3Al', {
        api_host: 'https://eu.i.posthog.com',
        person_profiles: 'identified_only',
        capture_pageview: true,
        capture_pageleave: true
      });

      console.log('PostHog initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PostHog:', error);
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
   * Checks multiple sources: data attributes, classes, and media queries
   */
  function isDarkMode() {
    // Check for dark mode via data-theme attribute (common in Mintlify)
    const htmlElement = document.documentElement;
    const bodyElement = document.body;

    console.log('Checking dark mode...');
    console.log('HTML data-theme:', htmlElement.getAttribute('data-theme'));
    console.log('Body data-theme:', bodyElement.getAttribute('data-theme'));
    console.log('HTML classes:', htmlElement.className);
    console.log('Body classes:', bodyElement.className);

    // Check data-theme attribute
    if (htmlElement.getAttribute('data-theme') === 'dark' ||
        bodyElement.getAttribute('data-theme') === 'dark') {
      console.log('Dark mode detected via data-theme');
      return true;
    }

    // Check for dark mode class on html or body element
    if (htmlElement.classList.contains('dark') ||
        bodyElement.classList.contains('dark')) {
      console.log('Dark mode detected via class');
      return true;
    }

    // Check for Mintlify-specific dark mode indicator
    const isDarkClass = htmlElement.className.includes('dark') ||
                        bodyElement.className.includes('dark');
    if (isDarkClass) {
      console.log('Dark mode detected via className string match');
      return true;
    }

    // Check computed background color as last resort
    const bgColor = window.getComputedStyle(htmlElement).backgroundColor;
    if (bgColor) {
      // Parse RGB values
      const match = bgColor.match(/\d+/g);
      if (match) {
        const [r, g, b] = match.map(Number);
        // If background is dark (low RGB values), assume dark mode
        const brightness = (r + g + b) / 3;
        console.log('Background brightness:', brightness, 'RGB:', r, g, b);
        if (brightness < 128) {
          console.log('Dark mode detected via background color');
          return true;
        }
      }
    }

    // Don't check system preference - it overrides the actual page theme
    // We should respect what Mintlify is actually displaying, not the OS preference

    console.log('Light mode detected (default)');
    return false;
  }

  /**
   * Gets color scheme based on current theme
   */
  function getColorScheme(darkMode) {
    return darkMode ? {
      cardBg: 'rgba(9, 9, 11, 0.95)',  // bg-card/95 with backdrop blur effect
      cardBorder: '#27272a',
      titleColor: '#fafafa',
      textColor: '#a1a1aa',  // text-muted-foreground
      linkColor: '#a1a1aa',
      linkHoverColor: '#fafafa',  // hover:text-foreground
      declineBg: 'rgba(39, 39, 42, 0.3)',  // dark:bg-input/30
      declineBorder: '#27272a',  // dark:border-input
      declineColor: '#fafafa',
      declineHoverBg: 'rgba(39, 39, 42, 0.5)'  // dark:hover:bg-input/50
    } : {
      cardBg: 'rgba(255, 255, 255, 0.95)',  // bg-background/95 with backdrop blur
      cardBorder: '#e4e4e7',
      titleColor: '#09090b',
      textColor: '#71717a',  // text-muted-foreground
      linkColor: '#71717a',
      linkHoverColor: '#09090b',  // hover:text-foreground
      declineBg: 'white',  // bg-background
      declineBorder: '#e4e4e7',
      declineColor: '#09090b',
      declineHoverBg: '#f4f4f5'  // hover:bg-accent
    };
  }

  /**
   * Updates banner theme dynamically
   */
  function updateBannerTheme(card, title, description, declineBtn, styleElement) {
    const darkMode = isDarkMode();
    const colors = getColorScheme(darkMode);

    // Update card styles
    card.style.background = colors.cardBg;
    card.style.borderColor = colors.cardBorder;
    card.style.boxShadow = `0 10px 15px -3px rgba(0, 0, 0, ${darkMode ? '0.3' : '0.1'}), 0 4px 6px -2px rgba(0, 0, 0, ${darkMode ? '0.2' : '0.05'})`;

    // Update text colors
    title.style.color = colors.titleColor;
    description.style.color = colors.textColor;

    // Update link color
    const link = description.querySelector('a');
    if (link) {
      link.style.color = colors.linkColor;
    }

    // Update decline button
    declineBtn.style.background = colors.declineBg;
    declineBtn.style.borderColor = colors.declineBorder;
    declineBtn.style.color = colors.declineColor;

    // Update hover styles
    styleElement.textContent = `
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

    console.log('Banner theme updated:', darkMode ? 'dark' : 'light');
  }

  /**
   * Creates and shows the cookie consent banner
   */
  function showConsentBanner() {
    const darkMode = isDarkMode();
    const colors = getColorScheme(darkMode);

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
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
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

    // Watch for theme changes and update banner dynamically
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' &&
            (mutation.attributeName === 'class' ||
             mutation.attributeName === 'data-theme' ||
             mutation.attributeName === 'style')) {
          updateBannerTheme(card, title, description, declineBtn, style);
        }
      });
    });

    // Observe changes to html and body elements
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style']
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style']
    });

    // Handle accept button
    acceptBtn.addEventListener('click', function() {
      observer.disconnect(); // Stop observing when banner is dismissed
      setConsentStatus(CONSENT_VALUE_GRANTED);
      banner.style.animation = 'slideUp 0.3s ease-in reverse';
      setTimeout(() => banner.remove(), 300);
    });

    // Handle decline button
    declineBtn.addEventListener('click', function() {
      observer.disconnect(); // Stop observing when banner is dismissed
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

      // Initialize PostHog if consent was granted
      if (currentConsent === CONSENT_VALUE_GRANTED) {
        initializePostHog();
      }

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

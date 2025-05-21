// Global state to track if Yandex Maps API is already loaded
let isYandexMapsLoaded = false;
let scriptLoadPromise = null;
const YANDEX_MAPS_API_KEY = 'f2749db0-14ee-4f82-b043-5bb8082c4aa9';

/**
 * Loads the Yandex Maps API and ensures it's only loaded once
 * @returns {Promise} Promise that resolves when the API is loaded
 */
export const loadYandexMapsApi = () => {
  // Return existing promise if script is already being loaded
  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  // If already loaded, return a resolved promise
  if (isYandexMapsLoaded || window.ymaps) {
    isYandexMapsLoaded = true;
    return Promise.resolve(window.ymaps);
  }

  // Create a new promise to load the script
  scriptLoadPromise = new Promise((resolve, reject) => {
    try {
      // Check if script is already in the document
      if (document.querySelector('script[src*="api-maps.yandex.ru"]')) {
        // Script tag exists but may not be fully loaded
        if (window.ymaps) {
          isYandexMapsLoaded = true;
          resolve(window.ymaps);
        } else {
          // Wait for existing script to load
          const checkYmaps = setInterval(() => {
            if (window.ymaps) {
              clearInterval(checkYmaps);
              isYandexMapsLoaded = true;
              resolve(window.ymaps);
            }
          }, 100);
          
          // Set a timeout to avoid infinite checking
          setTimeout(() => {
            clearInterval(checkYmaps);
            reject(new Error("Timeout waiting for Yandex Maps to load"));
          }, 10000);
        }
        return;
      }
      
      // Create and append the script
      const script = document.createElement('script');
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YANDEX_MAPS_API_KEY}&lang=ru_RU`;
      script.async = true;
      
      script.onload = () => {
        window.ymaps.ready(() => {
          isYandexMapsLoaded = true;
          resolve(window.ymaps);
        });
      };
      
      script.onerror = (error) => {
        scriptLoadPromise = null;
        reject(new Error("Failed to load Yandex Maps script: " + error));
      };
      
      document.body.appendChild(script);
    } catch (error) {
      scriptLoadPromise = null;
      reject(error);
    }
  });

  return scriptLoadPromise;
};

/**
 * Checks if Yandex Maps API is already loaded
 * @returns {boolean} true if loaded, false otherwise
 */
export const isYandexMapsApiLoaded = () => {
  return isYandexMapsLoaded || (typeof window !== 'undefined' && !!window.ymaps);
}; 
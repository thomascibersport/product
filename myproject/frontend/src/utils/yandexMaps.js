// Global state to track if Yandex Maps API is already loaded
let isYandexMapsLoaded = false;
let scriptLoadPromise = null;
const YANDEX_MAPS_API_KEY = 'f2749db0-14ee-4f82-b043-5bb8082c4aa9';

/**

 * @returns {Promise} 
 */
export const loadYandexMapsApi = () => {

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }


  if (isYandexMapsLoaded || window.ymaps) {
    isYandexMapsLoaded = true;
    return Promise.resolve(window.ymaps);
  }


  scriptLoadPromise = new Promise((resolve, reject) => {
    try {
      
      if (document.querySelector('script[src*="api-maps.yandex.ru"]')) {
       
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
          
          
          setTimeout(() => {
            clearInterval(checkYmaps);
            reject(new Error("Timeout waiting for Yandex Maps to load"));
          }, 10000);
        }
        return;
      }
      
      
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
 
 * @returns {boolean} 
 */
export const isYandexMapsApiLoaded = () => {
  return isYandexMapsLoaded || (typeof window !== 'undefined' && !!window.ymaps);
}; 
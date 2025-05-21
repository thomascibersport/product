import React, { useRef, useEffect, useState } from "react";
import { loadYandexMapsApi } from "../utils/yandexMaps";

const YandexAddressAutocomplete = ({ value, onChange }) => {
  const inputRef = useRef(null);
  const [suggestView, setSuggestView] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    // Use the shared utility to load Yandex Maps
    loadYandexMapsApi()
      .then((ymaps) => {
        if (!isMounted) return;
        
        // Create SuggestView once the API is loaded
        if (inputRef.current && !suggestView) {
          const newSuggestView = new ymaps.SuggestView(inputRef.current, {
            // Optional: You can add configuration here
          });
          setSuggestView(newSuggestView);
        }
      })
      .catch((error) => {
        console.error("Error loading Yandex Maps API:", error);
      });
    
    // Cleanup
    return () => {
      isMounted = false;
      if (suggestView) {
        // Destroy the suggest view if it exists
        try {
          suggestView.destroy();
        } catch (e) {
          console.warn("Error while destroying SuggestView:", e);
        }
      }
    };
  }, [suggestView]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={onChange}
      placeholder="Введите адрес доставки"
      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
    />
  );
};

export default YandexAddressAutocomplete;

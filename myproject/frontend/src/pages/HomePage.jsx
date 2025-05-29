import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import Cookies from "js-cookie";
import Header from "../components/Header";

const HomePage = () => {
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortOption, setSortOption] = useState(""); // Added for sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(12);
  const [categories, setCategories] = useState([]);
  // New state variables for location filtering
  const [cityFilter, setCityFilter] = useState("");
  const [maxDistance, setMaxDistance] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [userCity, setUserCity] = useState("");
  const [userAddress, setUserAddress] = useState("");
  const [cities, setCities] = useState([]);
  const [locationError, setLocationError] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [productCoordinates, setProductCoordinates] = useState({});
  const [manualLocationInput, setManualLocationInput] = useState("");
  const [isSettingManualLocation, setIsSettingManualLocation] = useState(false);
  const [showManualLocationInput, setShowManualLocationInput] = useState(false);
  // Add new state for API status
  const [yandexApiStatus, setYandexApiStatus] = useState(null);
  const [recipeProductIds, setRecipeProductIds] = useState([]);
  const [baseSearch, setBaseSearch] = useState("");
  const [fullSearch, setFullSearch] = useState("");

  // Yandex Geocoder API key
  const YANDEX_API_KEY = "f2749db0-14ee-4f82-b043-5bb8082c4aa9";

  // Function to truncate text to a specific length
  const truncateText = (text, maxLength = 18) => {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  // Function to check if Yandex API is available
  const checkYandexApiStatus = async () => {
    try {
      // Try making a simple request to check if API is accessible
      const testLocation = "Moscow";
      const response = await axios.get(
        `https://geocode-maps.yandex.ru/1.x/?apikey=${YANDEX_API_KEY}&format=json&geocode=${encodeURIComponent(testLocation)}&lang=ru_RU&results=1`
      );
      
      if (response.status === 200) {
        setYandexApiStatus("available");
        return true;
      } else {
        setYandexApiStatus("unavailable");
        return false;
      }
    } catch (error) {
      console.error("Error checking Yandex API status:", error);
      
      if (error.response && error.response.status === 403) {
        if (error.response.data && error.response.data.message === "Limit is exceeded") {
          setYandexApiStatus("limit_exceeded");
        } else {
          setYandexApiStatus("forbidden");
        }
      } else {
        setYandexApiStatus("error");
      }
      return false;
    }
  };

  // Function to get user's current location with high accuracy
  const getUserLocation = async () => {
    setLoadingLocation(true);
    setLocationError(null);
    
    // First check if API is available
    const isApiAvailable = await checkYandexApiStatus();
    if (!isApiAvailable) {
      let errorMsg = "API Яндекс.Карт недоступен. ";
      
      switch(yandexApiStatus) {
        case "limit_exceeded":
          errorMsg += "Превышен лимит запросов к API.";
          break;
        case "forbidden":
          errorMsg += "Доступ к API запрещен.";
          break;
        case "error":
          errorMsg += "Ошибка соединения с API.";
          break;
        default:
          errorMsg += "Пожалуйста, попробуйте позже.";
      }
      
      setLocationError(errorMsg);
      setLoadingLocation(false);
      return;
    }
    
    if (!navigator.geolocation) {
      setLocationError("Геолокация не поддерживается вашим браузером");
      setLoadingLocation(false);
      return;
    }
    
    // Request location with high accuracy
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log(`Got user location: lat=${latitude}, lon=${longitude}, accuracy=${position.coords.accuracy}m`);
        
        setUserLocation({ 
          latitude, 
          longitude,
          accuracy: position.coords.accuracy, // Store accuracy in meters
          isManual: false
        });
        
        // Reverse geocode to get detailed address using Yandex
        reverseGeocodeYandex(longitude, latitude);
        
        // Geocode all product addresses to calculate distances
        await geocodeAllProductAddresses(products);
        
        setLoadingLocation(false);
      },
      (error) => {
        console.error("Ошибка определения местоположения:", error);
        let errorMessage = "Не удалось определить ваше местоположение";
        
        // Provide more specific error messages
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Доступ к геолокации запрещен. Пожалуйста, разрешите доступ к местоположению в настройках браузера.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Информация о местоположении недоступна. Проверьте подключение к интернету или GPS.";
            break;
          case error.TIMEOUT:
            errorMessage = "Превышено время ожидания при определении местоположения.";
            break;
        }
        
        setLocationError(errorMessage);
        setLoadingLocation(false);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 0 
      }
    );
  };

  // Function to reverse geocode coordinates to get detailed address using Yandex Geocoder
  const reverseGeocodeYandex = async (longitude, latitude) => {
    try {
      console.log(`Reverse geocoding coordinates: lon=${longitude}, lat=${latitude}`);
      
      const response = await axios.get(
        `https://geocode-maps.yandex.ru/1.x/?apikey=${YANDEX_API_KEY}&format=json&geocode=${longitude},${latitude}&lang=ru_RU&results=1&kind=house`
      );
      
      if (!response.data || 
          !response.data.response || 
          !response.data.response.GeoObjectCollection || 
          !response.data.response.GeoObjectCollection.featureMember || 
          response.data.response.GeoObjectCollection.featureMember.length === 0) {
        console.log("No reverse geocoding results found");
        return;
      }
      
      const geoObject = response.data.response.GeoObjectCollection.featureMember[0].GeoObject;
      
      // Get formatted address
      if (geoObject.metaDataProperty && 
          geoObject.metaDataProperty.GeocoderMetaData && 
          geoObject.metaDataProperty.GeocoderMetaData.Address) {
        
        const address = geoObject.metaDataProperty.GeocoderMetaData.Address;
        
        // Get address components
        if (address.Components) {
          const components = address.Components;
          
          // Find city component
          const cityComponent = components.find(comp => 
            comp.kind === 'locality'
          );
          
          if (cityComponent) {
            setUserCity(cityComponent.name);
            console.log(`Set user city to: ${cityComponent.name}`);
          } else {
            // If no city found, try settlement
            const settlementComponent = components.find(comp => 
              comp.kind === 'locality' || comp.kind === 'area' || comp.kind === 'province'
            );
            
            if (settlementComponent) {
              setUserCity(settlementComponent.name);
              console.log(`Set user location to: ${settlementComponent.name} (fallback)`);
            } else {
              setUserCity("Город не определен");
              console.log("Could not determine city from components");
            }
          }
        }
      }
    } catch (error) {
      console.error("Error reverse geocoding with Yandex:", error);
      
      if (error.response && error.response.status === 403) {
        if (error.response.data && error.response.data.message === "Limit is exceeded") {
          setYandexApiStatus("limit_exceeded");
          setLocationError("Превышен лимит запросов к API Яндекс.Карт.");
        } else {
          setYandexApiStatus("forbidden");
          setLocationError("Доступ к API Яндекс.Карт запрещен.");
        }
      }
      
      setUserCity("Город не определен");
    }
  };

  // Function to geocode an address to coordinates using Yandex Geocoder
  const geocodeAddressYandex = async (address) => {
    if (!address) {
      console.log("Empty address provided for geocoding");
      return null;
    }

    try {
      console.log(`Geocoding address: ${address}`);
      const response = await axios.get(
        `https://geocode-maps.yandex.ru/1.x/?apikey=${YANDEX_API_KEY}&format=json&geocode=${encodeURIComponent(address)}&lang=ru_RU&results=1`
      );
      
      if (!response.data || 
          !response.data.response || 
          !response.data.response.GeoObjectCollection || 
          !response.data.response.GeoObjectCollection.featureMember || 
          response.data.response.GeoObjectCollection.featureMember.length === 0) {
        console.log("No geocoding results found for address:", address);
        return null;
      }
      
      const geoObject = response.data.response.GeoObjectCollection.featureMember[0].GeoObject;
      
      // Get precision level
      let precision = null;
      if (geoObject.metaDataProperty && 
          geoObject.metaDataProperty.GeocoderMetaData && 
          geoObject.metaDataProperty.GeocoderMetaData.precision) {
        precision = geoObject.metaDataProperty.GeocoderMetaData.precision;
      }
      
      if (geoObject.Point && geoObject.Point.pos) {
        const [longitude, latitude] = geoObject.Point.pos.split(' ').map(parseFloat);
        
        if (isNaN(latitude) || isNaN(longitude)) {
          console.error("Invalid coordinates received from Yandex:", geoObject.Point.pos);
          return null;
        }
        
        console.log(`Geocoded coordinates: lat=${latitude}, lon=${longitude}, precision=${precision}`);
        return {
          latitude,
          longitude,
          precision
        };
      } else {
        console.error("No Point data in geocoding response for address:", address);
      }
    } catch (error) {
      console.error("Error geocoding address with Yandex:", error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
    }
    return null;
  };

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    // Validate inputs
    if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || 
        typeof lat2 !== 'number' || typeof lon2 !== 'number' ||
        isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
      console.error(`Invalid coordinates for distance calculation: (${lat1}, ${lon1}) to (${lat2}, ${lon2})`);
      return null;
    }
    
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    
    if (isNaN(distance)) {
      console.error(`Distance calculation returned NaN for coordinates: (${lat1}, ${lon1}) to (${lat2}, ${lon2})`);
      return null;
    }
    
    return distance;
  };

  // Calculate distances for all products
  const calculateProductDistances = (userLat, userLon) => {
    if (!userLat || !userLon) return;
    
    console.log("Calculating distances with user location:", userLat, userLon);
    
    const updatedProducts = products.map(product => {
      const coords = productCoordinates[product.id];
      if (coords && coords.latitude && coords.longitude) {
        const distance = calculateDistance(
          userLat,
          userLon,
          coords.latitude,
          coords.longitude
        );
        
        console.log(`Product ${product.id} (${product.name}) distance: ${distance} km`);
        
        return {
          ...product,
          distance: distance !== null ? Math.round(distance * 10) / 10 : null
        };
      }
      return {
        ...product,
        distance: null
      };
    });
    
    setProducts(updatedProducts);
    applyFilters(updatedProducts);
  };

  // Geocode all product addresses using Yandex - only when explicitly requested
  const geocodeAllProductAddresses = async (products) => {
    // Check API status first
    const isApiAvailable = await checkYandexApiStatus();
    if (!isApiAvailable) {
      console.log("Yandex API is not available, skipping address geocoding");
      return productCoordinates;
    }
    
    const coordinates = { ...productCoordinates };
    console.log("Starting geocoding for", products.length, "products");
    
    // Process products in batches to avoid overwhelming the geocoding service
    const batchSize = 5;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      
      // Process each product in the batch
      await Promise.all(batch.map(async (product) => {
        // Skip if we already have coordinates for this product
        if (coordinates[product.id] && 
            coordinates[product.id].latitude && 
            coordinates[product.id].longitude) {
          console.log(`Product ${product.id} already has coordinates, skipping`);
          return;
        }
        
        if (product.seller_address) {
          console.log(`Geocoding address for product ${product.id}: ${product.seller_address}`);
          try {
            const coords = await geocodeAddressYandex(product.seller_address);
            if (coords && coords.latitude && coords.longitude) {
              console.log(`Got coordinates for product ${product.id}:`, coords);
              coordinates[product.id] = coords;
            } else {
              console.log(`Failed to get coordinates for product ${product.id}`);
            }
          } catch (error) {
            console.error(`Error geocoding product ${product.id}:`, error);
          }
        }
      }));
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < products.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log("Finished geocoding, found coordinates for", 
                Object.keys(coordinates).length, 
                "products");
    
    setProductCoordinates(coordinates);
    
    // If user location is available, calculate distances
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      console.log("User location available, calculating distances");
      calculateProductDistances(userLocation.latitude, userLocation.longitude);
    } else {
      console.log("No user location available, skipping distance calculation");
    }
    
    return coordinates;
  };

  // Extract only city, village or settlement from product address
  const parseSellerAddress = (address) => {
    if (!address) return { city: "Город не указан" };
    
    // Remove country prefix if present
    const addressWithoutCountry = address.replace(/^Россия,?\s*/i, '').trim();
    
    // Split address into parts
    const addressParts = addressWithoutCountry.split(',').map(part => part.trim());
    
    // Special handling for addresses with format "Республика X (Y), City, ..."
    if (addressParts.length > 1) {
      const firstPart = addressParts[0];
      if (firstPart.match(/Республика|Респ\.|край|область|обл\.|автономный округ|АО/i)) {
        // The city is likely in the second part
        const secondPart = addressParts[1];
        // Make sure it's not a street
        if (secondPart && !secondPart.match(/улица|ул\.|проспект|пр\.|бульвар|б-р|шоссе|ш\.|переулок|пер\.|проезд/i)) {
          // Clean any city prefixes
          const cleanedCity = secondPart
            .replace(/^(?:г\.|город|г)\s+/i, '')  // Remove city prefix if present
            .trim();
          if (cleanedCity) {
            return { city: cleanedCity };
          }
        }
      }
    }
    
    // Continue with other patterns...
    // Match city with explicit prefix
    const cityPrefixMatch = addressWithoutCountry.match(/(?:г\.|город|г)\s+([\wа-яА-ЯёЁ\-]+(?:\s+[\wа-яА-ЯёЁ\-]+){0,2})/i);
    if (cityPrefixMatch) {
      return { city: cityPrefixMatch[1] };
    }
    
    // Match village with explicit prefix
    const villagePrefixMatch = addressWithoutCountry.match(/(?:с\.|село|с)\s+([\wа-яА-ЯёЁ\-]+(?:\s+[\wа-яА-ЯёЁ\-]+){0,2})/i);
    if (villagePrefixMatch) {
      return { city: villagePrefixMatch[1] };
    }
    
    // Match settlement with explicit prefix
    const settlementPrefixMatch = addressWithoutCountry.match(/(?:п\.|поселок|пос|п\.г\.т\.|пгт)\s+([\wа-яА-ЯёЁ\-]+(?:\s+[\wа-яА-ЯёЁ\-]+){0,2})/i);
    if (settlementPrefixMatch) {
      return { city: settlementPrefixMatch[1] };
    }
    
    // Handle addresses with administrative regions
    // Pattern to match republic/region and then extract the city
    const adminRegionPattern = /(?:Республика|Респ\.|край|область|обл\.|автономный округ|АО)\s+[^,]+,\s+(?:г\.|город|г)?\s*([а-яА-ЯёЁ\-]+(?:\s+[а-яА-ЯёЁ\-]+){0,2})/i;
    const adminRegionMatch = addressWithoutCountry.match(adminRegionPattern);
    if (adminRegionMatch) {
      return { city: adminRegionMatch[1] };
    }
    
    // Check for known large cities directly in any part
    for (const part of addressParts) {
      const largeCityMatch = part.match(/^(?:г\.|город|г)?\s*(Москва|Санкт-Петербург|Казань|Новосибирск|Екатеринбург|Нижний Новгород|Челябинск|Омск|Самара|Ростов-на-Дону|Уфа|Красноярск|Воронеж|Пермь|Волгоград)$/i);
      if (largeCityMatch) {
        return { city: largeCityMatch[1] };
      }
    }
    
    // For addresses with multiple parts, process each part
    for (let i = 0; i < addressParts.length; i++) {
      // Skip parts that look like administrative regions
      if (addressParts[i].match(/(?:Республика|Респ\.|край|область|обл\.|автономный округ|АО|\([^)]+\))/i)) {
        continue;
      }
      
      // Skip parts that look like street addresses
      if (addressParts[i].match(/(?:улица|ул\.|проспект|пр\.|бульвар|б-р|шоссе|ш\.|переулок|пер\.|проезд)/i)) {
        continue;
      }
      
      // Skip parts that are just numbers (building/apartment numbers)
      if (addressParts[i].match(/^\d+$/)) {
        continue;
      }
      
      // This part is likely to be a city/town/village
      // Remove any directional prefixes or building numbers if they slipped through
      const cleanedPart = addressParts[i]
        .replace(/^\d+\s*/, '')  // Remove leading numbers
        .replace(/^(?:г\.|город|г|с\.|село|с|п\.|поселок|пос|пгт)\s+/i, '')  // Remove location type prefixes
        .trim();
      
      if (cleanedPart) {
        return { city: cleanedPart };
      }
    }
    
    // Fallback: just use the first non-empty part if we couldn't find anything better
    for (const part of addressParts) {
      if (part && !part.match(/(?:Республика|Респ\.|край|область|обл\.|автономный округ|АО|\([^)]+\))/i)) {
        return { city: part };
      }
    }
    
    // Ultimate fallback
    return { city: "Город не указан" };
  };

  // Функция для упрощения названия продукта (удаляет окончания множественного числа)
  // Должна совпадать с той же функцией в AssistantPage
  const simplifyProductName = (name) => {
    if (!name) return "";
    
    // Преобразуем в нижний регистр
    let simpleName = name.toLowerCase();
    
    // Удаляем окончания множественного числа и прочие вариации
    const endings = ['ы', 'и', 'а', 'я', 'ов', 'ей'];
    
    // Проверяем каждое окончание
    for (const ending of endings) {
      if (simpleName.endsWith(ending) && simpleName.length > ending.length + 3) {
        // Удаляем окончание только если оставшееся слово достаточно длинное
        return simpleName.slice(0, -ending.length);
      }
    }
    
    return simpleName;
  };

  // Function to get query parameters from URL
  const getQueryParam = (param) => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get(param);
  };

  useEffect(() => {
    const token = Cookies.get("token");
    const config = token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : {};

    // Check for search parameters in URL
    const searchFromUrl = getQueryParam("search");
    const baseSearchFromUrl = getQueryParam("base_search");
    const fullSearchFromUrl = getQueryParam("full_search");
    
    // Set search states
    if (searchFromUrl) {
      setSearchTerm(searchFromUrl);
    }
    
    if (baseSearchFromUrl) {
      setBaseSearch(baseSearchFromUrl);
    }
    
    if (fullSearchFromUrl) {
      setFullSearch(fullSearchFromUrl);
      // Also set the displayed search term to the full product name
      setSearchTerm(fullSearchFromUrl);
    }

    // Still keep recipe product IDs for backward compatibility
    const productIdsFromUrl = getQueryParam("product_ids");
    let idsArray = [];
    if (productIdsFromUrl) {
      idsArray = productIdsFromUrl.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
      setRecipeProductIds(idsArray);
    } else {
      setRecipeProductIds([]);
    }

    // Fetch categories
    axios
      .get("http://localhost:8000/api/categories/", config)
      .then((response) => {
        setCategories(response.data);
      })
      .catch((err) => {
        console.error("Ошибка загрузки категорий:", err);
      });

    // Fetch products
    axios
      .get("http://localhost:8000/api/products/", config)
      .then((response) => {
        const fetchedProducts = response.data;
        setProducts(fetchedProducts);
        
        // Apply filtering based on URL parameters
        let filtered = fetchedProducts;
        
        // Filter by recipe product IDs if present
        if (idsArray && idsArray.length > 0) {
          filtered = filtered.filter(
            product => idsArray.includes(product.id)
          );
        } 
        // Advanced search with base form for similar product names
        else if (baseSearchFromUrl) {
          filtered = filtered.filter((product) => {
            // Simplify the product name in the same way
            const simplifiedName = simplifyProductName(product.name);
            
            // Check if simplified name contains the base search term
            return simplifiedName.includes(baseSearchFromUrl.toLowerCase());
          });
        }
        // Regular search term if present (fallback)
        else if (searchFromUrl) {
          filtered = filtered.filter((product) =>
            product.name.toLowerCase().includes(searchFromUrl.toLowerCase())
          );
        }
        
        setFilteredProducts(filtered);
        
        setLoading(false);
        
        // Extract unique cities from products
        const uniqueCities = [...new Set(
          fetchedProducts
            .map(product => {
              // Extract city from seller_address using the same function
              if (product.seller_address) {
                const { city } = parseSellerAddress(product.seller_address);
                return city;
              }
              return null;
            })
            .filter(city => city) // Filter out null cities
        )].sort(); // Sort alphabetically
        
        setCities(uniqueCities);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
      
    // Check initial API status without making geocoding requests
    checkYandexApiStatus();
  }, [location.search]); // Add location.search to dependencies

  useEffect(() => {
    if (recipeProductIds.length === 0) {
      applyFilters();
    }
  }, [
    searchTerm,
    categoryFilter,
    deliveryFilter,
    minRating,
    minPrice,
    maxPrice,
    sortOption,
    cityFilter,
    maxDistance,
    userLocation,
  ]);

  // Effect to recalculate distances when userLocation or productCoordinates change
  useEffect(() => {
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      console.log("User location changed, recalculating distances");
      calculateProductDistances(userLocation.latitude, userLocation.longitude);
    }
  }, [userLocation, productCoordinates]);

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct
  );

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Extract city from address for display
  const getCityFromAddress = (address) => {
    if (!address) return "Город не указан";
    const { city } = parseSellerAddress(address);
    return city;
  };

  // Function to handle manual location setting
  const setManualLocation = async () => {
    if (!manualLocationInput.trim()) {
      setLocationError("Пожалуйста, введите адрес");
      return;
    }

    // Check API status first
    const isApiAvailable = await checkYandexApiStatus();
    if (!isApiAvailable) {
      let errorMsg = "API Яндекс.Карт недоступен. ";
      
      switch(yandexApiStatus) {
        case "limit_exceeded":
          errorMsg += "Превышен лимит запросов к API.";
          break;
        case "forbidden":
          errorMsg += "Доступ к API запрещен.";
          break;
        default:
          errorMsg += "Пожалуйста, попробуйте позже.";
      }
      
      setLocationError(errorMsg);
      return;
    }

    setIsSettingManualLocation(true);
    setLocationError(null);
    
    try {
      console.log(`Geocoding manual address: ${manualLocationInput}`);
      const coords = await geocodeAddressYandex(manualLocationInput);
      
      if (coords && coords.latitude && coords.longitude) {
        console.log(`Manual location coordinates: lat=${coords.latitude}, lon=${coords.longitude}`);
        
        // Set user location
        setUserLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
          isManual: true
        });
        
        // Reverse geocode to get city name
        reverseGeocodeYandex(coords.longitude, coords.latitude);
        
        // Geocode all product addresses to calculate distances
        await geocodeAllProductAddresses(products);
        
        // Clear input field after successful location setting
        setManualLocationInput("");
        // Hide the manual input form
        setShowManualLocationInput(false);
      } else {
        setLocationError("Не удалось определить координаты по указанному адресу");
      }
    } catch (error) {
      console.error("Error setting manual location:", error);
      
      if (error.response && error.response.status === 403) {
        if (error.response.data && error.response.data.message === "Limit is exceeded") {
          setYandexApiStatus("limit_exceeded");
          setLocationError("Превышен лимит запросов к API Яндекс.Карт.");
        } else {
          setYandexApiStatus("forbidden");
          setLocationError("Доступ к API Яндекс.Карт запрещен.");
        }
      } else {
        setLocationError("Ошибка при установке местоположения");
      }
    } finally {
      setIsSettingManualLocation(false);
    }
  };

  // Function to clear user location
  const clearUserLocation = () => {
    setUserLocation(null);
    setUserCity("");
    setLocationError(null);
    setShowManualLocationInput(false);
    
    // Reset products with distance data
    setProducts(products.map(product => ({
      ...product,
      distance: null
    })));
    
    // Reapply filters without distance filtering
    applyFilters();
  };

  // Apply all current filters to products
  const applyFilters = (productsToFilter = products) => {
    // If we have recipe product IDs, filter by those IDs
    if (recipeProductIds.length > 0) {
      const filtered = productsToFilter.filter(
        product => recipeProductIds.includes(product.id)
      );
      setFilteredProducts(filtered);
      return;
    }
    
    let filtered = [...productsToFilter];

    // Advanced search with base form for similar product names
    if (baseSearch) {
      filtered = filtered.filter((product) => {
        // Simplify the product name in the same way
        const simplifiedName = simplifyProductName(product.name);
        // Check if simplified name contains the base search term
        return simplifiedName.includes(baseSearch.toLowerCase());
      });
    }
    // Regular search term
    else if (searchTerm) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (categoryFilter) {
      filtered = filtered.filter(
        (product) => product.category?.id === parseInt(categoryFilter)
      );
    }

    // Filter by delivery
    if (deliveryFilter) {
      filtered = filtered.filter((product) => product.delivery_available);
    }

    // Filter by minimum rating
    if (minRating > 0) {
      filtered = filtered.filter(
        (product) => (product.farmer?.average_rating ?? 0) >= minRating
      );
    }

    // Filter by price range
    if (minPrice) {
      filtered = filtered.filter(
        (product) => product.price >= parseFloat(minPrice)
      );
    }
    if (maxPrice) {
      filtered = filtered.filter(
        (product) => product.price <= parseFloat(maxPrice)
      );
    }
    
    // Filter by city
    if (cityFilter) {
      filtered = filtered.filter((product) => {
        if (!product.seller_address) return false;
        const { city } = parseSellerAddress(product.seller_address);
        return city.toLowerCase().includes(cityFilter.toLowerCase());
      });
    }
    
    // Filter by distance if user location is available
    if (userLocation && maxDistance) {
      filtered = filtered.filter((product) => {
        // Check if distance is available and is a number
        return typeof product.distance === 'number' && 
               !isNaN(product.distance) && 
               product.distance <= parseFloat(maxDistance);
      });
    }

    // Sorting
    if (sortOption === "priceAsc") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortOption === "priceDesc") {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortOption === "ratingDesc") {
      filtered.sort(
        (a, b) =>
          (b.farmer?.average_rating ?? 0) - (a.farmer?.average_rating ?? 0)
      );
    } else if (sortOption === "distanceAsc" && userLocation) {
      filtered.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    }

    setFilteredProducts(filtered);
    setCurrentPage(1);
  };

  // Add function to clear recipe product filter
  const clearRecipeProductFilter = () => {
    setRecipeProductIds([]);
    // Reset URL without the query parameter
    window.history.replaceState({}, document.title, window.location.pathname);
    applyFilters(products);
  };

  // Add function to clear search filter
  const clearSearchFilter = () => {
    setSearchTerm("");
    // Reset URL without the query parameter
    window.history.replaceState({}, document.title, window.location.pathname);
    applyFilters(products);
  };

  // Add function to clear advanced search filter
  const clearAdvancedSearchFilter = () => {
    setSearchTerm("");
    setBaseSearch("");
    setFullSearch("");
    // Reset URL without the query parameters
    window.history.replaceState({}, document.title, window.location.pathname);
    applyFilters(products);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-8 text-center">
          🛍️ Все товары
        </h1>

        {/* Recipe Product Filter Notice */}
        {recipeProductIds.length > 0 && (
          <div className="mb-6 bg-blue-100 dark:bg-blue-900 p-4 rounded-lg text-center">
            <p className="text-blue-700 dark:text-blue-300 font-medium">
              Показаны только продукты из рецепта ({filteredProducts.length})
            </p>
            <button
              onClick={clearRecipeProductFilter}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Показать все продукты
            </button>
          </div>
        )}

        {/* Advanced Search Filter Notice */}
        {(baseSearch || fullSearch) && recipeProductIds.length === 0 && (
          <div className="mb-6 bg-blue-100 dark:bg-blue-900 p-4 rounded-lg text-center">
            <p className="text-blue-700 dark:text-blue-300 font-medium">
              Показаны все варианты продукта: <strong>{fullSearch || baseSearch}</strong> ({filteredProducts.length})
            </p>
            <button
              onClick={clearAdvancedSearchFilter}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Показать все продукты
            </button>
          </div>
        )}

        {/* Regular Search Filter Notice - only show if not using advanced search */}
        {searchTerm && !baseSearch && !fullSearch && getQueryParam("search") && recipeProductIds.length === 0 && (
          <div className="mb-6 bg-blue-100 dark:bg-blue-900 p-4 rounded-lg text-center">
            <p className="text-blue-700 dark:text-blue-300 font-medium">
              Показаны результаты поиска для: <strong>{searchTerm}</strong> ({filteredProducts.length})
            </p>
            <button
              onClick={clearSearchFilter}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Показать все продукты
            </button>
          </div>
        )}

        {/* Filters and Search - Only show if not filtering by recipe product */}
        {recipeProductIds.length === 0 && (
          <div className="mb-8 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Поле поиска */}
              <input
                type="text"
                placeholder="Поиск по названию"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 p-2 border rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 border-gray-300 dark:border-gray-600"
              />
              {/* Выбор категории */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="p-2 border rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600"
              >
                <option value="">Все категории</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {/* Чекбокс доставки */}
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={deliveryFilter}
                  onChange={(e) => setDeliveryFilter(e.target.checked)}
                  className="form-checkbox"
                />
                <span className="text-gray-700 dark:text-white">
                  Только с доставкой
                </span>
              </label>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              {/* Минимальная цена */}
              <input
                type="number"
                placeholder="Мин. цена"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="p-2 border rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 border-gray-300 dark:border-gray-600"
              />
              {/* Максимальная цена */}
              <input
                type="number"
                placeholder="Макс. цена"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="p-2 border rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 border-gray-300 dark:border-gray-600"
              />
              {/* Минимальный рейтинг */}
              <select
                value={minRating}
                onChange={(e) => setMinRating(parseInt(e.target.value))}
                className="p-2 border rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600"
              >
                <option value="0">Любой рейтинг</option>
                <option value="1">1+ звезда</option>
                <option value="2">2+ звезды</option>
                <option value="3">3+ звезды</option>
                <option value="4">4+ звезды</option>
                <option value="5">5 звезд</option>
              </select>
              {/* Сортировка */}
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="p-2 border rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600"
              >
                <option value="">Сортировка</option>
                <option value="priceAsc">Цена: по возрастанию</option>
                <option value="priceDesc">Цена: по убыванию</option>
                <option value="ratingDesc">Рейтинг: по убыванию</option>
                {userLocation && <option value="distanceAsc">Расстояние: ближайшие</option>}
              </select>
            </div>
            
            {/* Location filters */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* City filter */}
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="p-2 border rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600"
              >
                <option value="">Все города</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              
              {/* Distance filter */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Макс. расстояние (км)"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(e.target.value)}
                  disabled={!userLocation}
                  className="p-2 border rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 border-gray-300 dark:border-gray-600"
                />
                <button
                  onClick={getUserLocation}
                  disabled={loadingLocation}
                  className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  {loadingLocation ? "Определение..." : "Моё местоположение"}
                </button>
                
                {/* Icon for manual location input - Fix the emoji */}
                <button
                  onClick={() => setShowManualLocationInput(!showManualLocationInput)}
                  className={`p-2 text-sm rounded transition-colors ${
                    showManualLocationInput 
                    ? "bg-blue-500 text-white hover:bg-blue-600" 
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                  title="Указать местоположение вручную"
                >
                  Вручную
                </button>
              </div>
            </div>
            
            {/* Location status with larger font */}
            {userLocation && !locationError && (
              <div className="mt-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    <span className="text-blue-500 text-xl mr-1">📍</span>
                    <span className="text-lg font-medium text-gray-800 dark:text-gray-200">
                      Ваше местоположение: <span className="text-blue-600 dark:text-blue-400 font-semibold">{userCity || "Город не определен"}</span>
                    </span>
                  </div>
                  {userLocation.isManual && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Вручную</span>
                  )}
                  {!userLocation.isManual && (
                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">Автоматически</span>
                  )}
                  <button 
                    onClick={clearUserLocation}
                    className="text-red-600 text-xs hover:underline"
                  >
                    Сбросить
                  </button>
                </div>
              </div>
            )}
            
            {/* Error display */}
            {locationError && (
              <div className="text-red-500 text-sm mt-2">{locationError}</div>
            )}
            
            {/* Manual location input (shown only when icon is clicked) */}
            {showManualLocationInput && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  placeholder="Введите адрес (город, улица)"
                  value={manualLocationInput}
                  onChange={(e) => setManualLocationInput(e.target.value)}
                  className="flex-1 p-2 border rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 border-gray-300 dark:border-gray-600"
                />
                <button
                  onClick={setManualLocation}
                  disabled={isSettingManualLocation || !manualLocationInput.trim()}
                  className="p-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:bg-gray-400"
                >
                  {isSettingManualLocation ? "Установка..." : "Установить"}
                </button>
                <button
                  onClick={() => setShowManualLocationInput(false)}
                  className="p-2 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                  title="Закрыть"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl">
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
                </div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="inline-block bg-red-100 dark:bg-red-900/20 p-8 rounded-2xl shadow-xl">
              <div className="text-6xl mb-4">⚠️</div>
              <p className="text-xl text-red-600 dark:text-red-400">
                Ошибка загрузки: {error}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {currentProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className={`group bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 ${
                    product.quantity === 0 ? 'opacity-75' : ''
                  }`}
                >
                  <div className="relative mb-4 overflow-hidden rounded-xl">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-48 object-contain transform transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 flex items-center justify-center rounded-xl">
                        <span className="text-gray-400">
                          🖼️ Нет изображения
                        </span>
                      </div>
                    )}
                    {product.quantity === 0 && (
                      <div className="absolute top-0 right-0 bg-red-500 text-white px-3 py-1 rounded-bl-xl">
                        Нет в наличии
                      </div>
                    )}
                    {product.quantity > 0 && product.quantity <= 5 && (
                      <div className="absolute top-0 right-0 bg-orange-500 text-white px-3 py-1 rounded-bl-xl">
                        Осталось: {product.quantity} шт.
                      </div>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 truncate">
                    {product.name}
                  </h2>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 rounded-full text-sm">
                        {product.category
                          ? product.category.name
                          : "Без категории"}
                      </span>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {product.price} ₽
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[150px]">
                        {truncateText(product.farmer_name || "Неизвестный продавец")}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        Рейтинг:{" "}
                        {(product.farmer?.average_rating || 0).toFixed(1)} ⭐
                      </span>
                    </div>
                    {/* Display location info */}
                    {product.seller_address && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <div className="flex justify-between items-center">
                          <span className="truncate max-w-[70%]">
                            📍 {getCityFromAddress(product.seller_address)}
                          </span>
                          {product.distance && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              {product.distance} км
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            <div className="flex justify-center mt-8">
              {Array.from(
                {
                  length: Math.ceil(filteredProducts.length / productsPerPage),
                },
                (_, i) => (
                  <button
                    key={i}
                    onClick={() => paginate(i + 1)}
                    className={`mx-1 px-3 py-1 rounded ${
                      currentPage === i + 1
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                    }`}
                  >
                    {i + 1}
                  </button>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HomePage;

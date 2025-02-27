import React, { useEffect, useRef, useCallback, useState } from "react";
import YandexMapLoader from "./YandexMapLoader";
import MapStore from "../utils/MapStore";
import throttle from "lodash.throttle";

function InteractiveMap({
  currentLocation,
  selectedPoint,
  isSettingLocation,
  isNavigationMode,
  userHeading, // Оставлен для совместимости, но не используется
  onSetCurrentLocation,
  onPointSelected,
  onRouteDetails,
}) {
  const mapContainerRef = useRef(null);
  const multiRouteRef = useRef(null);
  const selectedPointRef = useRef(null);
  const currentPlacemarkRef = useRef(null);
  const isSettingLocationRef = useRef(isSettingLocation);
  const [warehouses, setWarehouses] = useState([]);

  // Синхронизация рефа с пропсом isSettingLocation
  useEffect(() => {
    isSettingLocationRef.current = isSettingLocation;
  }, [isSettingLocation]);

  // Получение данных о складах с сервера
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const response = await fetch("/api/warehouses/", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await response.json();
        setWarehouses(data);
      } catch (error) {
        console.error("Ошибка при получении складов:", error);
      }
    };
    fetchWarehouses();
  }, []);

  // Обновление маркера текущего местоположения
  const updateCurrentPositionMarker = useCallback(
    (map) => {
      if (!currentLocation) return;

      if (currentPlacemarkRef.current) {
        currentPlacemarkRef.current.geometry.setCoordinates(currentLocation);
      } else {
        currentPlacemarkRef.current = new window.ymaps.Placemark(
          currentLocation,
          { hintContent: "Ваше местоположение" },
          {
            preset: "islands#blueCircleIcon",
            iconColor: "#3b82f6",
            draggable: false,
          }
        );
      }

      if (map.geoObjects.indexOf(currentPlacemarkRef.current) === -1) {
        map.geoObjects.add(currentPlacemarkRef.current);
      }
    },
    [currentLocation]
  );

  // Добавление точки назначения
  const addPoint = useCallback((map, coords) => {
    if (selectedPointRef.current) {
      map.geoObjects.remove(selectedPointRef.current);
    }

    const placemark = new window.ymaps.Placemark(
      coords,
      { hintContent: "Конечная точка", balloonContent: "Точка назначения" },
      { preset: "islands#redIcon" }
    );

    map.geoObjects.add(placemark);
    selectedPointRef.current = placemark;
  }, []);

  // Построение маршрута с использованием API Qwen
  const buildRoute = useCallback(
    throttle(async (map, endPoint) => {
      if (!currentLocation || !window.ymaps) return;

      if (multiRouteRef.current) {
        map.geoObjects.remove(multiRouteRef.current);
        multiRouteRef.current = null;
      }

      const multiRoute = new window.ymaps.multiRouter.MultiRoute(
        {
          referencePoints: [currentLocation, endPoint],
          params: {
            avoidTrafficJams: true,
            results: 3,
          },
        },
        {
          boundsAutoApply: true,
          routeActiveStrokeWidth: 5,
          routeActiveStrokeColor: "#3b82f6",
          routeStrokeStyle: "solid",
          routeStrokeWidth: 3,
        }
      );

      multiRoute.model.events.add("requestsuccess", async () => {
        const routes = multiRoute.getRoutes();
        if (routes.getLength() > 0) {
          const routeData = [];
          for (let i = 0; i < routes.getLength(); i++) {
            const route = routes.get(i);
            const distance = route.properties.get("distance").text;
            const duration = route.properties.get("duration").text;
            routeData.push(
              `Маршрут ${i + 1}: расстояние ${distance}, время ${duration}.`
            );
          }

          const prompt = `У меня есть следующие маршруты:\n${routeData.join(
            "\n"
          )}\nКакой из них самый быстрый и оптимальный?`;

          try {
            const response = await fetch(
              "https://openrouter.ai/api/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization:
                    "Bearer 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",
                },
                body: JSON.stringify({
                  model: "qwen/qwen-vl-plus:free",
                  messages: [{ role: "user", content: prompt }],
                }),
              }
            );

            if (!response.ok) throw new Error("Ошибка при запросе к API Qwen");

            const data = await response.json();
            const answer = data.choices[0].message.content.trim();
            const match = answer.match(/маршрут (\d)/i);

            if (match) {
              const routeIndex = parseInt(match[1], 10) - 1;
              if (routeIndex >= 0 && routeIndex < routes.getLength()) {
                const optimalRoute = routes.get(routeIndex);
                multiRoute.setActiveRoute(optimalRoute);
                onRouteDetails({
                  distance: optimalRoute.properties.get("distance").text,
                  duration: optimalRoute.properties.get("duration").text,
                });
              } else {
                throw new Error("Некорректный номер маршрута в ответе");
              }
            } else {
              throw new Error("Не удалось извлечь номер маршрута из ответа");
            }
          } catch (error) {
            console.error("Ошибка при работе с API Qwen:", error);
            let optimalRoute = routes.get(0);
            let minDuration = optimalRoute.properties.get("duration").value;

            for (let i = 1; i < routes.getLength(); i++) {
              const route = routes.get(i);
              const duration = route.properties.get("duration").value;
              if (duration < minDuration) {
                minDuration = duration;
                optimalRoute = route;
              }
            }

            multiRoute.setActiveRoute(optimalRoute);
            onRouteDetails({
              distance: optimalRoute.properties.get("distance").text,
              duration: optimalRoute.properties.get("duration").text,
            });
          }
        } else {
          onRouteDetails({ error: "Маршрут не найден" });
        }
      });

      map.geoObjects.add(multiRoute);
      multiRouteRef.current = multiRoute;
    }, 1000),
    [currentLocation, onRouteDetails]
  );

  // Привязка обработчиков событий клика
  const attachEventHandlers = useCallback(
    (map) => {
      const clickHandler = (e) => {
        const coords = e.get("coords");
        if (!coords) return;

        if (isSettingLocationRef.current) {
          onSetCurrentLocation(coords);
        } else {
          onPointSelected(coords);
        }
      };

      map.events.add("click", clickHandler);
      return () => map.events.remove("click", clickHandler);
    },
    [onSetCurrentLocation, onPointSelected]
  );

  // Инициализация карты
  const initializeMap = useCallback(() => {
    if (!mapContainerRef.current) {
      console.error("Контейнер карты не найден");
      return;
    }
    if (!window.ymaps) return;

    const map = MapStore.getMap();
    if (map) {
      map.setCenter(currentLocation || [55.751574, 37.573856]);
      updateCurrentPositionMarker(map);
      return;
    }

    const newMap = new window.ymaps.Map(mapContainerRef.current, {
      center: currentLocation || [55.751574, 37.573856],
      zoom: 14,
      controls: ["zoomControl", "typeSelector", "fullscreenControl"],
      suppressMapOpenBlock: true,
    });

    MapStore.setMap(newMap);
    updateCurrentPositionMarker(newMap);
    attachEventHandlers(newMap);
  }, [currentLocation, updateCurrentPositionMarker, attachEventHandlers]);

  // Обновление маршрута при изменении параметров
  useEffect(() => {
    const map = MapStore.getMap();
    if (map && selectedPoint && isNavigationMode) {
      try {
        buildRoute(map, selectedPoint);
      } catch (error) {
        console.error("Ошибка обновления маршрута:", error);
        onRouteDetails({ error: "Не удалось обновить маршрут" });
      }
    }
  }, [selectedPoint, isNavigationMode, buildRoute, onRouteDetails]);

  // Центрирование карты при изменении местоположения
  useEffect(() => {
    const map = MapStore.getMap();
    if (map && currentLocation) {
      updateCurrentPositionMarker(map);
      map.setCenter(currentLocation);
    }
  }, [currentLocation, updateCurrentPositionMarker]);

  // Подсказка при установке местоположения
  useEffect(() => {
    const map = MapStore.getMap();
    if (!map) return;

    if (isSettingLocation && currentLocation) {
      map.balloon.open(
        currentLocation,
        "Кликните на карте, чтобы установить ваше местоположение",
        { closeButton: false }
      );
    } else {
      map.balloon.close();
    }
  }, [isSettingLocation, currentLocation]);

  // Инициализация карты при монтировании
  useEffect(() => {
    initializeMap();
  }, [initializeMap]);

  // Обработка выбранной точки и маршрута
  useEffect(() => {
    const map = MapStore.getMap();
    if (map) {
      if (selectedPoint) {
        try {
          addPoint(map, selectedPoint);
          if (isNavigationMode) buildRoute(map, selectedPoint);
        } catch (error) {
          console.error("Ошибка построения маршрута:", error);
          onRouteDetails({ error: "Не удалось построить маршрут" });
        }
      } else {
        if (selectedPointRef.current) {
          map.geoObjects.remove(selectedPointRef.current);
          selectedPointRef.current = null;
        }
        if (multiRouteRef.current) {
          map.geoObjects.remove(multiRouteRef.current);
          multiRouteRef.current = null;
        }
        onRouteDetails(null);
      }
    }
  }, [selectedPoint, isNavigationMode, addPoint, buildRoute, onRouteDetails]);

  // Очистка карты при размонтировании
  useEffect(() => {
    return () => {
      const map = MapStore.getMap();
      if (map) {
        map.geoObjects.removeAll();
        map.destroy();
      }
      MapStore.destroyMap();
    };
  }, []);

  // Адаптация карты при изменении размера окна
  useEffect(() => {
    const handleResize = () => {
      const map = MapStore.getMap();
      if (map) {
        setTimeout(() => map.container.fitToViewport(), 100);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Добавление маркеров складов
  useEffect(() => {
    if (window.ymaps && warehouses.length > 0) {
      window.ymaps.ready(() => {
        const map = MapStore.getMap();
        if (!map) return;

        warehouses.forEach((warehouse) => {
          const placemark = new window.ymaps.Placemark(
            [warehouse.latitude, warehouse.longitude],
            {
              hintContent: warehouse.name,
              balloonContent: `Склад: ${warehouse.name}<br>Адрес: ${warehouse.address}<br>Загруженность: ${warehouse.load_percentage}%`,
            },
            {
              preset: "islands#blueWarehouseIcon",
            }
          );
          map.geoObjects.add(placemark);
        });
      });
    }
  }, [warehouses]);

  return (
    <div>
      <YandexMapLoader onLoad={initializeMap} />
      <div
        ref={mapContainerRef}
        style={{
          width: "100%",
          height: "500px",
          borderRadius: "0.75rem",
          overflow: "hidden",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          opacity: currentLocation ? 1 : 0.7,
        }}
      />
      {!currentLocation && (
        <div className="mt-2 text-yellow-600">
          Ожидание актуальных координат...
        </div>
      )}
    </div>
  );
}

export default InteractiveMap;
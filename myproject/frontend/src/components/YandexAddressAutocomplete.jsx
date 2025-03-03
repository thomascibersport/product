import React, { useRef, useEffect } from "react";

const YandexAddressAutocomplete = ({ value, onChange }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    // Функция для динамической загрузки скрипта Яндекс.Карт
    const loadYandexScript = () => {
      return new Promise((resolve, reject) => {
        if (window.ymaps) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = "https://api-maps.yandex.ru/2.1/?apikey=e89b14b0-8810-486a-bd99-f972192719d4&lang=ru_RU";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Ошибка загрузки скрипта Яндекс.Карт"));
        document.body.appendChild(script);
      });
    };

    loadYandexScript()
      .then(() => {
        // Инициализация SuggestView после загрузки скрипта и готовности API
        window.ymaps.ready(() => {
          if (inputRef.current) {
            // Создаём экземпляр SuggestView, который автоматически подсказывает адреса
            new window.ymaps.SuggestView(inputRef.current, {
              // Дополнительно можно задать опции, например, ограничить регион поиска
              // boundedBy: [[55.5, 37.3], [55.9, 37.8]]
            });
          }
        });
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

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

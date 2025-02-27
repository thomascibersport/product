async function fetchOptimalRoute(currentLocation, destination, weather) {
  const [startLat, startLng] = currentLocation;
  const [endLat, endLng] = destination;

  const body = {
    start: { lat: startLat, lng: startLng },
    destination: { lat: endLat, lng: endLng },
    weather: {
      description: weather.description,
      temperature: weather.temperature,
    },
  };

  console.log("Отправка запроса на построение маршрута:", body);

  try {
    const response = await fetch("https://api.deepseek.com/v1/optimal-route", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer sk-e393e0f4d0d54a27bd036d229ff08153",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Deepseek API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Ответ от API:", data);
    return data;
  } catch (error) {
    console.error("Ошибка при запросе оптимального маршрута:", error);
    return null;
  }
}
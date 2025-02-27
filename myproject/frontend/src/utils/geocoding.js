const YANDEX_API_KEY = "f2749db0-14ee-4f82-b043-5bb8082c4aa9";
export async function getDetailedAddress(lat, lon) {
  try {
    const url = `https://geocode-maps.yandex.ru/1.x/?apikey=${YANDEX_API_KEY}&geocode=${lon},${lat}&format=json`;
    const response = await fetch(url);
    const data = await response.json();
    const geoObject =
      data.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
    if (geoObject) {
      const addressMeta = geoObject.metaDataProperty.GeocoderMetaData.Address;
      // Возвращаем полностью отформатированный адрес, который обычно содержит номер дома
      return addressMeta.formatted;
    }
    return `${lat}, ${lon}`;
  } catch (error) {
    console.error("Ошибка получения подробного адреса:", error);
    return `${lat}, ${lon}`;
  }
}

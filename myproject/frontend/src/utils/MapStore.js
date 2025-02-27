// src/utils/MapStore.js

const MapStore = {
  mapInstance: null,
  isLoaded: false,

  /**
   * Устанавливает экземпляр карты и отмечает, что карта загружена.
   * @param {object} map - Экземпляр карты (например, из window.ymaps.Map).
   */
  setMap(map) {
    this.mapInstance = map;
    this.isLoaded = true;
  },

  /**
   * Возвращает сохранённый экземпляр карты.
   * @returns {object|null} Экземпляр карты или null, если его нет.
   */
  getMap() {
    return this.mapInstance;
  },

  /**
   * Уничтожает экземпляр карты и очищает состояние.
   * Вызывайте этот метод только тогда, когда уверены, что карта больше не нужна.
   */
  destroyMap() {
    if (this.mapInstance) {
      // Например, удаляем все объекты и уничтожаем экземпляр.
      this.mapInstance.geoObjects.removeAll();
      this.mapInstance.destroy();
      this.mapInstance = null;
      this.isLoaded = false;
    }
  },
};

export default MapStore;

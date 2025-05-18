// routes.js
import axios from 'axios';

// Базовый URL для API (убедитесь, что он совпадает с настройками вашего Django)
const API_URL = 'http://127.0.0.1:8000/api/authentication/';

export const saveRouteRecord = async (token, routeRecordData) => {
  return await axios.post(`${API_URL}routes/`, routeRecordData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
};





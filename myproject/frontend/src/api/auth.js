import axios from 'axios';
import Cookies from "js-cookie";
const API_URL = 'http://127.0.0.1:8000/api/authentication/';

export const register = async (userData) => {
    return await axios.post(`${API_URL}register/`, userData);
};

export const login = async (credentials) => {
  const response = await axios.post(`${API_URL}login/`, credentials);
  const token = response.data.access; // Предполагается, что сервер возвращает access-токен
  Cookies.set("token", token, { secure: true, sameSite: "Strict" });
  return response;
};

export const getUser = async (token) => {
    return await axios.get(`${API_URL}user/`, {
        headers: {
            Authorization: `Bearer ${token}`, // Убедитесь, что токен передаётся
        },
    });
};

export const updateProfile = async (token, userData) => {
    return await axios.put("http://127.0.0.1:8000/api/authentication/profile/update/", userData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  };
  export const uploadImage = async (token, formData) => {
    const response = await fetch(`${API_URL}upload-avatar/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Ошибка загрузки изображения');
    }
    
    return response.json();
  };
  export const updatePassword = async (token, passwordData) => {
    return await axios.post(`${API_URL}update-password/`, passwordData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  };
  export const saveRouteRecord = async (routeData) => {
    const token = Cookies.get("token");
    if (!token) {
      console.error("Ошибка: токен отсутствует");
      alert("Ошибка авторизации: войдите в систему.");
      return null; // Возвращаем `null`, если нет токена
    }
  
    try {
      const response = await fetch(`${API_URL}routes/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(routeData),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка сервера: ${response.status} - ${errorText}`);
      }
  
      return response; // ✅ Возвращаем `response`, а не `response.json()`
    } catch (error) {
      console.error("Ошибка запроса:", error);
      alert(`Ошибка сохранения маршрута: ${error.message}`);
      return null; // Возвращаем `null` при ошибке
    }
  };

  export const getRouteHistory = async () => {
    const token = Cookies.get("token");
    if (!token) {
      console.error("Ошибка: токен отсутствует");
      return null;
    }
  
    try {
      const response = await axios.get(`${API_URL}routes/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Ошибка загрузки истории маршрутов:", error);
      return null;
    }
  };
   
  
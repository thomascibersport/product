import axios from 'axios';
import Cookies from "js-cookie";

const API_URL = 'http://localhost:8000/api';

export const register = async (userData) => {
    return await axios.post(`${API_URL}/authentication/register/`, userData);
};

export const login = async (credentials) => {
  const response = await axios.post(`${API_URL}/authentication/login/`, credentials);
  const token = response.data.access; // Предполагается, что сервер возвращает access-токен
  Cookies.set("token", token, { secure: true, sameSite: "Strict" });
  return response;
};

export const getUser = async (token) => {
    return await axios.get(`${API_URL}/authentication/user/`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
};

export const updateProfile = async (token, userData) => {
    return await axios.put(`${API_URL}/authentication/profile/update/`, userData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
};

export const uploadImage = async (token, formData) => {
    const response = await fetch(`${API_URL}/authentication/upload-avatar/`, {
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
    return await axios.post(`${API_URL}/authentication/update-password/`, passwordData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
};

// Seller application methods
export const getSellerApplication = async (token) => {
  try {
    const response = await axios.get(
      `${API_URL}/authentication/seller-application/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response;
  } catch (error) {
    console.error("Error fetching seller application:", error);
    throw error;
  }
};

export const submitSellerApplication = async (token, formData) => {
  const response = await fetch(`${API_URL}/authentication/seller-application/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Ошибка отправки заявки');
  }
  
  return response.json();
};

export const deleteApplicationImage = async (token, imageId) => {
  return await axios.delete(`${API_URL}/authentication/seller-application/?image_id=${imageId}`, {
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
      return null;
    }
  
    try {
      const response = await fetch(`${API_URL}/authentication/routes/`, {
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
  
      return response;
    } catch (error) {
      console.error("Ошибка запроса:", error);
      alert(`Ошибка сохранения маршрута: ${error.message}`);
      return null;
    }
};

export const getRouteHistory = async () => {
    const token = Cookies.get("token");
    if (!token) {
      console.error("Ошибка: токен отсутствует");
      return null;
    }
  
    try {
      const response = await axios.get(`${API_URL}/authentication/routes/`, {
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

// Get user media files
export const getUserMedia = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/authentication/user-media/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Upload user media file
export const uploadUserMedia = async (token, formData) => {
  try {
    const response = await axios.post(`${API_URL}/authentication/user-media/`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Delete user media file
export const deleteUserMedia = async (token, mediaId) => {
  try {
    const response = await axios.delete(`${API_URL}/authentication/user-media/${mediaId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update user media details
export const updateUserMedia = async (token, mediaId, mediaData) => {
  try {
    const response = await axios.put(`${API_URL}/authentication/user-media/${mediaId}/`, mediaData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};
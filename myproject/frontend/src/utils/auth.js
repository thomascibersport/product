import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

export const saveToken = (token) => {
  // Параметры можно настроить:
  // secure: true (только по HTTPS), sameSite: 'Strict' или 'Lax'
  Cookies.set("token", token, { secure: true, sameSite: "Strict" });
};

// Получаем токен из куки
export const getToken = () => Cookies.get("token");

// Удаляем токен из куки
export const removeToken = () => Cookies.remove("token");

export const isAuthenticated = () => {
  const token = Cookies.get("token");
  return token !== undefined;
};

export const isAdmin = () => {
  const token = Cookies.get("token");
  if (token) {
    const decodedToken = jwtDecode(token);
    return decodedToken.is_staff || decodedToken.is_superuser;
  }
  return false;
};

// Выход (удаление токена и закрытие соединений)
export const logout = () => {
  // Close any active WebSocket connections
  document.querySelectorAll('[data-websocket-connection]').forEach(element => {
    try {
      const wsConnection = element.dataset.websocketConnection;
      if (wsConnection && typeof wsConnection.close === 'function') {
        wsConnection.close();
      }
    } catch (e) {
      console.error('Error closing WebSocket connection:', e);
    }
  });
  
  // Remove token
  removeToken();
};

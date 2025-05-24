import React, { createContext, useState, useEffect, useContext } from "react";
import Cookies from "js-cookie";
import { getUser } from "./api/auth";

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // Initialize user from localStorage if available
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(Cookies.get("token") || null);
  const [isLoading, setIsLoading] = useState(!!Cookies.get("token")); // true, если токен есть
  const [hasMessages, setHasMessages] = useState(false);

  // Update localStorage when user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  const login = (newToken, newUsername, newAvatar) => {
    setToken(newToken);
    Cookies.set("token", newToken, { secure: true, sameSite: "Strict" });
    setIsLoading(true);
    getUser(newToken)
      .then((response) => {
        setUser(response.data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Ошибка загрузки данных при логине:", error);
        setIsLoading(false);
      });
  };

  const logout = () => {
    // Close any active WebSocket connections
    const wsElements = document.querySelectorAll('[data-websocket-connection]');
    wsElements.forEach(element => {
      try {
        if (element.websocket && typeof element.websocket.close === 'function') {
          element.websocket.close();
        }
      } catch (e) {
        console.error('Error closing WebSocket connection:', e);
      }
      
      // Remove the element from DOM
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    
    setToken(null);
    setUser(null);
    setHasMessages(false);
    setIsLoading(false);
    Cookies.remove("token");
    localStorage.removeItem("user");
  };
  
  useEffect(() => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getUser(token)
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, [token]);
  
  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        token,
        login,
        logout,
        isLoading,
        hasMessages,
        setHasMessages,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

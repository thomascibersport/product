import React, { createContext, useState, useEffect, useContext } from 'react';
import Cookies from 'js-cookie';
import { getUser } from './api/auth';

export const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(Cookies.get("token") || null);
  const [hasMessages, setHasMessages] = useState(false);

  useEffect(() => {
    if (token && !user) {
      getUser(token)
        .then(response => {
          setUser(response.data); // Сохраняем данные пользователя, включая id
        })
        .catch(error => {
          console.error("Ошибка загрузки данных пользователя:", error);
          setUser(null);
        });
    }
  }, [token]);

  const login = (newToken, newUsername, newAvatar) => {
    setToken(newToken);
    Cookies.set("token", newToken, { secure: true, sameSite: "Strict" });
    getUser(newToken)
      .then(response => {
        setUser(response.data); // Сохраняем данные пользователя
      })
      .catch(error => {
        console.error("Ошибка загрузки данных при логине:", error);
      });
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setHasMessages(false);
    Cookies.remove("token");
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, token, login, logout, hasMessages, setHasMessages }}
    >
      {children}
    </AuthContext.Provider>
  );
};
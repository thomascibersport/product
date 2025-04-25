import React, { createContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { getUser } from './api/auth'; // Подключаем вашу функцию getUser

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Хранит полный объект пользователя
  const [token, setToken] = useState(Cookies.get("token") || null);
  const [hasMessages, setHasMessages] = useState(false);

  // Загружаем данные пользователя, если есть токен
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
    // После логина сразу загружаем данные пользователя
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
import React, { createContext, useState, useEffect, useContext } from "react";
import Cookies from "js-cookie";
import { getUser } from "./api/auth";

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(Cookies.get("token") || null);
  const [isLoading, setIsLoading] = useState(!!Cookies.get("token")); // true, если токен есть
  const [hasMessages, setHasMessages] = useState(false);

  useEffect(() => {
    console.log("AuthProvider: token:", token, "isLoading:", isLoading);
    if (token) {
      setIsLoading(true);
      getUser(token)
        .then((response) => {
          console.log("AuthProvider: пользователь загружен:", response.data);
          setUser(response.data);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error("AuthProvider: ошибка загрузки пользователя:", error);
          setUser(null);
          setIsLoading(false);
        });
    } else {
      setUser(null);
      setIsLoading(false);
    }
  }, [token]);

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
    setToken(null);
    setUser(null);
    setHasMessages(false);
    setIsLoading(false);
    Cookies.remove("token");
  };

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

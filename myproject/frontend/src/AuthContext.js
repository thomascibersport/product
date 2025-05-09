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

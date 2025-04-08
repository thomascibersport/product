import React, { createContext, useState } from 'react';
import Cookies from 'js-cookie';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [avatar, setAvatar] = useState("/media/default-avatar.png");
  const [username, setUsername] = useState("Гость");
  const [token, setToken] = useState(Cookies.get("token") || null);
  const [hasMessages, setHasMessages] = useState(false);

  const login = (newToken, newUsername, newAvatar) => {
    setToken(newToken);
    setUsername(newUsername);
    setAvatar(newAvatar || "/media/default-avatar.png");
    Cookies.set("token", newToken, { secure: true, sameSite: "Strict" });
  };

  const logout = () => {
    setToken(null);
    setUsername("Гость");
    setAvatar("/media/default-avatar.png");
    setHasMessages(false);
    Cookies.remove("token");
  };

  return (
    <AuthContext.Provider
      value={{ avatar, setAvatar, username, setUsername, token, login, logout, hasMessages, setHasMessages }}
    >
      {children}
    </AuthContext.Provider>
  );
};
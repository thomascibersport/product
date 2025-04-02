import { createContext, useState } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [avatar, setAvatar] = useState("/media/default-avatar.png");

  return (
    <AuthContext.Provider value={{ avatar, setAvatar }}>
      {children}
    </AuthContext.Provider>
  );
};
import { createContext, useState } from "react";
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [avatar, setAvatar] = useState("/media/default-avatar.png");
  const [username, setUsername] = useState("Гость"); 

  return (
    <AuthContext.Provider value={{ avatar, setAvatar, username, setUsername }}>
      {children}
    </AuthContext.Provider>
  );
};
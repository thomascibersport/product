import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const PrivateRoute = ({ children }) => {
  const { token, user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (!token || !user)) {
      navigate("/login");
    }
  }, [isLoading, token, user, navigate]);

  if (isLoading) {
    return <div>Загрузка...</div>;
  }

  if (!token || !user) {
    return null; // Перенаправление произойдёт в useEffect
  }

  return children;
};

export default PrivateRoute;
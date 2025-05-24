import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

// Loading component with background matching the site theme
const LoadingFallback = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
      <p className="text-gray-600 dark:text-gray-400 text-lg">Загрузка...</p>
    </div>
  </div>
);

const SellerRoute = ({ children }) => {
  const { token, user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      // Redirect if not authenticated
      if (!token || !user) {
        navigate("/login");
        return;
      }
      
      // Redirect if authenticated but not a seller
      if (!user.is_seller) {
        navigate("/");
      }
    }
  }, [isLoading, token, user, navigate]);

  if (isLoading) {
    return <LoadingFallback />;
  }

  if (!token || !user) {
    return null; // Перенаправление произойдёт в useEffect
  }

  if (!user.is_seller) {
    return null; // Перенаправление произойдёт в useEffect
  }

  return children;
};

export default SellerRoute; 
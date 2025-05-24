import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { getToken } from "../utils/auth";
import { AuthContext } from "../AuthContext";
import useSellerStatus from "../hooks/useSellerStatus";
import axios from "axios";

// Throttle function to limit API calls
const throttle = (func, delay) => {
  let lastCall = 0;
  return function(...args) {
    const now = new Date().getTime();
    if (now - lastCall < delay) {
      return;
    }
    lastCall = now;
    return func(...args);
  };
};

function Header() {
  const { user, token, logout, setUser } = useContext(AuthContext);
  const { refreshSellerStatus } = useSellerStatus();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme ? savedTheme === "dark" : false;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(!!getToken());
  const [hasMessages, setHasMessages] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation(); // Get current location
  const intervalRef = useRef(null);
  const isLoadingRef = useRef(false);

  // Log when user or location changes
  useEffect(() => {
    if (user) {
      console.log("User data in Header:", user.username, "is_seller:", user.is_seller);
    }
  }, [user, location.pathname]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  // Create a throttled fetch function to prevent too many API calls
  const fetchUserAndMessageData = useCallback(async () => {
    // Don't make a request if we're already loading or not authenticated
    if (isLoadingRef.current || !getToken()) return;
    
    try {
      isLoadingRef.current = true;
      const token = getToken();
      if (!token) {
        setIsAuthenticated(false);
        return;
      }
      
      // Use the combined endpoint
      const response = await axios.get(
        "http://localhost:8000/api/users/messages-data/",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      // Update state with all the data
      setUser(response.data.user);
      setIsAuthenticated(true);
      setHasMessages(response.data.has_messages);
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
      if (error.response && error.response.status === 401) {
        logout();
        setIsAuthenticated(false);
        navigate("/login");
      }
    } finally {
      // Set loading to false after a slight delay to prevent rapid consecutive calls
      setTimeout(() => {
        isLoadingRef.current = false;
      }, 1000); // 1 second delay as requested
    }
  }, [setUser, navigate, logout]);
  
  // Throttle the function to prevent too frequent calls
  const throttledFetch = useCallback(throttle(fetchUserAndMessageData, 5000), [fetchUserAndMessageData]);

  // Initial data fetch - only run once on mount
  useEffect(() => {
    fetchUserAndMessageData();
    
    // Clean up function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  // Empty dependency array means this runs exactly once on mount
  }, []); 
  
  // Set up polling for data updates at reasonable intervals
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Don't set up polling if user is not authenticated or is staff
    if (!isAuthenticated || (user && user.is_staff)) return;
    
    // Set up interval with longer delay (10 seconds instead of 1 minute)
    intervalRef.current = setInterval(throttledFetch, 10000);
    
    // Clean up on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAuthenticated, user, throttledFetch]);

  // Force refresh user data on each navigation
  useEffect(() => {
    if (isAuthenticated && token) {
      refreshSellerStatus();
    }
  }, [location.pathname, isAuthenticated, token, refreshSellerStatus]);

  const handleLogout = () => {
    // Clear interval on logout
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    logout();
    setIsAuthenticated(false);
    navigate("/login");
  };

  const handleThemeChange = () => {
    setIsDarkMode((prevMode) => !prevMode);
  };

  const handleProfileSettings = () => {
    navigate("/profile/edit");
  };

  // Check seller status when component is focused
  useEffect(() => {
    const handleFocus = () => {
      refreshSellerStatus();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshSellerStatus]);

  // Also check seller status periodically
  useEffect(() => {
    // Only set up this interval if the user is authenticated but not a seller
    if (!isAuthenticated || !user || user.is_staff || user.is_seller) {
      return;
    }
    
    // Check every 30 seconds if seller status has changed
    const statusCheckInterval = setInterval(() => {
      refreshSellerStatus();
    }, 30000);
    
    return () => {
      clearInterval(statusCheckInterval);
    };
  }, [isAuthenticated, user, refreshSellerStatus]);

  // Determine if user is a seller directly from user object
  const showSellerLinks = user && user.is_seller === true;

  return (
    <header className="bg-gray-800 text-white py-4 px-6 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold hover:text-gray-300">
          Продукты
        </Link>

        {isAuthenticated && user?.is_staff ? (
          <nav className="flex space-x-4">
            <Link to="/admin" className="hover:text-gray-300">
              Админ панель
            </Link>
          </nav>
        ) : isAuthenticated ? (
          <nav className="flex space-x-4">
            <Link to="/orders" className="hover:text-gray-300">
              Мои заказы
            </Link>
            <Link to="/cart" className="hover:text-gray-300">
              Корзина
            </Link>
            {showSellerLinks && (
              <>
                <Link to="/my-products" className="hover:text-gray-300">
                  Мои объявления
                </Link>
                <Link to="/seller-orders" className="hover:text-gray-300">
                  Заказы на мои товары
                </Link>
                <Link to="/seller-statistics" className="hover:text-gray-300">
                  Статистика
                </Link>
              </>
            )}
            {hasMessages && (
              <Link to="/messages" className="hover:text-gray-300 relative">
                Сообщения
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            )}
            <Link
              to="/assistant"
              className="text-white hover:text-gray-300"
            >
              ИИ Помощник
            </Link>
          </nav>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-white hover:bg-gray-700"
            >
              <img
                src={user?.avatar || "/media/default-avatar.png"}
                alt="avatar"
                className="w-10 h-10 rounded-full object-cover"
              />
              <span>{user?.username || "Гость"}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-white text-black shadow-lg rounded-lg mt-2">
            {isAuthenticated && !user?.is_staff && (
              <DropdownMenuItem onClick={handleProfileSettings}>
                Настройки профиля
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleThemeChange}>
              {isDarkMode ? "Светлая тема" : "Тёмная тема"}
            </DropdownMenuItem>
            {isAuthenticated ? (
              <DropdownMenuItem onClick={handleLogout}>Выйти</DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => navigate("/login")}>
                Войти
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default Header;

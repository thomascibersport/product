import React, { useEffect, useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { getUser } from "../api/auth";
import { getToken, logout as clearToken } from "../utils/auth";
import { AuthContext } from "../AuthContext"; // Импортируем контекст

function Header() {
  const { avatar, setAvatar } = useContext(AuthContext); // Используем контекст
  const [username, setUsername] = useState("Гость");
  const [user, setUser] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme ? savedTheme === "dark" : false;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(!!getToken());
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = getToken();
        if (!token) {
          setIsAuthenticated(false);
          return;
        }
        const response = await getUser(token);
        setUser(response.data);
        setUsername(response.data.username);
        setAvatar(response.data.avatar || "/media/default-avatar.png"); // Устанавливаем аватар из данных пользователя
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Ошибка загрузки данных пользователя:", error);
        handleLogout();
      }
    };

    fetchUserData();
  }, [navigate, setAvatar]); // Добавляем setAvatar в зависимости

  const handleLogout = () => {
    clearToken();
    setIsAuthenticated(false);
    setUsername("Гость");
    setAvatar("/media/default-avatar.png"); // Сбрасываем аватар при выходе
    navigate("/login");
  };

  const handleThemeChange = () => {
    setIsDarkMode((prevMode) => !prevMode);
  };

  const handleProfileSettings = () => {
    navigate("/profile/edit");
  };

  return (
    <header className="bg-gray-800 text-white py-4 px-6 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold hover:text-gray-300">
          Продукты
        </Link>

        {isAuthenticated && (
          <nav className="flex space-x-4">
            <Link to="/orders" className="hover:text-gray-300">
              Мои заказы
            </Link>
            <Link to="/cart" className="hover:text-gray-300">
              Корзина
            </Link>
            <Link to="/my-products" className="hover:text-gray-300">
              Мои объявления
            </Link>
            <Link to="/seller-orders" className="hover:text-gray-300">
              Заказы на мои товары
            </Link>
          </nav>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-white hover:bg-gray-700"
            >
              <img
                src={avatar} // Используем аватар из контекста
                alt="avatar"
                className="w-10 h-10 rounded-full object-cover"
              />
              <span>{username}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-white text-black shadow-lg rounded-lg mt-2">
            {isAuthenticated && (
              <>
                <DropdownMenuItem onClick={handleProfileSettings}>
                  Настройки профиля
                </DropdownMenuItem>
              </>
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
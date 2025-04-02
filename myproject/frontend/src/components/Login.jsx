import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { saveToken, isAuthenticated } from "../utils/auth";
import Header from "../components/Header"; // Импортируем Header

function Login() {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/"); // Перенаправление на главную, если пользователь уже авторизован
    }
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials({ ...credentials, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await login(credentials);
      saveToken(response.data.access);
      if (response.data.is_admin) {
        window.location.href = "http://127.0.0.1:8000/admin/"; // Перенаправление на админку Django
      } else {
        navigate("/"); // Перенаправляем на главную страницу
      }
    } catch (err) {
      console.error("Ошибка авторизации:", err);
      setError("Неверное имя пользователя или пароль.");
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="relative w-full max-w-md">
          <div className="absolute -inset-2 bg-blue-100 dark:bg-blue-900/20 blur-lg opacity-30 rounded-3xl"></div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl relative transition-all duration-300 hover:shadow-2xl">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8 text-center">
              🔐 Вход в систему
            </h1>

            {error && (
              <div className="bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-300 px-4 py-3 rounded-xl mb-6 text-sm flex items-center">
                <span className="mr-2">⚠️</span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-3 font-medium">
                  Имя пользователя
                </label>
                <input
                  type="text"
                  name="username"
                  value={credentials.username}
                  onChange={handleInputChange}
                  required
                  className="w-full px-5 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 bg-transparent transition-all text-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-3 font-medium">
                  Пароль
                </label>
                <input
                  type="password"
                  name="password"
                  value={credentials.password}
                  onChange={handleInputChange}
                  required
                  className="w-full px-5 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 bg-transparent transition-all text-gray-800 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-blue-200/50 dark:hover:shadow-blue-900/30"
              >
                Войти
              </button>
            </form>

            <p className="mt-8 text-center text-gray-600 dark:text-gray-400 text-sm">
              Нет аккаунта?{" "}
              <a
                href="/register"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium underline-offset-4 hover:underline transition-all"
              >
                Зарегистрироваться
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;

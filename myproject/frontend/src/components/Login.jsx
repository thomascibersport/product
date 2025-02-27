import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { saveToken, isAuthenticated } from "../utils/auth";
import Header from "../components/Header"; // Импортируем Header

function Login() {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
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
      {/* Интегрированная шапка */}
      <Header />
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6 text-center">
            Вход в систему
          </h1>
          {error && (
            <div className="bg-red-100 text-red-800 px-4 py-2 rounded mb-4 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-2">Имя пользователя</label>
              <input
                type="text"
                name="username"
                value={credentials.username}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 dark:text-gray-300 mb-2">Пароль</label>
              <input
                type="password"
                name="password"
                value={credentials.password}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
            >
              Войти
            </button>
          </form>
          <p className="mt-4 text-center text-gray-600 dark:text-gray-400">
            Нет аккаунта?{" "}
            <a href="/register" className="text-blue-600 hover:underline">
              Зарегистрироваться
            </a>
          </p>
        </div>
      </div>
    </>
  );
}

export default Login;

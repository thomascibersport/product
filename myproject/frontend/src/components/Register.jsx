import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../api/auth";
import { isAuthenticated } from "../utils/auth";
import InputMask from "react-input-mask";
import Header from "../components/Header"; // Импортируем Header

function Register() {
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [userData, setUserData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    login: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData({ ...userData, [name]: value });
  };

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/"); // Если пользователь уже авторизован, перенаправляем на главную
    }
  }, [navigate]);

  const validateFields = () => {
    const {
      firstName,
      lastName,
      middleName,
      login,
      phone,
      password,
      confirmPassword,
      agreeToTerms,
    } = userData;

    // Проверка ФИО на кириллицу
    const cyrillicRegex = /^[А-Яа-яЁё\s-]+$/;
    if (
      !cyrillicRegex.test(firstName) ||
      !cyrillicRegex.test(lastName) ||
      !cyrillicRegex.test(middleName)
    ) {
      setError("ФИО должно содержать только кириллицу.");
      return false;
    }

    // Логин только латинские буквы и цифры
    const latinRegex = /^[A-Za-z0-9]+$/;
    if (!latinRegex.test(login)) {
      setError("Логин должен содержать только латинские буквы и цифры.");
      return false;
    }

    // Проверка пароля
    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      setError(
        "Пароль должен содержать минимум 8 символов, одну букву, одну цифру и один специальный символ."
      );
      return false;
    }
    if (password !== confirmPassword) {
      setError("Пароли не совпадают.");
      return false;
    }
    if (!agreeToTerms) {
      setError("Необходимо согласиться с обработкой данных.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateFields()) return;

    // Преобразуем данные для отправки на сервер
    const finalData = {
      username: userData.login, // переименовываем login в username
      email: userData.email || "",
      password: userData.password,
      confirm_password: userData.confirmPassword, // переименовываем confirmPassword
      first_name: userData.firstName, // переименовываем firstName
      last_name: userData.lastName, // переименовываем lastName
      middle_name: userData.middleName, // переименовываем middleName
      phone: userData.phone,
      agree_to_terms: userData.agreeToTerms, // переименовываем agreeToTerms
    };

    try {
      await register(finalData);
      navigate("/login");
    } catch (err) {
      console.error("Ошибка регистрации:", err);

      if (err.response && err.response.data) {
        const data = err.response.data;

        // Если сервер сообщает об ошибке в поле username:
        if (data.username && Array.isArray(data.username)) {
          setError("Пользователь с таким логином уже существует.");
          return;
        }

        // Если сервер сообщает об ошибке в поле email:
        if (data.email && Array.isArray(data.email)) {
          setError("Пользователь с таким email уже существует.");
          return;
        }
      }

      setError("Не удалось зарегистрироваться. Проверьте введённые данные.");
    }
  };

  return (
    <>
      {/* Интегрированная шапка */}
      <Header />
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center pt-16">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6 text-center">
            Регистрация
          </h1>
          {error && (
            <div className="bg-red-100 text-red-800 px-4 py-2 rounded mb-4 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            {/* Фамилия */}
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-2">
                Фамилия
              </label>
              <input
                type="text"
                name="lastName"
                value={userData.lastName}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
              />
            </div>
            {/* Имя */}
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-2">
                Имя
              </label>
              <input
                type="text"
                name="firstName"
                value={userData.firstName}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
              />
            </div>
            {/* Отчество */}
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-2">
                Отчество
              </label>
              <input
                type="text"
                name="middleName"
                value={userData.middleName}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
              />
            </div>
            {/* Логин */}
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-2">
                Логин
              </label>
              <input
                type="text"
                name="login"
                value={userData.login}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
              />
            </div>
            {/* Email */}
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={userData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
              />
            </div>
            {/* Телефон */}
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-2">
                Телефон
              </label>
              <InputMask
                mask="+7 (999) 999-99-99"
                name="phone"
                value={userData.phone}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
              />
            </div>
            {/* Пароль */}
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-2">
                Пароль
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={userData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3 py-2"
                >
                  {showPassword ? "Скрыть" : "Показать"}
                </button>
              </div>
            </div>
            {/* Подтверждение пароля */}
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-2">
                Подтверждение пароля
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={userData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 px-3 py-2"
                >
                  {showConfirmPassword ? "Скрыть" : "Показать"}
                </button>
              </div>
            </div>
            {/* Чекбокс согласия */}
            <div className="mb-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={userData.agreeToTerms}
                  onChange={(e) =>
                    setUserData({ ...userData, agreeToTerms: e.target.checked })
                  }
                  className="mr-2"
                />
                <span className="text-gray-700 dark:text-gray-300">
                  Согласен на обработку данных
                </span>
              </label>
            </div>
            {/* Кнопка отправки */}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
            >
              Зарегистрироваться
            </button>
          </form>
          <p className="mt-4 text-center text-gray-600 dark:text-gray-400">
            Уже есть аккаунт?{" "}
            <a href="/login" className="text-blue-600 hover:underline">
              Войти
            </a>
          </p>
        </div>
      </div>
    </>
  );
}

export default Register;

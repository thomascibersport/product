import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../api/auth";
import { isAuthenticated } from "../utils/auth";
import InputMask from "react-input-mask";
import Header from "../components/Header"; 

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
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 pt-15">
        <div className="relative w-full max-w-xl">
          <div className="absolute -inset-2 bg-blue-100 dark:bg-blue-900/20 blur-lg opacity-30 rounded-3xl"></div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl relative transition-all duration-300 hover:shadow-2xl">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8 text-center">
              📝 Регистрация
            </h1>

            {error && (
              <div className="bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-300 px-4 py-3 rounded-xl mb-6 text-sm flex items-center">
                <span className="mr-2">⚠️</span>
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Фамилия */}
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-3 font-medium">
                  Фамилия
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={userData.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-5 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 bg-transparent transition-all text-gray-800 dark:text-white"
                />
              </div>

              {/* Имя */}
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-3 font-medium">
                  Имя
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={userData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-5 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 bg-transparent transition-all text-gray-800 dark:text-white"
                />
              </div>

              {/* Отчество */}
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-3 font-medium">
                  Отчество
                </label>
                <input
                  type="text"
                  name="middleName"
                  value={userData.middleName}
                  onChange={handleInputChange}
                  className="w-full px-5 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 bg-transparent transition-all text-gray-800 dark:text-white"
                />
              </div>

              {/* Логин */}
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-3 font-medium">
                  Логин
                </label>
                <input
                  type="text"
                  name="login"
                  value={userData.login}
                  onChange={handleInputChange}
                  required
                  className="w-full px-5 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 bg-transparent transition-all text-gray-800 dark:text-white"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-3 font-medium">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={userData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-5 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 bg-transparent transition-all text-gray-800 dark:text-white"
                />
              </div>

              {/* Телефон */}
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-3 font-medium">
                  Телефон
                </label>
                <InputMask
                  mask="+7 (999) 999-99-99"
                  name="phone"
                  value={userData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-5 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 bg-transparent transition-all text-gray-800 dark:text-white"
                />
              </div>

              {/* Пароль */}
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-3 font-medium">
                  Пароль
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={userData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full px-5 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 bg-transparent transition-all pr-16 text-gray-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                  >
                    {showPassword ? "Скрыть" : "Показать"}
                  </button>
                </div>
              </div>

              {/* Подтверждение пароля */}
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-3 font-medium">
                  Подтверждение
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={userData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className="w-full px-5 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 bg-transparent transition-all pr-16 text-gray-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                  >
                    {showConfirmPassword ? "Скрыть" : "Показать"}
                  </button>
                </div>
              </div>

              {/* Чекбокс согласия */}
              <div className="md:col-span-2">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    checked={userData.agreeToTerms}
                    onChange={(e) =>
                      setUserData({
                        ...userData,
                        agreeToTerms: e.target.checked,
                      })
                    }
                    className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded-md focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-blue-600"
                  />
                  <span className="text-gray-700 dark:text-gray-300 text-sm">
                    Согласен на обработку персональных данных
                  </span>
                </label>
              </div>

              {/* Кнопка отправки */}
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-blue-200/50 dark:hover:shadow-blue-900/30"
                >
                  Зарегистрироваться
                </button>
              </div>
            </form>

            <p className="mt-8 text-center text-gray-600 dark:text-gray-400 text-sm">
              Уже есть аккаунт?{" "}
              <a
                href="/login"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium underline-offset-4 hover:underline transition-all"
              >
                Войти
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default Register;

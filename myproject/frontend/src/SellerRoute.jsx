import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { getUser } from './api/auth';
import Cookies from "js-cookie";

// Встроенный компонент загрузки
const LoadingFallback = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
      <p className="text-gray-600 dark:text-gray-400 text-lg">Загрузка...</p>
    </div>
  </div>
);

const SellerRoute = ({ children }) => {
  const { token, user, isLoading, setUser } = useAuth();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  // Используем ref для отслеживания первоначальной загрузки
  const initialCheckDone = useRef(false);

  useEffect(() => {
    // Функция для однократной проверки статуса продавца
    const checkSellerStatus = async () => {
      // Если проверка уже выполнена или нет токена/пользователя, выходим
      if (initialCheckDone.current || !token) {
        if (!token) {
          console.log("SellerRoute: Отсутствует токен, перенаправление на страницу входа");
          navigate('/login');
        }
        return;
      }

      // Если данные пользователя не загружены, ждем
      if (!user) {
        console.log("SellerRoute: Пользователь не загружен, ожидание...");
        return;
      }

      // Помечаем проверку как выполненную
      initialCheckDone.current = true;

      console.log("SellerRoute: Данные пользователя из контекста", { 
        is_seller: user.is_seller
      });

      // Если пользователь уже помечен как продавец, разрешаем доступ
      if (user.is_seller) {
        setIsChecking(false);
        return;
      }

      // Только если пользователь не помечен как продавец, делаем запрос
      try {
        const updatedUserResponse = await getUser(token);
        
        if (updatedUserResponse.data) {
          // Если с сервера пришло обновление о статусе продавца, обновляем пользователя
          if (updatedUserResponse.data.is_seller !== user.is_seller) {
            console.log("SellerRoute: Обновлен статус продавца:", updatedUserResponse.data.is_seller);
            setUser(updatedUserResponse.data);
          }
          
          if (!updatedUserResponse.data.is_seller) {
            console.log("SellerRoute: Доступ запрещен - пользователь не является продавцом");
            navigate('/');
            return;
          }
        }
      } catch (error) {
        console.error("SellerRoute: Ошибка получения данных пользователя", error);
      } finally {
        setIsChecking(false);
      }
    };

    checkSellerStatus();
  }, [token, navigate, setUser]); // Удалил user из зависимостей

  // Обновляем isChecking когда приходит пользователь (отдельный эффект)
  useEffect(() => {
    if (user && initialCheckDone.current) {
      setIsChecking(false);
    }
  }, [user]);

  if (isLoading || isChecking) {
    return <LoadingFallback />;
  }

  return children;
};

export default SellerRoute; 
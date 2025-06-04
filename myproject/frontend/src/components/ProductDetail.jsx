import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import Cookies from "js-cookie";
import Header from "../components/Header";
import { getUser } from "../api/auth";

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [prevProduct, setPrevProduct] = useState(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartMessage, setCartMessage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Function to truncate text to a specific length
  const truncateText = (text, maxLength = 30) => {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  // Загрузка данных продукта
  useEffect(() => {
    const token = Cookies.get("token");
    const config = token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : {};

    axios
      .get(`http://localhost:8000/api/products/${id}/`, config)
      .then((response) => {
        setProduct(response.data);
        setPrevProduct(response.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  // Загрузка данных текущего пользователя
  useEffect(() => {
    const token = Cookies.get("token");
    if (token) {
      getUser(token)
        .then((response) => setCurrentUser(response.data))
        .catch((error) =>
          console.error("Ошибка загрузки данных пользователя:", error)
        );
    }
  }, []);

  // Обработка состояния загрузки и ошибок
  if (loading)
    return (
      <div className="text-center py-10 text-gray-600 dark:text-gray-400">
        Загрузка...
      </div>
    );
  if (error)
    return (
      <div className="text-center py-10 text-red-500 dark:text-red-400">
        Ошибка: {error}
      </div>
    );

  const displayProduct = product || prevProduct;
  if (!displayProduct)
    return (
      <div className="text-center py-10 text-gray-600 dark:text-gray-400">
        Продукт не найден
      </div>
    );

  const totalCost = (Number(displayProduct.price) * quantity).toFixed(2);
  const isOwner = currentUser && displayProduct.farmer === currentUser.id;

  // Функция добавления в корзину
  const handleAddToCart = async () => {
    if (isOwner) {
      setCartMessage({
        type: "error",
        text: "Вы не можете добавить свой продукт в корзину.",
      });
      return;
    }

    if (quantity > displayProduct.quantity) {
      setCartMessage({
        type: "error",
        text: `Нельзя добавить больше ${displayProduct.quantity} единиц товара.`,
      });
      return;
    }

    const token = Cookies.get("token");
    if (!token) {
      alert("Пожалуйста, войдите в систему, чтобы добавить товар в корзину");
      return;
    }

    setIsAddingToCart(true);
    setCartMessage(null);

    try {
      const response = await axios.post(
        `http://localhost:8000/api/cart/`,
        {
          product: displayProduct.id,
          quantity: quantity,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 201 || response.status === 200) {
        setCartMessage({
          type: "success",
          text: "Товар успешно добавлен в корзину!",
        });
      }
    } catch (error) {
      console.error("Ошибка при добавлении в корзину:", error);
      let errorMessage = "Произошла ошибка при добавлении в корзину";
      if (error.response && error.response.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      setCartMessage({ type: "error", text: errorMessage });
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Блок для уведомлений */}
        {cartMessage && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between mb-6 shadow-lg ${
              cartMessage.type === "success"
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-l-4 border-green-500"
                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-l-4 border-red-500"
            } animate-fade-in`}
          >
            <div className="flex items-center gap-2">
              {cartMessage.type === "success" ? (
                <svg
                  className="w-6 h-6 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
              <span className="font-medium">{cartMessage.text}</span>
            </div>
            <button
              onClick={() => setCartMessage(null)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Основной контейнер */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden">
          {/* Заголовок без градиента */}
          <div className="bg-white dark:bg-gray-800 py-5 px-8 border-b border-gray-100 dark:border-gray-700">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white text-center">
              {displayProduct.name}
            </h1>
          </div>

          <div className="p-6 md:p-10">
            <div className="flex flex-col md:flex-row gap-10">
              {/* Левая колонка с изображением */}
              <div className="w-full md:w-2/5">
                <div className="relative group rounded-2xl overflow-hidden shadow-xl border-2 border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-blue-200 dark:hover:shadow-blue-900/30">
                  {displayProduct.image ? (
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={displayProduct.image}
                        alt={displayProduct.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      
                      {/* Гладкое затемнение при наведении */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      </div>
                      
                      {/* Индикатор наличия */}
                      <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                        {displayProduct.quantity} {displayProduct.unit || "шт"} в наличии
                      </div>
                    </div>
                  ) : (
                    <div className="w-full aspect-square flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                      <div className="text-center">
                        <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">Нет изображения</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Блок продавца */}
                <div className="mt-6 p-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mr-4 text-blue-600 dark:text-blue-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Продавец:</p>
                    <Link
                      to={`/users/${displayProduct.farmer.id}/`} 
                      className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors flex items-center gap-1"
                    >
                      {truncateText(displayProduct.farmer_name)}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
              
              {/* Правая колонка с информацией */}
              <div className="w-full md:w-3/5 space-y-6">
                <div className="prose prose-blue max-w-none dark:prose-invert">
                  <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                    {displayProduct.description}
                  </p>
                </div>
                
                {/* Блок с датой публикации */}
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Опубликовано: {new Date(displayProduct.created_at).toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
                
                {/* Блок с категорией в виде бейджа */}
                <div className="flex items-center flex-wrap gap-2">
                  <span className="text-gray-700 dark:text-gray-300">Категория:</span>
                  <span className="inline-block px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-sm font-medium">
                    {displayProduct.category ? displayProduct.category.name : "Без категории"}
                  </span>
                </div>
                
                {/* Блок для доставки и адреса с иконками */}
                <div className="flex flex-col gap-3 p-5 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-amber-600 dark:text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 text-sm">Доставка:</span>
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        {displayProduct.delivery_available ? (
                          <span className="text-green-600 dark:text-green-400">✓ Доступна</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">✗ Недоступна</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  {displayProduct.seller_address && (
                    <div className="flex items-center mt-1">
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 text-sm">Адрес продавца:</span>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{displayProduct.seller_address}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Блок с ценой - теперь прозрачный */}
                <div className="p-6 rounded-xl">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Цена за 1 {displayProduct.unit || "ед."}</p>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {displayProduct.price} <span className="text-xl">₽</span>
                      </p>
                    </div>
                    
                    <div className="flex items-center">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="w-12 h-12 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-l-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-600"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                        </svg>
                      </button>
                      <div className="w-16 h-12 bg-white dark:bg-gray-700 border-t border-b border-gray-200 dark:border-gray-600 flex items-center justify-center font-medium text-gray-800 dark:text-gray-200">
                        {quantity}
                      </div>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-12 h-12 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-r-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v12M6 12h12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Итоговая стоимость */}
                  <div className="mt-4 p-4 rounded-lg text-center">
                    <p className="text-lg text-gray-600 dark:text-gray-300">Итого к оплате:</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{totalCost} ₽</p>
                  </div>
                </div>
                
                {/* Кнопка добавления в корзину */}
                {Cookies.get("token") && (
                  <button
                    onClick={handleAddToCart}
                    disabled={isAddingToCart || isOwner}
                    className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold text-lg rounded-xl transition-all transform hover:scale-[1.01] shadow-lg hover:shadow-blue-200 dark:hover:shadow-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {isOwner ? (
                      <>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Нельзя добавить свой продукт
                      </>
                    ) : isAddingToCart ? (
                      <div className="flex items-center justify-center gap-2">
                        <svg
                          className="animate-spin h-6 w-6 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Добавление...
                      </div>
                    ) : (
                      <>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Добавить в корзину
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ProductDetail;

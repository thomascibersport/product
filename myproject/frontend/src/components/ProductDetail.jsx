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
        `http://localhost:8000/api/cart/items/`,
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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Блок для уведомлений */}
        {cartMessage && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between mb-4 ${
              cartMessage.type === "success"
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
            } animate-fade-in`}
          >
            <div className="flex items-center gap-2">
              {cartMessage.type === "success" ? (
                <svg
                  className="w-5 h-5 text-green-500"
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
                  className="w-5 h-5 text-red-500"
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
              <span>{cartMessage.text}</span>
            </div>
            <button
              onClick={() => setCartMessage(null)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        )}
        {/* Основной контейнер */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-8 text-center">
            🛒 {displayProduct.name}
          </h1>

          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/2">
              <div className="relative group rounded-xl overflow-hidden shadow-lg border-4 border-blue-100 dark:border-blue-900/50">
                {displayProduct.image ? (
                  <img
                    src={displayProduct.image}
                    alt={displayProduct.name}
                    className="w-full h-auto object-cover aspect-square transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full aspect-square flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                    <span className="text-gray-500 dark:text-gray-400 text-lg">
                      Нет изображения
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="w-full md:w-1/2 space-y-6">
              <div className="space-y-4">
                <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                  {displayProduct.description}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  Продавец:{" "}
                  <Link
                    to={`/users/${displayProduct.farmer.id}/`} 
                    className="font-medium text-gray-800 dark:text-gray-200 hover:underline"
                  >
                    {displayProduct.farmer_name}
                  </Link>
                </p>
                {/* Блок для доставки и адреса */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl">
                  <p className="text-gray-800 dark:text-gray-200">
                    Доставка:{" "}
                    {displayProduct.delivery_available
                      ? "доступна"
                      : "недоступна"}
                  </p>
                  {displayProduct.seller_address && (
                    <p className="text-gray-800 dark:text-gray-200 mt-2">
                      Адрес продавца: {displayProduct.seller_address}
                    </p>
                  )}
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    Цена за 1 {displayProduct.unit || "ед."}:{" "}
                    {displayProduct.price} руб.
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Категория:{" "}
                    {displayProduct.category
                      ? displayProduct.category.name
                      : "Без категории"}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="w-10 h-10 text-gray-600 dark:text-gray-400 rounded-l-lg flex items-center justify-center hover:text-blue-500 transition-colors disabled:opacity-50"
                  >
                    −
                  </button>
                  <span className="w-16 h-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 flex items-center justify-center font-medium dark:text-gray-200">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 text-gray-600 dark:text-gray-400 rounded-r-lg flex items-center justify-center hover:text-blue-500 transition-colors"
                  >
                    +
                  </button>
                </div>
                <div className="text-xl font-bold text-gray-800 dark:text-white p-4 bg-gray-100 dark:bg-gray-700 rounded-xl">
                  Общая стоимость: {totalCost} руб.
                </div>
              </div>

              {Cookies.get("token") && (
                <button
                  onClick={handleAddToCart}
                  disabled={isAddingToCart || isOwner}
                  className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isOwner ? (
                    "Нельзя добавить свой продукт"
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
                    "Добавить в корзину 🛒"
                  )}
                </button>
              )}
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

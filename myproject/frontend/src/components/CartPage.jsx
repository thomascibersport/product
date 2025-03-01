import React, { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import Header from "../components/Header";
import { useNavigate } from "react-router-dom";

const CartPage = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCartItems = async () => {
      const token = Cookies.get("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await axios.get("http://localhost:8000/api/cart/items/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setCartItems(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCartItems();
  }, [navigate]);

  const updateQuantity = async (itemId, newQuantity) => {
    const token = Cookies.get("token");
    try {
      await axios.put(
        `http://localhost:8000/api/cart/items/${itemId}/`,
        { quantity: newQuantity },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setCartItems(items =>
        items.map(item =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );
    } catch (error) {
      console.error("Ошибка обновления количества:", error);
    }
  };

  const removeItem = async (itemId) => {
    const token = Cookies.get("token");
    try {
      await axios.delete(`http://localhost:8000/api/cart/items/${itemId}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCartItems(items => items.filter(item => item.id !== itemId));
    } catch (error) {
      console.error("Ошибка удаления товара:", error);
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    ).toFixed(2);
  };

  if (loading)
    return <div className="text-center py-10 text-gray-600">Загрузка корзины...</div>;

  if (error)
    return <div className="text-center py-10 text-red-500">Ошибка: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Ваша корзина
        </h1>
        
        {cartItems.length === 0 ? (
          <div className="text-center py-10 text-gray-600 dark:text-gray-400">
            Корзина пуста
          </div>
        ) : (
          <div className="grid gap-6">
            {/* Список товаров */}
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex flex-col md:flex-row gap-6"
              >
                {/* Изображение товара */}
                <div className="w-full md:w-1/5">
                  <img
                    src={item.product.image || "/placeholder-product.jpg"}
                    alt={item.product.name}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                </div>

                {/* Информация о товаре */}
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {item.product.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    {item.product.category}
                  </p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-2">
                    {item.product.price} ₽
                  </p>

                  {/* Управление количеством */}
                  <div className="flex items-center mt-4">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-l disabled:opacity-50"
                    >
                      -
                    </button>
                    <span className="px-4 bg-white dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-r"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Удаление и общая цена */}
                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    Удалить
                  </button>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {(item.product.price * item.quantity).toFixed(2)} ₽
                  </p>
                </div>
              </div>
            ))}

            {/* Итого */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-6">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  Итого:
                </span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {calculateTotal()} ₽
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;